import { AIClient } from './ai';
import type {
  HealthStatus, Snapshot, CPUData, CPUSensorData, CoreTemperature, CPUPower,
  ThrottlingData, GPUData, MemoryData, DiskData, SMARTData, MainboardData,
  FanControllerData, AdvancedData, InferredMetrics, BottleneckAnalysis,
  ThermalHeadroom, WorkloadProfile, UnifiedMonitorData, UnifiedSensor, ActionResult
} from './types';

export interface CascadeClientOptions {
  host?: string;
  port?: number;
  timeout?: number;
}

/**
 * Cascade Hardware Monitor API Client
 * 
 * Modern, AI-friendly hardware monitoring. Superior alternative to OpenHardwareMonitor.
 * 
 * @example
 * ```typescript
 * const client = new CascadeClient();
 * const snapshot = await client.getSnapshot();
 * console.log(`CPU: ${snapshot.cpu.load}%`);
 * ```
 */
export class CascadeClient {
  private baseUrl: string;
  private timeout: number;
  
  /** AI-specific endpoints */
  public readonly ai: AIClient;

  constructor(options: CascadeClientOptions = {}) {
    const host = options.host || 'localhost';
    const port = options.port || 8085;
    this.timeout = options.timeout || 10000;
    this.baseUrl = `http://${host}:${port}/api/v1`;
    this.ai = new AIClient(this);
  }

  /** @internal */
  async get<T>(endpoint: string): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return await response.json() as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /** @internal */
  async post<T>(endpoint: string, body: unknown): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return await response.json() as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /** Check API health */
  health(): Promise<HealthStatus> {
    return this.get('/health');
  }

  /** Get full hardware snapshot */
  getSnapshot(): Promise<Snapshot> {
    return this.get('/snapshot');
  }

  /** Get live snapshot (force fresh poll) */
  getLiveSnapshot(): Promise<Snapshot> {
    return this.get('/snapshot/live');
  }

  /** Get CPU data */
  getCpu(): Promise<CPUData> {
    return this.get('/cpu');
  }

  /** Get detailed CPU sensors */
  getCpuSensors(): Promise<CPUSensorData> {
    return this.get('/cpu/sensors');
  }

  /** Get per-core temperatures */
  getCpuTemperatures(): Promise<CoreTemperature[]> {
    return this.get('/cpu/sensors/temperatures');
  }

  /** Get CPU power data */
  getCpuPower(): Promise<CPUPower> {
    return this.get('/cpu/sensors/power');
  }

  /** Get CPU throttling status */
  getCpuThrottling(): Promise<ThrottlingData> {
    return this.get('/cpu/sensors/throttling');
  }

  /** Get GPU data */
  getGpu(): Promise<GPUData> {
    return this.get('/gpu');
  }

  /** Get all GPUs */
  getAllGpus(): Promise<GPUData[]> {
    return this.get('/gpu/all');
  }

  /** Get memory data */
  getMemory(): Promise<MemoryData> {
    return this.get('/memory');
  }

  /** Get disk data */
  getDisks(): Promise<DiskData[]> {
    return this.get('/disks');
  }

  /** Get SMART disk health */
  getSmart(): Promise<SMARTData> {
    return this.get('/smart');
  }

  /** Get mainboard sensors */
  getMainboard(): Promise<MainboardData> {
    return this.get('/mainboard');
  }

  /** Get fan controllers */
  getFans(): Promise<FanControllerData> {
    return this.get('/fans');
  }

  /** Set fan speed (0-100) */
  async setFanSpeed(controllerId: string, channelId: string, speed: number): Promise<boolean> {
    const result = await this.post<ActionResult>(
      `/fans/controllers/${controllerId}/channels/${channelId}/speed`,
      { speed }
    );
    return result.success;
  }

  /** Get advanced hardware data */
  getAdvanced(): Promise<AdvancedData> {
    return this.get('/advanced');
  }

  /** Get inferred metrics */
  getInferred(): Promise<InferredMetrics> {
    return this.get('/inferred');
  }

  /** Get bottleneck analysis */
  getBottleneck(): Promise<BottleneckAnalysis> {
    return this.get('/inferred/bottleneck');
  }

  /** Get thermal headroom */
  getThermalHeadroom(): Promise<ThermalHeadroom> {
    return this.get('/inferred/thermal-headroom');
  }

  /** Get workload profile */
  getWorkload(): Promise<WorkloadProfile> {
    return this.get('/inferred/workload');
  }

  /** Get unified monitor data */
  getMonitors(): Promise<UnifiedMonitorData> {
    return this.get('/monitors');
  }

  /** Get all temperatures from all sources */
  getAllTemperatures(): Promise<UnifiedSensor[]> {
    return this.get('/monitors/temperatures');
  }

  /** Get critical sensors */
  getCriticalSensors(): Promise<UnifiedSensor[]> {
    return this.get('/monitors/critical');
  }

  /** Set display brightness (0-100) */
  async setBrightness(level: number): Promise<boolean> {
    const result = await this.post<ActionResult>('/ai/control/brightness', { level });
    return result.success;
  }
}
