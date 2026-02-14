import { exec } from 'child_process';
import { promisify } from 'util';
import { createChildLogger } from '../core/logger.js';

const execAsync = promisify(exec);
const logger = createChildLogger('fan-controller');

export interface FanChannel {
  id: string;
  name: string;
  speed: number;
  speedPercent: number;
  rpm: number | null;
  minSpeed: number;
  maxSpeed: number;
  mode: 'auto' | 'manual' | 'curve' | 'fixed';
  pwm: number | null;
  controllable: boolean;
}

export interface FanController {
  id: string;
  name: string;
  type: FanControllerType;
  vendor: string;
  model: string;
  firmware: string | null;
  channels: FanChannel[];
  connected: boolean;
  usbPath: string | null;
}

export type FanControllerType = 
  | 'nzxt-kraken'
  | 'nzxt-grid'
  | 'nzxt-smart-device'
  | 'corsair-commander'
  | 'corsair-lighting-node'
  | 'corsair-hydro'
  | 'aquacomputer-quadro'
  | 'aquacomputer-octo'
  | 'aquacomputer-farbwerk'
  | 'aquacomputer-d5next'
  | 'argus-monitor'
  | 'pwm-controller'
  | 'motherboard'
  | 'gpu'
  | 'unknown';

export interface FanControllerData {
  available: boolean;
  controllers: FanController[];
  totalChannels: number;
  sources: {
    liquidctl: boolean;
    openRGB: boolean;
    fanControl: boolean;
    motherboard: boolean;
    gpu: boolean;
  };
  timestamp: number;
}

class FanControllerService {
  private controllers: FanController[] = [];
  private liquidctlAvailable = false;
  private openRGBAvailable = false;
  private fanControlAvailable = false;

  async initialize(): Promise<boolean> {
    logger.info('Initializing fan controller service...');

    const checks = await Promise.all([
      this.checkLiquidctl(),
      this.checkOpenRGB(),
      this.checkFanControl(),
      this.detectMotherboardFans(),
      this.detectGPUFans()
    ]);

    this.liquidctlAvailable = checks[0];
    this.openRGBAvailable = checks[1];
    this.fanControlAvailable = checks[2];

    const available = this.controllers.length > 0 || 
                      this.liquidctlAvailable || 
                      this.openRGBAvailable;

    logger.info(`Fan controller service initialized. Controllers: ${this.controllers.length}`);
    return available;
  }

  private async checkLiquidctl(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('liquidctl --version', { timeout: 5000 });
      if (stdout.includes('liquidctl')) {
        logger.info('liquidctl available');
        return true;
      }
    } catch {}
    return false;
  }

  private async checkOpenRGB(): Promise<boolean> {
    try {
      // OpenRGB SDK server check
      const { stdout } = await execAsync('openrgb --version 2>/dev/null || echo ""', { timeout: 5000 });
      if (stdout.includes('OpenRGB')) {
        logger.info('OpenRGB available');
        return true;
      }
    } catch {}
    return false;
  }

  private async checkFanControl(): Promise<boolean> {
    if (process.platform !== 'win32') return false;
    
    try {
      // Check if FanControl is running
      const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq FanControl.exe" /NH', { timeout: 5000 });
      if (stdout.includes('FanControl.exe')) {
        logger.info('FanControl detected');
        return true;
      }
    } catch {}
    return false;
  }

  private async detectMotherboardFans(): Promise<void> {
    try {
      if (process.platform === 'linux') {
        // Use pwmconfig/fancontrol detection
        const { stdout } = await execAsync('ls /sys/class/hwmon/*/pwm* 2>/dev/null || echo ""', { timeout: 5000 });
        
        if (stdout.trim()) {
          const pwmPaths = stdout.trim().split('\n').filter(p => p && !p.includes('_'));
          
          if (pwmPaths.length > 0) {
            const channels: FanChannel[] = [];
            
            for (let i = 0; i < pwmPaths.length; i++) {
              const pwmPath = pwmPaths[i];
              const fanName = `System Fan ${i + 1}`;
              
              let pwmValue = 0;
              let rpm: number | null = null;
              
              try {
                const { stdout: pwmOut } = await execAsync(`cat ${pwmPath}`);
                pwmValue = parseInt(pwmOut.trim()) || 0;
                
                const rpmPath = pwmPath.replace(/pwm(\d+)$/, 'fan$1_input');
                const { stdout: rpmOut } = await execAsync(`cat ${rpmPath} 2>/dev/null || echo ""`);
                rpm = parseInt(rpmOut.trim()) || null;
              } catch {}

              channels.push({
                id: `mb-fan-${i}`,
                name: fanName,
                speed: Math.round((pwmValue / 255) * 100),
                speedPercent: Math.round((pwmValue / 255) * 100),
                rpm,
                minSpeed: 0,
                maxSpeed: 100,
                mode: 'auto',
                pwm: pwmValue,
                controllable: true
              });
            }

            if (channels.length > 0) {
              this.controllers.push({
                id: 'motherboard',
                name: 'Motherboard Fan Controller',
                type: 'motherboard',
                vendor: 'System',
                model: 'PWM Controller',
                firmware: null,
                channels,
                connected: true,
                usbPath: null
              });
            }
          }
        }
      } else if (process.platform === 'win32') {
        // Try to get motherboard fans via WMI
        const { stdout } = await execAsync(
          'powershell -Command "Get-WmiObject -Namespace root/LibreHardwareMonitor -Class Sensor | Where-Object { $_.SensorType -eq \'Fan\' } | Select-Object Name, Value, Parent | ConvertTo-Json"',
          { timeout: 10000 }
        ).catch(() => ({ stdout: '[]' }));

        try {
          const data = JSON.parse(stdout || '[]');
          const fans = Array.isArray(data) ? data : [data];
          
          if (fans.length > 0 && fans[0]) {
            const channels: FanChannel[] = fans.filter(f => f && f.Value).map((f, i) => ({
              id: `mb-fan-${i}`,
              name: f.Name || `Fan ${i + 1}`,
              speed: 0,
              speedPercent: 0,
              rpm: Math.round(f.Value) || null,
              minSpeed: 0,
              maxSpeed: 100,
              mode: 'auto' as const,
              pwm: null,
              controllable: false
            }));

            if (channels.length > 0) {
              this.controllers.push({
                id: 'motherboard',
                name: 'Motherboard Fans',
                type: 'motherboard',
                vendor: 'System',
                model: 'Motherboard',
                firmware: null,
                channels,
                connected: true,
                usbPath: null
              });
            }
          }
        } catch {}
      }
    } catch (err) {
      logger.debug('Motherboard fan detection failed:', err);
    }
  }

  private async detectGPUFans(): Promise<void> {
    try {
      // NVIDIA GPU fans
      const { stdout: nvidiaOut } = await execAsync(
        'nvidia-smi --query-gpu=index,name,fan.speed --format=csv,noheader,nounits',
        { timeout: 5000 }
      ).catch(() => ({ stdout: '' }));

      if (nvidiaOut.trim()) {
        const lines = nvidiaOut.trim().split('\n');
        const channels: FanChannel[] = [];

        for (const line of lines) {
          const [index, name, fanSpeed] = line.split(',').map(s => s.trim());
          channels.push({
            id: `nvidia-${index}`,
            name: `${name} Fan`,
            speed: parseInt(fanSpeed) || 0,
            speedPercent: parseInt(fanSpeed) || 0,
            rpm: null,
            minSpeed: 0,
            maxSpeed: 100,
            mode: 'auto',
            pwm: null,
            controllable: true
          });
        }

        if (channels.length > 0) {
          this.controllers.push({
            id: 'nvidia-gpu',
            name: 'NVIDIA GPU Fans',
            type: 'gpu',
            vendor: 'NVIDIA',
            model: 'GPU',
            firmware: null,
            channels,
            connected: true,
            usbPath: null
          });
        }
      }

      // AMD GPU fans via rocm-smi
      const { stdout: amdOut } = await execAsync(
        'rocm-smi --showfan 2>/dev/null || echo ""',
        { timeout: 5000 }
      ).catch(() => ({ stdout: '' }));

      if (amdOut.includes('Fan')) {
        const match = amdOut.match(/(\d+)%/);
        if (match) {
          this.controllers.push({
            id: 'amd-gpu',
            name: 'AMD GPU Fan',
            type: 'gpu',
            vendor: 'AMD',
            model: 'GPU',
            firmware: null,
            channels: [{
              id: 'amd-0',
              name: 'GPU Fan',
              speed: parseInt(match[1]),
              speedPercent: parseInt(match[1]),
              rpm: null,
              minSpeed: 0,
              maxSpeed: 100,
              mode: 'auto',
              pwm: null,
              controllable: true
            }],
            connected: true,
            usbPath: null
          });
        }
      }
    } catch (err) {
      logger.debug('GPU fan detection failed:', err);
    }
  }

  async getAllData(): Promise<FanControllerData> {
    // Refresh controller data
    await this.refreshControllers();

    return {
      available: this.controllers.length > 0,
      controllers: this.controllers,
      totalChannels: this.controllers.reduce((sum, c) => sum + c.channels.length, 0),
      sources: {
        liquidctl: this.liquidctlAvailable,
        openRGB: this.openRGBAvailable,
        fanControl: this.fanControlAvailable,
        motherboard: this.controllers.some(c => c.type === 'motherboard'),
        gpu: this.controllers.some(c => c.type === 'gpu')
      },
      timestamp: Date.now()
    };
  }

  private async refreshControllers(): Promise<void> {
    // Refresh liquidctl devices
    if (this.liquidctlAvailable) {
      await this.getLiquidctlDevices();
    }
  }

  private async getLiquidctlDevices(): Promise<void> {
    try {
      const { stdout } = await execAsync('liquidctl list --json', { timeout: 10000 });
      const devices = JSON.parse(stdout || '[]');

      for (const device of devices) {
        const existingIndex = this.controllers.findIndex(c => c.id === `liquidctl-${device.bus}:${device.address}`);
        
        const controller: FanController = {
          id: `liquidctl-${device.bus}:${device.address}`,
          name: device.description || 'Unknown Device',
          type: this.detectLiquidctlType(device.description),
          vendor: device.vendor || 'Unknown',
          model: device.product || 'Unknown',
          firmware: null,
          channels: [],
          connected: true,
          usbPath: `${device.bus}:${device.address}`
        };

        // Get device status for fan info
        try {
          const { stdout: statusOut } = await execAsync(
            `liquidctl --bus ${device.bus} --address ${device.address} status --json`,
            { timeout: 10000 }
          );
          const status = JSON.parse(statusOut || '[]');
          
          for (const item of status) {
            if (item.key && (item.key.toLowerCase().includes('fan') || item.key.toLowerCase().includes('pump'))) {
              const isRpm = item.unit === 'rpm';
              const isPercent = item.unit === '%';
              
              controller.channels.push({
                id: `${controller.id}-${item.key}`,
                name: item.key,
                speed: isPercent ? item.value : 0,
                speedPercent: isPercent ? item.value : 0,
                rpm: isRpm ? item.value : null,
                minSpeed: 0,
                maxSpeed: 100,
                mode: 'auto',
                pwm: null,
                controllable: true
              });
            }
          }
        } catch {}

        if (existingIndex >= 0) {
          this.controllers[existingIndex] = controller;
        } else {
          this.controllers.push(controller);
        }
      }
    } catch (err) {
      logger.debug('liquidctl device enumeration failed:', err);
    }
  }

  private detectLiquidctlType(description: string): FanControllerType {
    const desc = description.toLowerCase();
    
    if (desc.includes('kraken')) return 'nzxt-kraken';
    if (desc.includes('grid')) return 'nzxt-grid';
    if (desc.includes('smart device')) return 'nzxt-smart-device';
    if (desc.includes('commander')) return 'corsair-commander';
    if (desc.includes('lighting node')) return 'corsair-lighting-node';
    if (desc.includes('hydro') || desc.includes('h100') || desc.includes('h150')) return 'corsair-hydro';
    if (desc.includes('quadro')) return 'aquacomputer-quadro';
    if (desc.includes('octo')) return 'aquacomputer-octo';
    if (desc.includes('farbwerk')) return 'aquacomputer-farbwerk';
    if (desc.includes('d5 next')) return 'aquacomputer-d5next';
    
    return 'unknown';
  }

  async setFanSpeed(controllerId: string, channelId: string, speed: number): Promise<boolean> {
    const controller = this.controllers.find(c => c.id === controllerId);
    if (!controller) return false;

    const channel = controller.channels.find(ch => ch.id === channelId);
    if (!channel || !channel.controllable) return false;

    const clampedSpeed = Math.max(0, Math.min(100, speed));

    try {
      if (controller.type === 'motherboard' && process.platform === 'linux') {
        // Set PWM directly
        const pwmValue = Math.round((clampedSpeed / 100) * 255);
        const pwmPath = `/sys/class/hwmon/hwmon*/pwm${channelId.split('-').pop()}`;
        await execAsync(`echo ${pwmValue} | sudo tee ${pwmPath}`);
        return true;
      }

      if (controller.type === 'gpu' && controller.vendor === 'NVIDIA') {
        const gpuIndex = channelId.split('-')[1];
        await execAsync(`nvidia-settings -a "[gpu:${gpuIndex}]/GPUFanControlState=1" -a "[fan:${gpuIndex}]/GPUTargetFanSpeed=${clampedSpeed}"`);
        return true;
      }

      if (controller.id.startsWith('liquidctl-')) {
        const [bus, address] = controller.usbPath!.split(':');
        await execAsync(`liquidctl --bus ${bus} --address ${address} set fan speed ${clampedSpeed}`);
        return true;
      }

      return false;
    } catch (err) {
      logger.error(`Failed to set fan speed for ${channelId}:`, err);
      return false;
    }
  }

  async setFanMode(controllerId: string, channelId: string, mode: 'auto' | 'manual'): Promise<boolean> {
    const controller = this.controllers.find(c => c.id === controllerId);
    if (!controller) return false;

    try {
      if (controller.type === 'motherboard' && process.platform === 'linux') {
        const pwmEnablePath = `/sys/class/hwmon/hwmon*/pwm${channelId.split('-').pop()}_enable`;
        const value = mode === 'auto' ? '2' : '1';
        await execAsync(`echo ${value} | sudo tee ${pwmEnablePath}`);
        return true;
      }

      if (controller.type === 'gpu' && controller.vendor === 'NVIDIA') {
        const gpuIndex = channelId.split('-')[1];
        const state = mode === 'auto' ? '0' : '1';
        await execAsync(`nvidia-settings -a "[gpu:${gpuIndex}]/GPUFanControlState=${state}"`);
        return true;
      }

      return false;
    } catch (err) {
      logger.error(`Failed to set fan mode for ${channelId}:`, err);
      return false;
    }
  }

  getControllers(): FanController[] {
    return this.controllers;
  }

  getController(id: string): FanController | undefined {
    return this.controllers.find(c => c.id === id);
  }
}

export const fanController = new FanControllerService();
export default fanController;
