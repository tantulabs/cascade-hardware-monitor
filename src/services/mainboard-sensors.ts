import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import { createChildLogger } from '../core/logger.js';

const execAsync = promisify(exec);
const logger = createChildLogger('mainboard-sensors');

export interface SuperIOChip {
  name: string;
  vendor: 'nuvoton' | 'ite' | 'fintek' | 'winbond' | 'smsc' | 'unknown';
  model: string;
  address: string;
  driver: string;
}

export interface VRMSensor {
  name: string;
  temperature: number | null;
  voltage: number | null;
  current: number | null;
  power: number | null;
  phases: number | null;
  mosfetTemp: number | null;
}

export interface ChipsetSensor {
  name: string;
  vendor: string;
  temperature: number | null;
  pchTemperature: number | null;
}

export interface VoltageSensor {
  name: string;
  value: number;
  nominal: number | null;
  min: number | null;
  max: number | null;
  status: 'ok' | 'warning' | 'critical';
}

export interface TemperatureSensor {
  name: string;
  value: number;
  max: number | null;
  critical: number | null;
  source: string;
  status: 'ok' | 'warning' | 'critical';
}

export interface FanSensor {
  name: string;
  rpm: number;
  minRpm: number | null;
  maxRpm: number | null;
  pwm: number | null;
  pwmEnabled: boolean;
}

export interface MainboardData {
  manufacturer: string;
  model: string;
  version: string;
  serialNumber: string;
  biosVendor: string;
  biosVersion: string;
  biosDate: string;
  chipset: ChipsetSensor | null;
  superIO: SuperIOChip | null;
  vrm: VRMSensor | null;
  voltages: VoltageSensor[];
  temperatures: TemperatureSensor[];
  fans: FanSensor[];
  intrusion: boolean | null;
  timestamp: number;
}

const VOLTAGE_NOMINALS: { [key: string]: number } = {
  'vcore': 1.2,
  'cpu vcore': 1.2,
  '+12v': 12.0,
  '12v': 12.0,
  '+5v': 5.0,
  '5v': 5.0,
  '+3.3v': 3.3,
  '3.3v': 3.3,
  'vbat': 3.0,
  'cmos battery': 3.0,
  'avcc': 3.3,
  '3vsb': 3.3,
  'vtt': 1.05,
  'vccio': 1.05,
  'vccsa': 1.05,
  'dram': 1.35,
  'dimm': 1.35,
  'vddcr_soc': 1.1,
  'vddcr_cpu': 1.2,
};

class MainboardSensorService {
  private platform: string;
  private lastData: MainboardData | null = null;

  constructor() {
    this.platform = process.platform;
  }

  async getAllData(): Promise<MainboardData> {
    const [
      boardInfo,
      superIO,
      chipset,
      vrm,
      voltages,
      temperatures,
      fans,
      intrusion
    ] = await Promise.all([
      this.getBoardInfo(),
      this.detectSuperIO(),
      this.getChipsetData(),
      this.getVRMData(),
      this.getVoltages(),
      this.getTemperatures(),
      this.getFans(),
      this.getIntrusionStatus()
    ]);

    this.lastData = {
      ...boardInfo,
      superIO,
      chipset,
      vrm,
      voltages,
      temperatures,
      fans,
      intrusion,
      timestamp: Date.now()
    };

    return this.lastData;
  }

  private async getBoardInfo(): Promise<{
    manufacturer: string;
    model: string;
    version: string;
    serialNumber: string;
    biosVendor: string;
    biosVersion: string;
    biosDate: string;
  }> {
    try {
      if (this.platform === 'linux') {
        const [manufacturer, model, version, serial, biosVendor, biosVersion, biosDate] = await Promise.all([
          this.readDMI('/sys/class/dmi/id/board_vendor'),
          this.readDMI('/sys/class/dmi/id/board_name'),
          this.readDMI('/sys/class/dmi/id/board_version'),
          this.readDMI('/sys/class/dmi/id/board_serial'),
          this.readDMI('/sys/class/dmi/id/bios_vendor'),
          this.readDMI('/sys/class/dmi/id/bios_version'),
          this.readDMI('/sys/class/dmi/id/bios_date')
        ]);

        return {
          manufacturer: manufacturer || 'Unknown',
          model: model || 'Unknown',
          version: version || '',
          serialNumber: serial || '',
          biosVendor: biosVendor || '',
          biosVersion: biosVersion || '',
          biosDate: biosDate || ''
        };
      } else if (this.platform === 'win32') {
        const { stdout } = await execAsync(
          'powershell -Command "Get-WmiObject Win32_BaseBoard | Select-Object Manufacturer, Product, Version, SerialNumber | ConvertTo-Json"',
          { timeout: 10000 }
        ).catch(() => ({ stdout: '{}' }));

        const { stdout: biosOut } = await execAsync(
          'powershell -Command "Get-WmiObject Win32_BIOS | Select-Object Manufacturer, SMBIOSBIOSVersion, ReleaseDate | ConvertTo-Json"',
          { timeout: 10000 }
        ).catch(() => ({ stdout: '{}' }));

        const board = JSON.parse(stdout || '{}');
        const bios = JSON.parse(biosOut || '{}');

        return {
          manufacturer: board.Manufacturer || 'Unknown',
          model: board.Product || 'Unknown',
          version: board.Version || '',
          serialNumber: board.SerialNumber || '',
          biosVendor: bios.Manufacturer || '',
          biosVersion: bios.SMBIOSBIOSVersion || '',
          biosDate: bios.ReleaseDate || ''
        };
      } else if (this.platform === 'darwin') {
        const { stdout } = await execAsync(
          'system_profiler SPHardwareDataType -json',
          { timeout: 10000 }
        ).catch(() => ({ stdout: '{}' }));

        try {
          const data = JSON.parse(stdout);
          const hw = data.SPHardwareDataType?.[0] || {};
          return {
            manufacturer: 'Apple',
            model: hw.machine_model || 'Mac',
            version: hw.model_number || '',
            serialNumber: hw.serial_number || '',
            biosVendor: 'Apple',
            biosVersion: hw.boot_rom_version || '',
            biosDate: ''
          };
        } catch {
          return this.emptyBoardInfo();
        }
      }
    } catch (err) {
      logger.debug('Failed to get board info:', err);
    }

    return this.emptyBoardInfo();
  }

  private emptyBoardInfo() {
    return {
      manufacturer: 'Unknown',
      model: 'Unknown',
      version: '',
      serialNumber: '',
      biosVendor: '',
      biosVersion: '',
      biosDate: ''
    };
  }

  private async readDMI(path: string): Promise<string> {
    try {
      const content = await fs.promises.readFile(path, 'utf8');
      return content.trim();
    } catch {
      return '';
    }
  }

  private async detectSuperIO(): Promise<SuperIOChip | null> {
    try {
      if (this.platform === 'linux') {
        const { stdout } = await execAsync('sensors -j 2>/dev/null', { timeout: 10000 })
          .catch(() => ({ stdout: '{}' }));

        const data = JSON.parse(stdout || '{}');
        
        for (const chipName of Object.keys(data)) {
          const chip = this.identifySuperIO(chipName);
          if (chip) return chip;
        }
      } else if (this.platform === 'win32') {
        // Check via LibreHardwareMonitor
        const { stdout } = await execAsync(
          'powershell -Command "Get-WmiObject -Namespace root/LibreHardwareMonitor -Class Hardware | Where-Object { $_.HardwareType -eq \'SuperIO\' } | Select-Object Name, Identifier | ConvertTo-Json"',
          { timeout: 10000 }
        ).catch(() => ({ stdout: '[]' }));

        const chips = JSON.parse(stdout || '[]');
        const chipData = Array.isArray(chips) ? chips[0] : chips;
        
        if (chipData?.Name) {
          return this.identifySuperIO(chipData.Name);
        }
      }
    } catch (err) {
      logger.debug('SuperIO detection failed:', err);
    }

    return null;
  }

  private identifySuperIO(name: string): SuperIOChip | null {
    const nameLower = name.toLowerCase();
    
    // Nuvoton chips
    if (nameLower.includes('nct') || nameLower.includes('nuvoton')) {
      const modelMatch = name.match(/NCT\d+[A-Z]?/i);
      return {
        name,
        vendor: 'nuvoton',
        model: modelMatch ? modelMatch[0].toUpperCase() : 'Unknown',
        address: '',
        driver: 'nct6775'
      };
    }

    // ITE chips
    if (nameLower.includes('it8') || nameLower.includes('ite')) {
      const modelMatch = name.match(/IT\d+[A-Z]?/i);
      return {
        name,
        vendor: 'ite',
        model: modelMatch ? modelMatch[0].toUpperCase() : 'Unknown',
        address: '',
        driver: 'it87'
      };
    }

    // Fintek chips
    if (nameLower.includes('f71') || nameLower.includes('fintek')) {
      const modelMatch = name.match(/F\d+[A-Z]+/i);
      return {
        name,
        vendor: 'fintek',
        model: modelMatch ? modelMatch[0].toUpperCase() : 'Unknown',
        address: '',
        driver: 'f71882fg'
      };
    }

    // Winbond chips
    if (nameLower.includes('w83') || nameLower.includes('winbond')) {
      const modelMatch = name.match(/W83\d+[A-Z]*/i);
      return {
        name,
        vendor: 'winbond',
        model: modelMatch ? modelMatch[0].toUpperCase() : 'Unknown',
        address: '',
        driver: 'w83627hf'
      };
    }

    // SMSC chips
    if (nameLower.includes('sch') || nameLower.includes('smsc')) {
      return {
        name,
        vendor: 'smsc',
        model: 'Unknown',
        address: '',
        driver: 'smsc47m1'
      };
    }

    return null;
  }

  private async getChipsetData(): Promise<ChipsetSensor | null> {
    try {
      if (this.platform === 'linux') {
        // Try to get PCH temperature
        const { stdout } = await execAsync('sensors 2>/dev/null | grep -i "pch\\|chipset"', { timeout: 5000 })
          .catch(() => ({ stdout: '' }));

        if (stdout) {
          const tempMatch = stdout.match(/\+?(\d+\.?\d*)°C/);
          if (tempMatch) {
            return {
              name: 'Chipset',
              vendor: 'Intel',
              temperature: null,
              pchTemperature: parseFloat(tempMatch[1])
            };
          }
        }
      } else if (this.platform === 'win32') {
        const { stdout } = await execAsync(
          'powershell -Command "Get-WmiObject -Namespace root/LibreHardwareMonitor -Class Sensor | Where-Object { $_.Name -like \'*PCH*\' -or $_.Name -like \'*Chipset*\' } | Select-Object Name, Value | ConvertTo-Json"',
          { timeout: 10000 }
        ).catch(() => ({ stdout: '[]' }));

        const sensors = JSON.parse(stdout || '[]');
        const sensorData = Array.isArray(sensors) ? sensors[0] : sensors;

        if (sensorData?.Value) {
          return {
            name: sensorData.Name || 'Chipset',
            vendor: 'Unknown',
            temperature: null,
            pchTemperature: sensorData.Value
          };
        }
      }
    } catch (err) {
      logger.debug('Chipset data failed:', err);
    }

    return null;
  }

  private async getVRMData(): Promise<VRMSensor | null> {
    try {
      if (this.platform === 'linux') {
        const { stdout } = await execAsync('sensors 2>/dev/null | grep -i "vrm\\|vr mos\\|mosfet"', { timeout: 5000 })
          .catch(() => ({ stdout: '' }));

        if (stdout) {
          const tempMatch = stdout.match(/\+?(\d+\.?\d*)°C/);
          if (tempMatch) {
            return {
              name: 'VRM',
              temperature: parseFloat(tempMatch[1]),
              voltage: null,
              current: null,
              power: null,
              phases: null,
              mosfetTemp: null
            };
          }
        }
      } else if (this.platform === 'win32') {
        const { stdout } = await execAsync(
          'powershell -Command "Get-WmiObject -Namespace root/LibreHardwareMonitor -Class Sensor | Where-Object { $_.Name -like \'*VRM*\' -or $_.Name -like \'*MOS*\' } | Select-Object Name, SensorType, Value | ConvertTo-Json"',
          { timeout: 10000 }
        ).catch(() => ({ stdout: '[]' }));

        const sensors = JSON.parse(stdout || '[]');
        const sensorList = Array.isArray(sensors) ? sensors : [sensors];

        let temp: number | null = null;
        let voltage: number | null = null;
        let power: number | null = null;

        for (const s of sensorList) {
          if (!s) continue;
          if (s.SensorType === 'Temperature') temp = s.Value;
          if (s.SensorType === 'Voltage') voltage = s.Value;
          if (s.SensorType === 'Power') power = s.Value;
        }

        if (temp !== null || voltage !== null || power !== null) {
          return {
            name: 'VRM',
            temperature: temp,
            voltage,
            current: null,
            power,
            phases: null,
            mosfetTemp: null
          };
        }
      }
    } catch (err) {
      logger.debug('VRM data failed:', err);
    }

    return null;
  }

  private async getVoltages(): Promise<VoltageSensor[]> {
    const voltages: VoltageSensor[] = [];

    try {
      if (this.platform === 'linux') {
        const { stdout } = await execAsync('sensors -j 2>/dev/null', { timeout: 10000 })
          .catch(() => ({ stdout: '{}' }));

        const data = JSON.parse(stdout || '{}');

        for (const [chipName, chipData] of Object.entries(data)) {
          for (const [sensorName, sensorData] of Object.entries(chipData as object)) {
            if (sensorName === 'Adapter') continue;
            
            for (const [key, value] of Object.entries(sensorData as object)) {
              if (key.includes('_input') && (key.startsWith('in') || sensorName.toLowerCase().includes('v'))) {
                const numValue = typeof value === 'number' ? value : parseFloat(String(value));
                if (!isNaN(numValue) && numValue > 0 && numValue < 20) {
                  const nominal = this.getNominalVoltage(sensorName);
                  voltages.push({
                    name: sensorName,
                    value: numValue,
                    nominal,
                    min: null,
                    max: null,
                    status: this.getVoltageStatus(numValue, nominal)
                  });
                }
              }
            }
          }
        }
      } else if (this.platform === 'win32') {
        const { stdout } = await execAsync(
          'powershell -Command "Get-WmiObject -Namespace root/LibreHardwareMonitor -Class Sensor | Where-Object { $_.SensorType -eq \'Voltage\' } | Select-Object Name, Value, Min, Max | ConvertTo-Json"',
          { timeout: 10000 }
        ).catch(() => ({ stdout: '[]' }));

        const sensors = JSON.parse(stdout || '[]');
        const sensorList = Array.isArray(sensors) ? sensors : [sensors];

        for (const s of sensorList) {
          if (!s || s.Value === null) continue;
          const nominal = this.getNominalVoltage(s.Name);
          voltages.push({
            name: s.Name,
            value: s.Value,
            nominal,
            min: s.Min,
            max: s.Max,
            status: this.getVoltageStatus(s.Value, nominal)
          });
        }
      }
    } catch (err) {
      logger.debug('Voltage reading failed:', err);
    }

    return voltages;
  }

  private getNominalVoltage(name: string): number | null {
    const nameLower = name.toLowerCase();
    for (const [key, value] of Object.entries(VOLTAGE_NOMINALS)) {
      if (nameLower.includes(key)) {
        return value;
      }
    }
    return null;
  }

  private getVoltageStatus(value: number, nominal: number | null): 'ok' | 'warning' | 'critical' {
    if (nominal === null) return 'ok';
    const deviation = Math.abs(value - nominal) / nominal;
    if (deviation > 0.1) return 'critical';
    if (deviation > 0.05) return 'warning';
    return 'ok';
  }

  private async getTemperatures(): Promise<TemperatureSensor[]> {
    const temps: TemperatureSensor[] = [];

    try {
      if (this.platform === 'linux') {
        const { stdout } = await execAsync('sensors -j 2>/dev/null', { timeout: 10000 })
          .catch(() => ({ stdout: '{}' }));

        const data = JSON.parse(stdout || '{}');

        for (const [chipName, chipData] of Object.entries(data)) {
          for (const [sensorName, sensorData] of Object.entries(chipData as object)) {
            if (sensorName === 'Adapter') continue;
            
            let tempValue: number | null = null;
            let maxValue: number | null = null;
            let critValue: number | null = null;

            for (const [key, value] of Object.entries(sensorData as object)) {
              const numValue = typeof value === 'number' ? value : parseFloat(String(value));
              if (key.includes('_input') && key.startsWith('temp')) {
                tempValue = numValue;
              } else if (key.includes('_max')) {
                maxValue = numValue;
              } else if (key.includes('_crit')) {
                critValue = numValue;
              }
            }

            if (tempValue !== null && tempValue > 0 && tempValue < 150) {
              temps.push({
                name: sensorName,
                value: tempValue,
                max: maxValue,
                critical: critValue,
                source: chipName,
                status: this.getTempStatus(tempValue, maxValue, critValue)
              });
            }
          }
        }
      } else if (this.platform === 'win32') {
        const { stdout } = await execAsync(
          'powershell -Command "Get-WmiObject -Namespace root/LibreHardwareMonitor -Class Sensor | Where-Object { $_.SensorType -eq \'Temperature\' } | Select-Object Name, Value, Max, Parent | ConvertTo-Json"',
          { timeout: 10000 }
        ).catch(() => ({ stdout: '[]' }));

        const sensors = JSON.parse(stdout || '[]');
        const sensorList = Array.isArray(sensors) ? sensors : [sensors];

        for (const s of sensorList) {
          if (!s || s.Value === null) continue;
          temps.push({
            name: s.Name,
            value: s.Value,
            max: s.Max,
            critical: null,
            source: s.Parent || 'Unknown',
            status: this.getTempStatus(s.Value, s.Max, null)
          });
        }
      }
    } catch (err) {
      logger.debug('Temperature reading failed:', err);
    }

    return temps;
  }

  private getTempStatus(value: number, max: number | null, critical: number | null): 'ok' | 'warning' | 'critical' {
    if (critical !== null && value >= critical) return 'critical';
    if (max !== null && value >= max * 0.95) return 'critical';
    if (max !== null && value >= max * 0.85) return 'warning';
    if (value >= 90) return 'critical';
    if (value >= 80) return 'warning';
    return 'ok';
  }

  private async getFans(): Promise<FanSensor[]> {
    const fans: FanSensor[] = [];

    try {
      if (this.platform === 'linux') {
        const { stdout } = await execAsync('sensors -j 2>/dev/null', { timeout: 10000 })
          .catch(() => ({ stdout: '{}' }));

        const data = JSON.parse(stdout || '{}');

        for (const [chipName, chipData] of Object.entries(data)) {
          for (const [sensorName, sensorData] of Object.entries(chipData as object)) {
            if (sensorName === 'Adapter') continue;
            
            for (const [key, value] of Object.entries(sensorData as object)) {
              if (key.includes('_input') && key.startsWith('fan')) {
                const rpm = typeof value === 'number' ? value : parseInt(String(value));
                if (!isNaN(rpm)) {
                  // Try to get PWM info
                  const fanNum = key.match(/fan(\d+)/)?.[1];
                  let pwm: number | null = null;
                  let pwmEnabled = false;

                  if (fanNum) {
                    try {
                      const pwmPath = `/sys/class/hwmon/*/pwm${fanNum}`;
                      const { stdout: pwmOut } = await execAsync(`cat ${pwmPath} 2>/dev/null || echo ""`);
                      if (pwmOut.trim()) {
                        pwm = Math.round((parseInt(pwmOut.trim()) / 255) * 100);
                        pwmEnabled = true;
                      }
                    } catch {}
                  }

                  fans.push({
                    name: sensorName,
                    rpm,
                    minRpm: null,
                    maxRpm: null,
                    pwm,
                    pwmEnabled
                  });
                }
              }
            }
          }
        }
      } else if (this.platform === 'win32') {
        const { stdout } = await execAsync(
          'powershell -Command "Get-WmiObject -Namespace root/LibreHardwareMonitor -Class Sensor | Where-Object { $_.SensorType -eq \'Fan\' } | Select-Object Name, Value, Min, Max | ConvertTo-Json"',
          { timeout: 10000 }
        ).catch(() => ({ stdout: '[]' }));

        const sensors = JSON.parse(stdout || '[]');
        const sensorList = Array.isArray(sensors) ? sensors : [sensors];

        for (const s of sensorList) {
          if (!s || s.Value === null) continue;
          fans.push({
            name: s.Name,
            rpm: Math.round(s.Value),
            minRpm: s.Min ? Math.round(s.Min) : null,
            maxRpm: s.Max ? Math.round(s.Max) : null,
            pwm: null,
            pwmEnabled: false
          });
        }
      }
    } catch (err) {
      logger.debug('Fan reading failed:', err);
    }

    return fans;
  }

  private async getIntrusionStatus(): Promise<boolean | null> {
    try {
      if (this.platform === 'linux') {
        const { stdout } = await execAsync('sensors 2>/dev/null | grep -i intrusion', { timeout: 5000 })
          .catch(() => ({ stdout: '' }));

        if (stdout.toLowerCase().includes('alarm')) {
          return true;
        } else if (stdout.toLowerCase().includes('ok')) {
          return false;
        }
      }
    } catch {}

    return null;
  }
}

export const mainboardSensors = new MainboardSensorService();
export default mainboardSensors;
