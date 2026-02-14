export interface CPUCore {
  coreId: number;
  physicalId: number;
  temperature: number;
  load: number;
  speed: number;
  voltage: number;
}

export interface CPUSocket {
  socketId: number;
  manufacturer: string;
  brand: string;
  speed: number;
  speedMin: number;
  speedMax: number;
  cores: number;
  physicalCores: number;
  socket: string;
  temperature: number;
  temperatureMax: number;
  load: number;
  voltage: number;
  power: number;
  coreData: CPUCore[];
  cache: {
    l1d: number;
    l1i: number;
    l2: number;
    l3: number;
  };
}

export interface CPUData {
  manufacturer: string;
  brand: string;
  speed: number;
  speedMin: number;
  speedMax: number;
  cores: number;
  physicalCores: number;
  processors: number;
  socket: string;
  temperature: number;
  temperatureMax: number;
  temperatureSocket: number[];
  temperatureCores: number[];
  load: number;
  loadCores: number[];
  voltage: number;
  power: number;
  sockets: CPUSocket[];
  cache: {
    l1d: number;
    l1i: number;
    l2: number;
    l3: number;
  };
}

export interface GPUData {
  index: number;
  vendor: string;
  model: string;
  bus: string;
  vram: number;
  vramDynamic: boolean;
  driverVersion: string;
  temperature: number;
  temperatureMax: number;
  fanSpeed: number;
  powerDraw: number;
  powerLimit: number;
  clockCore: number;
  clockMemory: number;
  utilizationGpu: number;
  utilizationMemory: number;
  memoryTotal: number;
  memoryUsed: number;
  memoryFree: number;
}

export interface MemoryData {
  total: number;
  free: number;
  used: number;
  active: number;
  available: number;
  buffcache: number;
  swapTotal: number;
  swapUsed: number;
  swapFree: number;
  usedPercent: number;
  modules: MemoryModule[];
}

export interface MemoryModule {
  bank: string;
  type: string;
  formFactor: string;
  manufacturer: string;
  partNum: string;
  serialNum: string;
  voltageConfigured: number;
  voltageMin: number;
  voltageMax: number;
  size: number;
  clockSpeed: number;
}

export interface DiskData {
  index: number;
  device: string;
  name: string;
  type: string;
  fsType: string;
  mount: string;
  size: number;
  used: number;
  available: number;
  usePercent: number;
  temperature: number;
  readSpeed: number;
  writeSpeed: number;
  readOps: number;
  writeOps: number;
  smart: SmartData | null;
}

export interface SmartData {
  health: string;
  powerOnHours: number;
  powerCycleCount: number;
  temperature: number;
  reallocatedSectors: number;
  pendingSectors: number;
  uncorrectableSectors: number;
}

export interface NetworkInterface {
  iface: string;
  ifaceName: string;
  type: 'wired' | 'wireless' | 'bluetooth' | 'virtual';
  ip4: string;
  ip6: string;
  mac: string;
  speed: number;
  dhcp: boolean;
  operstate: 'up' | 'down' | 'unknown';
  rxBytes: number;
  txBytes: number;
  rxSec: number;
  txSec: number;
  rxDropped: number;
  txDropped: number;
  rxErrors: number;
  txErrors: number;
  signalStrength?: number;
  ssid?: string;
  frequency?: number;
  channel?: number;
}

export interface BluetoothDevice {
  device: string;
  name: string;
  manufacturer: string;
  macDevice: string;
  macHost: string;
  type: string;
  connected: boolean;
  batteryPercent: number | null;
}

export interface AudioDevice {
  id: string;
  name: string;
  manufacturer: string;
  type: 'input' | 'output';
  default: boolean;
  channel: string;
  status: string;
  volume: number;
  muted: boolean;
}

export interface BatteryData {
  hasBattery: boolean;
  cycleCount: number;
  isCharging: boolean;
  designedCapacity: number;
  maxCapacity: number;
  currentCapacity: number;
  voltage: number;
  capacityUnit: string;
  percent: number;
  timeRemaining: number;
  acConnected: boolean;
  type: string;
  model: string;
  manufacturer: string;
  serial: string;
  health: number;
}

export interface MotherboardData {
  manufacturer: string;
  model: string;
  version: string;
  serial: string;
  assetTag: string;
  memMax: number;
  memSlots: number;
}

export interface BiosData {
  vendor: string;
  version: string;
  releaseDate: string;
  revision: string;
  serial: string;
  language?: string;
  characteristics?: string[];
  features?: string[];
}

export interface TemperatureInfo {
  source: string;
  current: number;
  min?: number;
  max?: number;
  critical?: number;
  warning?: number;
  label: string;
  unit: string;
}

export interface ComponentInfo {
  id: string;
  name: string;
  type: 'cpu' | 'gpu' | 'memory' | 'disk' | 'network' | 'motherboard' | 'battery';
  temperatures: TemperatureInfo[];
  configurationHelp: string;
}

export interface ChassisData {
  manufacturer: string;
  model: string;
  type: string;
  version: string;
  serial: string;
  assetTag: string;
  sku: string;
}

export interface USBDevice {
  id: string;
  bus: number;
  deviceId: number;
  name: string;
  type: string;
  removable: boolean;
  vendor: string;
  manufacturer: string;
  maxPower: string;
  serialNumber: string;
}

export interface ProcessData {
  pid: number;
  parentPid: number;
  name: string;
  cpu: number;
  cpuUser: number;
  cpuSystem: number;
  mem: number;
  priority: number;
  memVsz: number;
  memRss: number;
  nice: number;
  started: string;
  state: string;
  tty: string;
  user: string;
  command: string;
  path: string;
}

export interface SystemInfo {
  manufacturer: string;
  model: string;
  version: string;
  serial: string;
  uuid: string;
  sku: string;
  virtual: boolean;
  virtualHost: string;
}

export interface OSInfo {
  platform: string;
  distro: string;
  release: string;
  codename: string;
  kernel: string;
  arch: string;
  hostname: string;
  fqdn: string;
  codepage: string;
  logofile: string;
  serial: string;
  build: string;
  servicepack: string;
  uefi: boolean;
  hypervizor: boolean;
  remoteSession: boolean;
}

export interface HardwareSnapshot {
  timestamp: number;
  machineId: string;
  system: SystemInfo;
  os: OSInfo;
  cpu: CPUData;
  gpu: GPUData[];
  memory: MemoryData;
  disks: DiskData[];
  network: NetworkInterface[];
  bluetooth: BluetoothDevice[];
  audio: AudioDevice[];
  battery: BatteryData | null;
  motherboard: MotherboardData;
  bios: BiosData;
  chassis: ChassisData;
  usb: USBDevice[];
  processes: ProcessData[];
}

export interface SensorReading {
  name: string;
  type: 'temperature' | 'voltage' | 'fan' | 'power' | 'load' | 'clock' | 'data';
  value: number;
  min: number;
  max: number;
  unit: string;
  source: string;
  timestamp: number;
}

export interface Alert {
  id: string;
  name: string;
  enabled: boolean;
  sensorPath: string;
  condition: 'above' | 'below' | 'between' | 'outside';
  thresholdMin: number;
  thresholdMax: number;
  duration: number;
  cooldown: number;
  actions: AlertAction[];
  lastTriggered: number | null;
  triggerCount: number;
}

export interface AlertAction {
  type: 'notification' | 'sound' | 'email' | 'webhook' | 'command';
  config: Record<string, unknown>;
}

export interface AlertEvent {
  id: string;
  alertId: string;
  alertName: string;
  sensorPath: string;
  value: number;
  threshold: number;
  condition: string;
  timestamp: number;
  acknowledged: boolean;
}

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  homepage: string;
  repository: string;
  license: string;
  sensors: string[];
  dependencies: Record<string, string>;
}

export interface PluginInstance {
  metadata: PluginMetadata;
  enabled: boolean;
  loaded: boolean;
  error: string | null;
  lastUpdate: number;
}

export interface MonitorConfig {
  pollingInterval: number;
  enabledSensors: string[];
  apiPort: number;
  wsPort: number;
  enableAuth: boolean;
  apiKey: string;
  enableHistory: boolean;
  historyRetention: number;
  enableAlerts: boolean;
  startMinimized: boolean;
  startWithWindows: boolean;
  theme: 'light' | 'dark' | 'system';
  language: string;
}
