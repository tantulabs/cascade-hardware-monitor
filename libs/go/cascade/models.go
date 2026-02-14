package cascade

// HealthStatus represents API health.
type HealthStatus struct {
	Status    string  `json:"status"`
	Timestamp int64   `json:"timestamp"`
	Uptime    float64 `json:"uptime"`
	Version   string  `json:"version"`
}

// Snapshot represents full hardware snapshot.
type Snapshot struct {
	CPU    CPUData     `json:"cpu"`
	GPU    *GPUData    `json:"gpu,omitempty"`
	Memory MemoryData  `json:"memory"`
	Disks  []DiskData  `json:"disks,omitempty"`
}

// CPUData represents CPU information.
type CPUData struct {
	Manufacturer  string   `json:"manufacturer"`
	Brand         string   `json:"brand"`
	Speed         float64  `json:"speed"`
	Cores         int      `json:"cores"`
	PhysicalCores int      `json:"physicalCores"`
	Load          float64  `json:"load"`
	Temperature   *float64 `json:"temperature,omitempty"`
}

// CPUSensorData represents detailed CPU sensors.
type CPUSensorData struct {
	Manufacturer     string         `json:"manufacturer"`
	Brand            string         `json:"brand"`
	PhysicalCores    int            `json:"physicalCores"`
	LogicalCores     int            `json:"logicalCores"`
	BaseFrequency    float64        `json:"baseFrequency"`
	MaxFrequency     float64        `json:"maxFrequency"`
	CurrentFrequency float64        `json:"currentFrequency"`
	AverageLoad      float64        `json:"averageLoad"`
	Package          CPUPackage     `json:"package"`
	Cores            []CoreData     `json:"cores"`
	Throttling       ThrottlingData `json:"throttling"`
	Power            CPUPower       `json:"power"`
}

// CPUPackage represents CPU package data.
type CPUPackage struct {
	Temperature    *float64 `json:"temperature,omitempty"`
	TemperatureMax *float64 `json:"temperatureMax,omitempty"`
	TemperatureTjMax *float64 `json:"temperatureTjMax,omitempty"`
	Power          *float64 `json:"power,omitempty"`
	Voltage        *float64 `json:"voltage,omitempty"`
}

// CoreData represents per-core data.
type CoreData struct {
	Core        int      `json:"core"`
	Temperature *float64 `json:"temperature,omitempty"`
	Load        float64  `json:"load"`
	Frequency   float64  `json:"frequency"`
	Voltage     *float64 `json:"voltage,omitempty"`
	Throttling  bool     `json:"throttling"`
}

// CoreTemperature represents per-core temperature.
type CoreTemperature struct {
	Core        int      `json:"core"`
	Temperature *float64 `json:"temperature,omitempty"`
}

// ThrottlingData represents CPU throttling status.
type ThrottlingData struct {
	ThermalThrottling  bool   `json:"thermalThrottling"`
	PowerThrottling    bool   `json:"powerThrottling"`
	CurrentThrottling  bool   `json:"currentThrottling"`
	ThrottleCount      *int64 `json:"throttleCount,omitempty"`
}

// CPUPower represents CPU power data.
type CPUPower struct {
	PackagePower *float64 `json:"packagePower,omitempty"`
	CoresPower   *float64 `json:"coresPower,omitempty"`
	UncorePower  *float64 `json:"uncorePower,omitempty"`
	DRAMPower    *float64 `json:"dramPower,omitempty"`
	TDP          *float64 `json:"tdp,omitempty"`
}

// GPUData represents GPU information.
type GPUData struct {
	Name              string   `json:"name"`
	Vendor            string   `json:"vendor,omitempty"`
	Temperature       *float64 `json:"temperature,omitempty"`
	UtilizationGPU    *float64 `json:"utilizationGpu,omitempty"`
	UtilizationMemory *float64 `json:"utilizationMemory,omitempty"`
	MemoryTotal       *int64   `json:"memoryTotal,omitempty"`
	MemoryUsed        *int64   `json:"memoryUsed,omitempty"`
	PowerDraw         *float64 `json:"powerDraw,omitempty"`
	FanSpeed          *int     `json:"fanSpeed,omitempty"`
}

// MemoryData represents memory information.
type MemoryData struct {
	Total       int64   `json:"total"`
	Used        int64   `json:"used"`
	Free        int64   `json:"free"`
	UsedPercent float64 `json:"usedPercent"`
	SwapTotal   int64   `json:"swapTotal"`
	SwapUsed    int64   `json:"swapUsed"`
}

// DiskData represents disk information.
type DiskData struct {
	Name        string   `json:"name"`
	Mount       string   `json:"mount"`
	Size        int64    `json:"size"`
	Used        int64    `json:"used"`
	UsePercent  float64  `json:"usePercent"`
	Temperature *float64 `json:"temperature,omitempty"`
}

// SMARTData represents SMART disk health.
type SMARTData struct {
	Available      bool           `json:"available"`
	Disks          []SMARTDisk    `json:"disks"`
	HealthySummary HealthySummary `json:"healthySummary"`
}

// SMARTDisk represents individual disk SMART data.
type SMARTDisk struct {
	Device       string   `json:"device"`
	Model        string   `json:"model"`
	HealthStatus string   `json:"healthStatus"`
	Temperature  *float64 `json:"temperature,omitempty"`
	PowerOnHours *int64   `json:"powerOnHours,omitempty"`
}

// HealthySummary represents disk health summary.
type HealthySummary struct {
	Total   int `json:"total"`
	Healthy int `json:"healthy"`
	Warning int `json:"warning"`
	Failing int `json:"failing"`
}

// MainboardData represents mainboard sensors.
type MainboardData struct {
	Manufacturer string              `json:"manufacturer"`
	Model        string              `json:"model"`
	BIOSVersion  string              `json:"biosVersion"`
	Voltages     []VoltageSensor     `json:"voltages"`
	Temperatures []TemperatureSensor `json:"temperatures"`
	Fans         []FanSensor         `json:"fans"`
	VRM          *VRMData            `json:"vrm,omitempty"`
	Chipset      *ChipsetData        `json:"chipset,omitempty"`
}

// VoltageSensor represents voltage reading.
type VoltageSensor struct {
	Name    string   `json:"name"`
	Value   float64  `json:"value"`
	Nominal *float64 `json:"nominal,omitempty"`
	Status  string   `json:"status"`
}

// TemperatureSensor represents temperature reading.
type TemperatureSensor struct {
	Name   string   `json:"name"`
	Value  float64  `json:"value"`
	Max    *float64 `json:"max,omitempty"`
	Status string   `json:"status"`
}

// FanSensor represents fan reading.
type FanSensor struct {
	Name string `json:"name"`
	RPM  int    `json:"rpm"`
	PWM  *int   `json:"pwm,omitempty"`
}

// VRMData represents VRM sensor data.
type VRMData struct {
	Temperature *float64 `json:"temperature,omitempty"`
	Voltage     *float64 `json:"voltage,omitempty"`
	Power       *float64 `json:"power,omitempty"`
}

// ChipsetData represents chipset data.
type ChipsetData struct {
	Name           string   `json:"name"`
	PCHTemperature *float64 `json:"pchTemperature,omitempty"`
}

// FanControllerData represents fan controllers.
type FanControllerData struct {
	Available     bool            `json:"available"`
	Controllers   []FanController `json:"controllers"`
	TotalChannels int             `json:"totalChannels"`
}

// FanController represents a fan controller.
type FanController struct {
	ID       string       `json:"id"`
	Name     string       `json:"name"`
	Channels []FanChannel `json:"channels"`
}

// FanChannel represents a fan channel.
type FanChannel struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	SpeedPercent int    `json:"speedPercent"`
	RPM          *int   `json:"rpm,omitempty"`
	Controllable bool   `json:"controllable"`
}

// AdvancedData represents advanced hardware data.
type AdvancedData struct {
	VRM           *VRMData        `json:"vrm,omitempty"`
	Chipset       *ChipsetData    `json:"chipset,omitempty"`
	PCIeBandwidth []PCIeBandwidth `json:"pcieBandwidth"`
	ThermalZones  []ThermalZone   `json:"thermalZones"`
}

// PCIeBandwidth represents PCIe slot data.
type PCIeBandwidth struct {
	Slot         string  `json:"slot"`
	Device       string  `json:"device"`
	CurrentSpeed string  `json:"currentSpeed"`
	Lanes        int     `json:"lanes"`
	BandwidthGBps float64 `json:"bandwidthGBps"`
}

// ThermalZone represents a thermal zone.
type ThermalZone struct {
	Name        string  `json:"name"`
	Temperature float64 `json:"temperature"`
}

// InferredMetrics represents calculated metrics.
type InferredMetrics struct {
	ThermalHeadroom ThermalHeadroom    `json:"thermalHeadroom"`
	EfficiencyScore EfficiencyScore    `json:"efficiencyScore"`
	Bottleneck      BottleneckAnalysis `json:"bottleneck"`
	WorkloadProfile WorkloadProfile    `json:"workloadProfile"`
}

// ThermalHeadroom represents thermal headroom data.
type ThermalHeadroom struct {
	CPU ThermalComponent   `json:"cpu"`
	GPU []ThermalComponent `json:"gpu"`
}

// ThermalComponent represents component thermal data.
type ThermalComponent struct {
	Current         float64 `json:"current"`
	Max             float64 `json:"max"`
	Headroom        float64 `json:"headroom"`
	HeadroomPercent float64 `json:"headroomPercent"`
	Throttling      bool    `json:"throttling"`
}

// EfficiencyScore represents efficiency metrics.
type EfficiencyScore struct {
	Overall int                 `json:"overall"`
	CPU     ComponentEfficiency `json:"cpu"`
}

// ComponentEfficiency represents component efficiency.
type ComponentEfficiency struct {
	Score             int      `json:"score"`
	PerformancePerWatt *float64 `json:"performancePerWatt,omitempty"`
}

// BottleneckAnalysis represents bottleneck detection.
type BottleneckAnalysis struct {
	PrimaryBottleneck string   `json:"primaryBottleneck"`
	Severity          string   `json:"severity"`
	Confidence        int      `json:"confidence"`
	Recommendations   []string `json:"recommendations"`
}

// WorkloadProfile represents detected workload.
type WorkloadProfile struct {
	Type               string   `json:"type"`
	Confidence         int      `json:"confidence"`
	EstimatedPowerDraw *float64 `json:"estimatedPowerDraw,omitempty"`
}

// UnifiedMonitorData represents unified sensor data.
type UnifiedMonitorData struct {
	Sources      MonitorSources  `json:"sources"`
	Sensors      []UnifiedSensor `json:"sensors"`
	Temperatures []UnifiedSensor `json:"temperatures"`
}

// MonitorSources represents available monitoring sources.
type MonitorSources struct {
	LibreHardwareMonitor bool `json:"libreHardwareMonitor"`
	LMSensors            bool `json:"lmSensors"`
	IPMI                 bool `json:"ipmi"`
	HWiNFO               bool `json:"hwinfo"`
	SMART                bool `json:"smart"`
}

// UnifiedSensor represents a sensor from any source.
type UnifiedSensor struct {
	ID     string  `json:"id"`
	Name   string  `json:"name"`
	Type   string  `json:"type"`
	Value  float64 `json:"value"`
	Unit   string  `json:"unit"`
	Source string  `json:"source"`
	Status string  `json:"status"`
}

// AIStatus represents AI-friendly system status.
type AIStatus struct {
	Timestamp    int64                  `json:"timestamp"`
	System       SystemHealth           `json:"system"`
	Summary      map[string]interface{} `json:"summary"`
	Capabilities map[string]bool        `json:"capabilities"`
	Actions      []AIAction             `json:"actions"`
}

// SystemHealth represents system health status.
type SystemHealth struct {
	Healthy    bool `json:"healthy"`
	AlertCount int  `json:"alertCount"`
}

// AIAnalysis represents AI analysis results.
type AIAnalysis struct {
	Recommendations []string               `json:"recommendations"`
	Warnings        []string               `json:"warnings"`
	Metrics         map[string]interface{} `json:"metrics"`
}

// AIAction represents an available AI action.
type AIAction struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

// ActionResult represents action execution result.
type ActionResult struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
}
