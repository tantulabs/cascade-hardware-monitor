import si from 'systeminformation';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import machineId from 'node-machine-id';
import type {
  HardwareSnapshot,
  CPUData,
  CPUSocket,
  CPUCore,
  GPUData,
  MemoryData,
  DiskData,
  NetworkInterface,
  BluetoothDevice,
  AudioDevice,
  BatteryData,
  MotherboardData,
  BiosData,
  ChassisData,
  USBDevice,
  ProcessData,
  SystemInfo,
  OSInfo,
  SensorReading
} from '../types/hardware.js';
import { getConfig } from '../core/config.js';
import { createChildLogger } from '../core/logger.js';
import { gpuManager, EnhancedGPUData } from './gpu/index.js';
import { monitorSettings } from './monitor-settings.js';

const logger = createChildLogger('hardware-monitor');

export class HardwareMonitor extends EventEmitter {
  private pollingInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private machineId: string;
  private lastSnapshot: HardwareSnapshot | null = null;
  private history: HardwareSnapshot[] = [];
  private sensorReadings: Map<string, SensorReading[]> = new Map();

  constructor() {
    super();
    this.machineId = this.getMachineId();
  }

  private getMachineId(): string {
    try {
      return machineId.machineIdSync();
    } catch {
      logger.warn('Could not get machine ID, generating random one');
      return uuidv4();
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Hardware monitor is already running');
      return;
    }

    logger.info('Starting hardware monitor...');
    this.isRunning = true;

    // Initialize monitor settings
    await monitorSettings.initialize();

    // Initialize GPU manager for vendor-specific data (if enabled)
    if (monitorSettings.isEnabled('gpu')) {
      await gpuManager.init();
    }

    await this.poll();

    const config = getConfig();
    this.pollingInterval = setInterval(() => {
      this.poll().catch(err => {
        logger.error('Polling error:', err);
      });
    }, config.pollingInterval);

    logger.info(`Hardware monitor started with ${config.pollingInterval}ms polling interval`);
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    this.isRunning = false;
    logger.info('Hardware monitor stopped');
  }

  async poll(): Promise<HardwareSnapshot> {
    const config = getConfig();
    const enabledSensors = new Set(config.enabledSensors);

    const snapshot: HardwareSnapshot = {
      timestamp: Date.now(),
      machineId: this.machineId,
      system: await this.getSystemInfo(),
      os: await this.getOSInfo(),
      cpu: (enabledSensors.has('cpu') && monitorSettings.isEnabled('cpu')) ? await this.getCPUData() : {} as CPUData,
      gpu: (enabledSensors.has('gpu') && monitorSettings.isEnabled('gpu')) ? await this.getGPUData() : [],
      memory: (enabledSensors.has('memory') && monitorSettings.isEnabled('memory')) ? await this.getMemoryData() : {} as MemoryData,
      disks: (enabledSensors.has('disk') && monitorSettings.isEnabled('disk')) ? await this.getDiskData() : [],
      network: (enabledSensors.has('network') && monitorSettings.isEnabled('network')) ? await this.getNetworkData() : [],
      bluetooth: enabledSensors.has('bluetooth') ? await this.getBluetoothData() : [],
      audio: enabledSensors.has('audio') ? await this.getAudioData() : [],
      battery: enabledSensors.has('battery') ? await this.getBatteryData() : null,
      motherboard: monitorSettings.isEnabled('mainboard') ? await this.getMotherboardData() : {} as MotherboardData,
      bios: await this.getBiosData(),
      chassis: await this.getChassisData(),
      usb: enabledSensors.has('usb') ? await this.getUSBData() : [],
      processes: await this.getProcessData()
    };

    this.lastSnapshot = snapshot;
    this.updateHistory(snapshot);
    this.extractSensorReadings(snapshot);
    this.emit('snapshot', snapshot);

    return snapshot;
  }

  private updateHistory(snapshot: HardwareSnapshot): void {
    const config = getConfig();
    if (!config.enableHistory) return;

    this.history.push(snapshot);

    const cutoff = Date.now() - (config.historyRetention * 1000);
    this.history = this.history.filter(s => s.timestamp >= cutoff);
  }

  private extractSensorReadings(snapshot: HardwareSnapshot): void {
    const readings: SensorReading[] = [];
    const now = Date.now();

    if (snapshot.cpu.temperature !== undefined) {
      readings.push({
        name: 'CPU Temperature',
        type: 'temperature',
        value: snapshot.cpu.temperature,
        min: 0,
        max: snapshot.cpu.temperatureMax || 100,
        unit: '°C',
        source: 'cpu',
        timestamp: now
      });
    }

    if (snapshot.cpu.load !== undefined) {
      readings.push({
        name: 'CPU Load',
        type: 'load',
        value: snapshot.cpu.load,
        min: 0,
        max: 100,
        unit: '%',
        source: 'cpu',
        timestamp: now
      });
    }

    snapshot.gpu.forEach((gpu, i) => {
      if (gpu.temperature !== undefined) {
        readings.push({
          name: `GPU ${i} Temperature`,
          type: 'temperature',
          value: gpu.temperature,
          min: 0,
          max: gpu.temperatureMax || 100,
          unit: '°C',
          source: `gpu.${i}`,
          timestamp: now
        });
      }

      if (gpu.utilizationGpu !== undefined) {
        readings.push({
          name: `GPU ${i} Load`,
          type: 'load',
          value: gpu.utilizationGpu,
          min: 0,
          max: 100,
          unit: '%',
          source: `gpu.${i}`,
          timestamp: now
        });
      }

      if (gpu.fanSpeed !== undefined) {
        readings.push({
          name: `GPU ${i} Fan`,
          type: 'fan',
          value: gpu.fanSpeed,
          min: 0,
          max: 100,
          unit: '%',
          source: `gpu.${i}`,
          timestamp: now
        });
      }
    });

    if (snapshot.memory.usedPercent !== undefined) {
      readings.push({
        name: 'Memory Usage',
        type: 'load',
        value: snapshot.memory.usedPercent,
        min: 0,
        max: 100,
        unit: '%',
        source: 'memory',
        timestamp: now
      });
    }

    snapshot.disks.forEach((disk, i) => {
      if (disk.usePercent !== undefined) {
        readings.push({
          name: `Disk ${disk.name} Usage`,
          type: 'load',
          value: disk.usePercent,
          min: 0,
          max: 100,
          unit: '%',
          source: `disk.${i}`,
          timestamp: now
        });
      }

      if (disk.temperature !== undefined && disk.temperature > 0) {
        readings.push({
          name: `Disk ${disk.name} Temperature`,
          type: 'temperature',
          value: disk.temperature,
          min: 0,
          max: 70,
          unit: '°C',
          source: `disk.${i}`,
          timestamp: now
        });
      }
    });

    for (const reading of readings) {
      const key = `${reading.source}.${reading.name}`;
      if (!this.sensorReadings.has(key)) {
        this.sensorReadings.set(key, []);
      }
      const arr = this.sensorReadings.get(key)!;
      arr.push(reading);

      const config = getConfig();
      const cutoff = now - (config.historyRetention * 1000);
      while (arr.length > 0 && arr[0].timestamp < cutoff) {
        arr.shift();
      }
    }

    this.emit('readings', readings);
  }

  async getSystemInfo(): Promise<SystemInfo> {
    const data = await si.system();
    return {
      manufacturer: data.manufacturer,
      model: data.model,
      version: data.version,
      serial: data.serial,
      uuid: data.uuid,
      sku: data.sku,
      virtual: data.virtual,
      virtualHost: data.virtualHost || ''
    };
  }

  async getOSInfo(): Promise<OSInfo> {
    const data = await si.osInfo();
    return {
      platform: data.platform,
      distro: data.distro,
      release: data.release,
      codename: data.codename,
      kernel: data.kernel,
      arch: data.arch,
      hostname: data.hostname,
      fqdn: data.fqdn,
      codepage: data.codepage,
      logofile: data.logofile,
      serial: data.serial,
      build: data.build,
      servicepack: data.servicepack,
      uefi: data.uefi || false,
      hypervizor: data.hypervizor || false,
      remoteSession: data.remoteSession || false
    };
  }

  async getCPUData(): Promise<CPUData> {
    const [cpuInfo, cpuSpeed, cpuTemp, cpuLoad] = await Promise.all([
      si.cpu(),
      si.cpuCurrentSpeed(),
      si.cpuTemperature(),
      si.currentLoad()
    ]);

    const coresPerSocket = cpuInfo.physicalCores / Math.max(1, cpuInfo.processors);
    const sockets: CPUSocket[] = [];

    for (let s = 0; s < cpuInfo.processors; s++) {
      const coreData: CPUCore[] = [];
      const startCore = s * coresPerSocket;
      const endCore = startCore + coresPerSocket;

      for (let c = startCore; c < endCore && c < cpuLoad.cpus.length; c++) {
        coreData.push({
          coreId: c,
          physicalId: s,
          temperature: cpuTemp.cores?.[c] || cpuTemp.main || 0,
          load: cpuLoad.cpus[c]?.load || 0,
          speed: cpuSpeed.cores?.[c] || cpuSpeed.avg || cpuInfo.speed,
          voltage: Number(cpuInfo.voltage) || 0
        });
      }

      sockets.push({
        socketId: s,
        manufacturer: cpuInfo.manufacturer,
        brand: cpuInfo.brand,
        speed: cpuInfo.speed,
        speedMin: cpuInfo.speedMin,
        speedMax: cpuInfo.speedMax,
        cores: Math.floor(cpuInfo.cores / cpuInfo.processors),
        physicalCores: Math.floor(cpuInfo.physicalCores / cpuInfo.processors),
        socket: cpuInfo.socket,
        temperature: cpuTemp.socket?.[s] || cpuTemp.main || 0,
        temperatureMax: cpuTemp.max || 100,
        load: coreData.reduce((sum, c) => sum + c.load, 0) / coreData.length || 0,
        voltage: Number(cpuInfo.voltage) || 0,
        power: 0,
        coreData,
        cache: {
          l1d: cpuInfo.cache.l1d,
          l1i: cpuInfo.cache.l1i,
          l2: cpuInfo.cache.l2,
          l3: cpuInfo.cache.l3
        }
      });
    }

    return {
      manufacturer: cpuInfo.manufacturer,
      brand: cpuInfo.brand,
      speed: cpuInfo.speed,
      speedMin: cpuInfo.speedMin,
      speedMax: cpuInfo.speedMax,
      cores: cpuInfo.cores,
      physicalCores: cpuInfo.physicalCores,
      processors: cpuInfo.processors,
      socket: cpuInfo.socket,
      temperature: cpuTemp.main,
      temperatureMax: cpuTemp.max,
      temperatureSocket: cpuTemp.socket || [],
      temperatureCores: cpuTemp.cores || [],
      load: cpuLoad.currentLoad,
      loadCores: cpuLoad.cpus.map(c => c.load),
      voltage: Number(cpuInfo.voltage) || 0,
      power: 0,
      sockets,
      cache: {
        l1d: cpuInfo.cache.l1d,
        l1i: cpuInfo.cache.l1i,
        l2: cpuInfo.cache.l2,
        l3: cpuInfo.cache.l3
      }
    };
  }

  async getGPUData(): Promise<GPUData[]> {
    // Try to get enhanced GPU data from vendor-specific tools first
    if (gpuManager.isInitialized()) {
      const enhancedData = await gpuManager.getAllGPUData();
      if (enhancedData.length > 0) {
        return enhancedData.map(gpu => ({
          index: gpu.index,
          vendor: gpu.vendor,
          model: gpu.name,
          bus: gpu.busId,
          vram: gpu.memoryTotal,
          vramDynamic: false,
          driverVersion: gpu.driverVersion,
          temperature: gpu.temperature,
          temperatureMax: gpu.temperatureMax,
          fanSpeed: gpu.fanSpeed,
          powerDraw: gpu.powerDraw,
          powerLimit: gpu.powerLimit,
          clockCore: gpu.clockGraphics,
          clockMemory: gpu.clockMemory,
          utilizationGpu: gpu.utilizationGpu,
          utilizationMemory: gpu.utilizationMemory,
          memoryTotal: gpu.memoryTotal,
          memoryUsed: gpu.memoryUsed,
          memoryFree: gpu.memoryFree
        }));
      }
    }

    // Fallback to systeminformation
    const controllers = await si.graphics();
    return controllers.controllers.map((gpu, index) => ({
      index,
      vendor: gpu.vendor,
      model: gpu.model,
      bus: gpu.bus,
      vram: gpu.vram || 0,
      vramDynamic: gpu.vramDynamic,
      driverVersion: gpu.driverVersion || '',
      temperature: gpu.temperatureGpu || 0,
      temperatureMax: 100,
      fanSpeed: gpu.fanSpeed || 0,
      powerDraw: gpu.powerDraw || 0,
      powerLimit: gpu.powerLimit || 0,
      clockCore: gpu.clockCore || 0,
      clockMemory: gpu.clockMemory || 0,
      utilizationGpu: gpu.utilizationGpu || 0,
      utilizationMemory: gpu.utilizationMemory || 0,
      memoryTotal: gpu.memoryTotal || gpu.vram || 0,
      memoryUsed: gpu.memoryUsed || 0,
      memoryFree: gpu.memoryFree || 0
    }));
  }

  async getEnhancedGPUData(): Promise<EnhancedGPUData[]> {
    if (gpuManager.isInitialized()) {
      return gpuManager.getAllGPUData();
    }
    return [];
  }

  async getMemoryData(): Promise<MemoryData> {
    const [mem, memLayout] = await Promise.all([
      si.mem(),
      si.memLayout()
    ]);

    return {
      total: mem.total,
      free: mem.free,
      used: mem.used,
      active: mem.active,
      available: mem.available,
      buffcache: mem.buffcache,
      swapTotal: mem.swaptotal,
      swapUsed: mem.swapused,
      swapFree: mem.swapfree,
      usedPercent: (mem.used / mem.total) * 100,
      modules: memLayout.map(m => ({
        bank: m.bank,
        type: m.type,
        formFactor: m.formFactor,
        manufacturer: m.manufacturer || '',
        partNum: m.partNum,
        serialNum: m.serialNum,
        voltageConfigured: m.voltageConfigured || 0,
        voltageMin: m.voltageMin || 0,
        voltageMax: m.voltageMax || 0,
        size: m.size,
        clockSpeed: m.clockSpeed || 0
      }))
    };
  }

  async getDiskData(): Promise<DiskData[]> {
    const [fsSize, diskIO, disksLayout] = await Promise.all([
      si.fsSize(),
      si.disksIO(),
      si.diskLayout()
    ]);

    const tempMap = new Map<string, number>();
    for (const disk of disksLayout) {
      if (disk.temperature) {
        tempMap.set(disk.device, disk.temperature);
      }
    }

    return fsSize.map((fs, index) => ({
      index,
      device: fs.fs,
      name: fs.fs,
      type: fs.type,
      fsType: fs.type,
      mount: fs.mount,
      size: fs.size,
      used: fs.used,
      available: fs.available,
      usePercent: fs.use,
      temperature: tempMap.get(fs.fs) || 0,
      readSpeed: diskIO?.rIO_sec || 0,
      writeSpeed: diskIO?.wIO_sec || 0,
      readOps: diskIO?.rIO || 0,
      writeOps: diskIO?.wIO || 0,
      smart: null
    }));
  }

  async getNetworkData(): Promise<NetworkInterface[]> {
    const [interfaces, stats, connections] = await Promise.all([
      si.networkInterfaces(),
      si.networkStats(),
      si.networkConnections()
    ]);

    const ifaceArray = Array.isArray(interfaces) ? interfaces : [interfaces];
    const statsMap = new Map(stats.map(s => [s.iface, s]));

    return ifaceArray.map(iface => {
      const stat = statsMap.get(iface.iface) || {};
      let type: 'wired' | 'wireless' | 'bluetooth' | 'virtual' = 'wired';
      
      if (iface.type === 'wireless') type = 'wireless';
      else if (iface.type === 'virtual') type = 'virtual';
      else if (iface.iface.toLowerCase().includes('bluetooth')) type = 'bluetooth';

      return {
        iface: iface.iface,
        ifaceName: iface.ifaceName,
        type,
        ip4: iface.ip4,
        ip6: iface.ip6,
        mac: iface.mac,
        speed: iface.speed || 0,
        dhcp: iface.dhcp,
        operstate: iface.operstate as 'up' | 'down' | 'unknown',
        rxBytes: (stat as any).rx_bytes || 0,
        txBytes: (stat as any).tx_bytes || 0,
        rxSec: (stat as any).rx_sec || 0,
        txSec: (stat as any).tx_sec || 0,
        rxDropped: (stat as any).rx_dropped || 0,
        txDropped: (stat as any).tx_dropped || 0,
        rxErrors: (stat as any).rx_errors || 0,
        txErrors: (stat as any).tx_errors || 0
      };
    });
  }

  async getBluetoothData(): Promise<BluetoothDevice[]> {
    try {
      const devices = await si.bluetoothDevices();
      return devices.map(d => ({
        device: d.device,
        name: d.name,
        manufacturer: d.manufacturer,
        macDevice: d.macDevice,
        macHost: d.macHost,
        type: d.type,
        connected: d.connected,
        batteryPercent: d.batteryPercent
      }));
    } catch {
      return [];
    }
  }

  async getAudioData(): Promise<AudioDevice[]> {
    try {
      const audio = await si.audio();
      return audio.map(a => ({
        id: String(a.id),
        name: a.name,
        manufacturer: a.manufacturer,
        type: a.type as 'input' | 'output',
        default: a.default,
        channel: a.channel,
        status: a.status,
        volume: 0,
        muted: false
      }));
    } catch {
      return [];
    }
  }

  async getBatteryData(): Promise<BatteryData | null> {
    try {
      const battery = await si.battery();
      if (!battery.hasBattery) return null;

      return {
        hasBattery: battery.hasBattery,
        cycleCount: battery.cycleCount,
        isCharging: battery.isCharging,
        designedCapacity: battery.designedCapacity,
        maxCapacity: battery.maxCapacity,
        currentCapacity: battery.currentCapacity,
        voltage: battery.voltage,
        capacityUnit: battery.capacityUnit,
        percent: battery.percent,
        timeRemaining: battery.timeRemaining,
        acConnected: battery.acConnected,
        type: battery.type,
        model: battery.model,
        manufacturer: battery.manufacturer,
        serial: battery.serial,
        health: (battery.maxCapacity / battery.designedCapacity) * 100
      };
    } catch {
      return null;
    }
  }

  async getMotherboardData(): Promise<MotherboardData> {
    const data = await si.baseboard();
    return {
      manufacturer: data.manufacturer,
      model: data.model,
      version: data.version,
      serial: data.serial,
      assetTag: data.assetTag,
      memMax: data.memMax || 0,
      memSlots: data.memSlots || 0
    };
  }

  async getBiosData(): Promise<BiosData> {
    const data = await si.bios();
    return {
      vendor: data.vendor,
      version: data.version,
      releaseDate: data.releaseDate,
      revision: data.revision || '',
      serial: data.serial || ''
    };
  }

  async getChassisData(): Promise<ChassisData> {
    const data = await si.chassis();
    return {
      manufacturer: data.manufacturer,
      model: data.model,
      type: data.type,
      version: data.version,
      serial: data.serial,
      assetTag: data.assetTag,
      sku: data.sku
    };
  }

  async getUSBData(): Promise<USBDevice[]> {
    const devices = await si.usb();
    return devices.map(d => ({
      id: String(d.id),
      bus: d.bus,
      deviceId: d.deviceId,
      name: d.name,
      type: d.type,
      removable: d.removable,
      vendor: d.vendor,
      manufacturer: d.manufacturer,
      maxPower: d.maxPower,
      serialNumber: d.serialNumber || ''
    }));
  }

  async getProcessData(): Promise<ProcessData[]> {
    const processes = await si.processes();
    return processes.list.slice(0, 50).map(p => ({
      pid: p.pid,
      parentPid: p.parentPid,
      name: p.name,
      cpu: p.cpu,
      cpuUser: p.cpuu,
      cpuSystem: p.cpus,
      mem: p.mem,
      priority: p.priority,
      memVsz: p.memVsz,
      memRss: p.memRss,
      nice: p.nice,
      started: p.started,
      state: p.state,
      tty: p.tty,
      user: p.user,
      command: p.command,
      path: p.path
    }));
  }

  getLastSnapshot(): HardwareSnapshot | null {
    return this.lastSnapshot;
  }

  getHistory(): HardwareSnapshot[] {
    return [...this.history];
  }

  getSensorReadings(sensorPath?: string): SensorReading[] {
    if (sensorPath) {
      return this.sensorReadings.get(sensorPath) || [];
    }

    const all: SensorReading[] = [];
    for (const readings of this.sensorReadings.values()) {
      if (readings.length > 0) {
        all.push(readings[readings.length - 1]);
      }
    }
    return all;
  }

  getSensorPaths(): string[] {
    return Array.from(this.sensorReadings.keys());
  }

  isActive(): boolean {
    return this.isRunning;
  }
}

export const hardwareMonitor = new HardwareMonitor();
export default hardwareMonitor;
