import { exec } from 'child_process';
import { promisify } from 'util';
import * as si from 'systeminformation';
import { createChildLogger } from '../core/logger.js';

const execAsync = promisify(exec);
const logger = createChildLogger('advanced-monitors');

export interface VRMData {
  temperature: number | null;
  voltage: number | null;
  current: number | null;
  power: number | null;
  phases: number | null;
}

export interface ChipsetData {
  name: string;
  vendor: string;
  temperature: number | null;
  pchTemperature: number | null;
}

export interface PCIeBandwidth {
  slot: string;
  device: string;
  currentSpeed: string;
  maxSpeed: string;
  lanes: number;
  maxLanes: number;
  bandwidthGBps: number;
  utilizationPercent: number | null;
}

export interface PowerDelivery {
  inputVoltage: number | null;
  inputCurrent: number | null;
  totalPower: number | null;
  efficiency: number | null;
  rail12v: { voltage: number; current: number } | null;
  rail5v: { voltage: number; current: number } | null;
  rail3v3: { voltage: number; current: number } | null;
}

export interface CacheInfo {
  l1d: number;
  l1i: number;
  l2: number;
  l3: number;
  l1Latency: number | null;
  l2Latency: number | null;
  l3Latency: number | null;
}

export interface MemoryTimings {
  casLatency: number | null;
  tRCD: number | null;
  tRP: number | null;
  tRAS: number | null;
  commandRate: string | null;
  voltage: number | null;
}

export interface ThermalZone {
  name: string;
  type: string;
  temperature: number;
  criticalTemp: number | null;
  throttleTemp: number | null;
}

export interface AdvancedHardwareData {
  vrm: VRMData | null;
  chipset: ChipsetData | null;
  pcieBandwidth: PCIeBandwidth[];
  powerDelivery: PowerDelivery | null;
  cache: CacheInfo | null;
  memoryTimings: MemoryTimings | null;
  thermalZones: ThermalZone[];
  ambientTemperature: number | null;
  cpuPackagePower: number | null;
  cpuCoreVoltage: number | null;
  dramPower: number | null;
}

class AdvancedMonitorService {
  private platform: string;
  private lastData: AdvancedHardwareData | null = null;

  constructor() {
    this.platform = process.platform;
  }

  async getAdvancedData(): Promise<AdvancedHardwareData> {
    const [
      vrm,
      chipset,
      pcieBandwidth,
      powerDelivery,
      cache,
      memoryTimings,
      thermalZones,
      cpuPower
    ] = await Promise.all([
      this.getVRMData(),
      this.getChipsetData(),
      this.getPCIeBandwidth(),
      this.getPowerDelivery(),
      this.getCacheInfo(),
      this.getMemoryTimings(),
      this.getThermalZones(),
      this.getCPUPowerData()
    ]);

    this.lastData = {
      vrm,
      chipset,
      pcieBandwidth,
      powerDelivery,
      cache,
      memoryTimings,
      thermalZones,
      ambientTemperature: await this.getAmbientTemperature(),
      cpuPackagePower: cpuPower.packagePower,
      cpuCoreVoltage: cpuPower.coreVoltage,
      dramPower: cpuPower.dramPower
    };

    return this.lastData;
  }

  private async getVRMData(): Promise<VRMData | null> {
    try {
      if (this.platform === 'win32') {
        // Try to get VRM data from WMI (requires LibreHardwareMonitor or similar)
        const { stdout } = await execAsync(
          'powershell -Command "Get-WmiObject -Namespace root/LibreHardwareMonitor -Class Sensor | Where-Object { $_.SensorType -eq \'Temperature\' -and $_.Name -like \'*VRM*\' } | Select-Object -First 1 -ExpandProperty Value"',
          { timeout: 5000 }
        ).catch(() => ({ stdout: '' }));
        
        if (stdout.trim()) {
          return {
            temperature: parseFloat(stdout.trim()),
            voltage: null,
            current: null,
            power: null,
            phases: null
          };
        }
      } else if (this.platform === 'linux') {
        // Try lm-sensors for VRM temps
        const { stdout } = await execAsync('sensors -j 2>/dev/null').catch(() => ({ stdout: '{}' }));
        try {
          const data = JSON.parse(stdout);
          for (const chip of Object.values(data) as any[]) {
            for (const [key, value] of Object.entries(chip)) {
              if (key.toLowerCase().includes('vrm') && typeof value === 'object') {
                const temp = Object.values(value as object).find((v: any) => typeof v === 'number');
                if (temp) {
                  return { temperature: temp as number, voltage: null, current: null, power: null, phases: null };
                }
              }
            }
          }
        } catch {}
      }
      return null;
    } catch (err) {
      logger.debug('VRM data not available');
      return null;
    }
  }

  private async getChipsetData(): Promise<ChipsetData | null> {
    try {
      const baseboard = await si.baseboard();
      
      let temperature: number | null = null;
      let pchTemperature: number | null = null;

      if (this.platform === 'win32') {
        // Try LibreHardwareMonitor for chipset temp
        const { stdout } = await execAsync(
          'powershell -Command "Get-WmiObject -Namespace root/LibreHardwareMonitor -Class Sensor | Where-Object { $_.SensorType -eq \'Temperature\' -and ($_.Name -like \'*Chipset*\' -or $_.Name -like \'*PCH*\') } | Select-Object Name, Value"',
          { timeout: 5000 }
        ).catch(() => ({ stdout: '' }));
        
        const lines = stdout.trim().split('\n');
        for (const line of lines) {
          if (line.includes('PCH')) {
            const match = line.match(/(\d+\.?\d*)/);
            if (match) pchTemperature = parseFloat(match[1]);
          } else if (line.includes('Chipset')) {
            const match = line.match(/(\d+\.?\d*)/);
            if (match) temperature = parseFloat(match[1]);
          }
        }
      } else if (this.platform === 'linux') {
        const { stdout } = await execAsync('sensors 2>/dev/null | grep -i "pch\\|chipset"').catch(() => ({ stdout: '' }));
        const match = stdout.match(/\+(\d+\.?\d*)°C/);
        if (match) pchTemperature = parseFloat(match[1]);
      }

      return {
        name: baseboard.model || 'Unknown',
        vendor: baseboard.manufacturer || 'Unknown',
        temperature,
        pchTemperature
      };
    } catch (err) {
      logger.debug('Chipset data not available');
      return null;
    }
  }

  private async getPCIeBandwidth(): Promise<PCIeBandwidth[]> {
    const devices: PCIeBandwidth[] = [];

    try {
      if (this.platform === 'linux') {
        const { stdout } = await execAsync('lspci -vvv 2>/dev/null | grep -E "(^[0-9]|LnkSta:|LnkCap:)"').catch(() => ({ stdout: '' }));
        const lines = stdout.split('\n');
        let currentDevice = '';
        let currentSlot = '';
        let maxSpeed = '';
        let maxLanes = 0;

        for (const line of lines) {
          if (line.match(/^[0-9a-f]/i)) {
            currentSlot = line.split(' ')[0];
            currentDevice = line.split(':').slice(2).join(':').trim();
          } else if (line.includes('LnkCap:')) {
            const speedMatch = line.match(/Speed (\d+\.?\d*GT\/s)/);
            const lanesMatch = line.match(/Width x(\d+)/);
            if (speedMatch) maxSpeed = speedMatch[1];
            if (lanesMatch) maxLanes = parseInt(lanesMatch[1]);
          } else if (line.includes('LnkSta:')) {
            const speedMatch = line.match(/Speed (\d+\.?\d*GT\/s)/);
            const lanesMatch = line.match(/Width x(\d+)/);
            if (speedMatch && currentDevice) {
              const currentSpeed = speedMatch[1];
              const lanes = lanesMatch ? parseInt(lanesMatch[1]) : maxLanes;
              const bandwidth = this.calculatePCIeBandwidth(currentSpeed, lanes);
              
              devices.push({
                slot: currentSlot,
                device: currentDevice.substring(0, 50),
                currentSpeed,
                maxSpeed: maxSpeed || currentSpeed,
                lanes,
                maxLanes: maxLanes || lanes,
                bandwidthGBps: bandwidth,
                utilizationPercent: null
              });
            }
          }
        }
      } else if (this.platform === 'win32') {
        // Get GPU PCIe info via nvidia-smi if available
        const { stdout } = await execAsync('nvidia-smi --query-gpu=pcie.link.gen.current,pcie.link.gen.max,pcie.link.width.current,pcie.link.width.max --format=csv,noheader,nounits')
          .catch(() => ({ stdout: '' }));
        
        if (stdout.trim()) {
          const parts = stdout.trim().split(',').map(s => s.trim());
          if (parts.length >= 4) {
            const genToSpeed: { [key: string]: string } = { '1': '2.5GT/s', '2': '5GT/s', '3': '8GT/s', '4': '16GT/s', '5': '32GT/s' };
            devices.push({
              slot: 'GPU',
              device: 'NVIDIA GPU',
              currentSpeed: genToSpeed[parts[0]] || `Gen${parts[0]}`,
              maxSpeed: genToSpeed[parts[1]] || `Gen${parts[1]}`,
              lanes: parseInt(parts[2]),
              maxLanes: parseInt(parts[3]),
              bandwidthGBps: this.calculatePCIeBandwidth(genToSpeed[parts[0]] || '8GT/s', parseInt(parts[2])),
              utilizationPercent: null
            });
          }
        }
      }
    } catch (err) {
      logger.debug('PCIe bandwidth data not available');
    }

    return devices;
  }

  private calculatePCIeBandwidth(speed: string, lanes: number): number {
    const speedMap: { [key: string]: number } = {
      '2.5GT/s': 0.25,
      '5GT/s': 0.5,
      '8GT/s': 0.985,
      '16GT/s': 1.969,
      '32GT/s': 3.938
    };
    const perLane = speedMap[speed] || 0.985;
    return Math.round(perLane * lanes * 100) / 100;
  }

  private async getPowerDelivery(): Promise<PowerDelivery | null> {
    try {
      if (this.platform === 'win32') {
        const { stdout } = await execAsync(
          'powershell -Command "Get-WmiObject -Namespace root/LibreHardwareMonitor -Class Sensor | Where-Object { $_.SensorType -eq \'Voltage\' } | Select-Object Name, Value"',
          { timeout: 5000 }
        ).catch(() => ({ stdout: '' }));

        let rail12v: { voltage: number; current: number } | null = null;
        let rail5v: { voltage: number; current: number } | null = null;
        let rail3v3: { voltage: number; current: number } | null = null;

        const lines = stdout.split('\n');
        for (const line of lines) {
          if (line.includes('+12V') || line.includes('12V')) {
            const match = line.match(/(\d+\.?\d*)/);
            if (match) rail12v = { voltage: parseFloat(match[1]), current: 0 };
          } else if (line.includes('+5V') || line.includes('5V')) {
            const match = line.match(/(\d+\.?\d*)/);
            if (match) rail5v = { voltage: parseFloat(match[1]), current: 0 };
          } else if (line.includes('+3.3V') || line.includes('3.3V')) {
            const match = line.match(/(\d+\.?\d*)/);
            if (match) rail3v3 = { voltage: parseFloat(match[1]), current: 0 };
          }
        }

        if (rail12v || rail5v || rail3v3) {
          return {
            inputVoltage: null,
            inputCurrent: null,
            totalPower: null,
            efficiency: null,
            rail12v,
            rail5v,
            rail3v3
          };
        }
      } else if (this.platform === 'linux') {
        const { stdout } = await execAsync('sensors 2>/dev/null | grep -iE "(\\+12V|\\+5V|\\+3.3V)"').catch(() => ({ stdout: '' }));
        const lines = stdout.split('\n');
        
        let rail12v: { voltage: number; current: number } | null = null;
        let rail5v: { voltage: number; current: number } | null = null;
        let rail3v3: { voltage: number; current: number } | null = null;

        for (const line of lines) {
          const match = line.match(/\+?(\d+\.?\d*)\s*V/);
          if (match) {
            const voltage = parseFloat(match[1]);
            if (line.includes('12')) rail12v = { voltage, current: 0 };
            else if (line.includes('5V')) rail5v = { voltage, current: 0 };
            else if (line.includes('3.3')) rail3v3 = { voltage, current: 0 };
          }
        }

        if (rail12v || rail5v || rail3v3) {
          return { inputVoltage: null, inputCurrent: null, totalPower: null, efficiency: null, rail12v, rail5v, rail3v3 };
        }
      }
      return null;
    } catch (err) {
      logger.debug('Power delivery data not available');
      return null;
    }
  }

  private async getCacheInfo(): Promise<CacheInfo | null> {
    try {
      const cpu = await si.cpu();
      return {
        l1d: cpu.cache?.l1d || 0,
        l1i: cpu.cache?.l1i || 0,
        l2: cpu.cache?.l2 || 0,
        l3: cpu.cache?.l3 || 0,
        l1Latency: null,
        l2Latency: null,
        l3Latency: null
      };
    } catch {
      return null;
    }
  }

  private async getMemoryTimings(): Promise<MemoryTimings | null> {
    try {
      const memLayout = await si.memLayout();
      if (memLayout.length > 0) {
        const mem = memLayout[0];
        return {
          casLatency: null,
          tRCD: null,
          tRP: null,
          tRAS: null,
          commandRate: null,
          voltage: mem.voltageConfigured || null
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  private async getThermalZones(): Promise<ThermalZone[]> {
    const zones: ThermalZone[] = [];

    try {
      if (this.platform === 'linux') {
        const { stdout } = await execAsync('cat /sys/class/thermal/thermal_zone*/type /sys/class/thermal/thermal_zone*/temp 2>/dev/null || true')
          .catch(() => ({ stdout: '' }));
        
        const lines = stdout.trim().split('\n');
        const types: string[] = [];
        const temps: number[] = [];
        
        for (const line of lines) {
          if (line.match(/^\d+$/)) {
            temps.push(parseInt(line) / 1000);
          } else if (line.trim()) {
            types.push(line.trim());
          }
        }

        for (let i = 0; i < Math.min(types.length, temps.length); i++) {
          zones.push({
            name: `zone${i}`,
            type: types[i],
            temperature: temps[i],
            criticalTemp: null,
            throttleTemp: null
          });
        }
      } else if (this.platform === 'darwin') {
        // macOS thermal zones via powermetrics (requires sudo)
        const { stdout } = await execAsync('ioreg -r -c AppleSMC 2>/dev/null | grep -i temperature || true')
          .catch(() => ({ stdout: '' }));
        
        const matches = stdout.matchAll(/"([^"]+Temperature[^"]*)"[^=]*=\s*(\d+)/gi);
        for (const match of matches) {
          zones.push({
            name: match[1],
            type: 'smc',
            temperature: parseInt(match[2]),
            criticalTemp: null,
            throttleTemp: null
          });
        }
      }
    } catch (err) {
      logger.debug('Thermal zones not available');
    }

    return zones;
  }

  private async getCPUPowerData(): Promise<{ packagePower: number | null; coreVoltage: number | null; dramPower: number | null }> {
    try {
      if (this.platform === 'win32') {
        const { stdout } = await execAsync(
          'powershell -Command "Get-WmiObject -Namespace root/LibreHardwareMonitor -Class Sensor | Where-Object { $_.SensorType -eq \'Power\' -and $_.Name -like \'*Package*\' } | Select-Object -First 1 -ExpandProperty Value"',
          { timeout: 5000 }
        ).catch(() => ({ stdout: '' }));
        
        if (stdout.trim()) {
          return {
            packagePower: parseFloat(stdout.trim()),
            coreVoltage: null,
            dramPower: null
          };
        }
      } else if (this.platform === 'linux') {
        // Try RAPL for CPU power
        const { stdout } = await execAsync('cat /sys/class/powercap/intel-rapl/intel-rapl:0/energy_uj 2>/dev/null || echo ""')
          .catch(() => ({ stdout: '' }));
        // RAPL gives energy in microjoules, would need two readings to calculate power
      }
      return { packagePower: null, coreVoltage: null, dramPower: null };
    } catch {
      return { packagePower: null, coreVoltage: null, dramPower: null };
    }
  }

  private async getAmbientTemperature(): Promise<number | null> {
    try {
      if (this.platform === 'linux') {
        const { stdout } = await execAsync('sensors 2>/dev/null | grep -i "ambient\\|room\\|env"').catch(() => ({ stdout: '' }));
        const match = stdout.match(/\+(\d+\.?\d*)°C/);
        if (match) return parseFloat(match[1]);
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const advancedMonitors = new AdvancedMonitorService();
export default advancedMonitors;
