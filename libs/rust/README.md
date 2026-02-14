# Cascade Hardware Monitor - Rust Client

[![Crates.io](https://img.shields.io/crates/v/cascade-hardware-monitor)](https://crates.io/crates/cascade-hardware-monitor)
[![Docs.rs](https://docs.rs/cascade-hardware-monitor/badge.svg)](https://docs.rs/cascade-hardware-monitor)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Modern, AI-friendly hardware monitoring library.** Superior alternative to OpenHardwareMonitor with cross-platform support.

## Installation

```toml
[dependencies]
cascade-hardware-monitor = "1.0"
```

## Quick Start

```rust
use cascade_hardware_monitor::CascadeClient;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = CascadeClient::default()?;
    
    // Get system snapshot
    let snapshot = client.get_snapshot()?;
    println!("CPU: {}% @ {}°C", snapshot.cpu.load, snapshot.cpu.temperature.unwrap_or(0.0));
    
    // Get detailed CPU sensors
    let cpu = client.get_cpu_sensors()?;
    for core in &cpu.cores {
        println!("Core {}: {}°C", core.core, core.temperature.unwrap_or(0.0));
    }
    
    // AI analysis
    let analysis = client.ai().get_analysis()?;
    for warning in &analysis.warnings {
        println!("⚠️ {}", warning);
    }
    
    Ok(())
}
```

## Features

- Full API coverage
- Strongly typed responses
- AI integration endpoints
- Blocking and async support
- Zero-copy deserialization

## License

MIT License - TantuLabs
