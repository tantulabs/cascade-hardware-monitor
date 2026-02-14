import * as fs from 'fs';
import * as path from 'path';
import { createChildLogger } from '../core/logger.js';

const logger = createChildLogger('monitor-settings');

export interface MonitorSettings {
  cpu: {
    enabled: boolean;
    perCoreTemps: boolean;
    perCoreLoads: boolean;
    powerMonitoring: boolean;
    throttlingDetection: boolean;
    pollIntervalMs: number;
  };
  gpu: {
    enabled: boolean;
    nvidia: boolean;
    amd: boolean;
    intel: boolean;
    apple: boolean;
    processMonitoring: boolean;
    pollIntervalMs: number;
  };
  memory: {
    enabled: boolean;
    pollIntervalMs: number;
  };
  disk: {
    enabled: boolean;
    smartMonitoring: boolean;
    pollIntervalMs: number;
  };
  network: {
    enabled: boolean;
    pollIntervalMs: number;
  };
  mainboard: {
    enabled: boolean;
    voltages: boolean;
    temperatures: boolean;
    fans: boolean;
    vrm: boolean;
    chipset: boolean;
    pollIntervalMs: number;
  };
  fans: {
    enabled: boolean;
    controllers: boolean;
    pollIntervalMs: number;
  };
  advanced: {
    enabled: boolean;
    pcieBandwidth: boolean;
    thermalZones: boolean;
    powerDelivery: boolean;
    pollIntervalMs: number;
  };
  unified: {
    enabled: boolean;
    libreHardwareMonitor: boolean;
    lmSensors: boolean;
    ipmi: boolean;
    hwinfo: boolean;
  };
  inferred: {
    enabled: boolean;
    thermalHeadroom: boolean;
    efficiency: boolean;
    bottleneck: boolean;
    workload: boolean;
    health: boolean;
  };
  global: {
    defaultPollIntervalMs: number;
    maxConcurrentPolls: number;
    cacheResultsMs: number;
  };
}

const DEFAULT_SETTINGS: MonitorSettings = {
  cpu: {
    enabled: true,
    perCoreTemps: true,
    perCoreLoads: true,
    powerMonitoring: true,
    throttlingDetection: true,
    pollIntervalMs: 1000
  },
  gpu: {
    enabled: true,
    nvidia: true,
    amd: true,
    intel: true,
    apple: true,
    processMonitoring: true,
    pollIntervalMs: 1000
  },
  memory: {
    enabled: true,
    pollIntervalMs: 1000
  },
  disk: {
    enabled: true,
    smartMonitoring: true,
    pollIntervalMs: 5000
  },
  network: {
    enabled: true,
    pollIntervalMs: 1000
  },
  mainboard: {
    enabled: true,
    voltages: true,
    temperatures: true,
    fans: true,
    vrm: true,
    chipset: true,
    pollIntervalMs: 2000
  },
  fans: {
    enabled: true,
    controllers: true,
    pollIntervalMs: 2000
  },
  advanced: {
    enabled: true,
    pcieBandwidth: true,
    thermalZones: true,
    powerDelivery: true,
    pollIntervalMs: 5000
  },
  unified: {
    enabled: true,
    libreHardwareMonitor: true,
    lmSensors: true,
    ipmi: false,
    hwinfo: true
  },
  inferred: {
    enabled: true,
    thermalHeadroom: true,
    efficiency: true,
    bottleneck: true,
    workload: true,
    health: true
  },
  global: {
    defaultPollIntervalMs: 1000,
    maxConcurrentPolls: 3,
    cacheResultsMs: 500
  }
};

class MonitorSettingsService {
  private settings: MonitorSettings;
  private settingsPath: string;
  private listeners: Array<(settings: MonitorSettings) => void> = [];

  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.settingsPath = path.join(process.cwd(), 'data', 'monitor-settings.json');
  }

  async initialize(): Promise<void> {
    await this.load();
    logger.info('Monitor settings initialized');
  }

  private async load(): Promise<void> {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const content = await fs.promises.readFile(this.settingsPath, 'utf8');
        const loaded = JSON.parse(content);
        this.settings = this.mergeSettings(DEFAULT_SETTINGS, loaded);
        logger.info('Loaded monitor settings from file');
      }
    } catch (err) {
      logger.warn('Failed to load monitor settings, using defaults:', err);
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  private mergeSettings(defaults: MonitorSettings, loaded: Partial<MonitorSettings>): MonitorSettings {
    const merged = { ...defaults };
    
    for (const key of Object.keys(defaults) as Array<keyof MonitorSettings>) {
      if (loaded[key] !== undefined) {
        merged[key] = { ...defaults[key], ...loaded[key] } as any;
      }
    }
    
    return merged;
  }

  async save(): Promise<void> {
    try {
      const dir = path.dirname(this.settingsPath);
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
      }
      await fs.promises.writeFile(this.settingsPath, JSON.stringify(this.settings, null, 2));
      logger.info('Saved monitor settings');
    } catch (err) {
      logger.error('Failed to save monitor settings:', err);
    }
  }

  getSettings(): MonitorSettings {
    return { ...this.settings };
  }

  async updateSettings(updates: Partial<MonitorSettings>): Promise<MonitorSettings> {
    this.settings = this.mergeSettings(this.settings, updates);
    await this.save();
    this.notifyListeners();
    return this.getSettings();
  }

  async setMonitorEnabled(monitor: keyof MonitorSettings, enabled: boolean): Promise<void> {
    if (monitor in this.settings && typeof this.settings[monitor] === 'object') {
      (this.settings[monitor] as any).enabled = enabled;
      await this.save();
      this.notifyListeners();
      logger.info(`Monitor ${monitor} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  async setSubMonitorEnabled(monitor: keyof MonitorSettings, subMonitor: string, enabled: boolean): Promise<void> {
    if (monitor in this.settings && typeof this.settings[monitor] === 'object') {
      const monitorSettings = this.settings[monitor] as Record<string, any>;
      if (subMonitor in monitorSettings) {
        monitorSettings[subMonitor] = enabled;
        await this.save();
        this.notifyListeners();
        logger.info(`Sub-monitor ${monitor}.${subMonitor} ${enabled ? 'enabled' : 'disabled'}`);
      }
    }
  }

  isEnabled(monitor: keyof MonitorSettings): boolean {
    const setting = this.settings[monitor];
    if (typeof setting === 'object' && 'enabled' in setting) {
      return (setting as any).enabled;
    }
    return true;
  }

  isSubEnabled(monitor: keyof MonitorSettings, subMonitor: string): boolean {
    if (!this.isEnabled(monitor)) return false;
    
    const setting = this.settings[monitor] as Record<string, any>;
    if (subMonitor in setting) {
      return setting[subMonitor] === true;
    }
    return true;
  }

  getPollInterval(monitor: keyof MonitorSettings): number {
    const setting = this.settings[monitor] as Record<string, any>;
    return setting?.pollIntervalMs || this.settings.global.defaultPollIntervalMs;
  }

  async resetToDefaults(): Promise<MonitorSettings> {
    this.settings = { ...DEFAULT_SETTINGS };
    await this.save();
    this.notifyListeners();
    logger.info('Reset monitor settings to defaults');
    return this.getSettings();
  }

  onSettingsChange(callback: (settings: MonitorSettings) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.getSettings());
      } catch (err) {
        logger.error('Settings listener error:', err);
      }
    }
  }

  getEnabledMonitors(): string[] {
    const enabled: string[] = [];
    
    if (this.settings.cpu.enabled) enabled.push('cpu');
    if (this.settings.gpu.enabled) enabled.push('gpu');
    if (this.settings.memory.enabled) enabled.push('memory');
    if (this.settings.disk.enabled) enabled.push('disk');
    if (this.settings.network.enabled) enabled.push('network');
    if (this.settings.mainboard.enabled) enabled.push('mainboard');
    if (this.settings.fans.enabled) enabled.push('fans');
    if (this.settings.advanced.enabled) enabled.push('advanced');
    if (this.settings.unified.enabled) enabled.push('unified');
    if (this.settings.inferred.enabled) enabled.push('inferred');
    
    return enabled;
  }

  getDisabledMonitors(): string[] {
    const all = ['cpu', 'gpu', 'memory', 'disk', 'network', 'mainboard', 'fans', 'advanced', 'unified', 'inferred'];
    const enabled = this.getEnabledMonitors();
    return all.filter(m => !enabled.includes(m));
  }

  getPerformanceProfile(): 'minimal' | 'balanced' | 'full' {
    const enabled = this.getEnabledMonitors();
    if (enabled.length <= 3) return 'minimal';
    if (enabled.length <= 6) return 'balanced';
    return 'full';
  }

  async applyPreset(preset: 'minimal' | 'balanced' | 'full' | 'gaming' | 'server'): Promise<MonitorSettings> {
    switch (preset) {
      case 'minimal':
        return this.updateSettings({
          cpu: { ...this.settings.cpu, enabled: true, perCoreTemps: false, perCoreLoads: false, powerMonitoring: false },
          gpu: { ...this.settings.gpu, enabled: true, processMonitoring: false },
          memory: { ...this.settings.memory, enabled: true },
          disk: { ...this.settings.disk, enabled: false },
          network: { ...this.settings.network, enabled: false },
          mainboard: { ...this.settings.mainboard, enabled: false },
          fans: { ...this.settings.fans, enabled: false },
          advanced: { ...this.settings.advanced, enabled: false },
          unified: { ...this.settings.unified, enabled: false },
          inferred: { ...this.settings.inferred, enabled: false }
        });

      case 'balanced':
        return this.updateSettings({
          cpu: { ...this.settings.cpu, enabled: true, perCoreTemps: true, perCoreLoads: true, powerMonitoring: false },
          gpu: { ...this.settings.gpu, enabled: true, processMonitoring: false },
          memory: { ...this.settings.memory, enabled: true },
          disk: { ...this.settings.disk, enabled: true, smartMonitoring: false },
          network: { ...this.settings.network, enabled: true },
          mainboard: { ...this.settings.mainboard, enabled: false },
          fans: { ...this.settings.fans, enabled: true },
          advanced: { ...this.settings.advanced, enabled: false },
          unified: { ...this.settings.unified, enabled: false },
          inferred: { ...this.settings.inferred, enabled: true, health: false }
        });

      case 'full':
        return this.resetToDefaults();

      case 'gaming':
        return this.updateSettings({
          cpu: { ...this.settings.cpu, enabled: true, perCoreTemps: true, perCoreLoads: true, powerMonitoring: true, throttlingDetection: true },
          gpu: { ...this.settings.gpu, enabled: true, processMonitoring: true },
          memory: { ...this.settings.memory, enabled: true },
          disk: { ...this.settings.disk, enabled: false },
          network: { ...this.settings.network, enabled: false },
          mainboard: { ...this.settings.mainboard, enabled: true, voltages: false },
          fans: { ...this.settings.fans, enabled: true },
          advanced: { ...this.settings.advanced, enabled: false },
          unified: { ...this.settings.unified, enabled: false },
          inferred: { ...this.settings.inferred, enabled: true, bottleneck: true, thermalHeadroom: true, health: false }
        });

      case 'server':
        return this.updateSettings({
          cpu: { ...this.settings.cpu, enabled: true },
          gpu: { ...this.settings.gpu, enabled: false },
          memory: { ...this.settings.memory, enabled: true },
          disk: { ...this.settings.disk, enabled: true, smartMonitoring: true },
          network: { ...this.settings.network, enabled: true },
          mainboard: { ...this.settings.mainboard, enabled: true },
          fans: { ...this.settings.fans, enabled: true },
          advanced: { ...this.settings.advanced, enabled: true },
          unified: { ...this.settings.unified, enabled: true, ipmi: true },
          inferred: { ...this.settings.inferred, enabled: true, health: true }
        });

      default:
        return this.getSettings();
    }
  }
}

export const monitorSettings = new MonitorSettingsService();
export default monitorSettings;
