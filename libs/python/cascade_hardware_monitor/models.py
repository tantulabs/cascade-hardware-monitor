"""
Cascade Hardware Monitor - Data Models
"""

from typing import Any, Dict, List, Optional


class BaseModel:
    """Base model with dict-like access."""
    
    def __init__(self, data: Dict[str, Any]):
        self._data = data
        for key, value in data.items():
            setattr(self, key, value)
    
    def __getitem__(self, key: str) -> Any:
        return self._data.get(key)
    
    def __repr__(self) -> str:
        return f"{self.__class__.__name__}({self._data})"
    
    def to_dict(self) -> Dict[str, Any]:
        return self._data


class CPUData(BaseModel):
    """CPU monitoring data."""
    manufacturer: str
    brand: str
    speed: float
    cores: int
    physicalCores: int
    load: float
    temperature: Optional[float]


class GPUData(BaseModel):
    """GPU monitoring data."""
    name: str
    vendor: str
    temperature: Optional[float]
    utilizationGpu: Optional[float]
    utilizationMemory: Optional[float]
    memoryTotal: Optional[int]
    memoryUsed: Optional[int]
    powerDraw: Optional[float]
    fanSpeed: Optional[int]


class MemoryData(BaseModel):
    """Memory monitoring data."""
    total: int
    used: int
    free: int
    usedPercent: float
    swapTotal: int
    swapUsed: int


class DiskData(BaseModel):
    """Disk monitoring data."""
    name: str
    mount: str
    type: str
    size: int
    used: int
    usePercent: float
    temperature: Optional[float]


class NetworkData(BaseModel):
    """Network monitoring data."""
    interfaces: List[Dict[str, Any]]
    rxBytes: int
    txBytes: int
    rxSpeed: float
    txSpeed: float


class MainboardData(BaseModel):
    """Mainboard sensor data."""
    manufacturer: str
    model: str
    biosVersion: str
    voltages: List[Dict[str, Any]]
    temperatures: List[Dict[str, Any]]
    fans: List[Dict[str, Any]]
    vrm: Optional[Dict[str, Any]]
    chipset: Optional[Dict[str, Any]]


class FanController(BaseModel):
    """Fan controller data."""
    available: bool
    controllers: List[Dict[str, Any]]
    totalChannels: int


class SMARTData(BaseModel):
    """SMART disk health data."""
    available: bool
    disks: List[Dict[str, Any]]
    healthySummary: Dict[str, int]


class Alert(BaseModel):
    """Alert configuration."""
    id: str
    name: str
    sensorPath: str
    condition: str
    enabled: bool


class AIStatus(BaseModel):
    """AI-friendly system status."""
    timestamp: int
    system: Dict[str, Any]
    summary: Dict[str, Any]
    capabilities: Dict[str, bool]
    actions: List[Dict[str, Any]]


class AIAnalysis(BaseModel):
    """AI semantic analysis."""
    recommendations: List[str]
    warnings: List[str]
    metrics: Dict[str, Any]


class InferredMetrics(BaseModel):
    """Inferred/calculated metrics."""
    thermalHeadroom: Dict[str, Any]
    efficiencyScore: Dict[str, Any]
    bottleneck: Dict[str, Any]
    systemBalance: Dict[str, Any]
    workloadProfile: Dict[str, Any]
    healthPrediction: Dict[str, Any]
