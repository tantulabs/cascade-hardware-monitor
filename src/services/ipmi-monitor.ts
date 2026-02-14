import { exec } from 'child_process';
import { promisify } from 'util';
import { createChildLogger } from '../core/logger.js';

const execAsync = promisify(exec);
const logger = createChildLogger('ipmi-monitor');

export interface IPMISensor {
  name: string;
  value: number;
  unit: string;
  status: 'ok' | 'warning' | 'critical' | 'unknown';
  lowerCritical: number | null;
  lowerWarning: number | null;
  upperWarning: number | null;
  upperCritical: number | null;
  type: 'temperature' | 'voltage' | 'fan' | 'power' | 'current' | 'other';
}

export interface IPMISystemInfo {
  manufacturer: string;
  productName: string;
  serialNumber: string;
  firmwareVersion: string;
}

export interface IPMIData {
  available: boolean;
  local: boolean;
  systemInfo: IPMISystemInfo | null;
  sensors: IPMISensor[];
  temperatures: IPMISensor[];
  voltages: IPMISensor[];
  fans: IPMISensor[];
  powers: IPMISensor[];
  timestamp: number;
}

interface IPMIConfig {
  host?: string;
  username?: string;
  password?: string;
  interface?: 'lan' | 'lanplus' | 'open';
}

class IPMIMonitorService {
  private available = false;
  private config: IPMIConfig = {};
  private lastData: IPMIData | null = null;

  async initialize(config?: IPMIConfig): Promise<boolean> {
    this.config = config || {};

    try {
      // Check if ipmitool is available
      const { stdout } = await execAsync('which ipmitool || where ipmitool 2>nul', { timeout: 5000 })
        .catch(() => ({ stdout: '' }));
      
      if (!stdout.trim()) {
        logger.info('ipmitool not found');
        return false;
      }

      // Try local IPMI first
      if (!this.config.host) {
        const { stdout: localTest } = await execAsync('ipmitool sdr list 2>/dev/null || ipmitool sdr list 2>nul', { timeout: 10000 })
          .catch(() => ({ stdout: '' }));
        
        if (localTest.trim()) {
          this.available = true;
          logger.info('Local IPMI available');
          return true;
        }
      }

      // Try remote IPMI if configured
      if (this.config.host && this.config.username && this.config.password) {
        const cmd = this.buildCommand('sdr list');
        const { stdout: remoteTest } = await execAsync(cmd, { timeout: 15000 })
          .catch(() => ({ stdout: '' }));
        
        if (remoteTest.trim()) {
          this.available = true;
          logger.info(`Remote IPMI available at ${this.config.host}`);
          return true;
        }
      }

      logger.info('IPMI not available');
      return false;
    } catch (err) {
      logger.debug('IPMI initialization failed:', err);
      return false;
    }
  }

  isAvailable(): boolean {
    return this.available;
  }

  private buildCommand(subCommand: string): string {
    if (this.config.host) {
      const iface = this.config.interface || 'lanplus';
      return `ipmitool -I ${iface} -H ${this.config.host} -U ${this.config.username} -P ${this.config.password} ${subCommand}`;
    }
    return `ipmitool ${subCommand}`;
  }

  async getAllData(): Promise<IPMIData> {
    if (!this.available) {
      return {
        available: false,
        local: true,
        systemInfo: null,
        sensors: [],
        temperatures: [],
        voltages: [],
        fans: [],
        powers: [],
        timestamp: Date.now()
      };
    }

    try {
      const [sensors, systemInfo] = await Promise.all([
        this.getSensors(),
        this.getSystemInfo()
      ]);

      this.lastData = {
        available: true,
        local: !this.config.host,
        systemInfo,
        sensors,
        temperatures: sensors.filter(s => s.type === 'temperature'),
        voltages: sensors.filter(s => s.type === 'voltage'),
        fans: sensors.filter(s => s.type === 'fan'),
        powers: sensors.filter(s => s.type === 'power'),
        timestamp: Date.now()
      };

      return this.lastData;
    } catch (err) {
      logger.error('Failed to get IPMI data:', err);
      return {
        available: false,
        local: true,
        systemInfo: null,
        sensors: [],
        temperatures: [],
        voltages: [],
        fans: [],
        powers: [],
        timestamp: Date.now()
      };
    }
  }

  private async getSensors(): Promise<IPMISensor[]> {
    try {
      const cmd = this.buildCommand('sdr elist full');
      const { stdout } = await execAsync(cmd, { timeout: 15000 });
      
      const sensors: IPMISensor[] = [];
      const lines = stdout.trim().split('\n');

      for (const line of lines) {
        const sensor = this.parseSensorLine(line);
        if (sensor) {
          sensors.push(sensor);
        }
      }

      return sensors;
    } catch {
      return [];
    }
  }

  private parseSensorLine(line: string): IPMISensor | null {
    // Format: "Sensor Name | hex | status | value"
    const parts = line.split('|').map(p => p.trim());
    if (parts.length < 4) return null;

    const name = parts[0];
    const statusStr = parts[2].toLowerCase();
    const valueStr = parts[3];

    // Parse value and unit
    const valueMatch = valueStr.match(/([\d.]+)\s*(\S+)?/);
    if (!valueMatch) return null;

    const value = parseFloat(valueMatch[1]);
    if (isNaN(value)) return null;

    const unitRaw = valueMatch[2] || '';
    const unit = unitRaw.toLowerCase();

    // Determine type
    let type: IPMISensor['type'] = 'other';
    if (unit.includes('degrees') || unit.includes('c') || name.toLowerCase().includes('temp')) {
      type = 'temperature';
    } else if (unit.includes('volts') || unit.includes('v')) {
      type = 'voltage';
    } else if (unit.includes('rpm') || name.toLowerCase().includes('fan')) {
      type = 'fan';
    } else if (unit.includes('watts') || unit.includes('w')) {
      type = 'power';
    } else if (unit.includes('amps') || unit.includes('a')) {
      type = 'current';
    }

    // Determine status
    let status: IPMISensor['status'] = 'unknown';
    if (statusStr.includes('ok')) {
      status = 'ok';
    } else if (statusStr.includes('cr') || statusStr.includes('critical')) {
      status = 'critical';
    } else if (statusStr.includes('nc') || statusStr.includes('warning')) {
      status = 'warning';
    }

    return {
      name,
      value,
      unit: unitRaw,
      status,
      lowerCritical: null,
      lowerWarning: null,
      upperWarning: null,
      upperCritical: null,
      type
    };
  }

  private async getSystemInfo(): Promise<IPMISystemInfo | null> {
    try {
      const cmd = this.buildCommand('fru print 0');
      const { stdout } = await execAsync(cmd, { timeout: 10000 });
      
      const info: IPMISystemInfo = {
        manufacturer: '',
        productName: '',
        serialNumber: '',
        firmwareVersion: ''
      };

      const lines = stdout.split('\n');
      for (const line of lines) {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();
        
        if (key.includes('Product Manufacturer')) {
          info.manufacturer = value;
        } else if (key.includes('Product Name')) {
          info.productName = value;
        } else if (key.includes('Product Serial')) {
          info.serialNumber = value;
        } else if (key.includes('Product Version')) {
          info.firmwareVersion = value;
        }
      }

      return info.manufacturer || info.productName ? info : null;
    } catch {
      return null;
    }
  }

  async getTemperatures(): Promise<IPMISensor[]> {
    const data = await this.getAllData();
    return data.temperatures;
  }

  async getFans(): Promise<IPMISensor[]> {
    const data = await this.getAllData();
    return data.fans;
  }

  async getPowerConsumption(): Promise<number | null> {
    try {
      const cmd = this.buildCommand('dcmi power reading');
      const { stdout } = await execAsync(cmd, { timeout: 10000 });
      
      const match = stdout.match(/Instantaneous power reading:\s*([\d.]+)\s*Watts/i);
      if (match) {
        return parseFloat(match[1]);
      }
      return null;
    } catch {
      return null;
    }
  }

  async getChassisStatus(): Promise<{ powerOn: boolean; fault: boolean } | null> {
    try {
      const cmd = this.buildCommand('chassis status');
      const { stdout } = await execAsync(cmd, { timeout: 10000 });
      
      return {
        powerOn: stdout.toLowerCase().includes('power is on'),
        fault: stdout.toLowerCase().includes('fault')
      };
    } catch {
      return null;
    }
  }
}

export const ipmiMonitor = new IPMIMonitorService();
export default ipmiMonitor;
