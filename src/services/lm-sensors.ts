import { exec } from 'child_process';
import { promisify } from 'util';
import { createChildLogger } from '../core/logger.js';

const execAsync = promisify(exec);
const logger = createChildLogger('lm-sensors');

export interface LMSensor {
  chip: string;
  adapter: string;
  name: string;
  type: 'temperature' | 'voltage' | 'fan' | 'power' | 'current' | 'humidity' | 'intrusion';
  value: number;
  min: number | null;
  max: number | null;
  critical: number | null;
  alarm: boolean;
  unit: string;
}

export interface LMChip {
  name: string;
  adapter: string;
  sensors: LMSensor[];
}

export interface LMSensorsData {
  available: boolean;
  chips: LMChip[];
  temperatures: LMSensor[];
  voltages: LMSensor[];
  fans: LMSensor[];
  powers: LMSensor[];
  timestamp: number;
}

class LMSensorsService {
  private available = false;
  private lastData: LMSensorsData | null = null;

  async initialize(): Promise<boolean> {
    if (process.platform !== 'linux') {
      logger.info('lm-sensors only available on Linux');
      return false;
    }

    try {
      const { stdout } = await execAsync('which sensors', { timeout: 5000 });
      if (stdout.trim()) {
        this.available = true;
        logger.info('lm-sensors available');
        return true;
      }
    } catch {
      logger.info('lm-sensors not installed');
    }

    this.available = false;
    return false;
  }

  isAvailable(): boolean {
    return this.available;
  }

  async getAllData(): Promise<LMSensorsData> {
    if (!this.available) {
      return {
        available: false,
        chips: [],
        temperatures: [],
        voltages: [],
        fans: [],
        powers: [],
        timestamp: Date.now()
      };
    }

    try {
      const { stdout } = await execAsync('sensors -j', { timeout: 10000 });
      const data = JSON.parse(stdout);
      
      const chips: LMChip[] = [];
      const allSensors: LMSensor[] = [];

      for (const [chipName, chipData] of Object.entries(data)) {
        const chip: LMChip = {
          name: chipName,
          adapter: (chipData as any).Adapter || 'Unknown',
          sensors: []
        };

        for (const [sensorName, sensorData] of Object.entries(chipData as object)) {
          if (sensorName === 'Adapter') continue;
          
          const sensor = this.parseSensor(chipName, chip.adapter, sensorName, sensorData);
          if (sensor) {
            chip.sensors.push(sensor);
            allSensors.push(sensor);
          }
        }

        if (chip.sensors.length > 0) {
          chips.push(chip);
        }
      }

      this.lastData = {
        available: true,
        chips,
        temperatures: allSensors.filter(s => s.type === 'temperature'),
        voltages: allSensors.filter(s => s.type === 'voltage'),
        fans: allSensors.filter(s => s.type === 'fan'),
        powers: allSensors.filter(s => s.type === 'power'),
        timestamp: Date.now()
      };

      return this.lastData;
    } catch (err) {
      logger.error('Failed to parse lm-sensors data:', err);
      return {
        available: false,
        chips: [],
        temperatures: [],
        voltages: [],
        fans: [],
        powers: [],
        timestamp: Date.now()
      };
    }
  }

  private parseSensor(chip: string, adapter: string, name: string, data: any): LMSensor | null {
    if (typeof data !== 'object') return null;

    const entries = Object.entries(data);
    if (entries.length === 0) return null;

    let value: number | null = null;
    let min: number | null = null;
    let max: number | null = null;
    let critical: number | null = null;
    let alarm = false;
    let type: LMSensor['type'] = 'temperature';
    let unit = '';

    for (const [key, val] of entries) {
      const numVal = typeof val === 'number' ? val : null;
      const keyLower = key.toLowerCase();

      if (keyLower.includes('_input')) {
        value = numVal;
        if (keyLower.startsWith('temp')) {
          type = 'temperature';
          unit = '°C';
        } else if (keyLower.startsWith('in') || keyLower.includes('volt')) {
          type = 'voltage';
          unit = 'V';
        } else if (keyLower.startsWith('fan')) {
          type = 'fan';
          unit = 'RPM';
        } else if (keyLower.startsWith('power')) {
          type = 'power';
          unit = 'W';
        } else if (keyLower.startsWith('curr')) {
          type = 'current';
          unit = 'A';
        }
      } else if (keyLower.includes('_min')) {
        min = numVal;
      } else if (keyLower.includes('_max')) {
        max = numVal;
      } else if (keyLower.includes('_crit')) {
        critical = numVal;
      } else if (keyLower.includes('_alarm') && val === 1) {
        alarm = true;
      }
    }

    if (value === null) return null;

    return {
      chip,
      adapter,
      name,
      type,
      value,
      min,
      max,
      critical,
      alarm,
      unit
    };
  }

  async getTemperatures(): Promise<LMSensor[]> {
    const data = await this.getAllData();
    return data.temperatures;
  }

  async getFans(): Promise<LMSensor[]> {
    const data = await this.getAllData();
    return data.fans;
  }

  async getVoltages(): Promise<LMSensor[]> {
    const data = await this.getAllData();
    return data.voltages;
  }

  async getCriticalAlerts(): Promise<LMSensor[]> {
    const data = await this.getAllData();
    const allSensors = [...data.temperatures, ...data.voltages, ...data.fans, ...data.powers];
    return allSensors.filter(s => s.alarm || (s.critical && s.value >= s.critical));
  }
}

export const lmSensors = new LMSensorsService();
export default lmSensors;
