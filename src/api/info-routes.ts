import { Router, Request, Response } from 'express';
import { COMPONENT_CONFIG_HELP, getConfigurationHelp } from '../services/component-info.js';
import { hardwareMonitor } from '../services/hardware-monitor.js';

const router = Router();

router.get('/config-help', (_req: Request, res: Response) => {
  res.json(COMPONENT_CONFIG_HELP);
});

router.get('/config-help/:component', (req: Request, res: Response) => {
  const help = getConfigurationHelp(req.params.component);
  res.json({ component: req.params.component, help });
});

router.get('/bios', async (_req: Request, res: Response) => {
  try {
    const bios = await hardwareMonitor.getBiosData();
    const motherboard = await hardwareMonitor.getMotherboardData();
    const chassis = await hardwareMonitor.getChassisData();
    
    res.json({
      bios,
      motherboard,
      chassis
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get BIOS/system info' });
  }
});

router.get('/temperatures', async (_req: Request, res: Response) => {
  try {
    const snapshot = hardwareMonitor.getLastSnapshot();
    if (!snapshot) {
      res.status(503).json({ error: 'No data available yet' });
      return;
    }

    const temperatures: Record<string, any> = {};

    // CPU temperatures
    if (snapshot.cpu) {
      temperatures.cpu = {
        main: snapshot.cpu.temperature,
        max: snapshot.cpu.temperatureMax,
        cores: snapshot.cpu.temperatureCores,
        sockets: snapshot.cpu.temperatureSocket,
        configHelp: getConfigurationHelp('cpu')
      };
    }

    // GPU temperatures
    if (snapshot.gpu && snapshot.gpu.length > 0) {
      temperatures.gpu = snapshot.gpu.map((gpu, i) => ({
        index: i,
        name: gpu.model,
        temperature: gpu.temperature,
        temperatureMax: gpu.temperatureMax,
        configHelp: getConfigurationHelp('gpu')
      }));
    }

    // Disk temperatures
    if (snapshot.disks && snapshot.disks.length > 0) {
      temperatures.disks = snapshot.disks.map((disk, i) => ({
        index: i,
        name: disk.name || disk.mount,
        temperature: disk.temperature,
        configHelp: getConfigurationHelp('disk')
      }));
    }

    // Battery temperature (if available)
    if (snapshot.battery) {
      temperatures.battery = {
        available: true,
        configHelp: getConfigurationHelp('battery')
      };
    }

    res.json(temperatures);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get temperature data' });
  }
});

router.get('/system-summary', async (_req: Request, res: Response) => {
  try {
    const [bios, motherboard, chassis, system, os] = await Promise.all([
      hardwareMonitor.getBiosData(),
      hardwareMonitor.getMotherboardData(),
      hardwareMonitor.getSystemInfo(),
      hardwareMonitor.getOSInfo(),
      Promise.resolve(null)
    ]);

    res.json({
      system,
      os: system,
      bios,
      motherboard,
      chassis
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get system summary' });
  }
});

export default router;
