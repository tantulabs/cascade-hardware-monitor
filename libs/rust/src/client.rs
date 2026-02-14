//! Cascade Hardware Monitor Client

use crate::error::CascadeError;
use crate::models::*;
use reqwest::blocking::Client;
use serde_json::Value;

/// AI-specific endpoints
pub struct AIClient<'a> {
    client: &'a CascadeClient,
}

impl<'a> AIClient<'a> {
    /// Get AI-friendly system status with health scores
    pub fn get_status(&self) -> Result<AIStatus, CascadeError> {
        self.client.get("/ai/status")
    }

    /// Get semantic analysis with recommendations
    pub fn get_analysis(&self) -> Result<AIAnalysis, CascadeError> {
        self.client.get("/ai/analysis")
    }

    /// Get available AI actions
    pub fn get_actions(&self) -> Result<Vec<AIAction>, CascadeError> {
        let response: Value = self.client.get("/ai/actions")?;
        let actions = response["actions"].clone();
        Ok(serde_json::from_value(actions)?)
    }

    /// Execute an AI action
    pub fn execute_action(&self, action: &str, params: Value) -> Result<ActionResult, CascadeError> {
        self.client.post("/ai/action", serde_json::json!({
            "action": action,
            "params": params
        }))
    }
}

/// Cascade Hardware Monitor API Client
/// 
/// Modern, AI-friendly hardware monitoring. Superior to OpenHardwareMonitor.
pub struct CascadeClient {
    base_url: String,
    http: Client,
}

impl CascadeClient {
    /// Create a new client
    pub fn new(host: &str, port: u16) -> Result<Self, CascadeError> {
        let http = Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()?;

        Ok(Self {
            base_url: format!("http://{}:{}/api/v1", host, port),
            http,
        })
    }

    /// Create client with default localhost:8085
    pub fn default() -> Result<Self, CascadeError> {
        Self::new("localhost", 8085)
    }

    fn get<T: serde::de::DeserializeOwned>(&self, endpoint: &str) -> Result<T, CascadeError> {
        let url = format!("{}{}", self.base_url, endpoint);
        let response = self.http.get(&url).send()?;
        
        if !response.status().is_success() {
            return Err(CascadeError::Api(format!("HTTP {}", response.status())));
        }
        
        Ok(response.json()?)
    }

    fn post<T: serde::de::DeserializeOwned>(&self, endpoint: &str, body: Value) -> Result<T, CascadeError> {
        let url = format!("{}{}", self.base_url, endpoint);
        let response = self.http.post(&url).json(&body).send()?;
        
        if !response.status().is_success() {
            return Err(CascadeError::Api(format!("HTTP {}", response.status())));
        }
        
        Ok(response.json()?)
    }

    /// Get AI client for AI-specific endpoints
    pub fn ai(&self) -> AIClient {
        AIClient { client: self }
    }

    /// Check API health
    pub fn health(&self) -> Result<HealthStatus, CascadeError> {
        self.get("/health")
    }

    /// Get full hardware snapshot
    pub fn get_snapshot(&self) -> Result<Snapshot, CascadeError> {
        self.get("/snapshot")
    }

    /// Get CPU data
    pub fn get_cpu(&self) -> Result<CPUData, CascadeError> {
        self.get("/cpu")
    }

    /// Get detailed CPU sensors
    pub fn get_cpu_sensors(&self) -> Result<CPUSensorData, CascadeError> {
        self.get("/cpu/sensors")
    }

    /// Get per-core temperatures
    pub fn get_cpu_temperatures(&self) -> Result<Vec<CoreTemperature>, CascadeError> {
        self.get("/cpu/sensors/temperatures")
    }

    /// Get CPU power data
    pub fn get_cpu_power(&self) -> Result<CPUPower, CascadeError> {
        self.get("/cpu/sensors/power")
    }

    /// Get CPU throttling status
    pub fn get_cpu_throttling(&self) -> Result<ThrottlingData, CascadeError> {
        self.get("/cpu/sensors/throttling")
    }

    /// Get GPU data
    pub fn get_gpu(&self) -> Result<GPUData, CascadeError> {
        self.get("/gpu")
    }

    /// Get all GPUs
    pub fn get_all_gpus(&self) -> Result<Vec<GPUData>, CascadeError> {
        self.get("/gpu/all")
    }

    /// Get memory data
    pub fn get_memory(&self) -> Result<MemoryData, CascadeError> {
        self.get("/memory")
    }

    /// Get disk data
    pub fn get_disks(&self) -> Result<Vec<DiskData>, CascadeError> {
        self.get("/disks")
    }

    /// Get SMART disk health
    pub fn get_smart(&self) -> Result<SMARTData, CascadeError> {
        self.get("/smart")
    }

    /// Get mainboard sensors
    pub fn get_mainboard(&self) -> Result<MainboardData, CascadeError> {
        self.get("/mainboard")
    }

    /// Get fan controllers
    pub fn get_fans(&self) -> Result<FanControllerData, CascadeError> {
        self.get("/fans")
    }

    /// Set fan speed
    pub fn set_fan_speed(&self, controller_id: &str, channel_id: &str, speed: u8) -> Result<bool, CascadeError> {
        let result: ActionResult = self.post(
            &format!("/fans/controllers/{}/channels/{}/speed", controller_id, channel_id),
            serde_json::json!({"speed": speed})
        )?;
        Ok(result.success)
    }

    /// Get advanced hardware data
    pub fn get_advanced(&self) -> Result<AdvancedData, CascadeError> {
        self.get("/advanced")
    }

    /// Get inferred metrics
    pub fn get_inferred(&self) -> Result<InferredMetrics, CascadeError> {
        self.get("/inferred")
    }

    /// Get bottleneck analysis
    pub fn get_bottleneck(&self) -> Result<BottleneckAnalysis, CascadeError> {
        self.get("/inferred/bottleneck")
    }

    /// Get thermal headroom
    pub fn get_thermal_headroom(&self) -> Result<ThermalHeadroom, CascadeError> {
        self.get("/inferred/thermal-headroom")
    }

    /// Get workload profile
    pub fn get_workload(&self) -> Result<WorkloadProfile, CascadeError> {
        self.get("/inferred/workload")
    }

    /// Get unified monitor data
    pub fn get_monitors(&self) -> Result<UnifiedMonitorData, CascadeError> {
        self.get("/monitors")
    }

    /// Get all temperatures from all sources
    pub fn get_all_temperatures(&self) -> Result<Vec<UnifiedSensor>, CascadeError> {
        self.get("/monitors/temperatures")
    }

    /// Get critical sensors
    pub fn get_critical_sensors(&self) -> Result<Vec<UnifiedSensor>, CascadeError> {
        self.get("/monitors/critical")
    }

    /// Set display brightness
    pub fn set_brightness(&self, level: u8) -> Result<bool, CascadeError> {
        let result: ActionResult = self.post("/ai/control/brightness", serde_json::json!({"level": level}))?;
        Ok(result.success)
    }
}
