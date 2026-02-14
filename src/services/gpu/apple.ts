import { exec } from 'child_process';
import { promisify } from 'util';
import { createChildLogger } from '../../core/logger.js';

const execAsync = promisify(exec);
const logger = createChildLogger('apple-gpu');

export interface AppleGPUData {
  index: number;
  name: string;
  vendor: string;
  chipType: string;
  metalSupport: boolean;
  metalVersion: string;
  vram: number;
  vramDynamic: boolean;
  displayCount: number;
  temperature: number;
  utilizationGpu: number;
  utilizationMemory: number;
  powerDraw: number;
  frequency: number;
  isIntegrated: boolean;
  isAppleSilicon: boolean;
}

export interface AppleSiliconMetrics {
  cpuPower: number;
  gpuPower: number;
  anePower: number;
  dramPower: number;
  packagePower: number;
  cpuEfficiencyCores: number;
  cpuPerformanceCores: number;
  gpuCores: number;
  neuralEngineCores: number;
  thermalPressure: string;
}

class AppleGPUService {
  private available: boolean = false;
  private isAppleSilicon: boolean = false;
  private gpuCount: number = 0;

  async initialize(): Promise<void> {
    if (process.platform !== 'darwin') {
      logger.info('Not running on macOS, Apple GPU service disabled');
      return;
    }

    try {
      // Check if running on Apple Silicon
      const { stdout: archOutput } = await execAsync('uname -m');
      this.isAppleSilicon = archOutput.trim() === 'arm64';

      // Get GPU info using system_profiler
      const { stdout } = await execAsync('system_profiler SPDisplaysDataType -json');
      const data = JSON.parse(stdout);
      
      if (data.SPDisplaysDataType && data.SPDisplaysDataType.length > 0) {
        this.gpuCount = data.SPDisplaysDataType.length;
        this.available = true;
        logger.info(`Apple GPU service initialized. Found ${this.gpuCount} GPU(s). Apple Silicon: ${this.isAppleSilicon}`);
      }
    } catch (err) {
      logger.warn('Failed to initialize Apple GPU service:', err);
      this.available = false;
    }
  }

  isAvailable(): boolean {
    return this.available;
  }

  isAppleSiliconMac(): boolean {
    return this.isAppleSilicon;
  }

  async getAllGPUData(): Promise<AppleGPUData[]> {
    if (!this.available) return [];

    try {
      const { stdout } = await execAsync('system_profiler SPDisplaysDataType -json');
      const data = JSON.parse(stdout);
      const gpus: AppleGPUData[] = [];

      if (data.SPDisplaysDataType) {
        for (let i = 0; i < data.SPDisplaysDataType.length; i++) {
          const gpu = data.SPDisplaysDataType[i];
          
          // Parse VRAM - handle "X GB" or "X MB" format
          let vram = 0;
          if (gpu.sppci_vram) {
            const match = gpu.sppci_vram.match(/(\d+)\s*(GB|MB)/i);
            if (match) {
              vram = parseInt(match[1]) * (match[2].toUpperCase() === 'GB' ? 1024 : 1);
            }
          }

          // Get Metal support info
          const metalSupport = gpu.spdisplays_mtlgpufamilysupport !== undefined;
          const metalVersion = gpu.spdisplays_mtlgpufamilysupport || 'Not supported';

          gpus.push({
            index: i,
            name: gpu.sppci_model || gpu._name || 'Apple GPU',
            vendor: 'apple',
            chipType: gpu.sppci_device_type || (this.isAppleSilicon ? 'Apple Silicon' : 'Intel'),
            metalSupport,
            metalVersion,
            vram,
            vramDynamic: this.isAppleSilicon, // Apple Silicon uses unified memory
            displayCount: gpu.spdisplays_ndrvs ? gpu.spdisplays_ndrvs.length : 0,
            temperature: await this.getGPUTemperature(i),
            utilizationGpu: await this.getGPUUtilization(),
            utilizationMemory: 0,
            powerDraw: await this.getGPUPower(),
            frequency: 0,
            isIntegrated: gpu.sppci_bus === 'spdisplays_builtin' || this.isAppleSilicon,
            isAppleSilicon: this.isAppleSilicon
          });
        }
      }

      return gpus;
    } catch (err) {
      logger.error('Failed to get Apple GPU data:', err);
      return [];
    }
  }

  async getGPUTemperature(index: number): Promise<number> {
    try {
      // Try using powermetrics (requires sudo on some systems)
      // Fall back to ioreg for thermal data
      const { stdout } = await execAsync(
        'ioreg -r -c AppleSMC -d 1 | grep -i "GPU" | head -1'
      );
      
      // Parse temperature if available
      const match = stdout.match(/(\d+)/);
      if (match) {
        return parseInt(match[1]);
      }
    } catch {
      // Temperature monitoring may require elevated privileges
    }
    return 0;
  }

  async getGPUUtilization(): Promise<number> {
    if (!this.isAppleSilicon) return 0;

    try {
      // For Apple Silicon, we can try to get GPU utilization from powermetrics
      // This requires sudo, so we'll return 0 if not available
      const { stdout } = await execAsync(
        'ps -A -o %cpu | awk \'{s+=$1} END {print s}\''
      );
      // This is a rough approximation
      return Math.min(100, parseFloat(stdout.trim()) / 4);
    } catch {
      return 0;
    }
  }

  async getGPUPower(): Promise<number> {
    if (!this.isAppleSilicon) return 0;

    try {
      // powermetrics requires sudo, so this may not work without privileges
      return 0;
    } catch {
      return 0;
    }
  }

  async getAppleSiliconMetrics(): Promise<AppleSiliconMetrics | null> {
    if (!this.isAppleSilicon) return null;

    try {
      // Get chip info
      const { stdout: chipInfo } = await execAsync('sysctl -n machdep.cpu.brand_string');
      
      // Parse core counts from chip name (e.g., "Apple M1 Pro" -> look up specs)
      const chipName = chipInfo.trim();
      const coreInfo = this.getAppleSiliconCoreInfo(chipName);

      // Get thermal pressure
      const { stdout: thermalOutput } = await execAsync(
        'pmset -g therm 2>/dev/null | grep -i "thermal" || echo "nominal"'
      );
      const thermalPressure = thermalOutput.toLowerCase().includes('heavy') ? 'heavy' :
                              thermalOutput.toLowerCase().includes('moderate') ? 'moderate' :
                              thermalOutput.toLowerCase().includes('light') ? 'light' : 'nominal';

      return {
        cpuPower: 0,
        gpuPower: 0,
        anePower: 0,
        dramPower: 0,
        packagePower: 0,
        cpuEfficiencyCores: coreInfo.efficiencyCores,
        cpuPerformanceCores: coreInfo.performanceCores,
        gpuCores: coreInfo.gpuCores,
        neuralEngineCores: coreInfo.neuralEngineCores,
        thermalPressure
      };
    } catch (err) {
      logger.error('Failed to get Apple Silicon metrics:', err);
      return null;
    }
  }

  private getAppleSiliconCoreInfo(chipName: string): {
    efficiencyCores: number;
    performanceCores: number;
    gpuCores: number;
    neuralEngineCores: number;
  } {
    // Apple Silicon chip specifications
    const chips: Record<string, any> = {
      'M1': { efficiencyCores: 4, performanceCores: 4, gpuCores: 8, neuralEngineCores: 16 },
      'M1 Pro': { efficiencyCores: 2, performanceCores: 8, gpuCores: 16, neuralEngineCores: 16 },
      'M1 Max': { efficiencyCores: 2, performanceCores: 8, gpuCores: 32, neuralEngineCores: 16 },
      'M1 Ultra': { efficiencyCores: 4, performanceCores: 16, gpuCores: 64, neuralEngineCores: 32 },
      'M2': { efficiencyCores: 4, performanceCores: 4, gpuCores: 10, neuralEngineCores: 16 },
      'M2 Pro': { efficiencyCores: 4, performanceCores: 8, gpuCores: 19, neuralEngineCores: 16 },
      'M2 Max': { efficiencyCores: 4, performanceCores: 8, gpuCores: 38, neuralEngineCores: 16 },
      'M2 Ultra': { efficiencyCores: 8, performanceCores: 16, gpuCores: 76, neuralEngineCores: 32 },
      'M3': { efficiencyCores: 4, performanceCores: 4, gpuCores: 10, neuralEngineCores: 16 },
      'M3 Pro': { efficiencyCores: 6, performanceCores: 6, gpuCores: 18, neuralEngineCores: 16 },
      'M3 Max': { efficiencyCores: 4, performanceCores: 12, gpuCores: 40, neuralEngineCores: 16 },
      'M4': { efficiencyCores: 4, performanceCores: 6, gpuCores: 10, neuralEngineCores: 16 },
      'M4 Pro': { efficiencyCores: 4, performanceCores: 10, gpuCores: 20, neuralEngineCores: 16 },
      'M4 Max': { efficiencyCores: 4, performanceCores: 12, gpuCores: 40, neuralEngineCores: 16 },
    };

    for (const [chip, info] of Object.entries(chips)) {
      if (chipName.includes(chip)) {
        return info;
      }
    }

    // Default for unknown chips
    return { efficiencyCores: 4, performanceCores: 4, gpuCores: 8, neuralEngineCores: 16 };
  }

  async getDisplayInfo(): Promise<any[]> {
    try {
      const { stdout } = await execAsync('system_profiler SPDisplaysDataType -json');
      const data = JSON.parse(stdout);
      const displays: any[] = [];

      if (data.SPDisplaysDataType) {
        for (const gpu of data.SPDisplaysDataType) {
          if (gpu.spdisplays_ndrvs) {
            for (const display of gpu.spdisplays_ndrvs) {
              displays.push({
                name: display._name,
                resolution: display._spdisplays_resolution,
                pixelDepth: display.spdisplays_depth,
                mainDisplay: display.spdisplays_main === 'spdisplays_yes',
                mirror: display.spdisplays_mirror !== 'spdisplays_off',
                online: display.spdisplays_status === 'spdisplays_status_ok',
                rotation: display.spdisplays_rotation || 0
              });
            }
          }
        }
      }

      return displays;
    } catch (err) {
      logger.error('Failed to get display info:', err);
      return [];
    }
  }
}

export const appleGPUService = new AppleGPUService();
export default appleGPUService;
