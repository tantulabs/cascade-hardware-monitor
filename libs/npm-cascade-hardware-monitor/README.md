# Cascade Hardware Monitor

[![npm](https://img.shields.io/npm/v/cascade-hardware-monitor)](https://www.npmjs.com/package/cascade-hardware-monitor)
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
| TypeScript | ✅ Full types | ❌ No |
| Active development | ✅ 2026+ | ❌ Abandoned |

## Installation

```bash
npm install cascade-hardware-monitor
```

## Quick Start

```typescript
import { CascadeClient } from 'cascade-hardware-monitor';

const client = new CascadeClient();

// Get system snapshot
const snapshot = await client.getSnapshot();
console.log(`CPU: ${snapshot.cpu.load}% @ ${snapshot.cpu.temperature}°C`);

// Get detailed CPU sensors
const cpu = await client.getCpuSensors();
cpu.cores.forEach(core => {
  console.log(`Core ${core.core}: ${core.temperature}°C`);
});
```

## AI Integration

```typescript
// Get AI-optimized system analysis
const analysis = await client.ai.getAnalysis();

// Check warnings
analysis.warnings.forEach(warning => {
  console.warn(`⚠️ ${warning}`);
});

// Get recommendations
analysis.recommendations.forEach(rec => {
  console.log(`💡 ${rec}`);
});

// Execute AI actions
await client.ai.executeAction('set_power_profile', { profileId: 'high_performance' });
await client.ai.executeAction('set_brightness', { level: 75 });
```

## Comprehensive Monitoring

```typescript
// CPU sensors (per-core)
const cpuData = await client.getCpuSensors();
console.log(`Package Power: ${cpuData.power.packagePower}W`);
console.log(`Throttling: ${cpuData.throttling.currentThrottling}`);

// GPU data
const gpus = await client.getAllGpus();
gpus.forEach(gpu => {
  console.log(`${gpu.name}: ${gpu.temperature}°C, ${gpu.utilizationGpu}%`);
});

// Mainboard sensors
const mainboard = await client.getMainboard();
console.log(`VRM Temp: ${mainboard.vrm?.temperature}°C`);
mainboard.voltages.forEach(v => {
  console.log(`${v.name}: ${v.value}V (${v.status})`);
});

// SMART disk health
const smart = await client.getSmart();
smart.disks.forEach(disk => {
  console.log(`${disk.model}: ${disk.healthStatus}`);
});

// Fan controllers
const fans = await client.getFans();
fans.controllers.forEach(ctrl => {
  ctrl.channels.forEach(ch => {
    console.log(`${ch.name}: ${ch.rpm} RPM`);
  });
});
```

## Inferred Metrics

```typescript
// Bottleneck detection
const bottleneck = await client.getBottleneck();
console.log(`Primary bottleneck: ${bottleneck.primaryBottleneck}`);
console.log(`Severity: ${bottleneck.severity}`);

// Thermal headroom
const thermal = await client.getThermalHeadroom();
console.log(`CPU headroom: ${thermal.cpu.headroom}°C`);

// Workload detection
const workload = await client.getWorkload();
console.log(`Detected: ${workload.type} (${workload.confidence}% confidence)`);
```

## Hardware Control

```typescript
// Set fan speed
await client.setFanSpeed('nvidia-gpu', 'nvidia-0', 75);

// Set display brightness
await client.setBrightness(50);
```

## Multi-Language Support

Cascade Hardware Monitor also provides client libraries for:

- **Python**: `pip install cascade-hardware-monitor`
- **Rust**: `cargo add cascade-hardware-monitor`
- **C#**: `dotnet add package CascadeHardwareMonitor`
- **Go**: `go get github.com/tantulabs/cascade-hardware-monitor`

## License

MIT License - TantuLabs
