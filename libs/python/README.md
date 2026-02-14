# Cascade Hardware Monitor - Python Client

[![PyPI](https://img.shields.io/pypi/v/cascade-hardware-monitor)](https://pypi.org/project/cascade-hardware-monitor/)
[![Python](https://img.shields.io/pypi/pyversions/cascade-hardware-monitor)](https://pypi.org/project/cascade-hardware-monitor/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Modern, AI-friendly hardware monitoring library.** Superior alternative to OpenHardwareMonitor with cross-platform support (Windows, macOS, Linux) and AI integration.

## Why Cascade over OpenHardwareMonitor?

| Feature | Cascade | OpenHardwareMonitor |
|---------|---------|---------------------|
| Cross-platform | ✅ Win/Mac/Linux | ❌ Windows only |
| AI Integration | ✅ Built-in | ❌ None |
| REST API | ✅ Full API | ❌ Limited |
| Apple Silicon | ✅ Native | ❌ None |
| Real-time WebSocket | ✅ Yes | ❌ No |
| Per-core CPU data | ✅ Yes | ⚠️ Limited |
| Multi-GPU support | ✅ NVIDIA/AMD/Intel/Apple | ⚠️ Limited |
| Fan control | ✅ Yes | ❌ No |
| SMART monitoring | ✅ Yes | ⚠️ Basic |
| Active development | ✅ 2024+ | ❌ Abandoned |

## Installation

```bash
pip install cascade-hardware-monitor
```

## Quick Start

```python
from cascade_hardware_monitor import CascadeClient

# Connect to local Cascade server
client = CascadeClient()

# Get system snapshot
snapshot = client.get_snapshot()
print(f"CPU: {snapshot['cpu']['load']}%")
print(f"GPU: {snapshot['gpu']['temperature']}°C")

# Get detailed CPU data
cpu = client.get_cpu()
print(f"CPU: {cpu.brand} @ {cpu.speed}GHz")

# Per-core temperatures
for core in client.get_cpu_temperatures():
    print(f"Core {core['core']}: {core['temperature']}°C")
```

## AI Integration

```python
# Get AI-optimized system analysis
analysis = client.ai.get_analysis()

# Check warnings
for warning in analysis.warnings:
    print(f"⚠️ {warning}")

# Get recommendations
for rec in analysis.recommendations:
    print(f"💡 {rec}")

# Execute AI actions
client.ai.execute_action('set_power_profile', {'profileId': 'high_performance'})
client.ai.execute_action('set_brightness', {'level': 75})
```

## Comprehensive Monitoring

```python
# CPU sensors (per-core)
cpu_data = client.get_cpu_sensors()
print(f"Package Power: {cpu_data['power']['packagePower']}W")
print(f"Throttling: {cpu_data['throttling']['currentThrottling']}")

# GPU data
for gpu in client.get_all_gpus():
    print(f"{gpu['name']}: {gpu['temperature']}°C, {gpu['utilizationGpu']}%")

# Mainboard sensors
mainboard = client.get_mainboard()
print(f"VRM Temp: {mainboard.vrm['temperature']}°C")
for v in mainboard.voltages:
    print(f"{v['name']}: {v['value']}V ({v['status']})")

# SMART disk health
smart = client.get_smart()
for disk in smart.disks:
    print(f"{disk['model']}: {disk['healthStatus']}")

# Fan controllers
fans = client.get_fans()
for ctrl in fans.controllers:
    for ch in ctrl['channels']:
        print(f"{ch['name']}: {ch['rpm']} RPM")
```

## Inferred Metrics

```python
# Bottleneck detection
bottleneck = client.get_bottleneck()
print(f"Primary bottleneck: {bottleneck['primaryBottleneck']}")
print(f"Severity: {bottleneck['severity']}")

# Thermal headroom
thermal = client.get_thermal_headroom()
print(f"CPU headroom: {thermal['cpu']['headroom']}°C")

# Workload detection
workload = client.get_workload_profile()
print(f"Detected: {workload['type']} ({workload['confidence']}% confidence)")
```

## Hardware Control

```python
# Set fan speed
client.set_fan_speed('nvidia-gpu', 'nvidia-0', 75)

# Set display brightness
client.set_brightness(50)

# Power profiles (Windows)
profiles = client.get_power_profiles()
client.set_power_profile(profiles[0]['id'])
```

## API Reference

See full documentation at [GitHub Wiki](https://github.com/tantulabs/cascade-hardware-monitor/wiki).

## License

MIT License - TantuLabs
