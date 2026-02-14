import { exec } from 'child_process';
import { promisify } from 'util';
import { createChildLogger } from '../core/logger.js';

const execAsync = promisify(exec);
const logger = createChildLogger('libre-hardware-monitor');

export interface LHMSensor {
  id: string;
  name: string;
  type: 'temperature' | 'voltage' | 'fan' | 'power' | 'clock' | 'load' | 'data' | 'throughput' | 'level';
  value: number;
  min: number | null;
  max: number | null;
  unit: string;
  hardware: string;
  hardwareType: string;
}

export interface LHMHardware {
  id: string;
  name: string;
  type: string;
  sensors: LHMSensor[];
}

export interface LHMData {
  available: boolean;
  hardware: LHMHardware[];
  sensors: {
    temperatures: LHMSensor[];
    voltages: LHMSensor[];
    fans: LHMSensor[];
    powers: LHMSensor[];
    clocks: LHMSensor[];
    loads: LHMSensor[];
  };
  timestamp: number;
}

class LibreHardwareMonitorService {
  private available = false;
  private lastData: LHMData | null = null;
  private wmiNamespace = 'root/LibreHardwareMonitor';

  async initialize(): Promise<boolean> {
    if (process.platform !== 'win32') {
      logger.info('LibreHardwareMonitor only available on Windows');
      return false;
    }

    try {
      const { stdout } = await execAsync(
        `powershell -Command "Get-WmiObject -Namespace ${this.wmiNamespace} -Class Hardware -ErrorAction Stop | Select-Object -First 1"`,
        { timeout: 5000 }
      );
      
      if (stdout.trim()) {
        this.available = true;
        logger.info('LibreHardwareMonitor WMI interface available');
        return true;
      }
    } catch (err) {
      logger.info('LibreHardwareMonitor not running or WMI not available');
    }

    this.available = false;
    return false;
  }

  isAvailable(): boolean {
    return this.available;
  }

  async getAllData(): Promise<LHMData> {
    if (!this.available) {
      return {
        available: false,
        hardware: [],
        sensors: { temperatures: [], voltages: [], fans: [], powers: [], clocks: [], loads: [] },
        timestamp: Date.now()
      };
    }

    try {
      const [hardware, sensors] = await Promise.all([
        this.getHardware(),
        this.getAllSensors()
      ]);

      const categorized = {
        temperatures: sensors.filter(s => s.type === 'temperature'),
        voltages: sensors.filter(s => s.type === 'voltage'),
        fans: sensors.filter(s => s.type === 'fan'),
        powers: sensors.filter(s => s.type === 'power'),
        clocks: sensors.filter(s => s.type === 'clock'),
        loads: sensors.filter(s => s.type === 'load')
      };

      this.lastData = {
        available: true,
        hardware,
        sensors: categorized,
        timestamp: Date.now()
      };

      return this.lastData;
    } catch (err) {
      logger.error('Failed to get LHM data:', err);
      return {
        available: false,
        hardware: [],
        sensors: { temperatures: [], voltages: [], fans: [], powers: [], clocks: [], loads: [] },
        timestamp: Date.now()
      };
    }
  }

  private async getHardware(): Promise<LHMHardware[]> {
    try {
      const { stdout } = await execAsync(
        `powershell -Command "Get-WmiObject -Namespace ${this.wmiNamespace} -Class Hardware | Select-Object Identifier, Name, HardwareType | ConvertTo-Json"`,
        { timeout: 10000 }
      );

      const data = JSON.parse(stdout || '[]');
      const items = Array.isArray(data) ? data : [data];

      return items.filter(h => h).map(h => ({
        id: h.Identifier || '',
        name: h.Name || 'Unknown',
        type: h.HardwareType || 'Unknown',
        sensors: []
      }));
    } catch {
      return [];
    }
  }

  private async getAllSensors(): Promise<LHMSensor[]> {
    try {
      const { stdout } = await execAsync(
        `powershell -Command "Get-WmiObject -Namespace ${this.wmiNamespace} -Class Sensor | Select-Object Identifier, Name, SensorType, Value, Min, Max, Parent | ConvertTo-Json"`,
        { timeout: 15000 }
      );

      const data = JSON.parse(stdout || '[]');
      const items = Array.isArray(data) ? data : [data];

      return items.filter(s => s && s.Value !== null).map(s => {
        const type = this.mapSensorType(s.SensorType);
        return {
          id: s.Identifier || '',
          name: s.Name || 'Unknown',
          type,
          value: s.Value || 0,
          min: s.Min,
          max: s.Max,
          unit: this.getUnit(type),
          hardware: s.Parent || '',
          hardwareType: ''
        };
      });
    } catch {
      return [];
    }
  }

  private mapSensorType(type: string): LHMSensor['type'] {
    const typeMap: { [key: string]: LHMSensor['type'] } = {
      'Temperature': 'temperature',
      'Voltage': 'voltage',
      'Fan': 'fan',
      'Power': 'power',
      'Clock': 'clock',
      'Load': 'load',
      'Data': 'data',
      'Throughput': 'throughput',
      'Level': 'level'
    };
    return typeMap[type] || 'load';
  }

  private getUnit(type: LHMSensor['type']): string {
    const unitMap: { [key: string]: string } = {
      'temperature': '°C',
      'voltage': 'V',
      'fan': 'RPM',
      'power': 'W',
      'clock': 'MHz',
      'load': '%',
      'data': 'GB',
      'throughput': 'MB/s',
      'level': '%'
    };
    return unitMap[type] || '';
  }

  async getTemperatures(): Promise<LHMSensor[]> {
    const data = await this.getAllData();
    return data.sensors.temperatures;
  }

  async getVoltages(): Promise<LHMSensor[]> {
    const data = await this.getAllData();
    return data.sensors.voltages;
  }

  async getFans(): Promise<LHMSensor[]> {
    const data = await this.getAllData();
    return data.sensors.fans;
  }

  async getPowers(): Promise<LHMSensor[]> {
    const data = await this.getAllData();
    return data.sensors.powers;
  }

  async getSensorsByHardware(hardwareId: string): Promise<LHMSensor[]> {
    const data = await this.getAllData();
    const allSensors = [
      ...data.sensors.temperatures,
      ...data.sensors.voltages,
      ...data.sensors.fans,
      ...data.sensors.powers,
      ...data.sensors.clocks,
      ...data.sensors.loads
    ];
    return allSensors.filter(s => s.hardware.includes(hardwareId));
  }
}

export const libreHardwareMonitor = new LibreHardwareMonitorService();
export default libreHardwareMonitor;
