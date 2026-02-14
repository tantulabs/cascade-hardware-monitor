import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Joi from 'joi';
import type { MonitorConfig } from '../types/hardware.js';
import { createChildLogger } from './logger.js';

const logger = createChildLogger('config');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONFIG_PATH = path.join(__dirname, '../../config/settings.json');
const CONFIG_DIR = path.dirname(CONFIG_PATH);

const configSchema = Joi.object<MonitorConfig>({
  pollingInterval: Joi.number().min(100).max(60000).default(1000),
  enabledSensors: Joi.array().items(Joi.string()).default([
    'cpu', 'gpu', 'memory', 'disk', 'network', 'bluetooth', 'audio', 'battery', 'usb'
  ]),
  apiPort: Joi.number().min(1024).max(65535).default(8085),
  wsPort: Joi.number().min(1024).max(65535).default(8086),
  enableAuth: Joi.boolean().default(false),
  apiKey: Joi.string().allow('').default(''),
  enableHistory: Joi.boolean().default(true),
  historyRetention: Joi.number().min(60).max(86400 * 30).default(3600),
  enableAlerts: Joi.boolean().default(true),
  startMinimized: Joi.boolean().default(false),
  startWithWindows: Joi.boolean().default(false),
  theme: Joi.string().valid('light', 'dark', 'system').default('system'),
  language: Joi.string().default('en')
});

const defaultConfig: MonitorConfig = {
  pollingInterval: 1000,
  enabledSensors: ['cpu', 'gpu', 'memory', 'disk', 'network', 'bluetooth', 'audio', 'battery', 'usb'],
  apiPort: 8085,
  wsPort: 8086,
  enableAuth: false,
  apiKey: '',
  enableHistory: true,
  historyRetention: 3600,
  enableAlerts: true,
  startMinimized: false,
  startWithWindows: false,
  theme: 'system',
  language: 'en'
};

let currentConfig: MonitorConfig = { ...defaultConfig };

export function loadConfig(): MonitorConfig {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    if (fs.existsSync(CONFIG_PATH)) {
      const rawData = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const parsed = JSON.parse(rawData);
      const { value, error } = configSchema.validate(parsed, { stripUnknown: true });
      
      if (error) {
        logger.warn(`Config validation error: ${error.message}. Using defaults.`);
        currentConfig = { ...defaultConfig };
      } else {
        currentConfig = value as MonitorConfig;
      }
    } else {
      saveConfig(defaultConfig);
      currentConfig = { ...defaultConfig };
    }
  } catch (err) {
    logger.error('Failed to load config:', err);
    currentConfig = { ...defaultConfig };
  }

  return currentConfig;
}

export function saveConfig(config: Partial<MonitorConfig>): MonitorConfig {
  try {
    const merged = { ...currentConfig, ...config };
    const { value, error } = configSchema.validate(merged, { stripUnknown: true });

    if (error) {
      throw new Error(`Invalid config: ${error.message}`);
    }

    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(value, null, 2), 'utf-8');
    currentConfig = value as MonitorConfig;
    logger.info('Configuration saved successfully');
  } catch (err) {
    logger.error('Failed to save config:', err);
    throw err;
  }

  return currentConfig;
}

export function getConfig(): MonitorConfig {
  return { ...currentConfig };
}

export function updateConfig(updates: Partial<MonitorConfig>): MonitorConfig {
  return saveConfig(updates);
}

export function resetConfig(): MonitorConfig {
  return saveConfig(defaultConfig);
}

loadConfig();

export default {
  load: loadConfig,
  save: saveConfig,
  get: getConfig,
  update: updateConfig,
  reset: resetConfig
};
