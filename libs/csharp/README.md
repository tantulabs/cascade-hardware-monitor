# Cascade Hardware Monitor - C# Client

[![NuGet](https://img.shields.io/nuget/v/CascadeHardwareMonitor)](https://www.nuget.org/packages/CascadeHardwareMonitor/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Modern, AI-friendly hardware monitoring library.** Superior alternative to OpenHardwareMonitor/LibreHardwareMonitor with cross-platform support.

## Installation

```bash
dotnet add package CascadeHardwareMonitor
```

## Quick Start

```csharp
using CascadeHardwareMonitor;

var client = new CascadeClient();

// Get system snapshot
var snapshot = await client.GetSnapshotAsync();
Console.WriteLine($"CPU: {snapshot.Cpu.Load}% @ {snapshot.Cpu.Temperature}°C");

// Get detailed CPU sensors
var cpu = await client.GetCpuSensorsAsync();
foreach (var core in cpu.Cores)
{
    Console.WriteLine($"Core {core.Core}: {core.Temperature}°C");
}

// AI analysis
var analysis = await client.AI.GetAnalysisAsync();
foreach (var warning in analysis.Warnings)
{
    Console.WriteLine($"⚠️ {warning}");
}
```

## Why Cascade over LibreHardwareMonitor?

| Feature | Cascade | LibreHardwareMonitor |
|---------|---------|----------------------|
| REST API | ✅ Full API | ❌ None |
| AI Integration | ✅ Built-in | ❌ None |
| Cross-platform | ✅ Win/Mac/Linux | ⚠️ Windows focused |
| Apple Silicon | ✅ Native | ❌ None |
| WebSocket streaming | ✅ Yes | ❌ No |
| Fan control | ✅ Yes | ⚠️ Limited |

## License

MIT License - TantuLabs
