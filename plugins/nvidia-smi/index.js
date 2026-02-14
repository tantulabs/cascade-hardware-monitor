import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default class NvidiaSmiPlugin {
  constructor(metadata) {
    this.metadata = metadata;
    this.running = false;
    this.available = false;
  }

  async init() {
    console.log(`[${this.metadata.name}] Initializing...`);
    try {
      await execAsync('nvidia-smi --version');
      this.available = true;
      console.log(`[${this.metadata.name}] NVIDIA SMI available`);
    } catch {
      this.available = false;
      console.log(`[${this.metadata.name}] NVIDIA SMI not available`);
    }
  }

  async start() {
    this.running = true;
    console.log(`[${this.metadata.name}] Started`);
  }

  async stop() {
    this.running = false;
    console.log(`[${this.metadata.name}] Stopped`);
  }

  async poll() {
    if (!this.running || !this.available) return [];

    try {
      const { stdout } = await execAsync(
        'nvidia-smi --query-gpu=index,name,temperature.gpu,utilization.gpu,utilization.memory,memory.total,memory.used,memory.free,power.draw,power.limit,fan.speed,clocks.gr,clocks.mem --format=csv,noheader,nounits'
      );

      const readings = [];
      const lines = stdout.trim().split('\n');
      const now = Date.now();

      for (const line of lines) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length < 13) continue;

        const [
          index, name, temp, gpuUtil, memUtil,
          memTotal, memUsed, memFree, powerDraw, powerLimit,
          fanSpeed, clockCore, clockMem
        ] = parts;

        const gpuIndex = parseInt(index);
        const prefix = `nvidia.gpu.${gpuIndex}`;

        readings.push({
          name: `GPU ${gpuIndex} Temperature`,
          type: 'temperature',
          value: parseFloat(temp) || 0,
          min: 0,
          max: 100,
          unit: '°C',
          source: prefix,
          timestamp: now
        });

        readings.push({
          name: `GPU ${gpuIndex} Utilization`,
          type: 'load',
          value: parseFloat(gpuUtil) || 0,
          min: 0,
          max: 100,
          unit: '%',
          source: prefix,
          timestamp: now
        });

        readings.push({
          name: `GPU ${gpuIndex} Memory Utilization`,
          type: 'load',
          value: parseFloat(memUtil) || 0,
          min: 0,
          max: 100,
          unit: '%',
          source: prefix,
          timestamp: now
        });

        readings.push({
          name: `GPU ${gpuIndex} Memory Used`,
          type: 'data',
          value: parseFloat(memUsed) || 0,
          min: 0,
          max: parseFloat(memTotal) || 0,
          unit: 'MB',
          source: prefix,
          timestamp: now
        });

        readings.push({
          name: `GPU ${gpuIndex} Power Draw`,
          type: 'power',
          value: parseFloat(powerDraw) || 0,
          min: 0,
          max: parseFloat(powerLimit) || 0,
          unit: 'W',
          source: prefix,
          timestamp: now
        });

        readings.push({
          name: `GPU ${gpuIndex} Fan Speed`,
          type: 'fan',
          value: parseFloat(fanSpeed) || 0,
          min: 0,
          max: 100,
          unit: '%',
          source: prefix,
          timestamp: now
        });

        readings.push({
          name: `GPU ${gpuIndex} Core Clock`,
          type: 'clock',
          value: parseFloat(clockCore) || 0,
          min: 0,
          max: 3000,
          unit: 'MHz',
          source: prefix,
          timestamp: now
        });

        readings.push({
          name: `GPU ${gpuIndex} Memory Clock`,
          type: 'clock',
          value: parseFloat(clockMem) || 0,
          min: 0,
          max: 10000,
          unit: 'MHz',
          source: prefix,
          timestamp: now
        });
      }

      return readings;
    } catch (err) {
      console.error(`[${this.metadata.name}] Poll error:`, err.message);
      return [];
    }
  }

  async destroy() {
    console.log(`[${this.metadata.name}] Destroyed`);
  }
}
