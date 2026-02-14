"""
Cascade Hardware Monitor - Main Client
"""

import json
import threading
from typing import Any, Callable, Dict, List, Optional, Union
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError
import ssl

from .models import (
    CPUData, GPUData, MemoryData, DiskData, NetworkData,
    MainboardData, FanController, SMARTData, Alert,
    AIStatus, AIAnalysis, InferredMetrics
)
from .exceptions import CascadeError, ConnectionError, APIError


class AIClient:
    """AI-specific endpoints for intelligent hardware monitoring."""
    
    def __init__(self, parent: 'CascadeClient'):
        self._parent = parent
    
    def get_status(self) -> AIStatus:
        """Get AI-friendly system status with health scores."""
        return AIStatus(self._parent._get('/ai/status'))
    
    def get_analysis(self) -> AIAnalysis:
        """Get semantic analysis with recommendations and warnings."""
        return AIAnalysis(self._parent._get('/ai/analysis'))
    
    def get_actions(self) -> List[Dict[str, Any]]:
        """Get list of available AI actions."""
        return self._parent._get('/ai/actions')['actions']
    
    def execute_action(self, action: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Execute an AI action (e.g., set_power_profile, set_brightness)."""
        return self._parent._post('/ai/action', {'action': action, 'params': params or {}})


class CascadeClient:
    """
    Cascade Hardware Monitor API Client
    
    A modern, AI-friendly hardware monitoring client that provides comprehensive
    system metrics. Superior alternative to OpenHardwareMonitor.
    
    Args:
        host: API host (default: localhost)
        port: API port (default: 8085)
        timeout: Request timeout in seconds (default: 10)
        ssl_verify: Verify SSL certificates (default: True)
    
    Example:
        client = CascadeClient()
        
        # Get full system snapshot
        snapshot = client.get_snapshot()
        
        # Get CPU data
        cpu = client.get_cpu()
        print(f"CPU Load: {cpu.load}%")
        
        # AI integration
        analysis = client.ai.get_analysis()
        for rec in analysis.recommendations:
            print(f"Recommendation: {rec}")
    """
    
    def __init__(
        self,
        host: str = "localhost",
        port: int = 8085,
        timeout: int = 10,
        ssl_verify: bool = True
    ):
        self.host = host
        self.port = port
        self.timeout = timeout
        self.ssl_verify = ssl_verify
        self._base_url = f"http://{host}:{port}/api/v1"
        self._ws_url = f"ws://{host}:{port}"
        self._ws_connection = None
        self._ws_callbacks: List[Callable] = []
        
        # AI client for AI-specific endpoints
        self.ai = AIClient(self)
    
    def _get(self, endpoint: str) -> Any:
        """Make GET request to API."""
        url = f"{self._base_url}{endpoint}"
        try:
            ctx = ssl.create_default_context()
            if not self.ssl_verify:
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE
            
            req = Request(url, headers={'Accept': 'application/json'})
            with urlopen(req, timeout=self.timeout, context=ctx) as response:
                return json.loads(response.read().decode('utf-8'))
        except HTTPError as e:
            raise APIError(f"API error: {e.code} {e.reason}", e.code)
        except URLError as e:
            raise ConnectionError(f"Connection failed: {e.reason}")
        except Exception as e:
            raise CascadeError(f"Request failed: {str(e)}")
    
    def _post(self, endpoint: str, data: Dict[str, Any]) -> Any:
        """Make POST request to API."""
        url = f"{self._base_url}{endpoint}"
        try:
            body = json.dumps(data).encode('utf-8')
            req = Request(url, data=body, method='POST')
            req.add_header('Content-Type', 'application/json')
            req.add_header('Accept', 'application/json')
            
            with urlopen(req, timeout=self.timeout) as response:
                return json.loads(response.read().decode('utf-8'))
        except HTTPError as e:
            raise APIError(f"API error: {e.code} {e.reason}", e.code)
        except URLError as e:
            raise ConnectionError(f"Connection failed: {e.reason}")
        except Exception as e:
            raise CascadeError(f"Request failed: {str(e)}")
    
    # Health & Status
    def health(self) -> Dict[str, Any]:
        """Check API health status."""
        return self._get('/health')
    
    def get_status(self) -> Dict[str, Any]:
        """Get monitoring status."""
        return self._get('/status')
    
    # Snapshots
    def get_snapshot(self) -> Dict[str, Any]:
        """Get full hardware snapshot."""
        return self._get('/snapshot')
    
    def get_live_snapshot(self) -> Dict[str, Any]:
        """Force fresh poll and get snapshot."""
        return self._get('/snapshot/live')
    
    # CPU
    def get_cpu(self) -> CPUData:
        """Get CPU data."""
        return CPUData(self._get('/cpu'))
    
    def get_cpu_sensors(self) -> Dict[str, Any]:
        """Get detailed CPU sensor data (per-core temps, voltages, power)."""
        return self._get('/cpu/sensors')
    
    def get_cpu_cores(self) -> List[Dict[str, Any]]:
        """Get per-core CPU data."""
        return self._get('/cpu/sensors/cores')
    
    def get_cpu_temperatures(self) -> List[Dict[str, Any]]:
        """Get per-core CPU temperatures."""
        return self._get('/cpu/sensors/temperatures')
    
    def get_cpu_frequencies(self) -> List[Dict[str, Any]]:
        """Get per-core CPU frequencies."""
        return self._get('/cpu/sensors/frequencies')
    
    def get_cpu_power(self) -> Dict[str, Any]:
        """Get CPU power consumption data."""
        return self._get('/cpu/sensors/power')
    
    def get_cpu_throttling(self) -> Dict[str, Any]:
        """Get CPU throttling status."""
        return self._get('/cpu/sensors/throttling')
    
    # GPU
    def get_gpu(self) -> GPUData:
        """Get GPU data."""
        return GPUData(self._get('/gpu'))
    
    def get_all_gpus(self) -> List[Dict[str, Any]]:
        """Get data for all GPUs."""
        return self._get('/gpu/all')
    
    def get_gpu_processes(self) -> List[Dict[str, Any]]:
        """Get GPU process list."""
        return self._get('/gpu/processes')
    
    # Memory
    def get_memory(self) -> MemoryData:
        """Get memory data."""
        return MemoryData(self._get('/memory'))
    
    # Storage
    def get_disks(self) -> List[DiskData]:
        """Get disk data."""
        data = self._get('/disks')
        return [DiskData(d) for d in data]
    
    def get_smart(self) -> SMARTData:
        """Get SMART disk health data."""
        return SMARTData(self._get('/smart'))
    
    def get_failing_disks(self) -> List[Dict[str, Any]]:
        """Get disks with failing SMART attributes."""
        return self._get('/smart/failing')
    
    # Network
    def get_network(self) -> NetworkData:
        """Get network data."""
        return NetworkData(self._get('/network'))
    
    # Mainboard
    def get_mainboard(self) -> MainboardData:
        """Get mainboard sensor data (VRM, chipset, voltages)."""
        return MainboardData(self._get('/mainboard'))
    
    def get_voltages(self) -> List[Dict[str, Any]]:
        """Get mainboard voltage readings."""
        return self._get('/mainboard/voltages')
    
    def get_vrm(self) -> Optional[Dict[str, Any]]:
        """Get VRM temperature and power data."""
        return self._get('/mainboard/vrm')
    
    def get_chipset(self) -> Optional[Dict[str, Any]]:
        """Get chipset/PCH temperature."""
        return self._get('/mainboard/chipset')
    
    # Fans
    def get_fans(self) -> FanController:
        """Get fan controller data."""
        return FanController(self._get('/fans'))
    
    def get_fan_controllers(self) -> List[Dict[str, Any]]:
        """Get all fan controllers."""
        return self._get('/fans/controllers')
    
    def set_fan_speed(self, controller_id: str, channel_id: str, speed: int) -> bool:
        """Set fan speed (0-100%)."""
        result = self._post(f'/fans/controllers/{controller_id}/channels/{channel_id}/speed', {'speed': speed})
        return result.get('success', False)
    
    def set_fan_mode(self, controller_id: str, channel_id: str, mode: str) -> bool:
        """Set fan mode ('auto' or 'manual')."""
        result = self._post(f'/fans/controllers/{controller_id}/channels/{channel_id}/mode', {'mode': mode})
        return result.get('success', False)
    
    # Advanced Monitoring
    def get_advanced(self) -> Dict[str, Any]:
        """Get advanced hardware data (VRM, chipset, PCIe, power rails)."""
        return self._get('/advanced')
    
    def get_pcie_bandwidth(self) -> List[Dict[str, Any]]:
        """Get PCIe slot bandwidth data."""
        return self._get('/advanced/pcie')
    
    def get_thermal_zones(self) -> List[Dict[str, Any]]:
        """Get all thermal zones."""
        return self._get('/advanced/thermal-zones')
    
    # Inferred Metrics
    def get_inferred(self) -> InferredMetrics:
        """Get all inferred/calculated metrics."""
        return InferredMetrics(self._get('/inferred'))
    
    def get_thermal_headroom(self) -> Dict[str, Any]:
        """Get thermal headroom before throttling."""
        return self._get('/inferred/thermal-headroom')
    
    def get_efficiency(self) -> Dict[str, Any]:
        """Get system efficiency scores."""
        return self._get('/inferred/efficiency')
    
    def get_bottleneck(self) -> Dict[str, Any]:
        """Get bottleneck analysis."""
        return self._get('/inferred/bottleneck')
    
    def get_workload_profile(self) -> Dict[str, Any]:
        """Get detected workload profile."""
        return self._get('/inferred/workload')
    
    def get_health_prediction(self) -> Dict[str, Any]:
        """Get component health predictions."""
        return self._get('/inferred/health')
    
    # Unified Monitors
    def get_monitors(self) -> Dict[str, Any]:
        """Get all sensors from all monitoring sources."""
        return self._get('/monitors')
    
    def get_monitor_sources(self) -> Dict[str, bool]:
        """Get available monitoring sources."""
        return self._get('/monitors/sources')
    
    def get_all_temperatures(self) -> List[Dict[str, Any]]:
        """Get all temperature sensors from all sources."""
        return self._get('/monitors/temperatures')
    
    def get_critical_sensors(self) -> List[Dict[str, Any]]:
        """Get sensors in critical state."""
        return self._get('/monitors/critical')
    
    def get_warning_sensors(self) -> List[Dict[str, Any]]:
        """Get sensors in warning state."""
        return self._get('/monitors/warnings')
    
    # Alerts
    def get_alerts(self) -> List[Alert]:
        """Get all alerts."""
        data = self._get('/alerts')
        return [Alert(a) for a in data]
    
    def create_alert(self, name: str, sensor_path: str, condition: str, **kwargs) -> Alert:
        """Create a new alert."""
        data = {'name': name, 'sensorPath': sensor_path, 'condition': condition, **kwargs}
        return Alert(self._post('/alerts', data))
    
    # Hardware Control
    def get_power_profiles(self) -> List[Dict[str, Any]]:
        """Get available power profiles (Windows)."""
        return self._get('/ai/control/power-profiles')
    
    def set_power_profile(self, profile_id: str) -> bool:
        """Set active power profile."""
        result = self._post(f'/ai/control/power-profiles/{profile_id}', {})
        return result.get('success', False)
    
    def get_brightness(self) -> Optional[int]:
        """Get display brightness."""
        result = self._get('/ai/control/brightness')
        return result.get('brightness')
    
    def set_brightness(self, level: int) -> bool:
        """Set display brightness (0-100)."""
        result = self._post('/ai/control/brightness', {'level': level})
        return result.get('success', False)
    
    def kill_process(self, pid: int, force: bool = False) -> bool:
        """Kill a process by PID."""
        result = self._post(f'/ai/control/process/{pid}', {'force': force})
        return result.get('success', False)
