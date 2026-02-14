import * as si from 'systeminformation';
import { createChildLogger } from '../core/logger.js';

const logger = createChildLogger('inferred-metrics');

export interface ThermalHeadroom {
  cpu: {
    current: number;
    max: number;
    headroom: number;
    headroomPercent: number;
    throttling: boolean;
    estimatedTimeToThrottle: number | null;
  };
  gpu: {
    current: number;
    max: number;
    headroom: number;
    headroomPercent: number;
    throttling: boolean;
  }[];
}

export interface EfficiencyScore {
  overall: number;
  cpu: {
    score: number;
    performancePerWatt: number | null;
    idleEfficiency: number;
    loadEfficiency: number;
  };
  gpu: {
    score: number;
    performancePerWatt: number | null;
    memoryEfficiency: number;
  }[];
  memory: {
    score: number;
    utilizationEfficiency: number;
    swapPressure: number;
  };
  storage: {
    score: number;
    readEfficiency: number;
    writeEfficiency: number;
    queueDepth: number;
  };
}

export interface BottleneckAnalysis {
  primaryBottleneck: 'cpu' | 'gpu' | 'memory' | 'storage' | 'network' | 'none';
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  details: {
    component: string;
    metric: string;
    value: number;
    threshold: number;
    impact: string;
  }[];
  recommendations: string[];
}

export interface SystemBalance {
  cpuGpuBalance: number;
  memoryBalance: number;
  storageBalance: number;
  overallBalance: number;
  imbalances: string[];
}

export interface WorkloadProfile {
  type: 'idle' | 'light' | 'moderate' | 'heavy' | 'gaming' | 'rendering' | 'compiling' | 'streaming' | 'mixed';
  confidence: number;
  characteristics: {
    cpuIntensive: boolean;
    gpuIntensive: boolean;
    memoryIntensive: boolean;
    ioIntensive: boolean;
    networkIntensive: boolean;
  };
  estimatedPowerDraw: number | null;
}

export interface HealthPrediction {
  cpu: {
    healthScore: number;
    degradationRate: number | null;
    estimatedLifespan: string | null;
    concerns: string[];
  };
  storage: {
    healthScore: number;
    wearLevel: number | null;
    estimatedLifespan: string | null;
    concerns: string[];
  }[];
  battery: {
    healthScore: number;
    cycleCount: number | null;
    designCapacity: number | null;
    currentCapacity: number | null;
    estimatedLifespan: string | null;
  } | null;
}

export interface PerformanceProjection {
  sustainedLoad: {
    cpuThrottleTime: number | null;
    gpuThrottleTime: number | null;
    thermalLimit: number | null;
  };
  peakPerformance: {
    cpuBoostDuration: number | null;
    gpuBoostDuration: number | null;
  };
}

export interface InferredMetrics {
  thermalHeadroom: ThermalHeadroom;
  efficiencyScore: EfficiencyScore;
  bottleneck: BottleneckAnalysis;
  systemBalance: SystemBalance;
  workloadProfile: WorkloadProfile;
  healthPrediction: HealthPrediction;
  performanceProjection: PerformanceProjection;
  timestamp: number;
}

interface HistoricalData {
  cpuLoads: number[];
  cpuTemps: number[];
  gpuLoads: number[];
  gpuTemps: number[];
  memoryUsage: number[];
  diskIO: number[];
  networkIO: number[];
  timestamps: number[];
}

class InferredMetricsService {
  private history: HistoricalData = {
    cpuLoads: [],
    cpuTemps: [],
    gpuLoads: [],
    gpuTemps: [],
    memoryUsage: [],
    diskIO: [],
    networkIO: [],
    timestamps: []
  };
  private maxHistorySize = 60;

  async calculate(
    cpuData: any,
    gpuData: any[],
    memoryData: any,
    diskData: any[],
    networkData: any
  ): Promise<InferredMetrics> {
    this.updateHistory(cpuData, gpuData, memoryData);

    const [
      thermalHeadroom,
      efficiencyScore,
      bottleneck,
      systemBalance,
      workloadProfile,
      healthPrediction,
      performanceProjection
    ] = await Promise.all([
      this.calculateThermalHeadroom(cpuData, gpuData),
      this.calculateEfficiencyScore(cpuData, gpuData, memoryData, diskData),
      this.analyzeBottleneck(cpuData, gpuData, memoryData, diskData, networkData),
      this.calculateSystemBalance(cpuData, gpuData, memoryData),
      this.detectWorkloadProfile(cpuData, gpuData, memoryData, diskData, networkData),
      this.predictHealth(cpuData, diskData),
      this.projectPerformance(cpuData, gpuData)
    ]);

    return {
      thermalHeadroom,
      efficiencyScore,
      bottleneck,
      systemBalance,
      workloadProfile,
      healthPrediction,
      performanceProjection,
      timestamp: Date.now()
    };
  }

  private updateHistory(cpuData: any, gpuData: any[], memoryData: any): void {
    const now = Date.now();
    
    this.history.cpuLoads.push(cpuData?.load || 0);
    this.history.cpuTemps.push(cpuData?.temperature || 0);
    this.history.gpuLoads.push(gpuData[0]?.utilizationGpu || 0);
    this.history.gpuTemps.push(gpuData[0]?.temperature || 0);
    this.history.memoryUsage.push(memoryData?.usedPercent || 0);
    this.history.timestamps.push(now);

    if (this.history.cpuLoads.length > this.maxHistorySize) {
      this.history.cpuLoads.shift();
      this.history.cpuTemps.shift();
      this.history.gpuLoads.shift();
      this.history.gpuTemps.shift();
      this.history.memoryUsage.shift();
      this.history.timestamps.shift();
    }
  }

  private async calculateThermalHeadroom(cpuData: any, gpuData: any[]): Promise<ThermalHeadroom> {
    const cpuTemp = cpuData?.temperature || 50;
    const cpuMax = cpuData?.temperatureMax || 100;
    const cpuHeadroom = cpuMax - cpuTemp;
    
    const cpuTempTrend = this.calculateTrend(this.history.cpuTemps);
    let estimatedTimeToThrottle: number | null = null;
    
    if (cpuTempTrend > 0 && cpuHeadroom > 0) {
      estimatedTimeToThrottle = Math.round((cpuHeadroom / cpuTempTrend) * 60);
    }

    return {
      cpu: {
        current: cpuTemp,
        max: cpuMax,
        headroom: cpuHeadroom,
        headroomPercent: Math.round((cpuHeadroom / cpuMax) * 100),
        throttling: cpuTemp >= cpuMax * 0.95,
        estimatedTimeToThrottle
      },
      gpu: gpuData.map(gpu => {
        const temp = gpu.temperature || 50;
        const max = gpu.temperatureMax || 90;
        const headroom = max - temp;
        return {
          current: temp,
          max,
          headroom,
          headroomPercent: Math.round((headroom / max) * 100),
          throttling: temp >= max * 0.95
        };
      })
    };
  }

  private async calculateEfficiencyScore(
    cpuData: any,
    gpuData: any[],
    memoryData: any,
    diskData: any[]
  ): Promise<EfficiencyScore> {
    const cpuLoad = cpuData?.load || 0;
    const cpuPower = cpuData?.power || null;
    
    const cpuIdleEfficiency = cpuLoad < 10 ? 100 : Math.max(0, 100 - (cpuLoad - 10) * 2);
    const cpuLoadEfficiency = cpuLoad > 50 ? Math.min(100, cpuLoad * 1.2) : cpuLoad * 0.8;
    const cpuScore = Math.round((cpuIdleEfficiency * 0.3 + cpuLoadEfficiency * 0.7));

    const gpuScores = gpuData.map(gpu => {
      const load = gpu.utilizationGpu || 0;
      const memUsed = gpu.memoryUsed || 0;
      const memTotal = gpu.memoryTotal || 1;
      const memEfficiency = memTotal > 0 ? Math.round((memUsed / memTotal) * 100) : 0;
      
      return {
        score: Math.round(load * 0.7 + memEfficiency * 0.3),
        performancePerWatt: gpu.powerDraw ? Math.round(load / gpu.powerDraw * 100) / 100 : null,
        memoryEfficiency: memEfficiency
      };
    });

    const memUsedPercent = memoryData?.usedPercent || 0;
    const swapUsed = memoryData?.swapUsed || 0;
    const swapTotal = memoryData?.swapTotal || 1;
    const swapPressure = swapTotal > 0 ? Math.round((swapUsed / swapTotal) * 100) : 0;
    const memScore = Math.round(100 - Math.abs(memUsedPercent - 70) - swapPressure * 0.5);

    const storageScore = 80;
    const readEfficiency = 85;
    const writeEfficiency = 80;

    const overall = Math.round(
      (cpuScore * 0.3 + 
       (gpuScores[0]?.score || 50) * 0.25 + 
       memScore * 0.25 + 
       storageScore * 0.2)
    );

    return {
      overall: Math.max(0, Math.min(100, overall)),
      cpu: {
        score: Math.max(0, Math.min(100, cpuScore)),
        performancePerWatt: cpuPower && cpuLoad ? Math.round(cpuLoad / cpuPower * 100) / 100 : null,
        idleEfficiency: Math.round(cpuIdleEfficiency),
        loadEfficiency: Math.round(cpuLoadEfficiency)
      },
      gpu: gpuScores,
      memory: {
        score: Math.max(0, Math.min(100, memScore)),
        utilizationEfficiency: Math.round(100 - Math.abs(memUsedPercent - 70)),
        swapPressure
      },
      storage: {
        score: storageScore,
        readEfficiency,
        writeEfficiency,
        queueDepth: 0
      }
    };
  }

  private async analyzeBottleneck(
    cpuData: any,
    gpuData: any[],
    memoryData: any,
    diskData: any[],
    networkData: any
  ): Promise<BottleneckAnalysis> {
    const cpuLoad = cpuData?.load || 0;
    const gpuLoad = gpuData[0]?.utilizationGpu || 0;
    const memUsed = memoryData?.usedPercent || 0;
    const details: BottleneckAnalysis['details'] = [];
    const recommendations: string[] = [];

    if (cpuLoad > 90) {
      details.push({
        component: 'CPU',
        metric: 'load',
        value: cpuLoad,
        threshold: 90,
        impact: 'System responsiveness degraded'
      });
    }

    if (gpuLoad > 95) {
      details.push({
        component: 'GPU',
        metric: 'utilization',
        value: gpuLoad,
        threshold: 95,
        impact: 'Frame drops or rendering delays'
      });
    }

    if (memUsed > 85) {
      details.push({
        component: 'Memory',
        metric: 'usage',
        value: memUsed,
        threshold: 85,
        impact: 'Potential swapping and slowdowns'
      });
      recommendations.push('Close unused applications to free memory');
    }

    let primaryBottleneck: BottleneckAnalysis['primaryBottleneck'] = 'none';
    let severity: BottleneckAnalysis['severity'] = 'none';
    let confidence = 0;

    if (details.length > 0) {
      const sorted = details.sort((a, b) => (b.value - b.threshold) - (a.value - a.threshold));
      const top = sorted[0];
      
      primaryBottleneck = top.component.toLowerCase() as any;
      const excess = top.value - top.threshold;
      
      if (excess > 8) {
        severity = 'critical';
        confidence = 95;
      } else if (excess > 5) {
        severity = 'high';
        confidence = 85;
      } else if (excess > 2) {
        severity = 'medium';
        confidence = 70;
      } else {
        severity = 'low';
        confidence = 60;
      }

      if (primaryBottleneck === 'cpu') {
        recommendations.push('Consider upgrading CPU or reducing background processes');
        if (gpuLoad < 50) {
          recommendations.push('GPU is underutilized - CPU bottleneck confirmed');
        }
      } else if (primaryBottleneck === 'gpu') {
        recommendations.push('Lower graphics settings or upgrade GPU');
      }
    }

    return {
      primaryBottleneck,
      severity,
      confidence,
      details,
      recommendations
    };
  }

  private async calculateSystemBalance(
    cpuData: any,
    gpuData: any[],
    memoryData: any
  ): Promise<SystemBalance> {
    const cpuLoad = cpuData?.load || 0;
    const gpuLoad = gpuData[0]?.utilizationGpu || 0;
    const memUsed = memoryData?.usedPercent || 0;

    const cpuGpuDiff = Math.abs(cpuLoad - gpuLoad);
    const cpuGpuBalance = Math.max(0, 100 - cpuGpuDiff);

    const memoryBalance = memUsed > 30 && memUsed < 80 ? 100 : Math.max(0, 100 - Math.abs(memUsed - 55));

    const storageBalance = 85;

    const overallBalance = Math.round((cpuGpuBalance + memoryBalance + storageBalance) / 3);

    const imbalances: string[] = [];
    if (cpuGpuDiff > 40) {
      if (cpuLoad > gpuLoad) {
        imbalances.push('CPU is significantly more loaded than GPU - potential CPU bottleneck');
      } else {
        imbalances.push('GPU is significantly more loaded than CPU - potential GPU bottleneck');
      }
    }
    if (memUsed > 85) {
      imbalances.push('Memory pressure detected - system may need more RAM');
    }
    if (memUsed < 20 && cpuLoad > 50) {
      imbalances.push('Low memory utilization with high CPU - memory underutilized');
    }

    return {
      cpuGpuBalance,
      memoryBalance,
      storageBalance,
      overallBalance,
      imbalances
    };
  }

  private async detectWorkloadProfile(
    cpuData: any,
    gpuData: any[],
    memoryData: any,
    diskData: any[],
    networkData: any
  ): Promise<WorkloadProfile> {
    const cpuLoad = cpuData?.load || 0;
    const gpuLoad = gpuData[0]?.utilizationGpu || 0;
    const memUsed = memoryData?.usedPercent || 0;

    const cpuIntensive = cpuLoad > 60;
    const gpuIntensive = gpuLoad > 60;
    const memoryIntensive = memUsed > 70;
    const ioIntensive = false;
    const networkIntensive = false;

    let type: WorkloadProfile['type'] = 'idle';
    let confidence = 80;

    if (cpuLoad < 10 && gpuLoad < 10) {
      type = 'idle';
      confidence = 95;
    } else if (cpuLoad < 30 && gpuLoad < 30) {
      type = 'light';
      confidence = 85;
    } else if (gpuLoad > 80 && cpuLoad < 50) {
      type = 'gaming';
      confidence = 75;
    } else if (gpuLoad > 90 && cpuLoad > 60) {
      type = 'rendering';
      confidence = 70;
    } else if (cpuLoad > 80 && gpuLoad < 20) {
      type = 'compiling';
      confidence = 65;
    } else if (cpuLoad > 50 || gpuLoad > 50) {
      type = 'moderate';
      confidence = 70;
    } else {
      type = 'mixed';
      confidence = 50;
    }

    let estimatedPowerDraw: number | null = null;
    const cpuTdp = 65;
    const gpuTdp = gpuData[0]?.powerLimit || 200;
    estimatedPowerDraw = Math.round((cpuTdp * cpuLoad / 100) + (gpuTdp * gpuLoad / 100) + 50);

    return {
      type,
      confidence,
      characteristics: {
        cpuIntensive,
        gpuIntensive,
        memoryIntensive,
        ioIntensive,
        networkIntensive
      },
      estimatedPowerDraw
    };
  }

  private async predictHealth(cpuData: any, diskData: any[]): Promise<HealthPrediction> {
    const cpuTemp = cpuData?.temperature || 50;
    const cpuTempAvg = this.average(this.history.cpuTemps) || cpuTemp;
    
    let cpuHealthScore = 100;
    if (cpuTempAvg > 80) cpuHealthScore -= 20;
    else if (cpuTempAvg > 70) cpuHealthScore -= 10;
    
    const cpuConcerns: string[] = [];
    if (cpuTempAvg > 75) {
      cpuConcerns.push('Elevated average temperature may reduce lifespan');
    }

    const storageHealth = diskData.map(disk => {
      const healthScore = 90;
      const concerns: string[] = [];
      
      if (disk.usePercent > 90) {
        concerns.push('Storage nearly full - may impact performance');
      }

      return {
        healthScore,
        wearLevel: null,
        estimatedLifespan: null,
        concerns
      };
    });

    let battery: HealthPrediction['battery'] = null;
    try {
      const batteryInfo = await si.battery();
      if (batteryInfo.hasBattery) {
        const healthPercent = batteryInfo.maxCapacity || 100;
        battery = {
          healthScore: healthPercent,
          cycleCount: batteryInfo.cycleCount || null,
          designCapacity: batteryInfo.designedCapacity || null,
          currentCapacity: batteryInfo.maxCapacity || null,
          estimatedLifespan: healthPercent > 80 ? '2+ years' : healthPercent > 60 ? '1-2 years' : '< 1 year'
        };
      }
    } catch {}

    return {
      cpu: {
        healthScore: cpuHealthScore,
        degradationRate: null,
        estimatedLifespan: cpuHealthScore > 80 ? '5+ years' : '3-5 years',
        concerns: cpuConcerns
      },
      storage: storageHealth,
      battery
    };
  }

  private async projectPerformance(cpuData: any, gpuData: any[]): Promise<PerformanceProjection> {
    const cpuTemp = cpuData?.temperature || 50;
    const cpuMax = cpuData?.temperatureMax || 100;
    const gpuTemp = gpuData[0]?.temperature || 50;
    const gpuMax = gpuData[0]?.temperatureMax || 90;

    const cpuTempTrend = this.calculateTrend(this.history.cpuTemps);
    const gpuTempTrend = this.calculateTrend(this.history.gpuTemps);

    let cpuThrottleTime: number | null = null;
    let gpuThrottleTime: number | null = null;

    if (cpuTempTrend > 0) {
      const headroom = cpuMax * 0.95 - cpuTemp;
      if (headroom > 0) {
        cpuThrottleTime = Math.round(headroom / cpuTempTrend * 60);
      }
    }

    if (gpuTempTrend > 0) {
      const headroom = gpuMax * 0.95 - gpuTemp;
      if (headroom > 0) {
        gpuThrottleTime = Math.round(headroom / gpuTempTrend * 60);
      }
    }

    return {
      sustainedLoad: {
        cpuThrottleTime,
        gpuThrottleTime,
        thermalLimit: Math.min(cpuThrottleTime || Infinity, gpuThrottleTime || Infinity) || null
      },
      peakPerformance: {
        cpuBoostDuration: cpuTemp < 60 ? 300 : cpuTemp < 70 ? 180 : 60,
        gpuBoostDuration: gpuTemp < 60 ? 300 : gpuTemp < 70 ? 180 : 60
      }
    };
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 5) return 0;
    const recent = values.slice(-10);
    const first = this.average(recent.slice(0, 3));
    const last = this.average(recent.slice(-3));
    return (last - first) / recent.length;
  }

  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
}

export const inferredMetrics = new InferredMetricsService();
export default inferredMetrics;
