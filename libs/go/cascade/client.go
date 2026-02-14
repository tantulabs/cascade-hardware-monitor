// Package cascade provides a Go client for Cascade Hardware Monitor API.
// Modern, AI-friendly hardware monitoring. Superior alternative to OpenHardwareMonitor.
package cascade

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Client is the Cascade Hardware Monitor API client.
type Client struct {
	baseURL    string
	httpClient *http.Client
	AI         *AIClient
}

// NewClient creates a new Cascade client with default localhost:8085.
func NewClient() *Client {
	return NewClientWithConfig("localhost", 8085)
}

// NewClientWithConfig creates a new Cascade client with custom host and port.
func NewClientWithConfig(host string, port int) *Client {
	c := &Client{
		baseURL: fmt.Sprintf("http://%s:%d/api/v1", host, port),
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
	c.AI = &AIClient{client: c}
	return c
}

func (c *Client) get(endpoint string, result interface{}) error {
	resp, err := c.httpClient.Get(c.baseURL + endpoint)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
	}

	return json.NewDecoder(resp.Body).Decode(result)
}

func (c *Client) post(endpoint string, body interface{}, result interface{}) error {
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return err
	}

	resp, err := c.httpClient.Post(c.baseURL+endpoint, "application/json", bytes.NewReader(jsonBody))
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("API error %d: %s", resp.StatusCode, string(respBody))
	}

	return json.NewDecoder(resp.Body).Decode(result)
}

// Health checks API health status.
func (c *Client) Health() (*HealthStatus, error) {
	var result HealthStatus
	err := c.get("/health", &result)
	return &result, err
}

// GetSnapshot returns full hardware snapshot.
func (c *Client) GetSnapshot() (*Snapshot, error) {
	var result Snapshot
	err := c.get("/snapshot", &result)
	return &result, err
}

// GetCPU returns CPU data.
func (c *Client) GetCPU() (*CPUData, error) {
	var result CPUData
	err := c.get("/cpu", &result)
	return &result, err
}

// GetCPUSensors returns detailed CPU sensor data.
func (c *Client) GetCPUSensors() (*CPUSensorData, error) {
	var result CPUSensorData
	err := c.get("/cpu/sensors", &result)
	return &result, err
}

// GetCPUTemperatures returns per-core temperatures.
func (c *Client) GetCPUTemperatures() ([]CoreTemperature, error) {
	var result []CoreTemperature
	err := c.get("/cpu/sensors/temperatures", &result)
	return result, err
}

// GetCPUPower returns CPU power data.
func (c *Client) GetCPUPower() (*CPUPower, error) {
	var result CPUPower
	err := c.get("/cpu/sensors/power", &result)
	return &result, err
}

// GetCPUThrottling returns CPU throttling status.
func (c *Client) GetCPUThrottling() (*ThrottlingData, error) {
	var result ThrottlingData
	err := c.get("/cpu/sensors/throttling", &result)
	return &result, err
}

// GetGPU returns GPU data.
func (c *Client) GetGPU() (*GPUData, error) {
	var result GPUData
	err := c.get("/gpu", &result)
	return &result, err
}

// GetAllGPUs returns data for all GPUs.
func (c *Client) GetAllGPUs() ([]GPUData, error) {
	var result []GPUData
	err := c.get("/gpu/all", &result)
	return result, err
}

// GetMemory returns memory data.
func (c *Client) GetMemory() (*MemoryData, error) {
	var result MemoryData
	err := c.get("/memory", &result)
	return &result, err
}

// GetDisks returns disk data.
func (c *Client) GetDisks() ([]DiskData, error) {
	var result []DiskData
	err := c.get("/disks", &result)
	return result, err
}

// GetSMART returns SMART disk health data.
func (c *Client) GetSMART() (*SMARTData, error) {
	var result SMARTData
	err := c.get("/smart", &result)
	return &result, err
}

// GetMainboard returns mainboard sensor data.
func (c *Client) GetMainboard() (*MainboardData, error) {
	var result MainboardData
	err := c.get("/mainboard", &result)
	return &result, err
}

// GetFans returns fan controller data.
func (c *Client) GetFans() (*FanControllerData, error) {
	var result FanControllerData
	err := c.get("/fans", &result)
	return &result, err
}

// SetFanSpeed sets fan speed (0-100).
func (c *Client) SetFanSpeed(controllerID, channelID string, speed int) (bool, error) {
	var result ActionResult
	err := c.post(fmt.Sprintf("/fans/controllers/%s/channels/%s/speed", controllerID, channelID),
		map[string]int{"speed": speed}, &result)
	return result.Success, err
}

// GetAdvanced returns advanced hardware data.
func (c *Client) GetAdvanced() (*AdvancedData, error) {
	var result AdvancedData
	err := c.get("/advanced", &result)
	return &result, err
}

// GetInferred returns inferred metrics.
func (c *Client) GetInferred() (*InferredMetrics, error) {
	var result InferredMetrics
	err := c.get("/inferred", &result)
	return &result, err
}

// GetBottleneck returns bottleneck analysis.
func (c *Client) GetBottleneck() (*BottleneckAnalysis, error) {
	var result BottleneckAnalysis
	err := c.get("/inferred/bottleneck", &result)
	return &result, err
}

// GetThermalHeadroom returns thermal headroom data.
func (c *Client) GetThermalHeadroom() (*ThermalHeadroom, error) {
	var result ThermalHeadroom
	err := c.get("/inferred/thermal-headroom", &result)
	return &result, err
}

// GetWorkload returns workload profile.
func (c *Client) GetWorkload() (*WorkloadProfile, error) {
	var result WorkloadProfile
	err := c.get("/inferred/workload", &result)
	return &result, err
}

// GetMonitors returns unified monitor data.
func (c *Client) GetMonitors() (*UnifiedMonitorData, error) {
	var result UnifiedMonitorData
	err := c.get("/monitors", &result)
	return &result, err
}

// GetAllTemperatures returns all temperatures from all sources.
func (c *Client) GetAllTemperatures() ([]UnifiedSensor, error) {
	var result []UnifiedSensor
	err := c.get("/monitors/temperatures", &result)
	return result, err
}

// GetCriticalSensors returns sensors in critical state.
func (c *Client) GetCriticalSensors() ([]UnifiedSensor, error) {
	var result []UnifiedSensor
	err := c.get("/monitors/critical", &result)
	return result, err
}

// SetBrightness sets display brightness (0-100).
func (c *Client) SetBrightness(level int) (bool, error) {
	var result ActionResult
	err := c.post("/ai/control/brightness", map[string]int{"level": level}, &result)
	return result.Success, err
}

// AIClient provides AI-specific endpoints.
type AIClient struct {
	client *Client
}

// GetStatus returns AI-friendly system status.
func (ai *AIClient) GetStatus() (*AIStatus, error) {
	var result AIStatus
	err := ai.client.get("/ai/status", &result)
	return &result, err
}

// GetAnalysis returns semantic analysis with recommendations.
func (ai *AIClient) GetAnalysis() (*AIAnalysis, error) {
	var result AIAnalysis
	err := ai.client.get("/ai/analysis", &result)
	return &result, err
}

// GetActions returns available AI actions.
func (ai *AIClient) GetActions() ([]AIAction, error) {
	var result struct {
		Actions []AIAction `json:"actions"`
	}
	err := ai.client.get("/ai/actions", &result)
	return result.Actions, err
}

// ExecuteAction executes an AI action.
func (ai *AIClient) ExecuteAction(action string, params map[string]interface{}) (*ActionResult, error) {
	var result ActionResult
	err := ai.client.post("/ai/action", map[string]interface{}{
		"action": action,
		"params": params,
	}, &result)
	return &result, err
}
