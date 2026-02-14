import { exec } from 'child_process';
import { promisify } from 'util';
import { createChildLogger } from '../../core/logger.js';

const execAsync = promisify(exec);
const logger = createChildLogger('intel-gpu');

export interface IntelGPUData {
  index: number;
  name: string;
  deviceId: string;
  vendorId: string;
  busId: string;
  driverVersion: string;
  
  // Temperature
  temperature: number;
  
  // Power
  powerDraw: number;
  powerLimit: number;
  
  // Clocks
  clockGraphics: number;
  clockGraphicsMax: number;
  clockMemory: number;
  clockRender: number;
  
  // Memory
  memoryTotal: number;
  memoryUsed: number;
  memoryFree: number;
  memoryShared: number;
  
  // Utilization
  utilizationGpu: number;
  utilizationRender: number;
  utilizationVideo: number;
  utilizationVideoEnhance: number;
  
  // EU (Execution Units)
  euCount: number;
  euActive: number;
  
  // Media engines
  mediaEngineCount: number;
}

export interface IntelSystemInfo {
  driverVersion: string;
  gpuCount: number;
  generation: string;
}

class IntelGPUService {
  private available = false;
  private systemInfo: IntelSystemInfo | null = null;
  private lastData: IntelGPUData[] = [];
  private toolPath: string = '';

  async init(): Promise<boolean> {
    // Try intel_gpu_top (Linux)
    try {
      const { stdout } = await execAsync('which intel_gpu_top 2>/dev/null || echo ""');
      if (stdout.trim()) {
        this.available = true;
        this.toolPath = 'intel_gpu_top';
        logger.info('Intel GPU service initialized (intel_gpu_top)');
        return true;
      }
    } catch {
      // intel_gpu_top not available
    }

    // Try xpu-smi (Intel oneAPI)
    try {
      const { stdout } = await execAsync('xpu-smi discovery 2>nul || echo ""');
      if (stdout.includes('Device') || stdout.includes('Intel')) {
        this.available = true;
        this.toolPath = 'xpu-smi';
        await this.getSystemInfo();
        logger.info('Intel GPU service initialized (xpu-smi)');
        return true;
      }
    } catch {
      // xpu-smi not available
    }

    // Try Windows WMI for Intel integrated/discrete GPUs
    try {
      const { stdout } = await execAsync(
        'wmic path win32_videocontroller get name,adaptercompatibility,driverversion /format:csv 2>nul || echo ""'
      );
      if (stdout.toLowerCase().includes('intel')) {
        this.available = true;
        this.toolPath = 'wmic';
        await this.getSystemInfo();
        logger.info('Intel GPU service initialized (WMIC)');
        return true;
      }
    } catch {
      // WMIC not available
    }

    logger.debug('Intel GPU tools not available');
    this.available = false;
    return false;
  }

  isAvailable(): boolean {
    return this.available;
  }

  async getSystemInfo(): Promise<IntelSystemInfo | null> {
    if (!this.available) return null;

    try {
      if (this.toolPath === 'xpu-smi') {
        const { stdout } = await execAsync('xpu-smi discovery');
        const deviceCount = (stdout.match(/Device ID/g) || []).length;
        const driverMatch = stdout.match(/Driver Version:\s*(\S+)/i);

        this.systemInfo = {
          driverVersion: driverMatch ? driverMatch[1] : '',
          gpuCount: deviceCount || 1,
          generation: ''
        };
      } else if (this.toolPath === 'wmic') {
        const { stdout } = await execAsync(
          'wmic path win32_videocontroller get name,adaptercompatibility,driverversion /format:csv'
        );
        const lines = stdout.trim().split('\n').filter(l => l.toLowerCase().includes('intel'));
        
        if (lines.length > 0) {
          const parts = lines[0].split(',');
          this.systemInfo = {
            driverVersion: parts[2] || '',
            gpuCount: lines.length,
            generation: this.detectGeneration(parts[3] || '')
          };
        } else {
          this.systemInfo = {
            driverVersion: '',
            gpuCount: 0,
            generation: ''
          };
        }
      }
      return this.systemInfo;
    } catch (err) {
      logger.error('Failed to get Intel system info:', err);
      return null;
    }
  }

  private detectGeneration(name: string): string {
    if (name.includes('Arc')) return 'Arc';
    if (name.includes('Xe')) return 'Xe';
    if (name.includes('UHD')) return 'UHD';
    if (name.includes('Iris')) return 'Iris';
    if (name.includes('HD')) return 'HD';
    return 'Unknown';
  }

  async getAllGPUData(): Promise<IntelGPUData[]> {
    if (!this.available) return [];

    try {
      if (this.toolPath === 'xpu-smi') {
        return await this.getDataFromXpuSmi();
      } else if (this.toolPath === 'wmic') {
        return await this.getDataFromWmic();
      }
      return [];
    } catch (err) {
      logger.error('Failed to get Intel GPU data:', err);
      return this.lastData;
    }
  }

  private async getDataFromXpuSmi(): Promise<IntelGPUData[]> {
    const gpus: IntelGPUData[] = [];

    try {
      // Get device list
      const { stdout: discovery } = await execAsync('xpu-smi discovery --json 2>nul || xpu-smi discovery');
      
      // Try JSON parsing
      try {
        const data = JSON.parse(discovery);
        for (const device of data.device_list || []) {
          const deviceId = device.device_id;
          
          // Get stats for this device
          let stats: Record<string, any> = {};
          try {
            const { stdout: statsOut } = await execAsync(`xpu-smi stats -d ${deviceId} --json`);
            stats = JSON.parse(statsOut);
          } catch {
            // Stats query failed
          }

          gpus.push({
            index: deviceId,
            name: device.device_name || 'Intel GPU',
            deviceId: device.pci_device_id || '',
            vendorId: '8086',
            busId: device.pci_bdf_address || '',
            driverVersion: device.driver_version || '',
            
            temperature: stats.gpu_temperature || 0,
            
            powerDraw: stats.power || 0,
            powerLimit: stats.power_limit || 0,
            
            clockGraphics: stats.gpu_frequency || 0,
            clockGraphicsMax: stats.gpu_frequency_max || 0,
            clockMemory: stats.memory_frequency || 0,
            clockRender: stats.render_frequency || 0,
            
            memoryTotal: (stats.memory_physical || 0) / (1024 * 1024),
            memoryUsed: (stats.memory_used || 0) / (1024 * 1024),
            memoryFree: (stats.memory_free || 0) / (1024 * 1024),
            memoryShared: 0,
            
            utilizationGpu: stats.gpu_utilization || 0,
            utilizationRender: stats.render_utilization || 0,
            utilizationVideo: stats.decoder_utilization || 0,
            utilizationVideoEnhance: stats.encoder_utilization || 0,
            
            euCount: device.number_of_eus || 0,
            euActive: 0,
            
            mediaEngineCount: device.number_of_media_engines || 0
          });
        }
      } catch {
        logger.debug('xpu-smi JSON parse failed');
      }

      this.lastData = gpus;
      return gpus;
    } catch (err) {
      logger.error('Failed to get xpu-smi data:', err);
      return this.lastData;
    }
  }

  private async getDataFromWmic(): Promise<IntelGPUData[]> {
    const gpus: IntelGPUData[] = [];

    try {
      const { stdout } = await execAsync(
        'wmic path win32_videocontroller get Name,AdapterCompatibility,DriverVersion,AdapterRAM /format:csv'
      );

      const lines = stdout.trim().split('\n').filter(l => l.toLowerCase().includes('intel'));
      
      lines.forEach((line, index) => {
        const parts = line.split(',');
        // CSV format: Node,AdapterCompatibility,AdapterRAM,DriverVersion,Name
        if (parts.length >= 5) {
          const memoryBytes = parseInt(parts[2]) || 0;
          
          gpus.push({
            index,
            name: parts[4] || 'Intel GPU',
            deviceId: '',
            vendorId: '8086',
            busId: '',
            driverVersion: parts[3] || '',
            
            temperature: 0,
            
            powerDraw: 0,
            powerLimit: 0,
            
            clockGraphics: 0,
            clockGraphicsMax: 0,
            clockMemory: 0,
            clockRender: 0,
            
            memoryTotal: memoryBytes / (1024 * 1024),
            memoryUsed: 0,
            memoryFree: 0,
            memoryShared: 0,
            
            utilizationGpu: 0,
            utilizationRender: 0,
            utilizationVideo: 0,
            utilizationVideoEnhance: 0,
            
            euCount: 0,
            euActive: 0,
            
            mediaEngineCount: 0
          });
        }
      });

      this.lastData = gpus;
      return gpus;
    } catch (err) {
      logger.error('Failed to get WMIC Intel data:', err);
      return this.lastData;
    }
  }

  async getGPUData(index: number): Promise<IntelGPUData | null> {
    const allData = await this.getAllGPUData();
    return allData.find(g => g.index === index) || null;
  }

  getLastData(): IntelGPUData[] {
    return this.lastData;
  }
}

export const intelGPU = new IntelGPUService();
export default intelGPU;
