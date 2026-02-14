import { createChildLogger } from '../core/logger.js';
import { libreHardwareMonitor, LHMData } from './libre-hardware-monitor.js';
import { lmSensors, LMSensorsData } from './lm-sensors.js';
import { ipmiMonitor, IPMIData } from './ipmi-monitor.js';
import { hwinfoMonitor, HWiNFOData } from './hwinfo-monitor.js';
import { smartMonitor, SMARTData } from './smart-monitor.js';

const logger = createChildLogger('unified-monitors');

export interface UnifiedSensor {
  id: string;
  name: string;
  type: 'temperature' | 'voltage' | 'fan' | 'power' | 'clock' | 'load' | 'current' | 'other';
  value: number;
  min: number | null;
  max: number | null;
  unit: string;
  source: 'lhm' | 'lm-sensors' | 'ipmi' | 'hwinfo' | 'smart' | 'system';
  hardware: string;
  status: 'ok' | 'warning' | 'critical';
}

export interface MonitoringSources {
  libreHardwareMonitor: boolean;
  lmSensors: boolean;
  ipmi: boolean;
  hwinfo: boolean;
  smart: boolean;
}

export interface UnifiedMonitorData {
  sources: MonitoringSources;
  sensors: UnifiedSensor[];
  temperatures: UnifiedSensor[];
  voltages: UnifiedSensor[];
  fans: UnifiedSensor[];
  powers: UnifiedSensor[];
  clocks: UnifiedSensor[];
  loads: UnifiedSensor[];
  diskHealth: SMARTData | null;
  raw: {
    lhm: LHMData | null;
    lmSensors: LMSensorsData | null;
    ipmi: IPMIData | null;
    hwinfo: HWiNFOData | null;
    smart: SMARTData | null;
  };
  timestamp: number;
}

class UnifiedMonitorService {
  private initialized = false;
  private sources: MonitoringSources = {
    libreHardwareMonitor: false,
    lmSensors: false,
    ipmi: false,
    hwinfo: false,
    smart: false
  };

  async initialize(): Promise<MonitoringSources> {
    logger.info('Initializing unified monitoring sources...');

    const results = await Promise.all([
      libreHardwareMonitor.initialize().catch(() => false),
      lmSensors.initialize().catch(() => false),
      ipmiMonitor.initialize().catch(() => false),
      hwinfoMonitor.initialize().catch(() => false),
      smartMonitor.initialize().catch(() => false)
    ]);

    this.sources = {
      libreHardwareMonitor: results[0],
      lmSensors: results[1],
      ipmi: results[2],
      hwinfo: results[3],
      smart: results[4]
    };

    this.initialized = true;
    
    const availableSources = Object.entries(this.sources)
      .filter(([_, available]) => available)
      .map(([name]) => name);
    
    logger.info(`Unified monitors initialized. Available: ${availableSources.join(', ') || 'none'}`);
    
    return this.sources;
  }

  getSources(): MonitoringSources {
    return this.sources;
  }

  async getAllData(): Promise<UnifiedMonitorData> {
    if (!this.initialized) {
      await this.initialize();
    }

    const [lhmData, lmData, ipmiData, hwinfoData, smartData] = await Promise.all([
      this.sources.libreHardwareMonitor ? libreHardwareMonitor.getAllData() : null,
      this.sources.lmSensors ? lmSensors.getAllData() : null,
      this.sources.ipmi ? ipmiMonitor.getAllData() : null,
      this.sources.hwinfo ? hwinfoMonitor.getAllData() : null,
      this.sources.smart ? smartMonitor.getAllData() : null
    ]);

    const sensors: UnifiedSensor[] = [];

    // Merge LHM sensors
    if (lhmData?.available) {
      for (const s of [...lhmData.sensors.temperatures, ...lhmData.sensors.voltages, 
                        ...lhmData.sensors.fans, ...lhmData.sensors.powers,
                        ...lhmData.sensors.clocks, ...lhmData.sensors.loads]) {
        const mappedType = this.mapSensorType(s.type);
        sensors.push({
          id: `lhm-${s.id}`,
          name: s.name,
          type: mappedType,
          value: s.value,
          min: s.min,
          max: s.max,
          unit: s.unit,
          source: 'lhm',
          hardware: s.hardware,
          status: this.getStatus(s.value, s.max, mappedType)
        });
      }
    }

    // Merge lm-sensors
    if (lmData?.available) {
      for (const s of [...lmData.temperatures, ...lmData.voltages, ...lmData.fans, ...lmData.powers]) {
        const mappedType = this.mapSensorType(s.type);
        sensors.push({
          id: `lm-${s.chip}-${s.name}`,
          name: s.name,
          type: mappedType,
          value: s.value,
          min: s.min,
          max: s.max,
          unit: s.unit,
          source: 'lm-sensors',
          hardware: s.chip,
          status: s.alarm ? 'critical' : this.getStatus(s.value, s.critical, mappedType)
        });
      }
    }

    // Merge IPMI sensors
    if (ipmiData?.available) {
      for (const s of ipmiData.sensors) {
        sensors.push({
          id: `ipmi-${s.name}`,
          name: s.name,
          type: s.type,
          value: s.value,
          min: s.lowerWarning,
          max: s.upperWarning,
          unit: s.unit,
          source: 'ipmi',
          hardware: 'BMC',
          status: s.status === 'critical' ? 'critical' : s.status === 'warning' ? 'warning' : 'ok'
        });
      }
    }

    // Merge HWiNFO sensors
    if (hwinfoData?.available) {
      for (const r of hwinfoData.readings) {
        sensors.push({
          id: `hwinfo-${r.id}`,
          name: r.readingName,
          type: r.type === 'usage' ? 'load' : r.type,
          value: r.value,
          min: r.valueMin,
          max: r.valueMax,
          unit: r.unit,
          source: 'hwinfo',
          hardware: r.sensorName,
          status: 'ok'
        });
      }
    }

    // Categorize sensors
    const categorized = {
      temperatures: sensors.filter(s => s.type === 'temperature'),
      voltages: sensors.filter(s => s.type === 'voltage'),
      fans: sensors.filter(s => s.type === 'fan'),
      powers: sensors.filter(s => s.type === 'power'),
      clocks: sensors.filter(s => s.type === 'clock'),
      loads: sensors.filter(s => s.type === 'load')
    };

    return {
      sources: this.sources,
      sensors,
      ...categorized,
      diskHealth: smartData,
      raw: {
        lhm: lhmData,
        lmSensors: lmData,
        ipmi: ipmiData,
        hwinfo: hwinfoData,
        smart: smartData
      },
      timestamp: Date.now()
    };
  }

  private mapSensorType(type: string): UnifiedSensor['type'] {
    const typeMap: { [key: string]: UnifiedSensor['type'] } = {
      'temperature': 'temperature',
      'voltage': 'voltage',
      'fan': 'fan',
      'power': 'power',
      'clock': 'clock',
      'load': 'load',
      'current': 'current',
      'data': 'other',
      'throughput': 'other',
      'level': 'load',
      'humidity': 'other',
      'intrusion': 'other'
    };
    return typeMap[type] || 'other';
  }

  private getStatus(value: number, max: number | null, type: string): 'ok' | 'warning' | 'critical' {
    if (max === null) return 'ok';
    
    const ratio = value / max;
    
    if (type === 'temperature') {
      if (ratio >= 0.95) return 'critical';
      if (ratio >= 0.85) return 'warning';
    } else if (type === 'fan') {
      // Low fan speed is concerning
      if (value < 200 && max > 1000) return 'warning';
    } else if (type === 'voltage') {
      // Voltage should be within 5% of expected
      if (Math.abs(1 - ratio) > 0.1) return 'critical';
      if (Math.abs(1 - ratio) > 0.05) return 'warning';
    }
    
    return 'ok';
  }

  async getTemperatures(): Promise<UnifiedSensor[]> {
    const data = await this.getAllData();
    return data.temperatures;
  }

  async getFans(): Promise<UnifiedSensor[]> {
    const data = await this.getAllData();
    return data.fans;
  }

  async getVoltages(): Promise<UnifiedSensor[]> {
    const data = await this.getAllData();
    return data.voltages;
  }

  async getPowers(): Promise<UnifiedSensor[]> {
    const data = await this.getAllData();
    return data.powers;
  }

  async getCriticalSensors(): Promise<UnifiedSensor[]> {
    const data = await this.getAllData();
    return data.sensors.filter(s => s.status === 'critical');
  }

  async getWarningSensors(): Promise<UnifiedSensor[]> {
    const data = await this.getAllData();
    return data.sensors.filter(s => s.status === 'warning');
  }

  async getDiskHealth(): Promise<SMARTData | null> {
    if (!this.sources.smart) return null;
    return smartMonitor.getAllData();
  }
}

export const unifiedMonitors = new UnifiedMonitorService();
export default unifiedMonitors;
