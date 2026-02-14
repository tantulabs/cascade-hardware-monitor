import { exec } from 'child_process';
import { promisify } from 'util';
import { createChildLogger } from '../../core/logger.js';

const execAsync = promisify(exec);
const logger = createChildLogger('nvidia-gpu');

export interface NvidiaGPUData {
  index: number;
  name: string;
  uuid: string;
  serial: string;
  busId: string;
  displayMode: string;
  displayActive: string;
  persistenceMode: string;
  driverVersion: string;
  cudaVersion: string;
  vbiosVersion: string;
  computeMode: string;
  gpuOperationMode: string;
  
  // Temperature
  temperature: number;
  temperatureThrottleThreshold: number;
  temperatureSlowdownThreshold: number;
  temperatureShutdownThreshold: number;
  temperatureMemory: number;
  
  // Power
  powerDraw: number;
  powerLimit: number;
  powerDefaultLimit: number;
  powerMinLimit: number;
  powerMaxLimit: number;
  powerState: string;
  
  // Clocks
  clockGraphics: number;
  clockGraphicsMax: number;
  clockSM: number;
  clockMemory: number;
  clockMemoryMax: number;
  clockVideo: number;
  
  // Memory
  memoryTotal: number;
  memoryUsed: number;
  memoryFree: number;
  memoryReserved: number;
  
  // Utilization
  utilizationGpu: number;
  utilizationMemory: number;
  utilizationEncoder: number;
  utilizationDecoder: number;
  
  // Fan
  fanSpeed: number;
  
  // PCIe
  pcieLinkGen: number;
  pcieLinkGenMax: number;
  pcieLinkWidth: number;
  pcieLinkWidthMax: number;
  pcieTxThroughput: number;
  pcieRxThroughput: number;
  
  // ECC
  eccMode: string;
  eccErrors: number;
  
  // Processes
  computeProcesses: NvidiaProcess[];
  graphicsProcesses: NvidiaProcess[];
}

export interface NvidiaProcess {
  pid: number;
  name: string;
  usedMemory: number;
  type: 'compute' | 'graphics';
}

export interface NvidiaSystemInfo {
  driverVersion: string;
  cudaVersion: string;
  gpuCount: number;
  nvmlVersion: string;
}

class NvidiaGPUService {
  private available = false;
  private systemInfo: NvidiaSystemInfo | null = null;
  private lastData: NvidiaGPUData[] = [];

  async init(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('nvidia-smi --query-gpu=driver_version --format=csv,noheader,nounits');
      if (stdout.trim()) {
        this.available = true;
        await this.getSystemInfo();
        logger.info('NVIDIA GPU service initialized');
        return true;
      }
    } catch (err) {
      logger.debug('NVIDIA SMI not available');
    }
    this.available = false;
    return false;
  }

  isAvailable(): boolean {
    return this.available;
  }

  async getSystemInfo(): Promise<NvidiaSystemInfo | null> {
    if (!this.available) return null;

    try {
      const { stdout } = await execAsync(
        'nvidia-smi --query-gpu=driver_version,count --format=csv,noheader,nounits'
      );
      
      const lines = stdout.trim().split('\n');
      if (lines.length > 0) {
        const parts = lines[0].split(',').map(p => p.trim());
        
        // Get CUDA version
        let cudaVersion = '';
        try {
          const cudaResult = await execAsync('nvidia-smi --query-gpu=cuda_version --format=csv,noheader,nounits 2>nul || echo ""');
          cudaVersion = cudaResult.stdout.trim().split('\n')[0] || '';
        } catch {
          // CUDA version query might not be supported
        }

        this.systemInfo = {
          driverVersion: parts[0] || '',
          cudaVersion: cudaVersion,
          gpuCount: lines.length,
          nvmlVersion: ''
        };
      }
      return this.systemInfo;
    } catch (err) {
      logger.error('Failed to get NVIDIA system info:', err);
      return null;
    }
  }

  parseValue(val: string, defaultVal: number = 0): number {
    if (!val || val === '[N/A]' || val === 'N/A' || val === '[Not Supported]') {
      return defaultVal;
    }
    const parsed = parseFloat(val);
    return isNaN(parsed) ? defaultVal : parsed;
  }

  async getAllGPUData(): Promise<NvidiaGPUData[]> {
    if (!this.available) return [];

    try {
      const query = [
        'index', 'name', 'uuid', 'serial', 'pci.bus_id',
        'display_mode', 'display_active', 'persistence_mode',
        'driver_version', 'vbios_version', 'compute_mode',
        'temperature.gpu', 'temperature.memory',
        'power.draw', 'power.limit', 'power.default_limit', 'power.min_limit', 'power.max_limit',
        'pstate',
        'clocks.current.graphics', 'clocks.max.graphics',
        'clocks.current.sm', 'clocks.current.memory', 'clocks.max.memory',
        'clocks.current.video',
        'memory.total', 'memory.used', 'memory.free',
        'utilization.gpu', 'utilization.memory', 'encoder.stats.sessionCount', 'encoder.stats.averageFps',
        'fan.speed',
        'pcie.link.gen.current', 'pcie.link.gen.max',
        'pcie.link.width.current', 'pcie.link.width.max'
      ].join(',');

      const { stdout } = await execAsync(
        `nvidia-smi --query-gpu=${query} --format=csv,noheader,nounits`
      );

      const gpus: NvidiaGPUData[] = [];
      const lines = stdout.trim().split('\n');

      for (const line of lines) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length < 20) continue;

        const gpu: NvidiaGPUData = {
          index: parseInt(parts[0]) || 0,
          name: parts[1] || '',
          uuid: parts[2] || '',
          serial: parts[3] || '',
          busId: parts[4] || '',
          displayMode: parts[5] || '',
          displayActive: parts[6] || '',
          persistenceMode: parts[7] || '',
          driverVersion: parts[8] || '',
          cudaVersion: this.systemInfo?.cudaVersion || '',
          vbiosVersion: parts[9] || '',
          computeMode: parts[10] || '',
          gpuOperationMode: '',
          
          temperature: this.parseValue(parts[11]),
          temperatureThrottleThreshold: 83,
          temperatureSlowdownThreshold: 90,
          temperatureShutdownThreshold: 100,
          temperatureMemory: this.parseValue(parts[12]),
          
          powerDraw: this.parseValue(parts[13]),
          powerLimit: this.parseValue(parts[14]),
          powerDefaultLimit: this.parseValue(parts[15]),
          powerMinLimit: this.parseValue(parts[16]),
          powerMaxLimit: this.parseValue(parts[17]),
          powerState: parts[18] || '',
          
          clockGraphics: this.parseValue(parts[19]),
          clockGraphicsMax: this.parseValue(parts[20]),
          clockSM: this.parseValue(parts[21]),
          clockMemory: this.parseValue(parts[22]),
          clockMemoryMax: this.parseValue(parts[23]),
          clockVideo: this.parseValue(parts[24]),
          
          memoryTotal: this.parseValue(parts[25]),
          memoryUsed: this.parseValue(parts[26]),
          memoryFree: this.parseValue(parts[27]),
          memoryReserved: 0,
          
          utilizationGpu: this.parseValue(parts[28]),
          utilizationMemory: this.parseValue(parts[29]),
          utilizationEncoder: this.parseValue(parts[30]),
          utilizationDecoder: this.parseValue(parts[31]),
          
          fanSpeed: this.parseValue(parts[32]),
          
          pcieLinkGen: parseInt(parts[33]) || 0,
          pcieLinkGenMax: parseInt(parts[34]) || 0,
          pcieLinkWidth: parseInt(parts[35]) || 0,
          pcieLinkWidthMax: parseInt(parts[36]) || 0,
          pcieTxThroughput: 0,
          pcieRxThroughput: 0,
          
          eccMode: '',
          eccErrors: 0,
          
          computeProcesses: [],
          graphicsProcesses: []
        };

        gpus.push(gpu);
      }

      // Get process info
      await this.getProcessInfo(gpus);

      this.lastData = gpus;
      return gpus;
    } catch (err) {
      logger.error('Failed to get NVIDIA GPU data:', err);
      return this.lastData;
    }
  }

  private async getProcessInfo(gpus: NvidiaGPUData[]): Promise<void> {
    try {
      const { stdout } = await execAsync(
        'nvidia-smi --query-compute-apps=gpu_uuid,pid,process_name,used_memory --format=csv,noheader,nounits'
      );

      const lines = stdout.trim().split('\n').filter(l => l.trim());
      for (const line of lines) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length < 4) continue;

        const uuid = parts[0];
        const gpu = gpus.find(g => g.uuid === uuid);
        if (gpu) {
          gpu.computeProcesses.push({
            pid: parseInt(parts[1]) || 0,
            name: parts[2] || '',
            usedMemory: parseFloat(parts[3]) || 0,
            type: 'compute'
          });
        }
      }
    } catch {
      // No compute processes or query failed
    }

    try {
      const { stdout } = await execAsync(
        'nvidia-smi --query-graphics-apps=gpu_uuid,pid,process_name,used_memory --format=csv,noheader,nounits 2>nul || echo ""'
      );

      const lines = stdout.trim().split('\n').filter(l => l.trim());
      for (const line of lines) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length < 4) continue;

        const uuid = parts[0];
        const gpu = gpus.find(g => g.uuid === uuid);
        if (gpu) {
          gpu.graphicsProcesses.push({
            pid: parseInt(parts[1]) || 0,
            name: parts[2] || '',
            usedMemory: parseFloat(parts[3]) || 0,
            type: 'graphics'
          });
        }
      }
    } catch {
      // No graphics processes or query failed
    }
  }

  async getGPUData(index: number): Promise<NvidiaGPUData | null> {
    const allData = await this.getAllGPUData();
    return allData.find(g => g.index === index) || null;
  }

  getLastData(): NvidiaGPUData[] {
    return this.lastData;
  }
}

export const nvidiaGPU = new NvidiaGPUService();
export default nvidiaGPU;
