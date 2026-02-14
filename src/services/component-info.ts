import type { ComponentInfo, TemperatureInfo } from '../types/hardware.js';

export const COMPONENT_CONFIG_HELP: Record<string, string> = {
  cpu: `**CPU Temperature Monitoring**

To enable CPU temperature readings:

**Windows:**
- Temperatures are read via WMI. No additional setup required for most systems.
- For more accurate readings, install HWiNFO64 or Open Hardware Monitor which expose data via shared memory.
- Some laptops may require manufacturer utilities (Dell Command, Lenovo Vantage, etc.)

**Linux:**
- Install lm-sensors: \`sudo apt install lm-sensors\`
- Run sensor detection: \`sudo sensors-detect\`
- Load kernel modules: \`sudo modprobe coretemp\` (Intel) or \`sudo modprobe k10temp\` (AMD)

**BIOS Settings:**
- Enable "Hardware Monitor" or "System Health" in BIOS
- Some systems have thermal throttling settings that affect readings

**Troubleshooting:**
- If temperatures show 0°C, your CPU may not expose thermal data via standard interfaces
- Check if your motherboard supports thermal monitoring
- Update BIOS to latest version for improved sensor support`,

  gpu: `**GPU Temperature Monitoring**

**NVIDIA GPUs:**
- Install NVIDIA drivers (nvidia-smi is included)
- Temperatures are read via nvidia-smi command
- For CUDA metrics, ensure CUDA toolkit is installed
- Run \`nvidia-smi\` in terminal to verify access

**AMD GPUs:**
- Install AMD drivers with ROCm support
- Linux: Install rocm-smi (\`sudo apt install rocm-smi\`)
- Windows: AMD Adrenalin software provides sensor access
- Run \`rocm-smi --showtemp\` to verify

**Intel GPUs:**
- Install Intel graphics drivers
- Linux: intel-gpu-tools package (\`sudo apt install intel-gpu-tools\`)
- Windows: Intel Graphics Command Center
- For Arc GPUs: Install Intel oneAPI with xpu-smi

**Troubleshooting:**
- Ensure GPU drivers are up to date
- Check if monitoring tools have admin/root access
- Integrated GPUs may have limited temperature reporting`,

  memory: `**Memory Temperature Monitoring**

Memory temperature monitoring depends on your RAM modules:

**Requirements:**
- RAM modules with temperature sensors (most DDR4/DDR5 modules have them)
- Motherboard with SPD (Serial Presence Detect) support
- BIOS must expose memory thermal data

**Windows:**
- Use HWiNFO64 for detailed memory temperatures
- Some motherboard utilities (ASUS AI Suite, MSI Dragon Center) expose this data

**Linux:**
- Install i2c-tools: \`sudo apt install i2c-tools\`
- Load SPD module: \`sudo modprobe eeprom\`
- Use \`decode-dimms\` for memory info

**Note:**
- Not all systems report memory temperatures
- Server/workstation boards typically have better support
- Check motherboard manual for memory thermal monitoring capabilities`,

  disk: `**Storage Temperature Monitoring**

**NVMe SSDs:**
- Temperatures are read via NVMe SMART data
- No additional setup required on most systems
- Use \`nvme smart-log /dev/nvmeX\` on Linux

**SATA SSDs/HDDs:**
- Requires SMART support enabled in BIOS
- Linux: Install smartmontools (\`sudo apt install smartmontools\`)
- Run \`sudo smartctl -a /dev/sdX\` to check

**Windows:**
- SMART data is read via WMI
- CrystalDiskInfo can verify SMART access
- Some drives require manufacturer utilities

**BIOS Settings:**
- Enable SMART monitoring in BIOS
- Enable AHCI mode for SATA devices

**Troubleshooting:**
- USB-connected drives may not report temperatures
- RAID arrays may require controller-specific tools
- Check drive specifications for thermal sensor support`,

  network: `**Network Interface Monitoring**

Network interfaces typically don't have temperature sensors, but some high-end NICs do:

**Server NICs (Intel X710, Mellanox, etc.):**
- Install vendor drivers and management tools
- Linux: ethtool can show some thermal data
- Run \`ethtool -m ethX\` for module info

**WiFi Adapters:**
- Some WiFi chips report thermal data
- Check iwconfig or vendor utilities

**General Monitoring:**
- Bandwidth and packet statistics are always available
- No special configuration needed for traffic monitoring

**Note:**
- Consumer NICs rarely have temperature sensors
- Focus on bandwidth monitoring for network health`,

  motherboard: `**Motherboard Temperature Monitoring**

**Super I/O Chip Sensors:**
- Most motherboards have multiple thermal zones
- Sensors include: VRM, chipset, ambient, etc.

**Windows:**
- Install motherboard vendor software:
  - ASUS: AI Suite
  - MSI: Dragon Center / MSI Center
  - Gigabyte: System Information Viewer
  - ASRock: A-Tuning
- HWiNFO64 provides comprehensive sensor access

**Linux:**
- Install lm-sensors: \`sudo apt install lm-sensors\`
- Run: \`sudo sensors-detect\` and follow prompts
- Load detected kernel modules
- Run \`sensors\` to view temperatures

**BIOS Settings:**
- Enable hardware monitoring in BIOS
- Check for "PC Health Status" or similar section

**Troubleshooting:**
- Update BIOS for better sensor support
- Some sensors may require specific kernel modules`,

  battery: `**Battery Temperature Monitoring**

**Laptops:**
- Battery temperature is read via ACPI
- No additional setup required on most systems

**Windows:**
- Battery data is available via WMI
- BatteryInfoView can show detailed battery stats

**Linux:**
- Check /sys/class/power_supply/BAT0/
- Install upower: \`sudo apt install upower\`
- Run \`upower -i /org/freedesktop/UPower/devices/battery_BAT0\`

**Note:**
- Desktop systems typically don't have batteries
- UPS batteries may require vendor software (APC PowerChute, etc.)
- Battery health affects temperature reporting accuracy

**Troubleshooting:**
- Ensure ACPI is enabled in BIOS
- Update battery drivers if temperatures are missing`
};

export function getComponentInfo(
  type: ComponentInfo['type'],
  id: string,
  name: string,
  temperatures: TemperatureInfo[] = []
): ComponentInfo {
  return {
    id,
    name,
    type,
    temperatures,
    configurationHelp: COMPONENT_CONFIG_HELP[type] || 'No configuration help available.'
  };
}

export function getConfigurationHelp(componentType: string): string {
  return COMPONENT_CONFIG_HELP[componentType] || 'No configuration help available for this component type.';
}

export default {
  COMPONENT_CONFIG_HELP,
  getComponentInfo,
  getConfigurationHelp
};
