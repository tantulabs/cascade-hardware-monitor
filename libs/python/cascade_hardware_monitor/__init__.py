"""
Cascade Hardware Monitor - Python Client Library

A modern, AI-friendly hardware monitoring library that provides comprehensive
system metrics via REST API. Superior alternative to OpenHardwareMonitor with
cross-platform support (Windows, macOS, Linux) and AI integration.

Features:
- Real-time CPU, GPU, memory, storage, network monitoring
- Per-core CPU temperatures, frequencies, and loads
- Multi-GPU support (NVIDIA, AMD, Intel, Apple Silicon)
- VRM, chipset, and motherboard sensor data
- Fan controller monitoring and control
- SMART disk health monitoring
- AI-friendly structured data with health scores
- WebSocket real-time streaming
- Hardware control capabilities

Installation:
    pip install cascade-hardware-monitor

Quick Start:
    from cascade_hardware_monitor import CascadeClient
    
    client = CascadeClient()
    status = client.get_status()
    print(f"CPU: {status['cpu']['load']}% @ {status['cpu']['temperature']}°C")

AI Integration:
    # Get AI-optimized system analysis
    analysis = client.ai.get_analysis()
    for warning in analysis['warnings']:
        print(f"Warning: {warning}")
    
    # Execute AI actions
    client.ai.execute_action('set_power_profile', {'profileId': 'balanced'})

Author: TantuLabs
License: MIT
Repository: https://github.com/tantulabs/cascade-hardware-monitor
"""

__version__ = "1.0.0"
__author__ = "TantuLabs"
__license__ = "MIT"

from .client import CascadeClient
from .models import (
    CPUData, GPUData, MemoryData, DiskData, NetworkData,
    MainboardData, FanController, SMARTData, Alert,
    AIStatus, AIAnalysis, InferredMetrics
)
from .exceptions import CascadeError, ConnectionError, APIError

__all__ = [
    "CascadeClient",
    "CPUData", "GPUData", "MemoryData", "DiskData", "NetworkData",
    "MainboardData", "FanController", "SMARTData", "Alert",
    "AIStatus", "AIAnalysis", "InferredMetrics",
    "CascadeError", "ConnectionError", "APIError"
]
