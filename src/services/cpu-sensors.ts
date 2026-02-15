import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as si from 'systeminformation';
import { createChildLogger } from '../core/logger.js';

const execAsync = promisify(exec);
const logger = createChildLogger('cpu-sensors');

export interface CPUCoreData {
  core: number;
  temperature: number | null;
  load: number;
  frequency: number;
  frequencyMax: number | null;
  voltage: number | null;
  power: number | null;
  throttling: boolean;
  cState: string | null;
}

export interface CPUPackageData {
  temperature: number | null;
  temperatureMax: number | null;
  temperatureTjMax: number | null;
  power: number | null;
  powerLimit: number | null;
  voltage: number | null;
  current: number | null;
}

export interface CPUCacheData {
  l1d: number;
  l1i: number;
  l2: number;
  l3: number;
  l1dPerCore: number;
  l2PerCore: number;
  l3Shared: boolean;
}

export interface CPUThrottlingData {
  thermalThrottling: boolean;
  powerThrottling: boolean;
  currentThrottling: boolean;
  throttleCount: number | null;
  throttleReason: string | null;
  performanceLimit: number | null;
}

export interface CPUPowerData {
  packagePower: number | null;
  coresPower: number | null;
  uncorePower: number | null;
  dramPower: number | null;
  tdp: number | null;
  pl1: number | null;
  pl2: number | null;
}

export interface CPUSensorData {
  manufacturer: string;
  brand: string;
  family: string;
  model: string;
  stepping: number;
  revision: string;
  socket: string;
  physicalCores: number;
  logicalCores: number;
  performanceCores: number | null;
  efficiencyCores: number | null;
  baseFrequency: number;
  maxFrequency: number;
  currentFrequency: number;
  averageLoad: number;
  package: CPUPackageData;
  cores: CPUCoreData[];
  cache: CPUCacheData;
  throttling: CPUThrottlingData;
  power: CPUPowerData;
  features: {
    hyperthreading: boolean;
    virtualization: boolean;
    aesni: boolean;
    avx: boolean;
    avx2: boolean;
    avx512: boolean;
  };
  timestamp: number;
}

class CPUSensorService {
  private platform: string;
  private lastData: CPUSensorData | null = null;
  private throttleHistory: number[] = [];

  constructor() {
    this.platform = process.platform;
  }

  async getAllData(): Promise<CPUSensorData> {
    const [
      cpuInfo,
      cpuTemp,
      cpuLoad,
      cpuSpeed,
      cores,
      packageData,
      powerData,
      throttlingData,
      cacheData
    ] = await Promise.all([
      si.cpu(),
      si.cpuTemperature(),
      si.currentLoad(),
      si.cpuCurrentSpeed(),
      this.getCoreData(),
      this.getPackageData(),
      this.getPowerData(),
      this.getThrottlingData(),
      this.getCacheData()
    ]);

    // Merge core data with load data
    const mergedCores = cores.map((core, i) => ({
      ...core,
      load: cpuLoad.cpus?.[i]?.load || 0,
      frequency: cpuSpeed.cores?.[i] || cpuSpeed.avg || 0
    }));

    this.lastData = {
      manufacturer: cpuInfo.manufacturer,
      brand: cpuInfo.brand,
      family: cpuInfo.family,
      model: cpuInfo.model,
      stepping: parseInt(String(cpuInfo.stepping)) || 0,
      revision: cpuInfo.revision,
      socket: cpuInfo.socket,
      physicalCores: cpuInfo.physicalCores,
      logicalCores: cpuInfo.cores,
      performanceCores: cpuInfo.performanceCores || null,
      efficiencyCores: cpuInfo.efficiencyCores || null,
      baseFrequency: cpuInfo.speed,
      maxFrequency: cpuInfo.speedMax || cpuInfo.speed,
      currentFrequency: cpuSpeed.avg,
      averageLoad: cpuLoad.currentLoad,
      package: {
        temperature: cpuTemp.main,
        temperatureMax: cpuTemp.max,
        temperatureTjMax: this.getTjMax(cpuInfo.brand),
        power: packageData.power ?? null,
        powerLimit: packageData.powerLimit ?? null,
        voltage: packageData.voltage ?? null,
        current: packageData.current ?? null
      },
      cores: mergedCores,
      cache: cacheData || {
        l1d: cpuInfo.cache?.l1d || 0,
        l1i: cpuInfo.cache?.l1i || 0,
        l2: cpuInfo.cache?.l2 || 0,
        l3: cpuInfo.cache?.l3 || 0,
        l1dPerCore: 0,
        l2PerCore: 0,
        l3Shared: true
      },
      throttling: throttlingData,
      power: powerData,
      features: {
        hyperthreading: cpuInfo.cores > cpuInfo.physicalCores,
        virtualization: cpuInfo.virtualization || false,
        aesni: false,
        avx: false,
        avx2: false,
        avx512: false
      },
      timestamp: Date.now()
    };

    // Detect CPU features
    await this.detectFeatures(this.lastData!);

    return this.lastData!;
  }

  private getTjMax(brand: string): number | null {
    const brandLower = brand.toLowerCase();
    
    // Intel TjMax values (2026 hardware support)
    if (brandLower.includes('intel')) {
      // Intel Core Ultra 200 Series (Arrow Lake, 2024-2026)
      if (brandLower.includes('core ultra') && brandLower.includes('200')) return 105;
      if (brandLower.includes('core ultra 9')) return 105;
      if (brandLower.includes('core ultra 7')) return 105;
      if (brandLower.includes('core ultra 5')) return 105;
      // Intel 15th Gen (Arrow Lake-S, 2025-2026)
      if (brandLower.includes('core') && brandLower.includes('15')) return 105;
      if (brandLower.includes('i9-15')) return 105;
      if (brandLower.includes('i7-15')) return 105;
      if (brandLower.includes('i5-15')) return 105;
      // Intel 14th Gen (Raptor Lake Refresh)
      if (brandLower.includes('core') && brandLower.includes('14')) return 100;
      if (brandLower.includes('i9-14')) return 100;
      if (brandLower.includes('i7-14')) return 100;
      if (brandLower.includes('i5-14')) return 100;
      // Intel 13th Gen (Raptor Lake)
      if (brandLower.includes('core') && brandLower.includes('13')) return 100;
      // Intel 12th Gen (Alder Lake)
      if (brandLower.includes('core') && brandLower.includes('12')) return 100;
      // Intel 11th Gen (Rocket Lake)
      if (brandLower.includes('core') && brandLower.includes('11')) return 100;
      // Intel 10th Gen (Comet Lake)
      if (brandLower.includes('core') && brandLower.includes('10')) return 100;
      // Intel Xeon (server)
      if (brandLower.includes('xeon w9')) return 100;
      if (brandLower.includes('xeon w7')) return 100;
      if (brandLower.includes('xeon w5')) return 100;
      if (brandLower.includes('xeon')) return 100;
      return 100;
    }
    
    // AMD TjMax values (2026 hardware support)
    if (brandLower.includes('amd')) {
      // AMD Ryzen 9000 Series (Granite Ridge, Zen 5, 2024-2026)
      if (brandLower.includes('ryzen 9 9')) return 95;
      if (brandLower.includes('ryzen 7 9')) return 95;
      if (brandLower.includes('ryzen 5 9')) return 95;
      if (brandLower.includes('9950x')) return 95;
      if (brandLower.includes('9900x')) return 95;
      if (brandLower.includes('9700x')) return 95;
      if (brandLower.includes('9600x')) return 95;
      // AMD Ryzen 8000 Series (Phoenix/Hawk Point, Zen 4)
      if (brandLower.includes('ryzen 9 8')) return 95;
      if (brandLower.includes('ryzen 7 8')) return 95;
      if (brandLower.includes('ryzen 5 8')) return 95;
      // AMD Ryzen 7000 Series (Raphael, Zen 4)
      if (brandLower.includes('ryzen 9 7')) return 95;
      if (brandLower.includes('ryzen 7 7')) return 95;
      if (brandLower.includes('ryzen 5 7')) return 95;
      // AMD Threadripper PRO 7000 (Storm Peak)
      if (brandLower.includes('threadripper pro 7')) return 95;
      if (brandLower.includes('threadripper')) return 95;
      // AMD EPYC (server)
      if (brandLower.includes('epyc 9')) return 96; // Genoa/Bergamo
      if (brandLower.includes('epyc')) return 96;
      // Generic Ryzen
      if (brandLower.includes('ryzen 9')) return 95;
      if (brandLower.includes('ryzen 7')) return 95;
      if (brandLower.includes('ryzen 5')) return 95;
      return 95;
    }

    // Apple Silicon (M-series)
    if (brandLower.includes('apple')) {
      if (brandLower.includes('m4')) return 105;
      if (brandLower.includes('m3')) return 105;
      if (brandLower.includes('m2')) return 105;
      if (brandLower.includes('m1')) return 105;
      return 105;
    }

    return null;
  }

  private async getCoreData(): Promise<CPUCoreData[]> {
    const cores: CPUCoreData[] = [];

    try {
      const cpuTemp = await si.cpuTemperature();
      const cpuInfo = await si.cpu();
      const coreCount = cpuInfo.physicalCores;

      for (let i = 0; i < coreCount; i++) {
        const coreTemp = cpuTemp.cores?.[i] ?? null;
        
        cores.push({
          core: i,
          temperature: coreTemp,
          load: 0,
          frequency: 0,
          frequencyMax: null,
          voltage: null,
          power: null,
          throttling: false,
          cState: null
        });
      }

      // Try to get per-core data from platform-specific sources
      if (this.platform === 'linux') {
        await this.enrichCoreDataLinux(cores);
      } else if (this.platform === 'win32') {
        await this.enrichCoreDataWindows(cores);
      }
    } catch (err) {
      logger.debug('Core data collection failed:', err);
    }

    return cores;
  }

  private async enrichCoreDataLinux(cores: CPUCoreData[]): Promise<void> {
    try {
      // Get per-core frequencies
      for (let i = 0; i < cores.length; i++) {
        try {
          const freqPath = `/sys/devices/system/cpu/cpu${i}/cpufreq/scaling_cur_freq`;
          const content = await fs.promises.readFile(freqPath, 'utf8');
          cores[i].frequency = parseInt(content.trim()) / 1000; // Convert to MHz

          const maxFreqPath = `/sys/devices/system/cpu/cpu${i}/cpufreq/scaling_max_freq`;
          const maxContent = await fs.promises.readFile(maxFreqPath, 'utf8');
          cores[i].frequencyMax = parseInt(maxContent.trim()) / 1000;
        } catch {}
      }

      // Check for throttling via thermal_throttle
      for (let i = 0; i < cores.length; i++) {
        try {
          const throttlePath = `/sys/devices/system/cpu/cpu${i}/thermal_throttle/core_throttle_count`;
          const content = await fs.promises.readFile(throttlePath, 'utf8');
          const count = parseInt(content.trim());
          cores[i].throttling = count > 0;
        } catch {}
      }
    } catch (err) {
      logger.debug('Linux core enrichment failed:', err);
    }
  }

  private async enrichCoreDataWindows(cores: CPUCoreData[]): Promise<void> {
    try {
      const { stdout } = await execAsync(
        'powershell -Command "Get-WmiObject -Namespace root/LibreHardwareMonitor -Class Sensor | Where-Object { $_.SensorType -eq \'Temperature\' -and $_.Name -like \'*Core*\' } | Select-Object Name, Value | ConvertTo-Json"',
        { timeout: 10000 }
      ).catch(() => ({ stdout: '[]' }));

      const sensors = JSON.parse(stdout || '[]');
      const sensorList = Array.isArray(sensors) ? sensors : [sensors];

      for (const s of sensorList) {
        if (!s) continue;
        const coreMatch = s.Name?.match(/Core\s*#?(\d+)/i);
        if (coreMatch) {
          const coreNum = parseInt(coreMatch[1]);
          if (cores[coreNum]) {
            cores[coreNum].temperature = s.Value;
          }
        }
      }

      // Get per-core voltages
      const { stdout: voltOut } = await execAsync(
        'powershell -Command "Get-WmiObject -Namespace root/LibreHardwareMonitor -Class Sensor | Where-Object { $_.SensorType -eq \'Voltage\' -and $_.Name -like \'*Core*\' } | Select-Object Name, Value | ConvertTo-Json"',
        { timeout: 10000 }
      ).catch(() => ({ stdout: '[]' }));

      const voltSensors = JSON.parse(voltOut || '[]');
      const voltList = Array.isArray(voltSensors) ? voltSensors : [voltSensors];

      for (const s of voltList) {
        if (!s) continue;
        const coreMatch = s.Name?.match(/Core\s*#?(\d+)/i);
        if (coreMatch) {
          const coreNum = parseInt(coreMatch[1]);
          if (cores[coreNum]) {
            cores[coreNum].voltage = s.Value;
          }
        }
      }
    } catch (err) {
      logger.debug('Windows core enrichment failed:', err);
    }
  }

  private async getPackageData(): Promise<Partial<CPUPackageData>> {
    const data: Partial<CPUPackageData> = {
      power: null,
      powerLimit: null,
      voltage: null,
      current: null
    };

    try {
      if (this.platform === 'win32') {
        const { stdout } = await execAsync(
          'powershell -Command "Get-WmiObject -Namespace root/LibreHardwareMonitor -Class Sensor | Where-Object { $_.Name -like \'*Package*\' -or $_.Name -like \'*CPU Total*\' } | Select-Object Name, SensorType, Value | ConvertTo-Json"',
          { timeout: 10000 }
        ).catch(() => ({ stdout: '[]' }));

        const sensors = JSON.parse(stdout || '[]');
        const sensorList = Array.isArray(sensors) ? sensors : [sensors];

        for (const s of sensorList) {
          if (!s) continue;
          if (s.SensorType === 'Power' && s.Name?.toLowerCase().includes('package')) {
            data.power = s.Value;
          }
          if (s.SensorType === 'Voltage' && s.Name?.toLowerCase().includes('cpu')) {
            data.voltage = s.Value;
          }
        }
      } else if (this.platform === 'linux') {
        // Try RAPL for power
        try {
          const energyPath = '/sys/class/powercap/intel-rapl/intel-rapl:0/energy_uj';
          const content = await fs.promises.readFile(energyPath, 'utf8');
          // Would need two readings to calculate power
        } catch {}
      }
    } catch (err) {
      logger.debug('Package data failed:', err);
    }

    return data;
  }

  private async getPowerData(): Promise<CPUPowerData> {
    const data: CPUPowerData = {
      packagePower: null,
      coresPower: null,
      uncorePower: null,
      dramPower: null,
      tdp: null,
      pl1: null,
      pl2: null
    };

    try {
      if (this.platform === 'win32') {
        const { stdout } = await execAsync(
          'powershell -Command "Get-WmiObject -Namespace root/LibreHardwareMonitor -Class Sensor | Where-Object { $_.SensorType -eq \'Power\' } | Select-Object Name, Value | ConvertTo-Json"',
          { timeout: 10000 }
        ).catch(() => ({ stdout: '[]' }));

        const sensors = JSON.parse(stdout || '[]');
        const sensorList = Array.isArray(sensors) ? sensors : [sensors];

        for (const s of sensorList) {
          if (!s) continue;
          const nameLower = s.Name?.toLowerCase() || '';
          if (nameLower.includes('package')) data.packagePower = s.Value;
          else if (nameLower.includes('cores')) data.coresPower = s.Value;
          else if (nameLower.includes('uncore') || nameLower.includes('gt')) data.uncorePower = s.Value;
          else if (nameLower.includes('dram') || nameLower.includes('memory')) data.dramPower = s.Value;
        }
      } else if (this.platform === 'linux') {
        // Read RAPL domains
        const domains = ['package-0', 'core', 'uncore', 'dram'];
        for (const domain of domains) {
          try {
            const path = `/sys/class/powercap/intel-rapl/intel-rapl:0/${domain === 'package-0' ? '' : `intel-rapl:0:${domains.indexOf(domain)}/`}constraint_0_power_limit_uw`;
            const content = await fs.promises.readFile(path, 'utf8');
            const watts = parseInt(content.trim()) / 1000000;
            if (domain === 'package-0') data.pl1 = watts;
          } catch {}
        }
      }
    } catch (err) {
      logger.debug('Power data failed:', err);
    }

    return data;
  }

  private async getThrottlingData(): Promise<CPUThrottlingData> {
    const data: CPUThrottlingData = {
      thermalThrottling: false,
      powerThrottling: false,
      currentThrottling: false,
      throttleCount: null,
      throttleReason: null,
      performanceLimit: null
    };

    try {
      if (this.platform === 'linux') {
        // Check package throttle count
        try {
          const throttlePath = '/sys/devices/system/cpu/cpu0/thermal_throttle/package_throttle_count';
          const content = await fs.promises.readFile(throttlePath, 'utf8');
          data.throttleCount = parseInt(content.trim());
          
          // Track throttle history
          this.throttleHistory.push(data.throttleCount);
          if (this.throttleHistory.length > 10) this.throttleHistory.shift();
          
          // Detect active throttling
          if (this.throttleHistory.length >= 2) {
            const recent = this.throttleHistory.slice(-2);
            data.currentThrottling = recent[1] > recent[0];
            data.thermalThrottling = data.currentThrottling;
          }
        } catch {}
      } else if (this.platform === 'win32') {
        // Check via performance counters or WMI
        const { stdout } = await execAsync(
          'powershell -Command "Get-WmiObject -Namespace root/LibreHardwareMonitor -Class Sensor | Where-Object { $_.Name -like \'*Throttl*\' -or $_.Name -like \'*Limit*\' } | Select-Object Name, Value | ConvertTo-Json"',
          { timeout: 10000 }
        ).catch(() => ({ stdout: '[]' }));

        const sensors = JSON.parse(stdout || '[]');
        const sensorList = Array.isArray(sensors) ? sensors : [sensors];

        for (const s of sensorList) {
          if (!s) continue;
          const nameLower = s.Name?.toLowerCase() || '';
          if (nameLower.includes('thermal') && nameLower.includes('throttl')) {
            data.thermalThrottling = s.Value > 0;
          }
          if (nameLower.includes('power') && nameLower.includes('limit')) {
            data.powerThrottling = s.Value > 0;
          }
        }

        data.currentThrottling = data.thermalThrottling || data.powerThrottling;
      }
    } catch (err) {
      logger.debug('Throttling data failed:', err);
    }

    return data;
  }

  private async getCacheData(): Promise<CPUCacheData | null> {
    try {
      const cpuInfo = await si.cpu();
      return {
        l1d: cpuInfo.cache?.l1d || 0,
        l1i: cpuInfo.cache?.l1i || 0,
        l2: cpuInfo.cache?.l2 || 0,
        l3: cpuInfo.cache?.l3 || 0,
        l1dPerCore: (cpuInfo.cache?.l1d || 0) / cpuInfo.physicalCores,
        l2PerCore: (cpuInfo.cache?.l2 || 0) / cpuInfo.physicalCores,
        l3Shared: true
      };
    } catch {
      return null;
    }
  }

  private async detectFeatures(data: CPUSensorData): Promise<void> {
    try {
      if (this.platform === 'linux') {
        const { stdout } = await execAsync('cat /proc/cpuinfo | grep flags | head -1', { timeout: 5000 })
          .catch(() => ({ stdout: '' }));

        const flags = stdout.toLowerCase();
        data.features.aesni = flags.includes('aes');
        data.features.avx = flags.includes(' avx ') || flags.includes(' avx,');
        data.features.avx2 = flags.includes('avx2');
        data.features.avx512 = flags.includes('avx512');
      } else if (this.platform === 'win32') {
        // Basic detection via brand string
        const brand = data.brand.toLowerCase();
        data.features.avx = brand.includes('core') || brand.includes('ryzen');
        data.features.avx2 = brand.includes('core') && !brand.includes('2nd') && !brand.includes('3rd');
      }
    } catch {}
  }

  async getPerCoreTemperatures(): Promise<{ core: number; temperature: number | null }[]> {
    const data = await this.getAllData();
    return data.cores.map(c => ({ core: c.core, temperature: c.temperature }));
  }

  async getPerCoreLoads(): Promise<{ core: number; load: number }[]> {
    const data = await this.getAllData();
    return data.cores.map(c => ({ core: c.core, load: c.load }));
  }

  async getPerCoreFrequencies(): Promise<{ core: number; frequency: number }[]> {
    const data = await this.getAllData();
    return data.cores.map(c => ({ core: c.core, frequency: c.frequency }));
  }

  async isThrottling(): Promise<boolean> {
    const data = await this.getAllData();
    return data.throttling.currentThrottling;
  }

  async getPowerConsumption(): Promise<CPUPowerData> {
    const data = await this.getAllData();
    return data.power;
  }
}

export const cpuSensors = new CPUSensorService();
export default cpuSensors;
