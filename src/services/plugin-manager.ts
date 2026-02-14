import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { PluginMetadata, PluginInstance, SensorReading } from '../types/hardware.js';
import { createChildLogger } from '../core/logger.js';

const logger = createChildLogger('plugin-manager');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGINS_DIR = path.join(__dirname, '../../plugins');
const PLUGINS_CONFIG_PATH = path.join(__dirname, '../../config/plugins.json');

export interface Plugin {
  metadata: PluginMetadata;
  init(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  poll(): Promise<SensorReading[]>;
  destroy(): Promise<void>;
}

export class PluginManager extends EventEmitter {
  private plugins: Map<string, Plugin> = new Map();
  private instances: Map<string, PluginInstance> = new Map();
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(PLUGINS_DIR)) {
      fs.mkdirSync(PLUGINS_DIR, { recursive: true });
    }
  }

  async loadPlugins(): Promise<void> {
    logger.info('Loading plugins...');

    try {
      const entries = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          await this.loadPlugin(entry.name);
        }
      }

      logger.info(`Loaded ${this.plugins.size} plugins`);
    } catch (err) {
      logger.error('Failed to load plugins:', err);
    }
  }

  async loadPlugin(pluginId: string): Promise<boolean> {
    const pluginPath = path.join(PLUGINS_DIR, pluginId);
    const manifestPath = path.join(pluginPath, 'manifest.json');
    const indexPath = path.join(pluginPath, 'index.js');

    try {
      if (!fs.existsSync(manifestPath)) {
        logger.warn(`Plugin ${pluginId} missing manifest.json`);
        return false;
      }

      if (!fs.existsSync(indexPath)) {
        logger.warn(`Plugin ${pluginId} missing index.js`);
        return false;
      }

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as PluginMetadata;
      const pluginModule = await import(`file://${indexPath}`);
      const plugin: Plugin = new pluginModule.default(manifest);

      await plugin.init();

      this.plugins.set(pluginId, plugin);
      this.instances.set(pluginId, {
        metadata: manifest,
        enabled: true,
        loaded: true,
        error: null,
        lastUpdate: Date.now()
      });

      logger.info(`Loaded plugin: ${manifest.name} v${manifest.version}`);
      return true;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to load plugin ${pluginId}:`, err);

      this.instances.set(pluginId, {
        metadata: {
          id: pluginId,
          name: pluginId,
          version: '0.0.0',
          author: 'Unknown',
          description: '',
          homepage: '',
          repository: '',
          license: '',
          sensors: [],
          dependencies: {}
        },
        enabled: false,
        loaded: false,
        error,
        lastUpdate: Date.now()
      });

      return false;
    }
  }

  async unloadPlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    try {
      await this.stopPlugin(pluginId);
      await plugin.destroy();
      this.plugins.delete(pluginId);
      this.instances.delete(pluginId);
      logger.info(`Unloaded plugin: ${pluginId}`);
      return true;
    } catch (err) {
      logger.error(`Failed to unload plugin ${pluginId}:`, err);
      return false;
    }
  }

  async startPlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    try {
      await plugin.start();

      const interval = setInterval(async () => {
        try {
          const readings = await plugin.poll();
          if (readings.length > 0) {
            this.emit('readings', readings);
          }
          const instance = this.instances.get(pluginId);
          if (instance) {
            instance.lastUpdate = Date.now();
          }
        } catch (err) {
          logger.error(`Plugin ${pluginId} poll error:`, err);
        }
      }, 1000);

      this.pollingIntervals.set(pluginId, interval);

      const instance = this.instances.get(pluginId);
      if (instance) {
        instance.enabled = true;
      }

      logger.info(`Started plugin: ${pluginId}`);
      return true;
    } catch (err) {
      logger.error(`Failed to start plugin ${pluginId}:`, err);
      return false;
    }
  }

  async stopPlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    try {
      const interval = this.pollingIntervals.get(pluginId);
      if (interval) {
        clearInterval(interval);
        this.pollingIntervals.delete(pluginId);
      }

      await plugin.stop();

      const instance = this.instances.get(pluginId);
      if (instance) {
        instance.enabled = false;
      }

      logger.info(`Stopped plugin: ${pluginId}`);
      return true;
    } catch (err) {
      logger.error(`Failed to stop plugin ${pluginId}:`, err);
      return false;
    }
  }

  async startAll(): Promise<void> {
    for (const pluginId of this.plugins.keys()) {
      await this.startPlugin(pluginId);
    }
  }

  async stopAll(): Promise<void> {
    for (const pluginId of this.plugins.keys()) {
      await this.stopPlugin(pluginId);
    }
  }

  getPlugin(pluginId: string): Plugin | null {
    return this.plugins.get(pluginId) || null;
  }

  getInstance(pluginId: string): PluginInstance | null {
    return this.instances.get(pluginId) || null;
  }

  getAllInstances(): PluginInstance[] {
    return Array.from(this.instances.values());
  }

  getLoadedPlugins(): string[] {
    return Array.from(this.plugins.keys());
  }

  async installPlugin(source: string): Promise<boolean> {
    logger.info(`Installing plugin from: ${source}`);
    return false;
  }

  async uninstallPlugin(pluginId: string): Promise<boolean> {
    await this.unloadPlugin(pluginId);

    const pluginPath = path.join(PLUGINS_DIR, pluginId);
    if (fs.existsSync(pluginPath)) {
      fs.rmSync(pluginPath, { recursive: true, force: true });
      logger.info(`Uninstalled plugin: ${pluginId}`);
      return true;
    }

    return false;
  }
}

export const pluginManager = new PluginManager();
export default pluginManager;
