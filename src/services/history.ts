import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { HardwareSnapshot, SensorReading } from '../types/hardware.js';
import { getConfig } from '../core/config.js';
import { createChildLogger } from '../core/logger.js';

const logger = createChildLogger('history');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HISTORY_DIR = path.join(__dirname, '../../data/history');

export interface HistoryEntry {
  timestamp: number;
  readings: Record<string, number>;
}

export interface HistoryQuery {
  sensorPath?: string;
  startTime?: number;
  endTime?: number;
  resolution?: 'raw' | 'minute' | 'hour' | 'day';
  limit?: number;
}

export class HistoryService {
  private memoryBuffer: HistoryEntry[] = [];
  private maxMemoryEntries = 3600;

  constructor() {
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(HISTORY_DIR)) {
      fs.mkdirSync(HISTORY_DIR, { recursive: true });
    }
  }

  addSnapshot(snapshot: HardwareSnapshot): void {
    const config = getConfig();
    if (!config.enableHistory) return;

    const entry: HistoryEntry = {
      timestamp: snapshot.timestamp,
      readings: {}
    };

    if (snapshot.cpu) {
      entry.readings['cpu.load'] = snapshot.cpu.load || 0;
      entry.readings['cpu.temperature'] = snapshot.cpu.temperature || 0;
    }

    if (snapshot.gpu && snapshot.gpu.length > 0) {
      snapshot.gpu.forEach((gpu, i) => {
        entry.readings[`gpu.${i}.load`] = gpu.utilizationGpu || 0;
        entry.readings[`gpu.${i}.temperature`] = gpu.temperature || 0;
        entry.readings[`gpu.${i}.memory`] = gpu.utilizationMemory || 0;
      });
    }

    if (snapshot.memory) {
      entry.readings['memory.used'] = snapshot.memory.usedPercent || 0;
    }

    if (snapshot.network) {
      let totalRx = 0, totalTx = 0;
      snapshot.network.forEach(n => {
        totalRx += n.rxSec || 0;
        totalTx += n.txSec || 0;
      });
      entry.readings['network.rx'] = totalRx;
      entry.readings['network.tx'] = totalTx;
    }

    this.memoryBuffer.push(entry);

    while (this.memoryBuffer.length > this.maxMemoryEntries) {
      this.memoryBuffer.shift();
    }
  }

  query(options: HistoryQuery = {}): HistoryEntry[] {
    const {
      startTime = 0,
      endTime = Date.now(),
      limit = 1000
    } = options;

    let results = this.memoryBuffer.filter(
      e => e.timestamp >= startTime && e.timestamp <= endTime
    );

    if (options.resolution && options.resolution !== 'raw') {
      results = this.downsample(results, options.resolution);
    }

    if (results.length > limit) {
      const step = Math.ceil(results.length / limit);
      results = results.filter((_, i) => i % step === 0);
    }

    return results;
  }

  private downsample(entries: HistoryEntry[], resolution: 'minute' | 'hour' | 'day'): HistoryEntry[] {
    const bucketSize = {
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000
    }[resolution];

    const buckets = new Map<number, HistoryEntry[]>();

    for (const entry of entries) {
      const bucketKey = Math.floor(entry.timestamp / bucketSize) * bucketSize;
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      buckets.get(bucketKey)!.push(entry);
    }

    const results: HistoryEntry[] = [];

    for (const [timestamp, bucketEntries] of buckets) {
      const avgReadings: Record<string, number> = {};
      const keys = new Set<string>();

      bucketEntries.forEach(e => {
        Object.keys(e.readings).forEach(k => keys.add(k));
      });

      for (const key of keys) {
        const values = bucketEntries
          .map(e => e.readings[key])
          .filter(v => v !== undefined);
        
        if (values.length > 0) {
          avgReadings[key] = values.reduce((a, b) => a + b, 0) / values.length;
        }
      }

      results.push({ timestamp, readings: avgReadings });
    }

    return results.sort((a, b) => a.timestamp - b.timestamp);
  }

  getSensorHistory(sensorPath: string, duration: number = 3600000): { timestamp: number; value: number }[] {
    const startTime = Date.now() - duration;
    
    return this.memoryBuffer
      .filter(e => e.timestamp >= startTime && e.readings[sensorPath] !== undefined)
      .map(e => ({
        timestamp: e.timestamp,
        value: e.readings[sensorPath]
      }));
  }

  getLatestReadings(): Record<string, number> {
    if (this.memoryBuffer.length === 0) return {};
    return { ...this.memoryBuffer[this.memoryBuffer.length - 1].readings };
  }

  clear(): void {
    this.memoryBuffer = [];
    logger.info('History cleared');
  }

  getStats(): { entries: number; oldestTimestamp: number | null; newestTimestamp: number | null } {
    if (this.memoryBuffer.length === 0) {
      return { entries: 0, oldestTimestamp: null, newestTimestamp: null };
    }

    return {
      entries: this.memoryBuffer.length,
      oldestTimestamp: this.memoryBuffer[0].timestamp,
      newestTimestamp: this.memoryBuffer[this.memoryBuffer.length - 1].timestamp
    };
  }
}

export const historyService = new HistoryService();
export default historyService;
