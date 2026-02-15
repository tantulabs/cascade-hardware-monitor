# Cascade Hardware Monitor

[![TantuLabs](https://img.shields.io/badge/TantuLabs-Open%20Source-purple)](https://tantulabs-cascade.web.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-green)](https://github.com/tantulabs/cascade-hardware-monitor)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green)](https://nodejs.org/)
[![Gemini AI](https://img.shields.io/badge/Gemini%20AI-Integrated-blue)](https://ai.google.dev/)

> **🌐 Website**: [tantulabs-cascade.web.app](https://tantulabs-cascade.web.app)  
> **📦 GitHub**: [github.com/tantulabs/cascade-hardware-monitor](https://github.com/tantulabs/cascade-hardware-monitor)  
> **📥 Downloads**: [Releases](https://github.com/tantulabs/cascade-hardware-monitor/releases)

A comprehensive cross-platform hardware monitoring application with full system monitoring capabilities, **Gemini AI integration**, and external API access. Modern replacement for OpenHardwareMonitor built with 2026 technologies.

**By [TantuLabs](https://github.com/tantulabs)** - Building open-source tools for developers and power users.

## 📥 Download

| Platform | Download | Architecture |
|----------|----------|--------------|
| **Windows** | [Cascade Hardware Monitor-1.0.0-win-x64.exe](https://github.com/tantulabs/cascade-hardware-monitor/releases/latest/download/Cascade%20Hardware%20Monitor-1.0.0-win-x64.exe) | x64 |
| **macOS (Intel)** | [Cascade Hardware Monitor-1.0.0-mac-x64.dmg](https://github.com/tantulabs/cascade-hardware-monitor/releases/latest/download/Cascade%20Hardware%20Monitor-1.0.0-mac-x64.dmg) | x64 |
| **macOS (Apple Silicon)** | [Cascade Hardware Monitor-1.0.0-mac-arm64.dmg](https://github.com/tantulabs/cascade-hardware-monitor/releases/latest/download/Cascade%20Hardware%20Monitor-1.0.0-mac-arm64.dmg) | ARM64 |
| **Linux (AppImage)** | [Cascade Hardware Monitor-1.0.0-linux-x86_64.AppImage](https://github.com/tantulabs/cascade-hardware-monitor/releases/latest/download/Cascade%20Hardware%20Monitor-1.0.0-linux-x86_64.AppImage) | x64 |
| **Linux (Debian)** | [Cascade Hardware Monitor-1.0.0-linux-amd64.deb](https://github.com/tantulabs/cascade-hardware-monitor/releases/latest/download/Cascade%20Hardware%20Monitor-1.0.0-linux-amd64.deb) | x64 |
| **Raspberry Pi (64-bit)** | [Cascade Hardware Monitor-1.0.0-linux-arm64.deb](https://github.com/tantulabs/cascade-hardware-monitor/releases/latest/download/Cascade%20Hardware%20Monitor-1.0.0-linux-arm64.deb) | ARM64 |
| **Raspberry Pi (32-bit)** | [Cascade Hardware Monitor-1.0.0-linux-armv7l.deb](https://github.com/tantulabs/cascade-hardware-monitor/releases/latest/download/Cascade%20Hardware%20Monitor-1.0.0-linux-armv7l.deb) | ARMv7l |

> 📦 **All releases**: [github.com/tantulabs/cascade-hardware-monitor/releases](https://github.com/tantulabs/cascade-hardware-monitor/releases)  
> 🍓 **Raspberry Pi Guide**: [docs/RASPBERRY_PI.md](docs/RASPBERRY_PI.md)

## ✨ Key Features

### 🖥️ Comprehensive Hardware Monitoring
- **CPU**: Temperature, load, speed, voltage, power consumption per core
- **GPU**: Temperature, utilization, VRAM, fan speed, clock speeds (NVIDIA/AMD/Intel/Apple Silicon)
- **Memory**: Usage, modules, speed, timings
- **Storage**: Disk usage, temperature, SMART data, read/write speeds, NVMe health
- **Network**: Ethernet, WiFi, bandwidth monitoring, connection status
- **Motherboard**: SuperIO sensors (Nuvoton, ITE, Fintek), fan control, voltage rails
- **Bluetooth**: Connected devices, battery levels
- **Audio**: Input/output devices, volume levels
- **USB**: Connected devices, power consumption
- **Battery**: Charge level, health, cycle count

### 🤖 Gemini AI Integration
- **Health Analysis**: AI-powered assessment of overall system health with actionable recommendations
- **Thermal Analysis**: Intelligent thermal monitoring with throttling risk prediction
- **Performance Analysis**: Bottleneck detection and optimization suggestions
- **Chat Interface**: Ask questions about your hardware in natural language
- **Encrypted Storage**: API keys stored securely with AES-256-GCM encryption

### 🔌 External App Integration
- **REST API**: Full hardware data access via HTTP
- **WebSocket**: Real-time streaming for live dashboards
- **Rate Limiting**: Built-in protection against abuse
- **Multi-Language SDKs**: Python, TypeScript/JavaScript, Go, Rust, C#

### 🖱️ System Tray Application
- Runs in background with minimal resource usage
- Quick access to key metrics
- Desktop notifications for alerts
- Cross-platform (Windows, macOS, Linux)

### ⚠️ Smart Alert System
- Configurable thresholds for any sensor
- Multiple conditions: above, below, between, outside range
- Actions: notifications, webhooks, commands, sounds
- Cooldown periods to prevent spam

### 🔧 Hardware Control
- Power profile switching (Windows)
- GPU power limit adjustment
- Display brightness control
- Volume control (macOS)
- Dark mode toggle (macOS)
- Process priority management

### 🧩 Plugin Architecture
- Extend monitoring capabilities
- Custom sensor support
- Easy plugin development with manifest system

### 📊 Modern Web Dashboard
- Real-time updates via WebSocket
- Dark theme with beautiful UI
- Responsive design for all devices

## 🔄 Why Cascade? (vs OpenHardwareMonitor)

Cascade is a **modern replacement** for OpenHardwareMonitor, HWiNFO, and LibreHardwareMonitor:

| Feature | Cascade Hardware Monitor | OpenHardwareMonitor | HWiNFO | LibreHardwareMonitor |
|---------|---------|---------------------|--------|----------------------|
| **Cross-Platform** | ✅ Win/Mac/Linux | ❌ Windows only | ❌ Windows only | ❌ Windows only |
| **REST API** | ✅ Full JSON API | ❌ None | ⚠️ Shared Memory | ⚠️ WMI only |
| **AI Integration** | ✅ Gemini AI | ❌ None | ❌ None | ❌ None |
| **Apple Silicon** | ✅ Native M1/M2/M3/M4 | ❌ None | ❌ None | ❌ None |
| **WebSocket Streaming** | ✅ Real-time | ❌ None | ❌ None | ❌ None |
| **Multi-Language SDKs** | ✅ 5 languages | ⚠️ C# only | ❌ None | ⚠️ C# NuGet |
| **Health Scores** | ✅ Auto-generated | ❌ Manual | ❌ Manual | ❌ Manual |
| **Bottleneck Detection** | ✅ Automatic | ❌ None | ❌ None | ❌ None |
| **Active Development** | ✅ 2026+ | ❌ Abandoned (2020) | ✅ Active | ✅ Active (fork) |
| **Open Source** | ✅ MIT License | ✅ MPL-2.0 | ❌ Proprietary | ✅ MPL-2.0 |
| **Latest Hardware** | ✅ Intel 15th Gen, AMD 9000, RTX 50 | ❌ Outdated | ✅ Yes | ✅ Community updates |

**Perfect for:**
- 🤖 **AI Agents** - Structured JSON API with semantic analysis
- 🎮 **Gamers** - Real-time monitoring with alerts
- 💻 **Developers** - Multi-language SDKs and WebSocket streaming
- 🖥️ **System Admins** - Cross-platform with IPMI/BMC support

## Installation

```bash
# Clone the repository
git clone https://github.com/tantulabs/cascade-hardware-monitor.git
cd cascade-hardware-monitor

# Install dependencies
npm install

# Start in development mode
npm run dev

# Or build and run
npm run build
npm start
```

## Running as Electron App

```bash
# Start the Electron app
npm run electron
```

## API Documentation

### Base URL
```
http://localhost:8085/api/v1
```

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/snapshot` | Get full hardware snapshot |
| GET | `/snapshot/live` | Force fresh poll |
| GET | `/cpu` | CPU data only |
| GET | `/gpu` | GPU data only |
| GET | `/memory` | Memory data only |
| GET | `/disks` | Disk data only |
| GET | `/network` | Network interfaces |
| GET | `/bluetooth` | Bluetooth devices |
| GET | `/audio` | Audio devices |
| GET | `/battery` | Battery status |
| GET | `/usb` | USB devices |
| GET | `/processes` | Top processes |
| GET | `/system` | System info |
| GET | `/status` | Get full system status |

### GPU Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/gpu/:index` | Get specific GPU by index |
| GET | `/gpu/enhanced` | Get enhanced GPU data with vendor-specific metrics |
| GET | `/gpu/system` | Get GPU system info (drivers, CUDA version, etc.) |
| GET | `/gpu/vendors` | List available GPU vendors |
| GET | `/gpu/:index/processes` | Get processes using specific GPU |
| GET | `/gpu/vendor/:vendor` | Get GPUs by vendor (nvidia/amd/intel) |
| GET | `/gpu/nvidia/raw` | Raw NVIDIA SMI data |
| GET | `/gpu/amd/raw` | Raw AMD ROCm data |
| GET | `/gpu/intel/raw` | Raw Intel GPU data |

### AI Endpoints (Gemini)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ai/gemini/status` | Get Gemini configuration status |
| POST | `/ai/gemini/configure` | Set API key (body: `{"apiKey": "..."}`) |
| DELETE | `/ai/gemini/configure` | Remove API key |
| POST | `/ai/gemini/enable` | Enable Gemini AI |
| POST | `/ai/gemini/disable` | Disable Gemini AI |
| PUT | `/ai/gemini/model` | Set model (body: `{"model": "gemini-2.0-flash"}`) |
| GET | `/ai/gemini/analyze/health` | AI health analysis |
| GET | `/ai/gemini/analyze/thermals` | AI thermal analysis |
| GET | `/ai/gemini/analyze/performance` | AI performance analysis |
| POST | `/ai/gemini/chat` | Chat with AI (body: `{"message": "...", "includeContext": true}`) |

### Alerts & History

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sensors` | All sensor readings |
| GET | `/sensors/:path` | Specific sensor history |
| GET | `/alerts` | List all alerts |
| POST | `/alerts` | Create alert |
| PUT | `/alerts/:id` | Update alert |
| DELETE | `/alerts/:id` | Delete alert |
| GET | `/history` | Query historical data |
| GET | `/history/sensor/:path` | Get sensor history |
| GET | `/history/latest` | Get latest readings |
| GET | `/history/stats` | Get history statistics |
| DELETE | `/history` | Clear history |

### Settings & Plugins

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/config` | Get configuration |
| PUT | `/config` | Update configuration |
| GET | `/plugins` | List plugins |
| GET | `/settings/monitors` | Get monitor settings |
| PUT | `/settings/monitors` | Update monitor settings |
| POST | `/settings/monitors/preset/:name` | Apply preset (minimal/standard/full/gaming/server) |
| POST | `/settings/monitors/reset` | Reset to defaults |
| GET | `/optimization/profiles` | List optimization profiles |
| POST | `/optimization/profiles/:name` | Apply optimization profile |
| GET | `/optimization/analyze` | Analyze resource usage |

### WebSocket

Connect to `ws://localhost:8085` for real-time updates.

**Messages:**
```javascript
// Subscribe to channels
{ "type": "subscribe", "channels": ["snapshot", "alerts", "readings"] }

// Get specific data
{ "type": "get", "resource": "cpu" }

// Ping
{ "type": "ping" }
```

**Received Events:**
```javascript
// Hardware snapshot
{ "type": "snapshot", "data": { ... } }

// Sensor readings
{ "type": "readings", "data": [ ... ] }

// Alert triggered
{ "type": "alert", "data": { ... } }
```

## Configuration

Configuration is stored in `config/settings.json`:

```json
{
  "pollingInterval": 1000,
  "enabledSensors": ["cpu", "gpu", "memory", "disk", "network", "bluetooth", "audio", "battery", "usb"],
  "apiPort": 8085,
  "wsPort": 8086,
  "enableAuth": false,
  "apiKey": "",
  "enableHistory": true,
  "historyRetention": 3600,
  "enableAlerts": true,
  "startMinimized": false,
  "startWithWindows": false,
  "theme": "system",
  "language": "en"
}
```

## Creating Alerts

```javascript
// POST /api/v1/alerts
{
  "name": "High CPU Temperature",
  "enabled": true,
  "sensorPath": "cpu.CPU Temperature",
  "condition": "above",
  "thresholdMin": 0,
  "thresholdMax": 80,
  "duration": 5,
  "cooldown": 60,
  "actions": [
    {
      "type": "notification",
      "config": { "sound": true }
    },
    {
      "type": "webhook",
      "config": { "url": "https://your-webhook.com/alert" }
    }
  ]
}
```

## Plugin Development

Create a folder in `plugins/` with:

**manifest.json:**
```json
{
  "id": "my-plugin",
  "name": "My Custom Plugin",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "Description of your plugin",
  "sensors": ["custom.my-sensor"],
  "dependencies": {}
}
```

**index.js:**
```javascript
export default class MyPlugin {
  constructor(metadata) {
    this.metadata = metadata;
  }

  async init() { }
  async start() { }
  async stop() { }
  
  async poll() {
    return [{
      name: 'My Sensor',
      type: 'temperature',
      value: 42,
      min: 0,
      max: 100,
      unit: '°C',
      source: 'custom.my-sensor',
      timestamp: Date.now()
    }];
  }

  async destroy() { }
}
```

## Optimization Profiles

The application includes built-in optimization profiles to balance monitoring detail vs resource usage:

| Profile | Polling | Sensors | Use Case |
|---------|---------|---------|----------|
| `performance` | 500ms | All | Real-time monitoring, gaming |
| `balanced` | 1000ms | Core | Default, general use |
| `efficiency` | 2000ms | Essential | Background monitoring |
| `minimal` | 5000ms | CPU/RAM | Low resource usage |

```javascript
// Apply a profile via API
POST /api/v1/optimization/profiles/efficiency
```

## Requirements

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **Node.js** | 18.0+ | 20.0+ (LTS) |
| **npm** | 8.0+ | 10.0+ |
| **RAM** | 256 MB | 512 MB |
| **Disk Space** | 100 MB | 200 MB |

### Operating System Support

| OS | Version | Notes |
|----|---------|-------|
| **Windows** | 10/11 | Full support, admin recommended for all sensors |
| **macOS** | 12+ (Monterey) | Apple Silicon & Intel supported |
| **Linux** | Ubuntu 20.04+, Debian 11+, Fedora 35+ | Most distributions supported |

### Optional Dependencies (for full functionality)

#### Windows
| Tool | Purpose | Installation |
|------|---------|--------------|
| **NVIDIA Driver** | NVIDIA GPU monitoring | [nvidia.com/drivers](https://www.nvidia.com/drivers) |
| **AMD Adrenalin** | AMD GPU monitoring | [amd.com/support](https://www.amd.com/support) |
| **LibreHardwareMonitor** | Enhanced sensor access | [github.com/LibreHardwareMonitor](https://github.com/LibreHardwareMonitor/LibreHardwareMonitor) |
| **HWiNFO** | Additional sensors (shared memory) | [hwinfo.com](https://www.hwinfo.com/) |

#### macOS
| Tool | Purpose | Installation |
|------|---------|--------------|
| **Xcode CLI Tools** | System utilities | `xcode-select --install` |
| **Homebrew** | Package manager (optional) | [brew.sh](https://brew.sh) |

#### Linux
| Tool | Purpose | Installation |
|------|---------|--------------|
| **lm-sensors** | CPU/motherboard sensors | `sudo apt install lm-sensors && sudo sensors-detect` |
| **nvidia-smi** | NVIDIA GPU monitoring | Included with NVIDIA driver |
| **rocm-smi** | AMD GPU monitoring | `sudo apt install rocm-smi` |
| **smartmontools** | SMART disk health | `sudo apt install smartmontools` |
| **ipmitool** | IPMI server monitoring | `sudo apt install ipmitool` |

## Installation Guide

### Quick Start

```bash
# Clone the repository
git clone https://github.com/tantulabs/cascade-hardware-monitor.git
cd cascade-hardware-monitor

# Install dependencies
npm install

# Start the server
npm start
```

### Detailed Installation

#### Step 1: Install Node.js

**Windows:**
```powershell
# Using winget
winget install OpenJS.NodeJS.LTS

# Or download from https://nodejs.org
```

**macOS:**
```bash
# Using Homebrew
brew install node

# Or download from https://nodejs.org
```

**Linux (Ubuntu/Debian):**
```bash
# Using NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

#### Step 2: Clone and Install

```bash
# Clone the repository
git clone https://github.com/tantulabs/cascade-hardware-monitor.git
cd cascade-hardware-monitor

# Install dependencies
npm install

# Build the project
npm run build
```

#### Step 3: Configure (Optional)

```bash
# Copy default config
cp config/settings.example.json config/settings.json

# Edit settings as needed
nano config/settings.json
```

#### Step 4: Run

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm start

# As Electron desktop app
npm run electron
```

### Platform-Specific Setup

#### Windows - Enable Full Sensor Access

```powershell
# Run as Administrator for full sensor access
# Right-click Command Prompt -> Run as Administrator

cd cascade-hardware-monitor
npm start
```

For LibreHardwareMonitor integration:
1. Download [LibreHardwareMonitor](https://github.com/LibreHardwareMonitor/LibreHardwareMonitor/releases)
2. Run LibreHardwareMonitor as Administrator
3. Enable "Run" in the main menu
4. Cascade will automatically detect and use LHM sensors

#### macOS - Grant Permissions

```bash
# Install Xcode CLI tools (required)
xcode-select --install

# For full disk access (SMART monitoring), grant Terminal full disk access:
# System Preferences -> Security & Privacy -> Privacy -> Full Disk Access -> Add Terminal
```

#### Linux - Install Sensor Tools

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install lm-sensors smartmontools

# Configure lm-sensors
sudo sensors-detect --auto

# For NVIDIA GPUs
sudo apt install nvidia-driver-535  # or latest version

# For AMD GPUs
sudo apt install rocm-smi

# For IPMI (servers)
sudo apt install ipmitool
sudo modprobe ipmi_devintf
```

### Docker Installation (Alternative)

```bash
# Build the image
docker build -t cascade-hardware-monitor .

# Run with host access for sensors
docker run -d \
  --name cascade \
  --privileged \
  -p 8085:8085 \
  -v /dev:/dev:ro \
  cascade-hardware-monitor
```

### Verify Installation

```bash
# Check if server is running
curl http://localhost:8085/api/v1/health

# Expected response:
# {"status":"ok","timestamp":...,"uptime":...,"version":"1.0.0"}

# Get system snapshot
curl http://localhost:8085/api/v1/snapshot
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| `EACCES` permission error | Run with `sudo` (Linux/macOS) or as Administrator (Windows) |
| GPU not detected | Ensure GPU drivers are installed and `nvidia-smi`/`rocm-smi` works |
| No temperature readings | Install `lm-sensors` (Linux) or run LibreHardwareMonitor (Windows) |
| Port 8085 in use | Change port in `config/settings.json` or set `PORT` env variable |
| SMART data missing | Install `smartmontools` and run with elevated privileges |

## Platform Support

| Feature | Windows | macOS | Linux |
|---------|---------|-------|-------|
| CPU Monitoring | ✅ | ✅ | ✅ |
| GPU Monitoring | ✅ NVIDIA/AMD/Intel | ✅ Apple Silicon/Intel | ✅ NVIDIA/AMD |
| Memory Monitoring | ✅ | ✅ | ✅ |
| Storage/SMART | ✅ | ✅ | ✅ |
| Power Profiles | ✅ | ❌ | ❌ |
| Volume Control | ❌ | ✅ | ❌ |
| Dark Mode Toggle | ❌ | ✅ | ❌ |
| Display Brightness | ✅ | ✅ | ❌ |

## Gemini AI Integration

Cascade Hardware Monitor supports optional Gemini AI integration for intelligent hardware analysis, recommendations, and natural language chat about your system.

### Features

- **Health Analysis**: AI-powered assessment of overall system health with actionable recommendations
- **Thermal Analysis**: Intelligent thermal monitoring with throttling risk prediction
- **Performance Analysis**: Bottleneck detection and optimization suggestions
- **Chat Interface**: Ask questions about your hardware in natural language

### Setup

1. **Get a Gemini API Key**
   - Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Create a new API key
   - Copy the key

2. **Configure via API**
   ```bash
   # Set your API key (stored encrypted locally)
   curl -X POST http://localhost:8085/api/v1/ai/gemini/configure \
     -H "Content-Type: application/json" \
     -d '{"apiKey": "YOUR_GEMINI_API_KEY"}'
   ```

3. **Verify Configuration**
   ```bash
   curl http://localhost:8085/api/v1/ai/gemini/status
   # Returns: {"enabled":true,"configured":true,"model":"gemini-2.0-flash"}
   ```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ai/gemini/status` | Get Gemini configuration status |
| POST | `/ai/gemini/configure` | Set API key (body: `{"apiKey": "..."}`) |
| DELETE | `/ai/gemini/configure` | Remove API key |
| POST | `/ai/gemini/enable` | Enable Gemini AI |
| POST | `/ai/gemini/disable` | Disable Gemini AI |
| PUT | `/ai/gemini/model` | Set model (body: `{"model": "gemini-2.0-flash"}`) |
| GET | `/ai/gemini/analyze/health` | Get AI health analysis |
| GET | `/ai/gemini/analyze/thermals` | Get AI thermal analysis |
| GET | `/ai/gemini/analyze/performance` | Get AI performance analysis |
| POST | `/ai/gemini/chat` | Chat with AI (body: `{"message": "...", "includeContext": true}`) |

### Example Usage

```bash
# Get AI health analysis
curl http://localhost:8085/api/v1/ai/gemini/analyze/health

# Response:
{
  "overallHealth": "good",
  "healthScore": 85,
  "summary": "System is running well with minor thermal concerns",
  "recommendations": ["Consider improving case airflow"],
  "warnings": ["CPU temperature slightly elevated"],
  "optimizations": ["Enable XMP for better memory performance"],
  "predictedIssues": [],
  "aiConfidence": 92
}

# Chat with AI about your hardware
curl -X POST http://localhost:8085/api/v1/ai/gemini/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Why is my CPU running hot?", "includeContext": true}'

# Response:
{
  "response": "Based on your current system data, your CPU is at 78°C which is elevated but not critical. This could be due to..."
}
```

### Security

- **Encrypted Storage**: Your API key is stored in an encrypted file (`data/gemini-config.enc`) using AES-256-GCM
- **Machine-Bound**: The encryption key is derived from your machine's unique identifiers
- **Local Only**: API keys are never transmitted except to Google's Gemini API
- **No Logging**: API keys are never logged or exposed in responses

### Supported Models

| Model | Description |
|-------|-------------|
| `gemini-2.0-flash` | Fast, efficient model (default) |
| `gemini-2.0-flash-lite` | Lighter version for basic tasks |
| `gemini-1.5-pro` | More capable model for complex analysis |

### Fallback Behavior

If Gemini AI is not configured or unavailable, all analysis endpoints return rule-based fallback assessments with `aiConfidence: 0` to indicate no AI was used.

## Building Executables

Pre-built executables are available in the [Releases](https://github.com/tantulabs/cascade-hardware-monitor/releases) section.

### Build From Source

#### Prerequisites
- Node.js 20+
- npm 10+

#### Build Commands

```bash
# Install dependencies
npm install

# Build for current platform
npm run dist

# Build for specific platforms
npm run dist:win    # Windows (.exe installer + portable)
npm run dist:mac    # macOS (.dmg + .zip for x64 and arm64)
npm run dist:linux  # Linux (.AppImage + .deb)
```

#### Output Files

| Platform | Output | Location |
|----------|--------|----------|
| **Windows** | `Cascade Hardware Monitor-1.0.0-win-x64.exe` | `release/` |
| **Windows** | `Cascade Hardware Monitor-1.0.0-win-x64-portable.exe` | `release/` |
| **macOS (Intel)** | `Cascade Hardware Monitor-1.0.0-mac-x64.dmg` | `release/` |
| **macOS (Apple Silicon)** | `Cascade Hardware Monitor-1.0.0-mac-arm64.dmg` | `release/` |
| **Linux** | `Cascade Hardware Monitor-1.0.0-linux-x64.AppImage` | `release/` |
| **Linux** | `cascade-hardware-monitor_1.0.0_amd64.deb` | `release/` |

### Running Without Building

If you don't want to build executables, you can run directly:

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start
```

The API will be available at `http://localhost:8085/api/v1`

## Links

- **🌐 Website**: [tantulabs-cascade.web.app](https://tantulabs-cascade.web.app)
- **📦 GitHub**: [github.com/tantulabs/cascade-hardware-monitor](https://github.com/tantulabs/cascade-hardware-monitor)
- **📖 API Docs**: Run the app and visit `/api-docs.html`
- **🐛 Issues**: [GitHub Issues](https://github.com/tantulabs/cascade-hardware-monitor/issues)

## License

MIT License - See [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

---

**Made with ❤️ by [TantuLabs](https://github.com/tantulabs)**
