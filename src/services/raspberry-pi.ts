import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import { createChildLogger } from '../core/logger.js';

const execAsync = promisify(exec);
const readFileAsync = promisify(fs.readFile);
const logger = createChildLogger('raspberry-pi');

export interface RaspberryPiInfo {
  isRaspberryPi: boolean;
  model: string;
  revision: string;
  serial: string;
  memorySize: number;
}

export interface RaspberryPiThermals {
  cpuTemperature: number;
  gpuTemperature: number;
}

export interface RaspberryPiVoltages {
  core: number;
  sdramC: number;
  sdramI: number;
  sdramP: number;
}

export interface RaspberryPiClocks {
  arm: number;
  core: number;
  h264: number;
  isp: number;
  v3d: number;
  uart: number;
  pwm: number;
  emmc: number;
  pixel: number;
  vec: number;
  hdmi: number;
  dpi: number;
}

export interface RaspberryPiThrottling {
  underVoltageDetected: boolean;
  armFrequencyCapped: boolean;
  currentlyThrottled: boolean;
  softTempLimitActive: boolean;
  underVoltageOccurred: boolean;
  armFrequencyCappedOccurred: boolean;
  throttlingOccurred: boolean;
  softTempLimitOccurred: boolean;
  rawValue: number;
}

export interface RaspberryPiMemory {
  armMemory: number;
  gpuMemory: number;
}

export interface RaspberryPiData {
  info: RaspberryPiInfo;
  thermals: RaspberryPiThermals;
  voltages: RaspberryPiVoltages;
  clocks: RaspberryPiClocks;
  throttling: RaspberryPiThrottling;
  memory: RaspberryPiMemory;
  timestamp: number;
}

class RaspberryPiService {
  private available = false;
  private piInfo: RaspberryPiInfo | null = null;

  async init(): Promise<boolean> {
    if (process.platform !== 'linux') {
      logger.info('Not running on Linux, Raspberry Pi service disabled');
      return false;
    }

    try {
      // Check if vcgencmd is available (Raspberry Pi specific)
      await execAsync('which vcgencmd');
      
      // Read Pi model info
      this.piInfo = await this.detectPiModel();
      
      if (this.piInfo.isRaspberryPi) {
        this.available = true;
        logger.info(`Raspberry Pi detected: ${this.piInfo.model}`);
        return true;
      }
    } catch {
      logger.info('vcgencmd not found, not a Raspberry Pi');
    }

    return false;
  }

  isAvailable(): boolean {
    return this.available;
  }

  getPiInfo(): RaspberryPiInfo | null {
    return this.piInfo;
  }

  private async detectPiModel(): Promise<RaspberryPiInfo> {
    const info: RaspberryPiInfo = {
      isRaspberryPi: false,
      model: 'Unknown',
      revision: '',
      serial: '',
      memorySize: 0
    };

    try {
      // Read /proc/cpuinfo for Pi-specific info
      const cpuinfo = await readFileAsync('/proc/cpuinfo', 'utf8');
      
      // Check for Raspberry Pi
      if (cpuinfo.includes('Raspberry Pi') || cpuinfo.includes('BCM')) {
        info.isRaspberryPi = true;
      }

      // Extract model
      const modelMatch = cpuinfo.match(/Model\s*:\s*(.+)/i);
      if (modelMatch) {
        info.model = modelMatch[1].trim();
        info.isRaspberryPi = true;
      }

      // Extract revision
      const revisionMatch = cpuinfo.match(/Revision\s*:\s*([a-f0-9]+)/i);
      if (revisionMatch) {
        info.revision = revisionMatch[1];
      }

      // Extract serial
      const serialMatch = cpuinfo.match(/Serial\s*:\s*([a-f0-9]+)/i);
      if (serialMatch) {
        info.serial = serialMatch[1];
      }

      // Get memory size
      const meminfo = await readFileAsync('/proc/meminfo', 'utf8');
      const memMatch = meminfo.match(/MemTotal:\s*(\d+)/);
      if (memMatch) {
        info.memorySize = Math.round(parseInt(memMatch[1]) / 1024); // Convert to MB
      }

    } catch (err) {
      logger.warn('Failed to detect Pi model:', err);
    }

    return info;
  }

  async getThermals(): Promise<RaspberryPiThermals> {
    const thermals: RaspberryPiThermals = {
      cpuTemperature: 0,
      gpuTemperature: 0
    };

    if (!this.available) return thermals;

    try {
      // CPU temperature from thermal zone
      try {
        const cpuTemp = await readFileAsync('/sys/class/thermal/thermal_zone0/temp', 'utf8');
        thermals.cpuTemperature = parseInt(cpuTemp) / 1000;
      } catch {
        // Fallback to vcgencmd
        const { stdout } = await execAsync('vcgencmd measure_temp');
        const match = stdout.match(/temp=([\d.]+)/);
        if (match) {
          thermals.cpuTemperature = parseFloat(match[1]);
        }
      }

      // GPU temperature (VideoCore)
      const { stdout: gpuTemp } = await execAsync('vcgencmd measure_temp');
      const gpuMatch = gpuTemp.match(/temp=([\d.]+)/);
      if (gpuMatch) {
        thermals.gpuTemperature = parseFloat(gpuMatch[1]);
      }

    } catch (err) {
      logger.warn('Failed to get Pi thermals:', err);
    }

    return thermals;
  }

  async getVoltages(): Promise<RaspberryPiVoltages> {
    const voltages: RaspberryPiVoltages = {
      core: 0,
      sdramC: 0,
      sdramI: 0,
      sdramP: 0
    };

    if (!this.available) return voltages;

    try {
      const voltageTypes = ['core', 'sdram_c', 'sdram_i', 'sdram_p'];
      
      for (const type of voltageTypes) {
        try {
          const { stdout } = await execAsync(`vcgencmd measure_volts ${type}`);
          const match = stdout.match(/volt=([\d.]+)V/);
          if (match) {
            const key = type.replace('sdram_', 'sdram').replace('_c', 'C').replace('_i', 'I').replace('_p', 'P') as keyof RaspberryPiVoltages;
            voltages[key] = parseFloat(match[1]);
          }
        } catch {}
      }
    } catch (err) {
      logger.warn('Failed to get Pi voltages:', err);
    }

    return voltages;
  }

  async getClocks(): Promise<RaspberryPiClocks> {
    const clocks: RaspberryPiClocks = {
      arm: 0,
      core: 0,
      h264: 0,
      isp: 0,
      v3d: 0,
      uart: 0,
      pwm: 0,
      emmc: 0,
      pixel: 0,
      vec: 0,
      hdmi: 0,
      dpi: 0
    };

    if (!this.available) return clocks;

    try {
      const clockTypes = Object.keys(clocks) as (keyof RaspberryPiClocks)[];
      
      for (const type of clockTypes) {
        try {
          const { stdout } = await execAsync(`vcgencmd measure_clock ${type}`);
          const match = stdout.match(/frequency\(\d+\)=(\d+)/);
          if (match) {
            clocks[type] = parseInt(match[1]) / 1000000; // Convert to MHz
          }
        } catch {}
      }
    } catch (err) {
      logger.warn('Failed to get Pi clocks:', err);
    }

    return clocks;
  }

  async getThrottling(): Promise<RaspberryPiThrottling> {
    const throttling: RaspberryPiThrottling = {
      underVoltageDetected: false,
      armFrequencyCapped: false,
      currentlyThrottled: false,
      softTempLimitActive: false,
      underVoltageOccurred: false,
      armFrequencyCappedOccurred: false,
      throttlingOccurred: false,
      softTempLimitOccurred: false,
      rawValue: 0
    };

    if (!this.available) return throttling;

    try {
      const { stdout } = await execAsync('vcgencmd get_throttled');
      const match = stdout.match(/throttled=0x([0-9a-f]+)/i);
      
      if (match) {
        const value = parseInt(match[1], 16);
        throttling.rawValue = value;
        
        // Bit flags (see https://www.raspberrypi.com/documentation/computers/os.html#get_throttled)
        throttling.underVoltageDetected = (value & 0x1) !== 0;
        throttling.armFrequencyCapped = (value & 0x2) !== 0;
        throttling.currentlyThrottled = (value & 0x4) !== 0;
        throttling.softTempLimitActive = (value & 0x8) !== 0;
        throttling.underVoltageOccurred = (value & 0x10000) !== 0;
        throttling.armFrequencyCappedOccurred = (value & 0x20000) !== 0;
        throttling.throttlingOccurred = (value & 0x40000) !== 0;
        throttling.softTempLimitOccurred = (value & 0x80000) !== 0;
      }
    } catch (err) {
      logger.warn('Failed to get Pi throttling status:', err);
    }

    return throttling;
  }

  async getMemorySplit(): Promise<RaspberryPiMemory> {
    const memory: RaspberryPiMemory = {
      armMemory: 0,
      gpuMemory: 0
    };

    if (!this.available) return memory;

    try {
      // Get ARM memory
      const { stdout: armMem } = await execAsync('vcgencmd get_mem arm');
      const armMatch = armMem.match(/arm=(\d+)M/);
      if (armMatch) {
        memory.armMemory = parseInt(armMatch[1]);
      }

      // Get GPU memory
      const { stdout: gpuMem } = await execAsync('vcgencmd get_mem gpu');
      const gpuMatch = gpuMem.match(/gpu=(\d+)M/);
      if (gpuMatch) {
        memory.gpuMemory = parseInt(gpuMatch[1]);
      }
    } catch (err) {
      logger.warn('Failed to get Pi memory split:', err);
    }

    return memory;
  }

  async getAllData(): Promise<RaspberryPiData | null> {
    if (!this.available || !this.piInfo) return null;

    const [thermals, voltages, clocks, throttling, memory] = await Promise.all([
      this.getThermals(),
      this.getVoltages(),
      this.getClocks(),
      this.getThrottling(),
      this.getMemorySplit()
    ]);

    return {
      info: this.piInfo,
      thermals,
      voltages,
      clocks,
      throttling,
      memory,
      timestamp: Date.now()
    };
  }

  async getHealthStatus(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
  }> {
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (!this.available) {
      return { status: 'healthy', issues: [] };
    }

    const [thermals, throttling] = await Promise.all([
      this.getThermals(),
      this.getThrottling()
    ]);

    // Check temperature
    if (thermals.cpuTemperature > 80) {
      issues.push(`Critical CPU temperature: ${thermals.cpuTemperature}°C`);
      status = 'critical';
    } else if (thermals.cpuTemperature > 70) {
      issues.push(`High CPU temperature: ${thermals.cpuTemperature}°C`);
      status = status === 'healthy' ? 'warning' : status;
    }

    // Check throttling
    if (throttling.underVoltageDetected) {
      issues.push('Under-voltage detected! Check power supply');
      status = 'critical';
    }
    if (throttling.currentlyThrottled) {
      issues.push('CPU is currently being throttled');
      status = status === 'healthy' ? 'warning' : status;
    }
    if (throttling.armFrequencyCapped) {
      issues.push('ARM frequency is capped');
      status = status === 'healthy' ? 'warning' : status;
    }
    if (throttling.softTempLimitActive) {
      issues.push('Soft temperature limit is active');
      status = status === 'healthy' ? 'warning' : status;
    }

    // Historical issues
    if (throttling.underVoltageOccurred) {
      issues.push('Under-voltage has occurred since boot');
    }
    if (throttling.throttlingOccurred) {
      issues.push('Throttling has occurred since boot');
    }

    return { status, issues };
  }
}

export const raspberryPiService = new RaspberryPiService();
export default raspberryPiService;
