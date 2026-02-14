import { nvidiaGPU, NvidiaGPUData, NvidiaProcess, NvidiaSystemInfo } from './nvidia.js';
import { amdGPU, AMDGPUData, AMDSystemInfo } from './amd.js';
import { intelGPU, IntelGPUData, IntelSystemInfo } from './intel.js';
import { appleGPUService, AppleGPUData, AppleSiliconMetrics } from './apple.js';
import { createChildLogger } from '../../core/logger.js';

const logger = createChildLogger('gpu-manager');

export type GPUVendor = 'nvidia' | 'amd' | 'intel' | 'apple' | 'unknown';

export interface EnhancedGPUData {
  index: number;
  vendor: GPUVendor;
  name: string;
  uuid?: string;
  busId: string;
  driverVersion: string;
  
  // Temperature
  temperature: number;
  temperatureMax: number;
  temperatureMemory?: number;
  temperatureHotspot?: number;
  
  // Power
  powerDraw: number;
  powerLimit: number;
  powerState?: string;
  
  // Clocks
  clockGraphics: number;
  clockGraphicsMax: number;
  clockMemory: number;
  clockMemoryMax: number;
  
  // Memory (in MB)
  memoryTotal: number;
  memoryUsed: number;
  memoryFree: number;
  
  // Utilization (percentage)
  utilizationGpu: number;
  utilizationMemory: number;
  utilizationEncoder?: number;
  utilizationDecoder?: number;
  
  // Fan
  fanSpeed: number;
  
  // PCIe
  pcieLinkGen?: number;
  pcieLinkWidth?: number;
  
  // Vendor-specific raw data
  vendorData?: NvidiaGPUData | AMDGPUData | IntelGPUData;
  
  // Processes using this GPU
  processes?: Array<{
    pid: number;
    name: string;
    memoryUsed: number;
    type: string;
  }>;
}

export interface AppleSystemInfo {
  isAppleSilicon: boolean;
  chipName?: string;
  gpuCores?: number;
  metalVersion?: string;
  gpuCount: number;
}

export interface GPUSystemInfo {
  nvidia?: NvidiaSystemInfo;
  amd?: AMDSystemInfo;
  intel?: IntelSystemInfo;
  apple?: AppleSystemInfo;
  totalGpuCount: number;
  vendors: GPUVendor[];
}

class GPUManager {
  private initialized = false;
  private availableVendors: GPUVendor[] = [];

  async init(): Promise<void> {
    logger.info('Initializing GPU manager...');
    
    // Initialize Apple GPU service first on macOS
    if (process.platform === 'darwin') {
      await appleGPUService.initialize();
      if (appleGPUService.isAvailable()) {
        this.availableVendors.push('apple');
      }
    }
    
    const initResults = await Promise.all([
      nvidiaGPU.init(),
      amdGPU.init(),
      intelGPU.init()
    ]);

    if (initResults[0]) this.availableVendors.push('nvidia');
    if (initResults[1]) this.availableVendors.push('amd');
    if (initResults[2]) this.availableVendors.push('intel');

    this.initialized = true;
    logger.info(`GPU manager initialized. Available vendors: ${this.availableVendors.join(', ') || 'none'}`);
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getAvailableVendors(): GPUVendor[] {
    return [...this.availableVendors];
  }

  async getSystemInfo(): Promise<GPUSystemInfo> {
    const info: GPUSystemInfo = {
      totalGpuCount: 0,
      vendors: this.availableVendors
    };

    if (this.availableVendors.includes('nvidia')) {
      info.nvidia = await nvidiaGPU.getSystemInfo() || undefined;
      info.totalGpuCount += info.nvidia?.gpuCount || 0;
    }

    if (this.availableVendors.includes('amd')) {
      info.amd = await amdGPU.getSystemInfo() || undefined;
      info.totalGpuCount += info.amd?.gpuCount || 0;
    }

    if (this.availableVendors.includes('intel')) {
      info.intel = await intelGPU.getSystemInfo() || undefined;
      info.totalGpuCount += info.intel?.gpuCount || 0;
    }

    if (this.availableVendors.includes('apple')) {
      const appleGpus = await appleGPUService.getAllGPUData();
      const metrics = await appleGPUService.getAppleSiliconMetrics();
      info.apple = {
        isAppleSilicon: appleGPUService.isAppleSiliconMac(),
        chipName: metrics ? 'Apple Silicon' : undefined,
        gpuCores: metrics?.gpuCores,
        metalVersion: appleGpus[0]?.metalVersion,
        gpuCount: appleGpus.length
      };
      info.totalGpuCount += appleGpus.length;
    }

    return info;
  }

  async getAllGPUData(): Promise<EnhancedGPUData[]> {
    const allGpus: EnhancedGPUData[] = [];
    let globalIndex = 0;

    // Get NVIDIA GPUs
    if (this.availableVendors.includes('nvidia')) {
      const nvidiaData = await nvidiaGPU.getAllGPUData();
      for (const gpu of nvidiaData) {
        allGpus.push(this.convertNvidiaData(gpu, globalIndex++));
      }
    }

    // Get AMD GPUs
    if (this.availableVendors.includes('amd')) {
      const amdData = await amdGPU.getAllGPUData();
      for (const gpu of amdData) {
        allGpus.push(this.convertAMDData(gpu, globalIndex++));
      }
    }

    // Get Intel GPUs
    if (this.availableVendors.includes('intel')) {
      const intelData = await intelGPU.getAllGPUData();
      for (const gpu of intelData) {
        allGpus.push(this.convertIntelData(gpu, globalIndex++));
      }
    }

    // Get Apple GPUs
    if (this.availableVendors.includes('apple')) {
      const appleData = await appleGPUService.getAllGPUData();
      for (const gpu of appleData) {
        allGpus.push(this.convertAppleData(gpu, globalIndex++));
      }
    }

    return allGpus;
  }

  private convertAppleData(gpu: AppleGPUData, index: number): EnhancedGPUData {
    return {
      index,
      vendor: 'apple',
      name: gpu.name,
      busId: 'integrated',
      driverVersion: gpu.metalVersion,
      
      temperature: gpu.temperature,
      temperatureMax: 100,
      
      powerDraw: gpu.powerDraw,
      powerLimit: 0,
      
      clockGraphics: gpu.frequency,
      clockGraphicsMax: 0,
      clockMemory: 0,
      clockMemoryMax: 0,
      
      memoryTotal: gpu.vram,
      memoryUsed: 0,
      memoryFree: gpu.vram,
      
      utilizationGpu: gpu.utilizationGpu,
      utilizationMemory: gpu.utilizationMemory,
      
      fanSpeed: 0,
      
      processes: []
    };
  }

  private convertNvidiaData(gpu: NvidiaGPUData, index: number): EnhancedGPUData {
    const processes = [
      ...gpu.computeProcesses.map(p => ({ ...p, type: 'compute' })),
      ...gpu.graphicsProcesses.map(p => ({ ...p, type: 'graphics' }))
    ].map(p => ({
      pid: p.pid,
      name: p.name,
      memoryUsed: p.usedMemory,
      type: p.type
    }));

    return {
      index,
      vendor: 'nvidia',
      name: gpu.name,
      uuid: gpu.uuid,
      busId: gpu.busId,
      driverVersion: gpu.driverVersion,
      
      temperature: gpu.temperature,
      temperatureMax: gpu.temperatureShutdownThreshold,
      temperatureMemory: gpu.temperatureMemory,
      
      powerDraw: gpu.powerDraw,
      powerLimit: gpu.powerLimit,
      powerState: gpu.powerState,
      
      clockGraphics: gpu.clockGraphics,
      clockGraphicsMax: gpu.clockGraphicsMax,
      clockMemory: gpu.clockMemory,
      clockMemoryMax: gpu.clockMemoryMax,
      
      memoryTotal: gpu.memoryTotal,
      memoryUsed: gpu.memoryUsed,
      memoryFree: gpu.memoryFree,
      
      utilizationGpu: gpu.utilizationGpu,
      utilizationMemory: gpu.utilizationMemory,
      utilizationEncoder: gpu.utilizationEncoder,
      utilizationDecoder: gpu.utilizationDecoder,
      
      fanSpeed: gpu.fanSpeed,
      
      pcieLinkGen: gpu.pcieLinkGen,
      pcieLinkWidth: gpu.pcieLinkWidth,
      
      vendorData: gpu,
      processes
    };
  }

  private convertAMDData(gpu: AMDGPUData, index: number): EnhancedGPUData {
    return {
      index,
      vendor: 'amd',
      name: gpu.name,
      busId: gpu.busId,
      driverVersion: gpu.driverVersion,
      
      temperature: gpu.temperature,
      temperatureMax: 110,
      temperatureMemory: gpu.temperatureMemory,
      temperatureHotspot: gpu.temperatureHotspot,
      
      powerDraw: gpu.powerDraw,
      powerLimit: gpu.powerCap,
      
      clockGraphics: gpu.clockGraphics,
      clockGraphicsMax: gpu.clockGraphicsMax,
      clockMemory: gpu.clockMemory,
      clockMemoryMax: gpu.clockMemoryMax,
      
      memoryTotal: gpu.memoryTotal,
      memoryUsed: gpu.memoryUsed,
      memoryFree: gpu.memoryFree,
      
      utilizationGpu: gpu.utilizationGpu,
      utilizationMemory: gpu.utilizationMemory,
      
      fanSpeed: gpu.fanSpeed,
      
      pcieLinkGen: gpu.pcieLinkGen,
      pcieLinkWidth: gpu.pcieLinkWidth,
      
      vendorData: gpu
    };
  }

  private convertIntelData(gpu: IntelGPUData, index: number): EnhancedGPUData {
    return {
      index,
      vendor: 'intel',
      name: gpu.name,
      busId: gpu.busId,
      driverVersion: gpu.driverVersion,
      
      temperature: gpu.temperature,
      temperatureMax: 100,
      
      powerDraw: gpu.powerDraw,
      powerLimit: gpu.powerLimit,
      
      clockGraphics: gpu.clockGraphics,
      clockGraphicsMax: gpu.clockGraphicsMax,
      clockMemory: gpu.clockMemory,
      clockMemoryMax: 0,
      
      memoryTotal: gpu.memoryTotal,
      memoryUsed: gpu.memoryUsed,
      memoryFree: gpu.memoryFree,
      
      utilizationGpu: gpu.utilizationGpu,
      utilizationMemory: 0,
      utilizationEncoder: gpu.utilizationVideoEnhance,
      utilizationDecoder: gpu.utilizationVideo,
      
      fanSpeed: 0,
      
      vendorData: gpu
    };
  }

  async getGPUByIndex(index: number): Promise<EnhancedGPUData | null> {
    const allGpus = await this.getAllGPUData();
    return allGpus.find(g => g.index === index) || null;
  }

  async getGPUsByVendor(vendor: GPUVendor): Promise<EnhancedGPUData[]> {
    const allGpus = await this.getAllGPUData();
    return allGpus.filter(g => g.vendor === vendor);
  }

}

export const gpuManager = new GPUManager();
export default gpuManager;

export { nvidiaGPU, amdGPU, intelGPU };
export type { NvidiaGPUData, NvidiaProcess, NvidiaSystemInfo };
export type { AMDGPUData, AMDSystemInfo };
export type { IntelGPUData, IntelSystemInfo };
