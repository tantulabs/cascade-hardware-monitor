import { createChildLogger } from '../core/logger.js';
import * as fs from 'fs';

const logger = createChildLogger('hwinfo-monitor');

export interface HWiNFOSensor {
  id: number;
  name: string;
  label: string;
  value: number;
  valueMin: number;
  valueMax: number;
  valueAvg: number;
  unit: string;
  sensorType: string;
}

export interface HWiNFOReading {
  id: number;
  sensorId: number;
  sensorName: string;
  readingName: string;
  value: number;
  valueMin: number;
  valueMax: number;
  valueAvg: number;
  unit: string;
  type: 'temperature' | 'voltage' | 'fan' | 'power' | 'clock' | 'usage' | 'other';
}

export interface HWiNFOData {
  available: boolean;
  version: string;
  sensors: HWiNFOSensor[];
  readings: HWiNFOReading[];
  temperatures: HWiNFOReading[];
  voltages: HWiNFOReading[];
  fans: HWiNFOReading[];
  powers: HWiNFOReading[];
  clocks: HWiNFOReading[];
  usages: HWiNFOReading[];
  timestamp: number;
}

const HWINFO_SHARED_MEM_NAME = 'Global\\HWiNFO_SENS_SM2';
const HWINFO_MUTEX_NAME = 'Global\\HWiNFO_SM2_MUTEX';

class HWiNFOMonitorService {
  private available = false;
  private lastData: HWiNFOData | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;

  async initialize(): Promise<boolean> {
    if (process.platform !== 'win32') {
      logger.info('HWiNFO only available on Windows');
      return false;
    }

    try {
      // Check if HWiNFO shared memory is available via registry or process
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // Check if HWiNFO is running
      const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq HWiNFO64.exe" /NH', { timeout: 5000 })
        .catch(() => ({ stdout: '' }));
      
      if (stdout.includes('HWiNFO64.exe')) {
        // HWiNFO is running, check for shared memory support
        const { stdout: regCheck } = await execAsync(
          'reg query "HKCU\\Software\\HWiNFO64\\Sensors" /v EnableSharedMemory 2>nul',
          { timeout: 5000 }
        ).catch(() => ({ stdout: '' }));

        if (regCheck.includes('0x1')) {
          this.available = true;
          logger.info('HWiNFO shared memory available');
          return true;
        } else {
          logger.info('HWiNFO running but shared memory not enabled. Enable in Settings > Shared Memory');
        }
      } else {
        // Check for HWiNFO32
        const { stdout: stdout32 } = await execAsync('tasklist /FI "IMAGENAME eq HWiNFO32.exe" /NH', { timeout: 5000 })
          .catch(() => ({ stdout: '' }));
        
        if (stdout32.includes('HWiNFO32.exe')) {
          this.available = true;
          logger.info('HWiNFO32 detected');
          return true;
        }
      }

      logger.info('HWiNFO not running');
      return false;
    } catch (err) {
      logger.debug('HWiNFO initialization failed:', err);
      return false;
    }
  }

  isAvailable(): boolean {
    return this.available;
  }

  async getAllData(): Promise<HWiNFOData> {
    if (!this.available) {
      return this.emptyData();
    }

    try {
      // Since direct shared memory access requires native bindings,
      // we'll use the HWiNFO CSV export or registry values as fallback
      const readings = await this.getReadingsFromRegistry();
      
      if (readings.length === 0) {
        return this.emptyData();
      }

      const categorized = this.categorizeReadings(readings);

      this.lastData = {
        available: true,
        version: '',
        sensors: [],
        readings,
        ...categorized,
        timestamp: Date.now()
      };

      return this.lastData;
    } catch (err) {
      logger.error('Failed to get HWiNFO data:', err);
      return this.emptyData();
    }
  }

  private emptyData(): HWiNFOData {
    return {
      available: false,
      version: '',
      sensors: [],
      readings: [],
      temperatures: [],
      voltages: [],
      fans: [],
      powers: [],
      clocks: [],
      usages: [],
      timestamp: Date.now()
    };
  }

  private async getReadingsFromRegistry(): Promise<HWiNFOReading[]> {
    const readings: HWiNFOReading[] = [];

    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // Query HWiNFO registry for sensor values
      const { stdout } = await execAsync(
        'reg query "HKCU\\Software\\HWiNFO64\\Sensors\\Custom" /s 2>nul',
        { timeout: 10000 }
      ).catch(() => ({ stdout: '' }));

      if (!stdout) return readings;

      // Parse registry output
      const lines = stdout.split('\n');
      let currentSensor = '';
      let currentReading: Partial<HWiNFOReading> = {};

      for (const line of lines) {
        if (line.includes('HKEY_')) {
          // New sensor section
          const match = line.match(/Sensor(\d+)/);
          if (match) {
            currentSensor = `Sensor${match[1]}`;
          }
        } else if (line.includes('REG_SZ') || line.includes('REG_DWORD')) {
          const parts = line.trim().split(/\s{2,}/);
          if (parts.length >= 3) {
            const key = parts[0];
            const value = parts[2];

            if (key === 'Name') {
              currentReading.readingName = value;
            } else if (key === 'Value') {
              currentReading.value = parseFloat(value) || 0;
            } else if (key === 'Unit') {
              currentReading.unit = value;
              currentReading.type = this.detectType(value, currentReading.readingName || '');
            }
          }
        }

        // If we have a complete reading, add it
        if (currentReading.readingName && currentReading.value !== undefined) {
          readings.push({
            id: readings.length,
            sensorId: parseInt(currentSensor.replace('Sensor', '')) || 0,
            sensorName: currentSensor,
            readingName: currentReading.readingName,
            value: currentReading.value,
            valueMin: currentReading.value,
            valueMax: currentReading.value,
            valueAvg: currentReading.value,
            unit: currentReading.unit || '',
            type: currentReading.type || 'other'
          });
          currentReading = {};
        }
      }
    } catch (err) {
      logger.debug('Failed to read HWiNFO registry:', err);
    }

    return readings;
  }

  private detectType(unit: string, name: string): HWiNFOReading['type'] {
    const unitLower = unit.toLowerCase();
    const nameLower = name.toLowerCase();

    if (unitLower.includes('°c') || unitLower.includes('c') || nameLower.includes('temp')) {
      return 'temperature';
    } else if (unitLower.includes('v') || nameLower.includes('volt')) {
      return 'voltage';
    } else if (unitLower.includes('rpm') || nameLower.includes('fan')) {
      return 'fan';
    } else if (unitLower.includes('w') || nameLower.includes('power')) {
      return 'power';
    } else if (unitLower.includes('mhz') || unitLower.includes('ghz') || nameLower.includes('clock')) {
      return 'clock';
    } else if (unitLower.includes('%') || nameLower.includes('usage') || nameLower.includes('load')) {
      return 'usage';
    }
    return 'other';
  }

  private categorizeReadings(readings: HWiNFOReading[]): {
    temperatures: HWiNFOReading[];
    voltages: HWiNFOReading[];
    fans: HWiNFOReading[];
    powers: HWiNFOReading[];
    clocks: HWiNFOReading[];
    usages: HWiNFOReading[];
  } {
    return {
      temperatures: readings.filter(r => r.type === 'temperature'),
      voltages: readings.filter(r => r.type === 'voltage'),
      fans: readings.filter(r => r.type === 'fan'),
      powers: readings.filter(r => r.type === 'power'),
      clocks: readings.filter(r => r.type === 'clock'),
      usages: readings.filter(r => r.type === 'usage')
    };
  }

  async getTemperatures(): Promise<HWiNFOReading[]> {
    const data = await this.getAllData();
    return data.temperatures;
  }

  async getFans(): Promise<HWiNFOReading[]> {
    const data = await this.getAllData();
    return data.fans;
  }

  async getVoltages(): Promise<HWiNFOReading[]> {
    const data = await this.getAllData();
    return data.voltages;
  }

  async getPowers(): Promise<HWiNFOReading[]> {
    const data = await this.getAllData();
    return data.powers;
  }
}

export const hwinfoMonitor = new HWiNFOMonitorService();
export default hwinfoMonitor;
