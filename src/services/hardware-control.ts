import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface PowerProfile {
  id: string;
  name: string;
  description: string;
  active: boolean;
}

export interface FanControl {
  id: string;
  name: string;
  currentSpeed: number;
  targetSpeed: number;
  mode: 'auto' | 'manual';
  minSpeed: number;
  maxSpeed: number;
}

export interface GPUPowerLimit {
  gpuIndex: number;
  currentLimit: number;
  defaultLimit: number;
  minLimit: number;
  maxLimit: number;
}

export interface ProcessPriority {
  pid: number;
  name: string;
  priority: 'idle' | 'below_normal' | 'normal' | 'above_normal' | 'high' | 'realtime';
}

export interface ControlCapabilities {
  powerProfiles: boolean;
  fanControl: boolean;
  gpuPowerLimit: boolean;
  processPriority: boolean;
  cpuAffinity: boolean;
  displayBrightness: boolean;
  volume: boolean;
  darkMode: boolean;
  lowPowerMode: boolean;
  preventSleep: boolean;
}

class HardwareControlService {
  private platform: string;
  private capabilities: ControlCapabilities;

  constructor() {
    this.platform = process.platform;
    this.capabilities = {
      powerProfiles: this.platform === 'win32',
      fanControl: false,
      gpuPowerLimit: false,
      processPriority: true,
      cpuAffinity: this.platform === 'win32',
      displayBrightness: this.platform === 'win32' || this.platform === 'darwin',
      volume: this.platform === 'darwin',
      darkMode: this.platform === 'darwin',
      lowPowerMode: this.platform === 'darwin',
      preventSleep: this.platform === 'darwin' || this.platform === 'win32'
    };
  }

  async initialize(): Promise<void> {
    // Check for NVIDIA GPU power control
    try {
      await execAsync('nvidia-smi --query-gpu=power.limit --format=csv,noheader');
      this.capabilities.gpuPowerLimit = true;
    } catch {
      this.capabilities.gpuPowerLimit = false;
    }
  }

  getCapabilities(): ControlCapabilities {
    return { ...this.capabilities };
  }

  // Power Profiles (Windows)
  async getPowerProfiles(): Promise<PowerProfile[]> {
    if (this.platform !== 'win32') {
      return [];
    }

    try {
      const { stdout } = await execAsync('powercfg /list');
      const lines = stdout.split('\n');
      const profiles: PowerProfile[] = [];
      
      for (const line of lines) {
        const match = line.match(/GUID:\s*([a-f0-9-]+)\s+\(([^)]+)\)(\s*\*)?/i);
        if (match) {
          profiles.push({
            id: match[1],
            name: match[2].trim(),
            description: this.getPowerProfileDescription(match[2].trim()),
            active: !!match[3]
          });
        }
      }
      
      return profiles;
    } catch {
      return [];
    }
  }

  private getPowerProfileDescription(name: string): string {
    const descriptions: Record<string, string> = {
      'Balanced': 'Automatically balances performance with energy consumption',
      'High performance': 'Maximizes system performance at the cost of energy',
      'Power saver': 'Reduces system performance to save energy',
      'Ultimate Performance': 'Maximum performance for high-end systems'
    };
    return descriptions[name] || 'Custom power profile';
  }

  async setActivePowerProfile(profileId: string): Promise<boolean> {
    if (this.platform !== 'win32') {
      return false;
    }

    try {
      await execAsync(`powercfg /setactive ${profileId}`);
      return true;
    } catch {
      return false;
    }
  }

  // GPU Power Limit (NVIDIA)
  async getGPUPowerLimits(): Promise<GPUPowerLimit[]> {
    if (!this.capabilities.gpuPowerLimit) {
      return [];
    }

    try {
      const { stdout } = await execAsync(
        'nvidia-smi --query-gpu=index,power.limit,power.default_limit,power.min_limit,power.max_limit --format=csv,noheader,nounits'
      );
      
      return stdout.trim().split('\n').map(line => {
        const [index, current, defaultLimit, min, max] = line.split(',').map(s => parseFloat(s.trim()));
        return {
          gpuIndex: index,
          currentLimit: current,
          defaultLimit: defaultLimit,
          minLimit: min,
          maxLimit: max
        };
      });
    } catch {
      return [];
    }
  }

  async setGPUPowerLimit(gpuIndex: number, powerLimit: number): Promise<boolean> {
    if (!this.capabilities.gpuPowerLimit) {
      return false;
    }

    try {
      await execAsync(`nvidia-smi -i ${gpuIndex} -pl ${powerLimit}`);
      return true;
    } catch {
      return false;
    }
  }

  // Process Priority
  async setProcessPriority(pid: number, priority: ProcessPriority['priority']): Promise<boolean> {
    const priorityMap: Record<string, string> = {
      idle: this.platform === 'win32' ? 'idle' : '19',
      below_normal: this.platform === 'win32' ? 'belownormal' : '10',
      normal: this.platform === 'win32' ? 'normal' : '0',
      above_normal: this.platform === 'win32' ? 'abovenormal' : '-5',
      high: this.platform === 'win32' ? 'high' : '-10',
      realtime: this.platform === 'win32' ? 'realtime' : '-20'
    };

    try {
      if (this.platform === 'win32') {
        await execAsync(`wmic process where processid="${pid}" CALL setpriority "${priorityMap[priority]}"`);
      } else {
        await execAsync(`renice ${priorityMap[priority]} -p ${pid}`);
      }
      return true;
    } catch {
      return false;
    }
  }

  // CPU Affinity
  async setProcessAffinity(pid: number, cpuMask: number): Promise<boolean> {
    if (this.platform !== 'win32') {
      return false;
    }

    try {
      // PowerShell command to set CPU affinity
      const cmd = `powershell -Command "(Get-Process -Id ${pid}).ProcessorAffinity = ${cpuMask}"`;
      await execAsync(cmd);
      return true;
    } catch {
      return false;
    }
  }

  // Display Brightness (Windows and macOS)
  async getDisplayBrightness(): Promise<number | null> {
    try {
      if (this.platform === 'win32') {
        const { stdout } = await execAsync(
          'powershell -Command "(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightness).CurrentBrightness"'
        );
        return parseInt(stdout.trim());
      } else if (this.platform === 'darwin') {
        // Try brightness command first
        try {
          const { stdout } = await execAsync('brightness -l 2>/dev/null | grep "display" | head -1 | awk \'{print $NF}\'');
          const brightness = parseFloat(stdout.trim());
          if (!isNaN(brightness)) {
            return Math.round(brightness * 100);
          }
        } catch {
          // brightness command not available
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  async setDisplayBrightness(brightness: number): Promise<boolean> {
    const level = Math.max(0, Math.min(100, brightness));
    
    try {
      if (this.platform === 'win32') {
        await execAsync(
          `powershell -Command "(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1, ${level})"`
        );
        return true;
      } else if (this.platform === 'darwin') {
        await execAsync(`brightness ${level / 100}`);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // macOS Volume Control
  async getVolume(): Promise<number | null> {
    if (this.platform !== 'darwin') return null;
    try {
      const { stdout } = await execAsync('osascript -e "output volume of (get volume settings)"');
      return parseInt(stdout.trim());
    } catch {
      return null;
    }
  }

  async setVolume(level: number): Promise<boolean> {
    if (this.platform !== 'darwin') return false;
    const volume = Math.max(0, Math.min(100, level));
    try {
      await execAsync(`osascript -e "set volume output volume ${volume}"`);
      return true;
    } catch {
      return false;
    }
  }

  async isMuted(): Promise<boolean> {
    if (this.platform !== 'darwin') return false;
    try {
      const { stdout } = await execAsync('osascript -e "output muted of (get volume settings)"');
      return stdout.trim() === 'true';
    } catch {
      return false;
    }
  }

  async setMuted(muted: boolean): Promise<boolean> {
    if (this.platform !== 'darwin') return false;
    try {
      await execAsync(`osascript -e "set volume output muted ${muted}"`);
      return true;
    } catch {
      return false;
    }
  }

  // macOS Dark Mode
  async isDarkMode(): Promise<boolean> {
    if (this.platform !== 'darwin') return false;
    try {
      const { stdout } = await execAsync(
        'osascript -e \'tell application "System Events" to tell appearance preferences to get dark mode\''
      );
      return stdout.trim() === 'true';
    } catch {
      return false;
    }
  }

  async setDarkMode(enabled: boolean): Promise<boolean> {
    if (this.platform !== 'darwin') return false;
    try {
      await execAsync(
        `osascript -e 'tell application "System Events" to tell appearance preferences to set dark mode to ${enabled}'`
      );
      return true;
    } catch {
      return false;
    }
  }

  // macOS Low Power Mode
  async isLowPowerMode(): Promise<boolean> {
    if (this.platform !== 'darwin') return false;
    try {
      const { stdout } = await execAsync('pmset -g | grep lowpowermode');
      return stdout.includes('1');
    } catch {
      return false;
    }
  }

  // Prevent Sleep (macOS and Windows)
  async preventSleep(): Promise<{ success: boolean; pid?: number }> {
    try {
      if (this.platform === 'darwin') {
        const { stdout } = await execAsync('caffeinate -d -i -s -u &; echo $!');
        return { success: true, pid: parseInt(stdout.trim()) };
      } else if (this.platform === 'win32') {
        await execAsync('powercfg -change -standby-timeout-ac 0');
        return { success: true };
      }
      return { success: false };
    } catch {
      return { success: false };
    }
  }

  async allowSleep(pid?: number): Promise<boolean> {
    try {
      if (this.platform === 'darwin') {
        if (pid) {
          await execAsync(`kill ${pid} 2>/dev/null || true`);
        } else {
          await execAsync('pkill caffeinate 2>/dev/null || true');
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // Kill Process
  async killProcess(pid: number, force: boolean = false): Promise<boolean> {
    try {
      if (this.platform === 'win32') {
        await execAsync(`taskkill ${force ? '/F' : ''} /PID ${pid}`);
      } else {
        await execAsync(`kill ${force ? '-9' : '-15'} ${pid}`);
      }
      return true;
    } catch {
      return false;
    }
  }

  // Restart Process
  async restartProcess(processPath: string): Promise<boolean> {
    try {
      if (this.platform === 'win32') {
        await execAsync(`start "" "${processPath}"`);
      } else {
        await execAsync(`"${processPath}" &`);
      }
      return true;
    } catch {
      return false;
    }
  }
}

export const hardwareControl = new HardwareControlService();
export default hardwareControl;
