# Raspberry Pi Installation Guide

Cascade Hardware Monitor supports Raspberry Pi devices running 64-bit or 32-bit Raspberry Pi OS.

## Supported Devices

| Device | Architecture | Status |
|--------|--------------|--------|
| Raspberry Pi 5 | ARM64 | ✅ Full Support |
| Raspberry Pi 4 Model B | ARM64 | ✅ Full Support |
| Raspberry Pi 4 Model B | ARMv7l (32-bit) | ✅ Full Support |
| Raspberry Pi 3 Model B+ | ARM64 | ✅ Full Support |
| Raspberry Pi 3 Model B+ | ARMv7l (32-bit) | ✅ Full Support |
| Raspberry Pi Zero 2 W | ARM64 | ✅ Supported |
| Raspberry Pi Zero W | ARMv6 | ❌ Not Supported |

## Installation

### Option 1: Download Pre-built Package (Recommended)

#### For 64-bit Raspberry Pi OS (ARM64)

```bash
# Download the ARM64 .deb package
wget https://github.com/tantulabs/cascade-hardware-monitor/releases/latest/download/Cascade%20Hardware%20Monitor-1.0.0-linux-arm64.deb

# Install
sudo dpkg -i "Cascade Hardware Monitor-1.0.0-linux-arm64.deb"

# Fix any dependency issues
sudo apt-get install -f
```

#### For 32-bit Raspberry Pi OS (ARMv7l)

```bash
# Download the ARMv7l .deb package
wget https://github.com/tantulabs/cascade-hardware-monitor/releases/latest/download/Cascade%20Hardware%20Monitor-1.0.0-linux-armv7l.deb

# Install
sudo dpkg -i "Cascade Hardware Monitor-1.0.0-linux-armv7l.deb"

# Fix any dependency issues
sudo apt-get install -f
```

### Option 2: Run from Source (Headless Server Mode)

For headless Raspberry Pi setups without a display:

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone the repository
git clone https://github.com/tantulabs/cascade-hardware-monitor.git
cd cascade-hardware-monitor

# Install dependencies
npm install

# Build
npm run build

# Run in headless mode (API server only)
npm run start:headless
```

## Configuration

### Enable Temperature Sensors

```bash
# Install lm-sensors
sudo apt-get install lm-sensors

# Detect sensors
sudo sensors-detect

# Load the detected modules
sudo modprobe <detected_modules>
```

### GPU Temperature (VideoCore)

Raspberry Pi's VideoCore GPU temperature is automatically detected:

```bash
# Manual check
vcgencmd measure_temp
```

### Running as a Service

Create a systemd service for automatic startup:

```bash
sudo nano /etc/systemd/system/cascade-monitor.service
```

Add the following content:

```ini
[Unit]
Description=Cascade Hardware Monitor
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/cascade-hardware-monitor
ExecStart=/usr/bin/npm run start:headless
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable cascade-monitor
sudo systemctl start cascade-monitor
```

## Accessing the API

Once running, access the API from any device on your network:

```bash
# From another computer
curl http://raspberrypi.local:3000/api/system

# Or use the IP address
curl http://192.168.1.100:3000/api/system
```

## Monitored Metrics on Raspberry Pi

| Metric | Availability |
|--------|--------------|
| CPU Temperature | ✅ Yes |
| CPU Usage | ✅ Yes |
| CPU Frequency | ✅ Yes |
| GPU Temperature (VideoCore) | ✅ Yes |
| Memory Usage | ✅ Yes |
| Disk Usage | ✅ Yes |
| Network Stats | ✅ Yes |
| Throttling Status | ✅ Yes |
| Voltage | ✅ Yes (via vcgencmd) |

## Performance Tips

1. **Use 64-bit OS**: ARM64 provides better performance than 32-bit
2. **Allocate sufficient GPU memory**: `sudo raspi-config` → Performance Options → GPU Memory
3. **Use a good power supply**: Undervoltage affects monitoring accuracy
4. **Enable hardware acceleration**: For the Electron GUI version

## Troubleshooting

### "Cannot find module" errors

```bash
npm rebuild
```

### Permission denied for temperature sensors

```bash
sudo usermod -aG video $USER
sudo usermod -aG gpio $USER
# Log out and back in
```

### High CPU usage

Run in headless mode without the GUI:

```bash
npm run start:headless
```

## Integration with Home Assistant

Use the REST API to integrate with Home Assistant:

```yaml
sensor:
  - platform: rest
    resource: http://raspberrypi.local:3000/api/cpu
    name: "Pi CPU Temperature"
    value_template: "{{ value_json.temperature }}"
    unit_of_measurement: "°C"
```
