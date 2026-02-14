namespace CascadeHardwareMonitor;

public record HealthStatus(string Status, long Timestamp, double Uptime, string Version);

public record Snapshot(CpuData Cpu, GpuData? Gpu, MemoryData Memory, List<DiskData>? Disks);

public record CpuData(
    string Manufacturer, string Brand, double Speed, int Cores, 
    int PhysicalCores, double Load, double? Temperature);

public record CpuSensorData(
    string Manufacturer, string Brand, int PhysicalCores, int LogicalCores,
    double BaseFrequency, double MaxFrequency, double CurrentFrequency, double AverageLoad,
    CpuPackage Package, List<CoreData> Cores, ThrottlingData Throttling, CpuPower Power);

public record CpuPackage(
    double? Temperature, double? TemperatureMax, double? TemperatureTjMax,
    double? Power, double? Voltage);

public record CoreData(int Core, double? Temperature, double Load, double Frequency, double? Voltage, bool Throttling);

public record CoreTemperature(int Core, double? Temperature);

public record ThrottlingData(bool ThermalThrottling, bool PowerThrottling, bool CurrentThrottling, long? ThrottleCount);

public record CpuPower(double? PackagePower, double? CoresPower, double? UncorePower, double? DramPower, double? Tdp);

public record GpuData(
    string Name, string? Vendor, double? Temperature, double? UtilizationGpu,
    double? UtilizationMemory, long? MemoryTotal, long? MemoryUsed, double? PowerDraw, int? FanSpeed);

public record MemoryData(long Total, long Used, long Free, double UsedPercent, long SwapTotal, long SwapUsed);

public record DiskData(string Name, string Mount, long Size, long Used, double UsePercent, double? Temperature);

public record SmartData(bool Available, List<SmartDisk> Disks, HealthySummary HealthySummary);

public record SmartDisk(string Device, string Model, string HealthStatus, double? Temperature, long? PowerOnHours);

public record HealthySummary(int Total, int Healthy, int Warning, int Failing);

public record MainboardData(
    string Manufacturer, string Model, string BiosVersion,
    List<VoltageSensor> Voltages, List<TemperatureSensor> Temperatures, List<FanSensor> Fans,
    VrmData? Vrm, ChipsetData? Chipset);

public record VoltageSensor(string Name, double Value, double? Nominal, string Status);

public record TemperatureSensor(string Name, double Value, double? Max, string Status);

public record FanSensor(string Name, int Rpm, int? Pwm);

public record VrmData(double? Temperature, double? Voltage, double? Power);

public record ChipsetData(string Name, double? PchTemperature);

public record FanControllerData(bool Available, List<FanController> Controllers, int TotalChannels);

public record FanController(string Id, string Name, List<FanChannel> Channels);

public record FanChannel(string Id, string Name, int SpeedPercent, int? Rpm, bool Controllable);

public record AdvancedData(VrmData? Vrm, ChipsetData? Chipset, List<PcieBandwidth> PcieBandwidth, List<ThermalZone> ThermalZones);

public record PcieBandwidth(string Slot, string Device, string CurrentSpeed, int Lanes, double BandwidthGbps);

public record ThermalZone(string Name, double Temperature);

public record InferredMetrics(ThermalHeadroom ThermalHeadroom, EfficiencyScore EfficiencyScore, BottleneckAnalysis Bottleneck, WorkloadProfile WorkloadProfile);

public record ThermalHeadroom(ThermalComponent Cpu, List<ThermalComponent> Gpu);

public record ThermalComponent(double Current, double Max, double Headroom, double HeadroomPercent, bool Throttling);

public record EfficiencyScore(int Overall, ComponentEfficiency Cpu);

public record ComponentEfficiency(int Score, double? PerformancePerWatt);

public record BottleneckAnalysis(string PrimaryBottleneck, string Severity, int Confidence, List<string> Recommendations);

public record WorkloadProfile(string Type, int Confidence, double? EstimatedPowerDraw);

public record UnifiedMonitorData(MonitorSources Sources, List<UnifiedSensor> Sensors, List<UnifiedSensor> Temperatures);

public record MonitorSources(bool LibreHardwareMonitor, bool LmSensors, bool Ipmi, bool Hwinfo, bool Smart);

public record UnifiedSensor(string Id, string Name, string Type, double Value, string Unit, string Source, string Status);

public record AiStatus(long Timestamp, SystemHealth System, object Summary, object Capabilities, List<AiAction> Actions);

public record SystemHealth(bool Healthy, int AlertCount);

public record AiAnalysis(List<string> Recommendations, List<string> Warnings, object Metrics);

public record AiAction(string Id, string Name, string Description);

public record ActionResult(bool Success, string? Message);

public class CascadeException : Exception
{
    public CascadeException(string message) : base(message) { }
    public CascadeException(string message, Exception inner) : base(message, inner) { }
}
