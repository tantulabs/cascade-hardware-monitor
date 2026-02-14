import { exec } from 'child_process';
import { promisify } from 'util';
import { createChildLogger } from '../core/logger.js';

const execAsync = promisify(exec);
const logger = createChildLogger('smart-monitor');

export interface SMARTAttribute {
  id: number;
  name: string;
  value: number;
  worst: number;
  threshold: number;
  rawValue: string;
  status: 'ok' | 'warning' | 'failing';
  type: 'pre-fail' | 'old-age';
}

export interface SMARTDisk {
  device: string;
  model: string;
  serial: string;
  firmware: string;
  capacity: string;
  type: 'hdd' | 'ssd' | 'nvme' | 'unknown';
  smartSupported: boolean;
  smartEnabled: boolean;
  healthStatus: 'PASSED' | 'FAILED' | 'UNKNOWN';
  temperature: number | null;
  powerOnHours: number | null;
  powerCycleCount: number | null;
  reallocatedSectors: number | null;
  pendingSectors: number | null;
  uncorrectableSectors: number | null;
  wearLevelingCount: number | null;
  writtenTB: number | null;
  attributes: SMARTAttribute[];
}

export interface SMARTData {
  available: boolean;
  disks: SMARTDisk[];
  healthySummary: {
    total: number;
    healthy: number;
    warning: number;
    failing: number;
  };
  timestamp: number;
}

class SMARTMonitorService {
  private available = false;
  private lastData: SMARTData | null = null;
  private smartctlPath = 'smartctl';

  async initialize(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('smartctl --version', { timeout: 5000 })
        .catch(() => ({ stdout: '' }));
      
      if (stdout.includes('smartctl')) {
        this.available = true;
        logger.info('smartmontools available');
        return true;
      }

      // Try common installation paths on Windows
      if (process.platform === 'win32') {
        const paths = [
          'C:\\Program Files\\smartmontools\\bin\\smartctl.exe',
          'C:\\Program Files (x86)\\smartmontools\\bin\\smartctl.exe'
        ];
        
        for (const path of paths) {
          try {
            const { stdout: testOut } = await execAsync(`"${path}" --version`, { timeout: 5000 });
            if (testOut.includes('smartctl')) {
              this.smartctlPath = `"${path}"`;
              this.available = true;
              logger.info('smartmontools found at:', path);
              return true;
            }
          } catch {}
        }
      }

      logger.info('smartmontools not installed');
      return false;
    } catch (err) {
      logger.debug('SMART initialization failed:', err);
      return false;
    }
  }

  isAvailable(): boolean {
    return this.available;
  }

  async getAllData(): Promise<SMARTData> {
    if (!this.available) {
      return {
        available: false,
        disks: [],
        healthySummary: { total: 0, healthy: 0, warning: 0, failing: 0 },
        timestamp: Date.now()
      };
    }

    try {
      const devices = await this.scanDevices();
      const disks: SMARTDisk[] = [];

      for (const device of devices) {
        const diskData = await this.getDiskData(device);
        if (diskData) {
          disks.push(diskData);
        }
      }

      const summary = {
        total: disks.length,
        healthy: disks.filter(d => d.healthStatus === 'PASSED').length,
        warning: disks.filter(d => d.attributes.some(a => a.status === 'warning')).length,
        failing: disks.filter(d => d.healthStatus === 'FAILED').length
      };

      this.lastData = {
        available: true,
        disks,
        healthySummary: summary,
        timestamp: Date.now()
      };

      return this.lastData;
    } catch (err) {
      logger.error('Failed to get SMART data:', err);
      return {
        available: false,
        disks: [],
        healthySummary: { total: 0, healthy: 0, warning: 0, failing: 0 },
        timestamp: Date.now()
      };
    }
  }

  private async scanDevices(): Promise<string[]> {
    try {
      const { stdout } = await execAsync(`${this.smartctlPath} --scan`, { timeout: 10000 });
      const devices: string[] = [];
      
      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        const match = line.match(/^(\/dev\/\S+|[A-Z]:|\\\\\.\\[A-Za-z]:)/);
        if (match) {
          devices.push(match[1]);
        }
      }

      // On Windows, also try physical drives
      if (process.platform === 'win32' && devices.length === 0) {
        for (let i = 0; i < 10; i++) {
          devices.push(`/dev/sd${String.fromCharCode(97 + i)}`);
        }
      }

      return devices;
    } catch {
      return [];
    }
  }

  private async getDiskData(device: string): Promise<SMARTDisk | null> {
    try {
      const { stdout } = await execAsync(
        `${this.smartctlPath} -a -j "${device}"`,
        { timeout: 30000 }
      ).catch(() => ({ stdout: '{}' }));

      const data = JSON.parse(stdout);
      if (!data.device) return null;

      const attributes = this.parseAttributes(data.ata_smart_attributes?.table || []);
      const nvmeAttrs = data.nvme_smart_health_information_log;

      let type: SMARTDisk['type'] = 'unknown';
      if (data.device?.type === 'nvme' || data.device?.protocol === 'NVMe') {
        type = 'nvme';
      } else if (data.rotation_rate === 0) {
        type = 'ssd';
      } else if (data.rotation_rate > 0) {
        type = 'hdd';
      }

      const disk: SMARTDisk = {
        device,
        model: data.model_name || data.model_family || 'Unknown',
        serial: data.serial_number || '',
        firmware: data.firmware_version || '',
        capacity: data.user_capacity?.bytes ? this.formatBytes(data.user_capacity.bytes) : '',
        type,
        smartSupported: data.smart_support?.available || false,
        smartEnabled: data.smart_support?.enabled || false,
        healthStatus: data.smart_status?.passed ? 'PASSED' : data.smart_status?.passed === false ? 'FAILED' : 'UNKNOWN',
        temperature: this.findAttribute(attributes, [194, 190])?.value || nvmeAttrs?.temperature || null,
        powerOnHours: this.findAttribute(attributes, [9])?.value || nvmeAttrs?.power_on_hours || null,
        powerCycleCount: this.findAttribute(attributes, [12])?.value || nvmeAttrs?.power_cycles || null,
        reallocatedSectors: this.findAttribute(attributes, [5])?.value || null,
        pendingSectors: this.findAttribute(attributes, [197])?.value || null,
        uncorrectableSectors: this.findAttribute(attributes, [198])?.value || null,
        wearLevelingCount: this.findAttribute(attributes, [177, 173, 231])?.value || nvmeAttrs?.percentage_used || null,
        writtenTB: nvmeAttrs?.data_units_written ? (nvmeAttrs.data_units_written * 512000) / 1e12 : null,
        attributes
      };

      return disk;
    } catch (err) {
      logger.debug(`Failed to get SMART data for ${device}:`, err);
      return null;
    }
  }

  private parseAttributes(table: any[]): SMARTAttribute[] {
    return table.map(attr => {
      let status: SMARTAttribute['status'] = 'ok';
      if (attr.value <= attr.thresh && attr.thresh > 0) {
        status = 'failing';
      } else if (attr.value <= attr.thresh + 10 && attr.thresh > 0) {
        status = 'warning';
      }

      return {
        id: attr.id,
        name: attr.name || `Attribute_${attr.id}`,
        value: attr.value,
        worst: attr.worst,
        threshold: attr.thresh,
        rawValue: String(attr.raw?.value || ''),
        status,
        type: attr.flags?.prefailure ? 'pre-fail' : 'old-age'
      };
    });
  }

  private findAttribute(attributes: SMARTAttribute[], ids: number[]): SMARTAttribute | null {
    for (const id of ids) {
      const attr = attributes.find(a => a.id === id);
      if (attr) return attr;
    }
    return null;
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
      bytes /= 1024;
      i++;
    }
    return `${bytes.toFixed(1)} ${units[i]}`;
  }

  async getDiskHealth(device: string): Promise<SMARTDisk | null> {
    return this.getDiskData(device);
  }

  async getFailingDisks(): Promise<SMARTDisk[]> {
    const data = await this.getAllData();
    return data.disks.filter(d => 
      d.healthStatus === 'FAILED' || 
      d.attributes.some(a => a.status === 'failing')
    );
  }

  async getWarningDisks(): Promise<SMARTDisk[]> {
    const data = await this.getAllData();
    return data.disks.filter(d => 
      d.attributes.some(a => a.status === 'warning') &&
      d.healthStatus !== 'FAILED'
    );
  }

  async getTemperatures(): Promise<{ device: string; model: string; temperature: number }[]> {
    const data = await this.getAllData();
    return data.disks
      .filter(d => d.temperature !== null)
      .map(d => ({
        device: d.device,
        model: d.model,
        temperature: d.temperature!
      }));
  }
}

export const smartMonitor = new SMARTMonitorService();
export default smartMonitor;
