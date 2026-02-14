import { exec } from 'child_process';
import { promisify } from 'util';
import { createChildLogger } from '../core/logger.js';

const execAsync = promisify(exec);
const logger = createChildLogger('macos-control');

export interface MacOSPowerMode {
  id: string;
  name: string;
  description: string;
  active: boolean;
}

export interface MacOSBatteryInfo {
  isCharging: boolean;
  currentCapacity: number;
  maxCapacity: number;
  designCapacity: number;
  cycleCount: number;
  health: string;
  temperature: number;
  voltage: number;
  amperage: number;
  wattage: number;
  timeRemaining: number;
  fullyCharged: boolean;
  externalConnected: boolean;
}

export interface MacOSThermalInfo {
  cpuTemperature: number;
  gpuTemperature: number;
  batteryTemperature: number;
  thermalPressure: string;
  fanSpeed: number[];
}

class MacOSControlService {
  private available: boolean = false;

  async initialize(): Promise<void> {
    if (process.platform !== 'darwin') {
      logger.info('Not running on macOS, macOS control service disabled');
      return;
    }

    this.available = true;
    logger.info('macOS control service initialized');
  }

  isAvailable(): boolean {
    return this.available;
  }

  // Power Management
  async getPowerModes(): Promise<MacOSPowerMode[]> {
    if (!this.available) return [];

    try {
      const { stdout } = await execAsync('pmset -g custom');
      const modes: MacOSPowerMode[] = [];

      // Parse power modes from pmset output
      const lines = stdout.split('\n');
      let currentMode = '';

      for (const line of lines) {
        if (line.includes('Battery Power')) {
          currentMode = 'battery';
        } else if (line.includes('AC Power')) {
          currentMode = 'ac';
        }
      }

      // Get current power source
      const { stdout: sourceOutput } = await execAsync('pmset -g ps');
      const isOnBattery = sourceOutput.includes('Battery Power');

      modes.push({
        id: 'low_power',
        name: 'Low Power Mode',
        description: 'Reduces energy usage to extend battery life',
        active: await this.isLowPowerModeEnabled()
      });

      modes.push({
        id: 'normal',
        name: 'Normal',
        description: 'Balanced performance and energy usage',
        active: !await this.isLowPowerModeEnabled()
      });

      return modes;
    } catch (err) {
      logger.error('Failed to get power modes:', err);
      return [];
    }
  }

  async isLowPowerModeEnabled(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('pmset -g');
      return stdout.includes('lowpowermode') && stdout.includes('1');
    } catch {
      return false;
    }
  }

  async setLowPowerMode(enabled: boolean): Promise<boolean> {
    if (!this.available) return false;

    try {
      // Note: This requires sudo privileges
      await execAsync(`sudo pmset -a lowpowermode ${enabled ? 1 : 0}`);
      return true;
    } catch (err) {
      logger.error('Failed to set low power mode (may require sudo):', err);
      return false;
    }
  }

  // Display Brightness
  async getDisplayBrightness(): Promise<number | null> {
    if (!this.available) return null;

    try {
      // Use brightness command if available, otherwise AppleScript
      try {
        const { stdout } = await execAsync('brightness -l 2>/dev/null | grep "display" | head -1 | awk \'{print $NF}\'');
        const brightness = parseFloat(stdout.trim());
        if (!isNaN(brightness)) {
          return Math.round(brightness * 100);
        }
      } catch {
        // Fall back to AppleScript
      }

      const { stdout } = await execAsync(
        'osascript -e \'tell application "System Events" to tell appearance preferences to get dark mode\''
      );
      // AppleScript brightness control is limited, return null if not available
      return null;
    } catch {
      return null;
    }
  }

  async setDisplayBrightness(level: number): Promise<boolean> {
    if (!this.available) return false;

    const brightness = Math.max(0, Math.min(100, level)) / 100;

    try {
      // Try using brightness command
      await execAsync(`brightness ${brightness}`);
      return true;
    } catch {
      try {
        // Fall back to osascript
        await execAsync(
          `osascript -e 'tell application "System Preferences" to set brightness of display 1 to ${brightness}'`
        );
        return true;
      } catch (err) {
        logger.error('Failed to set brightness:', err);
        return false;
      }
    }
  }

  // Battery Information
  async getBatteryInfo(): Promise<MacOSBatteryInfo | null> {
    if (!this.available) return null;

    try {
      const { stdout } = await execAsync('ioreg -r -c AppleSmartBattery -d 1');
      
      const getValue = (key: string): any => {
        const match = stdout.match(new RegExp(`"${key}"\\s*=\\s*([^\\n]+)`));
        if (match) {
          const value = match[1].trim();
          if (value === 'Yes') return true;
          if (value === 'No') return false;
          const num = parseInt(value);
          return isNaN(num) ? value : num;
        }
        return null;
      };

      const currentCapacity = getValue('CurrentCapacity') || 0;
      const maxCapacity = getValue('MaxCapacity') || 100;
      const designCapacity = getValue('DesignCapacity') || maxCapacity;

      return {
        isCharging: getValue('IsCharging') || false,
        currentCapacity,
        maxCapacity,
        designCapacity,
        cycleCount: getValue('CycleCount') || 0,
        health: maxCapacity / designCapacity > 0.8 ? 'Good' : maxCapacity / designCapacity > 0.5 ? 'Fair' : 'Poor',
        temperature: (getValue('Temperature') || 0) / 100,
        voltage: (getValue('Voltage') || 0) / 1000,
        amperage: getValue('Amperage') || 0,
        wattage: ((getValue('Voltage') || 0) / 1000) * ((getValue('Amperage') || 0) / 1000),
        timeRemaining: getValue('TimeRemaining') || 0,
        fullyCharged: getValue('FullyCharged') || false,
        externalConnected: getValue('ExternalConnected') || false
      };
    } catch (err) {
      logger.error('Failed to get battery info:', err);
      return null;
    }
  }

  // Thermal Information
  async getThermalInfo(): Promise<MacOSThermalInfo | null> {
    if (!this.available) return null;

    try {
      // Get thermal pressure
      const { stdout: thermalOutput } = await execAsync('pmset -g therm 2>/dev/null || echo "nominal"');
      const thermalPressure = thermalOutput.toLowerCase().includes('heavy') ? 'heavy' :
                              thermalOutput.toLowerCase().includes('moderate') ? 'moderate' :
                              thermalOutput.toLowerCase().includes('light') ? 'light' : 'nominal';

      // Try to get fan speeds
      let fanSpeeds: number[] = [];
      try {
        const { stdout: fanOutput } = await execAsync('ioreg -r -c AppleSMC | grep -i fan');
        const matches = fanOutput.match(/\d+/g);
        if (matches) {
          fanSpeeds = matches.map(m => parseInt(m)).filter(n => n > 0 && n < 10000);
        }
      } catch {
        // Fan info not available
      }

      return {
        cpuTemperature: 0, // Requires elevated privileges or third-party tools
        gpuTemperature: 0,
        batteryTemperature: 0,
        thermalPressure,
        fanSpeed: fanSpeeds
      };
    } catch (err) {
      logger.error('Failed to get thermal info:', err);
      return null;
    }
  }

  // System Sleep/Wake
  async preventSleep(reason: string = 'Hardware monitoring'): Promise<{ success: boolean; pid?: number }> {
    if (!this.available) return { success: false };

    try {
      // caffeinate prevents sleep
      const { stdout } = await execAsync(`caffeinate -d -i -s -u &; echo $!`);
      const pid = parseInt(stdout.trim());
      return { success: true, pid };
    } catch (err) {
      logger.error('Failed to prevent sleep:', err);
      return { success: false };
    }
  }

  async allowSleep(pid?: number): Promise<boolean> {
    if (!this.available) return false;

    try {
      if (pid) {
        await execAsync(`kill ${pid} 2>/dev/null || true`);
      } else {
        await execAsync('pkill caffeinate 2>/dev/null || true');
      }
      return true;
    } catch {
      return false;
    }
  }

  // Volume Control
  async getVolume(): Promise<number | null> {
    if (!this.available) return null;

    try {
      const { stdout } = await execAsync('osascript -e "output volume of (get volume settings)"');
      return parseInt(stdout.trim());
    } catch {
      return null;
    }
  }

  async setVolume(level: number): Promise<boolean> {
    if (!this.available) return false;

    const volume = Math.max(0, Math.min(100, level));

    try {
      await execAsync(`osascript -e "set volume output volume ${volume}"`);
      return true;
    } catch (err) {
      logger.error('Failed to set volume:', err);
      return false;
    }
  }

  async isMuted(): Promise<boolean> {
    if (!this.available) return false;

    try {
      const { stdout } = await execAsync('osascript -e "output muted of (get volume settings)"');
      return stdout.trim() === 'true';
    } catch {
      return false;
    }
  }

  async setMuted(muted: boolean): Promise<boolean> {
    if (!this.available) return false;

    try {
      await execAsync(`osascript -e "set volume output muted ${muted}"`);
      return true;
    } catch (err) {
      logger.error('Failed to set mute:', err);
      return false;
    }
  }

  // Dark Mode
  async isDarkMode(): Promise<boolean> {
    if (!this.available) return false;

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
    if (!this.available) return false;

    try {
      await execAsync(
        `osascript -e 'tell application "System Events" to tell appearance preferences to set dark mode to ${enabled}'`
      );
      return true;
    } catch (err) {
      logger.error('Failed to set dark mode:', err);
      return false;
    }
  }

  // Do Not Disturb
  async isDoNotDisturbEnabled(): Promise<boolean> {
    if (!this.available) return false;

    try {
      const { stdout } = await execAsync(
        'defaults -currentHost read com.apple.notificationcenterui doNotDisturb 2>/dev/null || echo 0'
      );
      return stdout.trim() === '1';
    } catch {
      return false;
    }
  }

  // Night Shift
  async isNightShiftEnabled(): Promise<boolean> {
    if (!this.available) return false;

    try {
      const { stdout } = await execAsync(
        'defaults read com.apple.CoreBrightness CBBlueReductionStatus 2>/dev/null | grep -c "BlueReductionEnabled = 1" || echo 0'
      );
      return parseInt(stdout.trim()) > 0;
    } catch {
      return false;
    }
  }

  // System Information
  async getSystemInfo(): Promise<any> {
    if (!this.available) return null;

    try {
      const { stdout } = await execAsync('system_profiler SPHardwareDataType -json');
      const data = JSON.parse(stdout);
      
      if (data.SPHardwareDataType && data.SPHardwareDataType[0]) {
        const hw = data.SPHardwareDataType[0];
        return {
          modelName: hw.machine_model,
          modelIdentifier: hw.machine_name,
          chipType: hw.chip_type || hw.cpu_type,
          totalCores: hw.number_processors,
          memory: hw.physical_memory,
          serialNumber: hw.serial_number,
          hardwareUUID: hw.platform_UUID,
          provisioningUDID: hw.provisioning_UDID,
          activationLockStatus: hw.activation_lock_status
        };
      }
      return null;
    } catch (err) {
      logger.error('Failed to get system info:', err);
      return null;
    }
  }
}

export const macosControl = new MacOSControlService();
export default macosControl;
