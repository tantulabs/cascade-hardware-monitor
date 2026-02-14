import { getConfig, updateConfig } from '../core/config.js';
import { hardwareMonitor } from './hardware-monitor.js';
import { createChildLogger } from '../core/logger.js';

const logger = createChildLogger('optimization');

export interface OptimizationProfile {
  name: string;
  pollingInterval: number;
  enabledSensors: string[];
  description: string;
}

export const OPTIMIZATION_PROFILES: OptimizationProfile[] = [
  {
    name: 'performance',
    pollingInterval: 500,
    enabledSensors: ['cpu', 'gpu', 'memory', 'disk', 'network', 'bluetooth', 'audio', 'battery', 'usb'],
    description: 'Maximum monitoring frequency for real-time data'
  },
  {
    name: 'balanced',
    pollingInterval: 1000,
    enabledSensors: ['cpu', 'gpu', 'memory', 'disk', 'network'],
    description: 'Good balance between detail and resource usage'
  },
  {
    name: 'efficiency',
    pollingInterval: 2000,
    enabledSensors: ['cpu', 'gpu', 'memory'],
    description: 'Lower resource usage, essential monitoring only'
  },
  {
    name: 'minimal',
    pollingInterval: 5000,
    enabledSensors: ['cpu', 'memory'],
    description: 'Minimal monitoring for background operation'
  }
];

export function applyOptimizationProfile(profileName: string): boolean {
  const profile = OPTIMIZATION_PROFILES.find(p => p.name === profileName);
  
  if (!profile) {
    logger.warn(`Unknown optimization profile: ${profileName}`);
    return false;
  }

  try {
    updateConfig({
      pollingInterval: profile.pollingInterval,
      enabledSensors: profile.enabledSensors
    });

    if (hardwareMonitor.isActive()) {
      hardwareMonitor.stop();
      hardwareMonitor.start();
    }

    logger.info(`Applied optimization profile: ${profile.name}`);
    return true;
  } catch (err) {
    logger.error('Failed to apply optimization profile:', err);
    return false;
  }
}

export function getCurrentProfile(): string | null {
  const config = getConfig();
  
  for (const profile of OPTIMIZATION_PROFILES) {
    if (
      config.pollingInterval === profile.pollingInterval &&
      JSON.stringify(config.enabledSensors.sort()) === JSON.stringify(profile.enabledSensors.sort())
    ) {
      return profile.name;
    }
  }
  
  return null;
}

export function getAvailableProfiles(): OptimizationProfile[] {
  return [...OPTIMIZATION_PROFILES];
}

export interface SystemResourceUsage {
  cpuUsage: number;
  memoryUsage: number;
  recommendation: string;
}

export async function analyzeResourceUsage(): Promise<SystemResourceUsage> {
  const snapshot = hardwareMonitor.getLastSnapshot();
  
  if (!snapshot) {
    return {
      cpuUsage: 0,
      memoryUsage: 0,
      recommendation: 'No data available'
    };
  }

  const cpuUsage = snapshot.cpu.load || 0;
  const memoryUsage = snapshot.memory.usedPercent || 0;

  let recommendation = 'balanced';
  
  if (cpuUsage > 80 || memoryUsage > 85) {
    recommendation = 'Consider switching to "minimal" profile to reduce system load';
  } else if (cpuUsage > 60 || memoryUsage > 70) {
    recommendation = 'Consider switching to "efficiency" profile';
  } else if (cpuUsage < 30 && memoryUsage < 50) {
    recommendation = 'System has resources available for "performance" profile';
  }

  return {
    cpuUsage,
    memoryUsage,
    recommendation
  };
}

export default {
  profiles: OPTIMIZATION_PROFILES,
  apply: applyOptimizationProfile,
  getCurrent: getCurrentProfile,
  getAvailable: getAvailableProfiles,
  analyzeUsage: analyzeResourceUsage
};
