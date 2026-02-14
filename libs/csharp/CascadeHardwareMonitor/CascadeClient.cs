using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace CascadeHardwareMonitor;

/// <summary>
/// Cascade Hardware Monitor API Client.
/// Modern, AI-friendly hardware monitoring. Superior alternative to OpenHardwareMonitor.
/// </summary>
public class CascadeClient : IDisposable
{
    private readonly HttpClient _http;
    private readonly string _baseUrl;
    private readonly JsonSerializerOptions _jsonOptions;

    /// <summary>AI-specific endpoints</summary>
    public AIClient AI { get; }

    /// <summary>Create client with default localhost:8085</summary>
    public CascadeClient() : this("localhost", 8085) { }

    /// <summary>Create client with custom host and port</summary>
    public CascadeClient(string host, int port)
    {
        _baseUrl = $"http://{host}:{port}/api/v1";
        _http = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };
        AI = new AIClient(this);
    }

    internal async Task<T> GetAsync<T>(string endpoint)
    {
        var response = await _http.GetAsync($"{_baseUrl}{endpoint}");
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<T>(_jsonOptions) 
            ?? throw new CascadeException("Empty response");
    }

    internal async Task<T> PostAsync<T>(string endpoint, object body)
    {
        var response = await _http.PostAsJsonAsync($"{_baseUrl}{endpoint}", body, _jsonOptions);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<T>(_jsonOptions)
            ?? throw new CascadeException("Empty response");
    }

    /// <summary>Check API health</summary>
    public Task<HealthStatus> HealthAsync() => GetAsync<HealthStatus>("/health");

    /// <summary>Get full hardware snapshot</summary>
    public Task<Snapshot> GetSnapshotAsync() => GetAsync<Snapshot>("/snapshot");

    /// <summary>Get CPU data</summary>
    public Task<CpuData> GetCpuAsync() => GetAsync<CpuData>("/cpu");

    /// <summary>Get detailed CPU sensors</summary>
    public Task<CpuSensorData> GetCpuSensorsAsync() => GetAsync<CpuSensorData>("/cpu/sensors");

    /// <summary>Get per-core temperatures</summary>
    public Task<List<CoreTemperature>> GetCpuTemperaturesAsync() => GetAsync<List<CoreTemperature>>("/cpu/sensors/temperatures");

    /// <summary>Get CPU power data</summary>
    public Task<CpuPower> GetCpuPowerAsync() => GetAsync<CpuPower>("/cpu/sensors/power");

    /// <summary>Get CPU throttling status</summary>
    public Task<ThrottlingData> GetCpuThrottlingAsync() => GetAsync<ThrottlingData>("/cpu/sensors/throttling");

    /// <summary>Get GPU data</summary>
    public Task<GpuData> GetGpuAsync() => GetAsync<GpuData>("/gpu");

    /// <summary>Get all GPUs</summary>
    public Task<List<GpuData>> GetAllGpusAsync() => GetAsync<List<GpuData>>("/gpu/all");

    /// <summary>Get memory data</summary>
    public Task<MemoryData> GetMemoryAsync() => GetAsync<MemoryData>("/memory");

    /// <summary>Get disk data</summary>
    public Task<List<DiskData>> GetDisksAsync() => GetAsync<List<DiskData>>("/disks");

    /// <summary>Get SMART disk health</summary>
    public Task<SmartData> GetSmartAsync() => GetAsync<SmartData>("/smart");

    /// <summary>Get mainboard sensors</summary>
    public Task<MainboardData> GetMainboardAsync() => GetAsync<MainboardData>("/mainboard");

    /// <summary>Get fan controllers</summary>
    public Task<FanControllerData> GetFansAsync() => GetAsync<FanControllerData>("/fans");

    /// <summary>Set fan speed (0-100)</summary>
    public async Task<bool> SetFanSpeedAsync(string controllerId, string channelId, int speed)
    {
        var result = await PostAsync<ActionResult>(
            $"/fans/controllers/{controllerId}/channels/{channelId}/speed",
            new { speed });
        return result.Success;
    }

    /// <summary>Get advanced hardware data</summary>
    public Task<AdvancedData> GetAdvancedAsync() => GetAsync<AdvancedData>("/advanced");

    /// <summary>Get inferred metrics</summary>
    public Task<InferredMetrics> GetInferredAsync() => GetAsync<InferredMetrics>("/inferred");

    /// <summary>Get bottleneck analysis</summary>
    public Task<BottleneckAnalysis> GetBottleneckAsync() => GetAsync<BottleneckAnalysis>("/inferred/bottleneck");

    /// <summary>Get thermal headroom</summary>
    public Task<ThermalHeadroom> GetThermalHeadroomAsync() => GetAsync<ThermalHeadroom>("/inferred/thermal-headroom");

    /// <summary>Get workload profile</summary>
    public Task<WorkloadProfile> GetWorkloadAsync() => GetAsync<WorkloadProfile>("/inferred/workload");

    /// <summary>Get unified monitor data</summary>
    public Task<UnifiedMonitorData> GetMonitorsAsync() => GetAsync<UnifiedMonitorData>("/monitors");

    /// <summary>Get all temperatures from all sources</summary>
    public Task<List<UnifiedSensor>> GetAllTemperaturesAsync() => GetAsync<List<UnifiedSensor>>("/monitors/temperatures");

    /// <summary>Get critical sensors</summary>
    public Task<List<UnifiedSensor>> GetCriticalSensorsAsync() => GetAsync<List<UnifiedSensor>>("/monitors/critical");

    /// <summary>Set display brightness (0-100)</summary>
    public async Task<bool> SetBrightnessAsync(int level)
    {
        var result = await PostAsync<ActionResult>("/ai/control/brightness", new { level });
        return result.Success;
    }

    public void Dispose() => _http.Dispose();
}

/// <summary>AI-specific endpoints</summary>
public class AIClient
{
    private readonly CascadeClient _client;
    internal AIClient(CascadeClient client) => _client = client;

    /// <summary>Get AI-friendly system status</summary>
    public Task<AiStatus> GetStatusAsync() => _client.GetAsync<AiStatus>("/ai/status");

    /// <summary>Get semantic analysis with recommendations</summary>
    public Task<AiAnalysis> GetAnalysisAsync() => _client.GetAsync<AiAnalysis>("/ai/analysis");

    /// <summary>Get available AI actions</summary>
    public async Task<List<AiAction>> GetActionsAsync()
    {
        var result = await _client.GetAsync<ActionsResponse>("/ai/actions");
        return result.Actions;
    }

    /// <summary>Execute an AI action</summary>
    public Task<ActionResult> ExecuteActionAsync(string action, object? parameters = null)
        => _client.PostAsync<ActionResult>("/ai/action", new { action, @params = parameters ?? new { } });
}

internal record ActionsResponse(List<AiAction> Actions);
