export interface HealthStatus {
  status: string;
  timestamp: number;
  uptime: number;
  version: string;
}

export interface Snapshot {
  cpu: CPUData;
  gpu?: GPUData;
  memory: MemoryData;
  disks?: DiskData[];
  network?: NetworkData;
}

export interface CPUData {
  manufacturer: string;
  brand: string;
  speed: number;
  cores: number;
  physicalCores: number;
  load: number;
  temperature?: number;
}

export interface CPUSensorData {
  manufacturer: string;
  brand: string;
  physicalCores: number;
  logicalCores: number;
  baseFrequency: number;
  maxFrequency: number;
  currentFrequency: number;
  averageLoad: number;
  package: CPUPackage;
  cores: CoreData[];
  throttling: ThrottlingData;
  power: CPUPower;
}

export interface CPUPackage {
  temperature?: number;
  temperatureMax?: number;
  temperatureTjMax?: number;
  power?: number;
  voltage?: number;
}

export interface CoreData {
  core: number;
  temperature?: number;
  load: number;
  frequency: number;
  voltage?: number;
  throttling: boolean;
}

export interface CoreTemperature {
  core: number;
  temperature?: number;
}

export interface ThrottlingData {
  thermalThrottling: boolean;
  powerThrottling: boolean;
  currentThrottling: boolean;
  throttleCount?: number;
}

export interface CPUPower {
  packagePower?: number;
  coresPower?: number;
  uncorePower?: number;
  dramPower?: number;
  tdp?: number;
}

export interface GPUData {
  name: string;
  vendor?: string;
  temperature?: number;
  utilizationGpu?: number;
  utilizationMemory?: number;
  memoryTotal?: number;
  memoryUsed?: number;
  powerDraw?: number;
  fanSpeed?: number;
}

export interface MemoryData {
  total: number;
  used: number;
  free: number;
  usedPercent: number;
  swapTotal: number;
  swapUsed: number;
}

export interface DiskData {
  name: string;
  mount: string;
  size: number;
  used: number;
  usePercent: number;
  temperature?: number;
}

export interface NetworkData {
  interfaces: NetworkInterface[];
  rxBytes: number;
  txBytes: number;
  rxSpeed: number;
  txSpeed: number;
}

export interface NetworkInterface {
  name: string;
  ip4: string;
  ip6: string;
  mac: string;
}

export interface SMARTData {
  available: boolean;
  disks: SMARTDisk[];
  healthySummary: HealthySummary;
}

export interface SMARTDisk {
  device: string;
  model: string;
  healthStatus: string;
  temperature?: number;
  powerOnHours?: number;
}

export interface HealthySummary {
  total: number;
  healthy: number;
  warning: number;
  failing: number;
}

export interface MainboardData {
  manufacturer: string;
  model: string;
  biosVersion: string;
  voltages: VoltageSensor[];
  temperatures: TemperatureSensor[];
  fans: FanSensor[];
  vrm?: VRMData;
  chipset?: ChipsetData;
}

export interface VoltageSensor {
  name: string;
  value: number;
  nominal?: number;
  status: string;
}

export interface TemperatureSensor {
  name: string;
  value: number;
  max?: number;
  status: string;
}

export interface FanSensor {
  name: string;
  rpm: number;
  pwm?: number;
}

export interface VRMData {
  temperature?: number;
  voltage?: number;
  power?: number;
}

export interface ChipsetData {
  name: string;
  pchTemperature?: number;
}

export interface FanControllerData {
  available: boolean;
  controllers: FanController[];
  totalChannels: number;
}

export interface FanController {
  id: string;
  name: string;
  channels: FanChannel[];
}

export interface FanChannel {
  id: string;
  name: string;
  speedPercent: number;
  rpm?: number;
  controllable: boolean;
}

export interface AdvancedData {
  vrm?: VRMData;
  chipset?: ChipsetData;
  pcieBandwidth: PCIeBandwidth[];
  thermalZones: ThermalZone[];
}

export interface PCIeBandwidth {
  slot: string;
  device: string;
  currentSpeed: string;
  lanes: number;
  bandwidthGBps: number;
}

export interface ThermalZone {
  name: string;
  temperature: number;
}

export interface InferredMetrics {
  thermalHeadroom: ThermalHeadroom;
  efficiencyScore: EfficiencyScore;
  bottleneck: BottleneckAnalysis;
  workloadProfile: WorkloadProfile;
}

export interface ThermalHeadroom {
  cpu: ThermalComponent;
  gpu: ThermalComponent[];
}

export interface ThermalComponent {
  current: number;
  max: number;
  headroom: number;
  headroomPercent: number;
  throttling: boolean;
}

export interface EfficiencyScore {
  overall: number;
  cpu: ComponentEfficiency;
}

export interface ComponentEfficiency {
  score: number;
  performancePerWatt?: number;
}

export interface BottleneckAnalysis {
  primaryBottleneck: string;
  severity: string;
  confidence: number;
  recommendations: string[];
}

export interface WorkloadProfile {
  type: string;
  confidence: number;
  estimatedPowerDraw?: number;
}

export interface UnifiedMonitorData {
  sources: MonitorSources;
  sensors: UnifiedSensor[];
  temperatures: UnifiedSensor[];
}

export interface MonitorSources {
  libreHardwareMonitor: boolean;
  lmSensors: boolean;
  ipmi: boolean;
  hwinfo: boolean;
  smart: boolean;
}

export interface UnifiedSensor {
  id: string;
  name: string;
  type: string;
  value: number;
  unit: string;
  source: string;
  status: string;
}

export interface AIStatus {
  timestamp: number;
  system: SystemHealth;
  summary: Record<string, unknown>;
  capabilities: Record<string, boolean>;
  actions: AIAction[];
}

export interface SystemHealth {
  healthy: boolean;
  alertCount: number;
}

export interface AIAnalysis {
  recommendations: string[];
  warnings: string[];
  metrics: Record<string, unknown>;
}

export interface AIAction {
  id: string;
  name: string;
  description: string;
}

export interface ActionResult {
  success: boolean;
  message?: string;
}
