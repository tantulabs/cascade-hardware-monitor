# Cascade Hardware Monitor - Go Client

[![Go Reference](https://pkg.go.dev/badge/github.com/tantulabs/cascade-hardware-monitor.svg)](https://pkg.go.dev/github.com/tantulabs/cascade-hardware-monitor)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Modern, AI-friendly hardware monitoring library.** Superior alternative to OpenHardwareMonitor with cross-platform support.

## Installation

```bash
go get github.com/tantulabs/cascade-hardware-monitor
```

## Quick Start

```go
package main

import (
    "fmt"
    "github.com/tantulabs/cascade-hardware-monitor/cascade"
)

func main() {
    client := cascade.NewClient()
    
    // Get system snapshot
    snapshot, err := client.GetSnapshot()
    if err != nil {
        panic(err)
    }
    fmt.Printf("CPU: %.1f%% @ %.1f°C\n", snapshot.CPU.Load, *snapshot.CPU.Temperature)
    
    // Get detailed CPU sensors
    cpu, _ := client.GetCPUSensors()
    for _, core := range cpu.Cores {
        fmt.Printf("Core %d: %.1f°C\n", core.Core, *core.Temperature)
    }
    
    // AI analysis
    analysis, _ := client.AI.GetAnalysis()
    for _, warning := range analysis.Warnings {
        fmt.Printf("⚠️ %s\n", warning)
    }
}
```

## Features

- Full API coverage
- Strongly typed responses
- AI integration endpoints
- WebSocket support
- Zero dependencies (except gorilla/websocket for streaming)

## License

MIT License - TantuLabs
