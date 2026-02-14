import { exec } from 'child_process';
import { promisify } from 'util';
import { createChildLogger } from '../../core/logger.js';

const execAsync = promisify(exec);
const logger = createChildLogger('amd-gpu');

export interface AMDGPUData {
  index: number;
  name: string;
  deviceId: string;
  vendorId: string;
  subsystemId: string;
  busId: string;
  uniqueId: string;
  vbiosVersion: string;
  driverVersion: string;
  
  // Temperature
  temperature: number;
  temperatureEdge: number;
  temperatureJunction: number;
  temperatureMemory: number;
  temperatureHotspot: number;
  
  // Power
  powerDraw: number;
  powerCap: number;
  powerCapDefault: number;
  powerCapMin: number;
  powerCapMax: number;
  
  // Clocks
  clockGraphics: number;
  clockGraphicsMax: number;
  clockMemory: number;
  clockMemoryMax: number;
  clockSoc: number;
  
  // Memory
  memoryTotal: number;
  memoryUsed: number;
  memoryFree: number;
  memoryBandwidth: number;
  
  // Utilization
  utilizationGpu: number;
  utilizationMemory: number;
  utilizationMediaEngine: number;
  
  // Fan
  fanSpeed: number;
  fanSpeedMax: number;
  fanRpm: number;
  
  // PCIe
  pcieLinkGen: number;
  pcieLinkGenMax: number;
  pcieLinkWidth: number;
  pcieLinkWidthMax: number;
  pcieBandwidth: number;
  
  // Voltage
  voltageGraphics: number;
  voltageSoc: number;
  voltageMemory: number;
}

export interface AMDSystemInfo {
  driverVersion: string;
  gpuCount: number;
  rocmVersion: string;
}

class AMDGPUService {
  private available = false;
  private systemInfo: AMDSystemInfo | null = null;
  private lastData: AMDGPUData[] = [];
  private toolPath: string = '';

  async init(): Promise<boolean> {
    // Try rocm-smi first (Linux/Windows with ROCm)
    try {
      const { stdout } = await execAsync('rocm-smi --showdriverversion');
      if (stdout.includes('Driver')) {
        this.available = true;
        this.toolPath = 'rocm-smi';
        await this.getSystemInfo();
        logger.info('AMD GPU service initialized (rocm-smi)');
        return true;
      }
    } catch {
      // rocm-smi not available
    }

    // Try amdgpu-pro tools
    try {
      const { stdout } = await execAsync('amdgpu-pro-px --version 2>nul || echo ""');
      if (stdout.trim()) {
        this.available = true;
        this.toolPath = 'amdgpu-pro';
        logger.info('AMD GPU service initialized (amdgpu-pro)');
        return true;
      }
    } catch {
      // amdgpu-pro not available
    }

    // Try Windows AMD ADL
    try {
      const { stdout } = await execAsync('wmic path win32_videocontroller where "AdapterCompatibility like \'%AMD%\'" get name,driverversion /format:csv 2>nul || echo ""');
      if (stdout.includes('AMD') || stdout.includes('Radeon')) {
        this.available = true;
        this.toolPath = 'wmic';
        logger.info('AMD GPU service initialized (WMIC fallback)');
        return true;
      }
    } catch {
      // WMIC not available
    }

    logger.debug('AMD GPU tools not available');
    this.available = false;
    return false;
  }

  isAvailable(): boolean {
    return this.available;
  }

  async getSystemInfo(): Promise<AMDSystemInfo | null> {
    if (!this.available) return null;

    try {
      if (this.toolPath === 'rocm-smi') {
        const { stdout } = await execAsync('rocm-smi --showdriverversion --showproductname');
        const driverMatch = stdout.match(/Driver version:\s*(\S+)/i);
        const gpuCount = (stdout.match(/GPU\[/g) || []).length || 1;

        let rocmVersion = '';
        try {
          const rocmResult = await execAsync('rocm-smi --version 2>nul || echo ""');
          const versionMatch = rocmResult.stdout.match(/(\d+\.\d+\.\d+)/);
          rocmVersion = versionMatch ? versionMatch[1] : '';
        } catch {
          // Version query failed
        }

        this.systemInfo = {
          driverVersion: driverMatch ? driverMatch[1] : '',
          gpuCount,
          rocmVersion
        };
      }
      return this.systemInfo;
    } catch (err) {
      logger.error('Failed to get AMD system info:', err);
      return null;
    }
  }

  async getAllGPUData(): Promise<AMDGPUData[]> {
    if (!this.available) return [];

    try {
      if (this.toolPath === 'rocm-smi') {
        return await this.getDataFromRocmSmi();
      } else if (this.toolPath === 'wmic') {
        return await this.getDataFromWmic();
      }
      return [];
    } catch (err) {
      logger.error('Failed to get AMD GPU data:', err);
      return this.lastData;
    }
  }

  private async getDataFromRocmSmi(): Promise<AMDGPUData[]> {
    const gpus: AMDGPUData[] = [];

    try {
      const { stdout } = await execAsync(
        'rocm-smi --showtemp --showuse --showmemuse --showpower --showclocks --showfan --showid --showproductname --json 2>nul || rocm-smi --showtemp --showuse --showmemuse --showpower --showclocks --showfan --showid --showproductname'
      );

      // Try to parse JSON output first
      try {
        const data = JSON.parse(stdout);
        for (const [key, value] of Object.entries(data)) {
          if (key.startsWith('card')) {
            const cardData = value as Record<string, any>;
            const index = parseInt(key.replace('card', '')) || 0;
            
            gpus.push({
              index,
              name: cardData['Card series'] || cardData['Product Name'] || 'AMD GPU',
              deviceId: cardData['Device ID'] || '',
              vendorId: cardData['Vendor ID'] || '',
              subsystemId: cardData['Subsystem ID'] || '',
              busId: cardData['PCI Bus'] || '',
              uniqueId: cardData['Unique ID'] || '',
              vbiosVersion: cardData['VBIOS version'] || '',
              driverVersion: this.systemInfo?.driverVersion || '',
              
              temperature: parseFloat(cardData['Temperature (Sensor edge) (C)']) || 0,
              temperatureEdge: parseFloat(cardData['Temperature (Sensor edge) (C)']) || 0,
              temperatureJunction: parseFloat(cardData['Temperature (Sensor junction) (C)']) || 0,
              temperatureMemory: parseFloat(cardData['Temperature (Sensor memory) (C)']) || 0,
              temperatureHotspot: parseFloat(cardData['Temperature (Sensor hotspot) (C)']) || 0,
              
              powerDraw: parseFloat(cardData['Average Graphics Package Power (W)']) || 0,
              powerCap: parseFloat(cardData['Max Graphics Package Power (W)']) || 0,
              powerCapDefault: 0,
              powerCapMin: 0,
              powerCapMax: 0,
              
              clockGraphics: parseFloat(cardData['sclk clock speed:']?.replace(/[^\d.]/g, '')) || 0,
              clockGraphicsMax: 0,
              clockMemory: parseFloat(cardData['mclk clock speed:']?.replace(/[^\d.]/g, '')) || 0,
              clockMemoryMax: 0,
              clockSoc: 0,
              
              memoryTotal: parseFloat(cardData['VRAM Total Memory (B)']) / (1024 * 1024) || 0,
              memoryUsed: parseFloat(cardData['VRAM Total Used Memory (B)']) / (1024 * 1024) || 0,
              memoryFree: 0,
              memoryBandwidth: 0,
              
              utilizationGpu: parseFloat(cardData['GPU use (%)']) || 0,
              utilizationMemory: parseFloat(cardData['GPU memory use (%)']) || 0,
              utilizationMediaEngine: 0,
              
              fanSpeed: parseFloat(cardData['Fan speed (%)']) || 0,
              fanSpeedMax: 100,
              fanRpm: parseFloat(cardData['Fan RPM']) || 0,
              
              pcieLinkGen: parseInt(cardData['PCIe Link Speed']) || 0,
              pcieLinkGenMax: 0,
              pcieLinkWidth: parseInt(cardData['PCIe Link Width']) || 0,
              pcieLinkWidthMax: 0,
              pcieBandwidth: 0,
              
              voltageGraphics: parseFloat(cardData['Voltage (mV)']) / 1000 || 0,
              voltageSoc: 0,
              voltageMemory: 0
            });
          }
        }
      } catch {
        // JSON parse failed, try text parsing
        logger.debug('rocm-smi JSON parse failed, using text parsing');
      }

      this.lastData = gpus;
      return gpus;
    } catch (err) {
      logger.error('Failed to get rocm-smi data:', err);
      return this.lastData;
    }
  }

  private async getDataFromWmic(): Promise<AMDGPUData[]> {
    const gpus: AMDGPUData[] = [];

    try {
      const { stdout } = await execAsync(
        'wmic path win32_videocontroller where "AdapterCompatibility like \'%AMD%\' or Name like \'%Radeon%\'" get Name,DriverVersion,AdapterRAM,VideoProcessor /format:csv'
      );

      const lines = stdout.trim().split('\n').filter(l => l.includes('AMD') || l.includes('Radeon'));
      
      lines.forEach((line, index) => {
        const parts = line.split(',');
        if (parts.length >= 4) {
          gpus.push({
            index,
            name: parts[2] || 'AMD GPU',
            deviceId: '',
            vendorId: '1002',
            subsystemId: '',
            busId: '',
            uniqueId: '',
            vbiosVersion: '',
            driverVersion: parts[1] || '',
            
            temperature: 0,
            temperatureEdge: 0,
            temperatureJunction: 0,
            temperatureMemory: 0,
            temperatureHotspot: 0,
            
            powerDraw: 0,
            powerCap: 0,
            powerCapDefault: 0,
            powerCapMin: 0,
            powerCapMax: 0,
            
            clockGraphics: 0,
            clockGraphicsMax: 0,
            clockMemory: 0,
            clockMemoryMax: 0,
            clockSoc: 0,
            
            memoryTotal: parseInt(parts[0]) / (1024 * 1024) || 0,
            memoryUsed: 0,
            memoryFree: 0,
            memoryBandwidth: 0,
            
            utilizationGpu: 0,
            utilizationMemory: 0,
            utilizationMediaEngine: 0,
            
            fanSpeed: 0,
            fanSpeedMax: 100,
            fanRpm: 0,
            
            pcieLinkGen: 0,
            pcieLinkGenMax: 0,
            pcieLinkWidth: 0,
            pcieLinkWidthMax: 0,
            pcieBandwidth: 0,
            
            voltageGraphics: 0,
            voltageSoc: 0,
            voltageMemory: 0
          });
        }
      });

      this.lastData = gpus;
      return gpus;
    } catch (err) {
      logger.error('Failed to get WMIC AMD data:', err);
      return this.lastData;
    }
  }

  async getGPUData(index: number): Promise<AMDGPUData | null> {
    const allData = await this.getAllGPUData();
    return allData.find(g => g.index === index) || null;
  }

  getLastData(): AMDGPUData[] {
    return this.lastData;
  }
}

export const amdGPU = new AMDGPUService();
export default amdGPU;
