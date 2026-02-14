//! Data models for Cascade Hardware Monitor

use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Deserialize, Serialize)]
pub struct HealthStatus {
    pub status: String,
    pub timestamp: u64,
    pub uptime: f64,
    pub version: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Snapshot {
    pub cpu: CPUData,
    pub gpu: Option<GPUData>,
    pub memory: MemoryData,
    pub disks: Option<Vec<DiskData>>,
    pub network: Option<Value>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CPUData {
    pub manufacturer: String,
    pub brand: String,
    pub speed: f64,
    pub cores: u32,
    pub physical_cores: u32,
    pub load: f64,
    pub temperature: Option<f64>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CPUSensorData {
    pub manufacturer: String,
    pub brand: String,
    pub physical_cores: u32,
    pub logical_cores: u32,
    pub base_frequency: f64,
    pub max_frequency: f64,
    pub current_frequency: f64,
    pub average_load: f64,
    pub package: CPUPackage,
    pub cores: Vec<CoreData>,
    pub throttling: ThrottlingData,
    pub power: CPUPower,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CPUPackage {
    pub temperature: Option<f64>,
    pub temperature_max: Option<f64>,
    pub temperature_tj_max: Option<f64>,
    pub power: Option<f64>,
    pub voltage: Option<f64>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CoreData {
    pub core: u32,
    pub temperature: Option<f64>,
    pub load: f64,
    pub frequency: f64,
    pub voltage: Option<f64>,
    pub throttling: bool,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CoreTemperature {
    pub core: u32,
    pub temperature: Option<f64>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ThrottlingData {
    pub thermal_throttling: bool,
    pub power_throttling: bool,
    pub current_throttling: bool,
    pub throttle_count: Option<u64>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CPUPower {
    pub package_power: Option<f64>,
    pub cores_power: Option<f64>,
    pub uncore_power: Option<f64>,
    pub dram_power: Option<f64>,
    pub tdp: Option<f64>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GPUData {
    pub name: String,
    pub vendor: Option<String>,
    pub temperature: Option<f64>,
    pub utilization_gpu: Option<f64>,
    pub utilization_memory: Option<f64>,
    pub memory_total: Option<u64>,
    pub memory_used: Option<u64>,
    pub power_draw: Option<f64>,
    pub fan_speed: Option<u32>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryData {
    pub total: u64,
    pub used: u64,
    pub free: u64,
    pub used_percent: f64,
    pub swap_total: u64,
    pub swap_used: u64,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskData {
    pub name: String,
    pub mount: String,
    pub size: u64,
    pub used: u64,
    pub use_percent: f64,
    pub temperature: Option<f64>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SMARTData {
    pub available: bool,
    pub disks: Vec<SMARTDisk>,
    pub healthy_summary: HealthySummary,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SMARTDisk {
    pub device: String,
    pub model: String,
    pub health_status: String,
    pub temperature: Option<f64>,
    pub power_on_hours: Option<u64>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct HealthySummary {
    pub total: u32,
    pub healthy: u32,
    pub warning: u32,
    pub failing: u32,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MainboardData {
    pub manufacturer: String,
    pub model: String,
    pub bios_version: String,
    pub voltages: Vec<VoltageSensor>,
    pub temperatures: Vec<TemperatureSensor>,
    pub fans: Vec<FanSensor>,
    pub vrm: Option<VRMData>,
    pub chipset: Option<ChipsetData>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct VoltageSensor {
    pub name: String,
    pub value: f64,
    pub nominal: Option<f64>,
    pub status: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct TemperatureSensor {
    pub name: String,
    pub value: f64,
    pub max: Option<f64>,
    pub status: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct FanSensor {
    pub name: String,
    pub rpm: u32,
    pub pwm: Option<u32>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct VRMData {
    pub temperature: Option<f64>,
    pub voltage: Option<f64>,
    pub power: Option<f64>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChipsetData {
    pub name: String,
    pub pch_temperature: Option<f64>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FanControllerData {
    pub available: bool,
    pub controllers: Vec<FanController>,
    pub total_channels: u32,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct FanController {
    pub id: String,
    pub name: String,
    pub channels: Vec<FanChannel>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FanChannel {
    pub id: String,
    pub name: String,
    pub speed_percent: u32,
    pub rpm: Option<u32>,
    pub controllable: bool,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct AdvancedData {
    pub vrm: Option<VRMData>,
    pub chipset: Option<ChipsetData>,
    #[serde(rename = "pcieBandwidth")]
    pub pcie_bandwidth: Vec<PCIeBandwidth>,
    #[serde(rename = "thermalZones")]
    pub thermal_zones: Vec<ThermalZone>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PCIeBandwidth {
    pub slot: String,
    pub device: String,
    pub current_speed: String,
    pub lanes: u32,
    pub bandwidth_gbps: f64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ThermalZone {
    pub name: String,
    pub temperature: f64,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InferredMetrics {
    pub thermal_headroom: ThermalHeadroom,
    pub efficiency_score: EfficiencyScore,
    pub bottleneck: BottleneckAnalysis,
    pub workload_profile: WorkloadProfile,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ThermalHeadroom {
    pub cpu: ThermalComponent,
    pub gpu: Vec<ThermalComponent>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ThermalComponent {
    pub current: f64,
    pub max: f64,
    pub headroom: f64,
    pub headroom_percent: f64,
    pub throttling: bool,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct EfficiencyScore {
    pub overall: u32,
    pub cpu: ComponentEfficiency,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ComponentEfficiency {
    pub score: u32,
    pub performance_per_watt: Option<f64>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BottleneckAnalysis {
    pub primary_bottleneck: String,
    pub severity: String,
    pub confidence: u32,
    pub recommendations: Vec<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkloadProfile {
    #[serde(rename = "type")]
    pub workload_type: String,
    pub confidence: u32,
    pub estimated_power_draw: Option<f64>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct UnifiedMonitorData {
    pub sources: MonitorSources,
    pub sensors: Vec<UnifiedSensor>,
    pub temperatures: Vec<UnifiedSensor>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MonitorSources {
    pub libre_hardware_monitor: bool,
    pub lm_sensors: bool,
    pub ipmi: bool,
    pub hwinfo: bool,
    pub smart: bool,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct UnifiedSensor {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub sensor_type: String,
    pub value: f64,
    pub unit: String,
    pub source: String,
    pub status: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct AIStatus {
    pub timestamp: u64,
    pub system: SystemHealth,
    pub summary: Value,
    pub capabilities: Value,
    pub actions: Vec<AIAction>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemHealth {
    pub healthy: bool,
    pub alert_count: u32,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct AIAnalysis {
    pub recommendations: Vec<String>,
    pub warnings: Vec<String>,
    pub metrics: Value,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct AIAction {
    pub id: String,
    pub name: String,
    pub description: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ActionResult {
    pub success: bool,
    pub message: Option<String>,
}
