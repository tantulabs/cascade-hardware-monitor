import { Router, Request, Response } from 'express';
import { hardwareMonitor } from '../services/hardware-monitor.js';
import { alertService } from '../services/alert-service.js';
import { pluginManager } from '../services/plugin-manager.js';
import { getConfig, updateConfig, resetConfig } from '../core/config.js';
import optimizationRoutes from './optimization-routes.js';
import historyRoutes from './history-routes.js';
import gpuRoutes from './gpu-routes.js';
import infoRoutes from './info-routes.js';
import aiRoutes from './ai-routes.js';
import raspberryPiRoutes from './raspberry-pi-routes.js';
import { advancedMonitors } from '../services/advanced-monitors.js';
import { inferredMetrics } from '../services/inferred-metrics.js';
import { unifiedMonitors } from '../services/unified-monitors.js';
import { smartMonitor } from '../services/smart-monitor.js';
import { fanController } from '../services/fan-controller.js';
import { mainboardSensors } from '../services/mainboard-sensors.js';
import { cpuSensors } from '../services/cpu-sensors.js';
import { monitorSettings, MonitorSettings } from '../services/monitor-settings.js';
import { geminiAI } from '../services/gemini-ai.js';
import type { Alert } from '../types/hardware.js';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

router.get('/snapshot', async (_req: Request, res: Response) => {
  try {
    const snapshot = hardwareMonitor.getLastSnapshot();
    if (!snapshot) {
      const fresh = await hardwareMonitor.poll();
      res.json(fresh);
    } else {
      res.json(snapshot);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to get snapshot' });
  }
});

router.get('/snapshot/live', async (_req: Request, res: Response) => {
  try {
    const snapshot = await hardwareMonitor.poll();
    res.json(snapshot);
  } catch (err) {
    res.status(500).json({ error: 'Failed to poll hardware' });
  }
});

router.get('/history', (_req: Request, res: Response) => {
  const history = hardwareMonitor.getHistory();
  res.json(history);
});

router.get('/cpu', async (_req: Request, res: Response) => {
  try {
    const data = await hardwareMonitor.getCPUData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get CPU data' });
  }
});

router.get('/cpu/socket/:socketId', async (req: Request, res: Response) => {
  try {
    const data = await hardwareMonitor.getCPUData();
    const socketId = parseInt(req.params.socketId);
    if (socketId >= 0 && socketId < data.sockets.length) {
      res.json(data.sockets[socketId]);
    } else {
      res.status(404).json({ error: `CPU socket ${socketId} not found` });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to get CPU data' });
  }
});

router.get('/cpu/core/:coreId', async (req: Request, res: Response) => {
  try {
    const data = await hardwareMonitor.getCPUData();
    const coreId = parseInt(req.params.coreId);
    for (const socket of data.sockets) {
      const core = socket.coreData.find(c => c.coreId === coreId);
      if (core) {
        res.json(core);
        return;
      }
    }
    res.status(404).json({ error: `CPU core ${coreId} not found` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get CPU data' });
  }
});

router.get('/gpu', async (_req: Request, res: Response) => {
  try {
    const data = await hardwareMonitor.getGPUData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get GPU data' });
  }
});

router.get('/gpu/:index', async (req: Request, res: Response) => {
  try {
    const data = await hardwareMonitor.getGPUData();
    const index = parseInt(req.params.index);
    if (index >= 0 && index < data.length) {
      res.json(data[index]);
    } else {
      res.status(404).json({ error: `GPU ${index} not found` });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to get GPU data' });
  }
});

router.get('/memory', async (_req: Request, res: Response) => {
  try {
    const data = await hardwareMonitor.getMemoryData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get memory data' });
  }
});

router.get('/disks', async (_req: Request, res: Response) => {
  try {
    const data = await hardwareMonitor.getDiskData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get disk data' });
  }
});

router.get('/disks/:index', async (req: Request, res: Response) => {
  try {
    const data = await hardwareMonitor.getDiskData();
    const index = parseInt(req.params.index);
    if (index >= 0 && index < data.length) {
      res.json(data[index]);
    } else {
      res.status(404).json({ error: `Disk ${index} not found` });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to get disk data' });
  }
});

router.get('/network', async (_req: Request, res: Response) => {
  try {
    const data = await hardwareMonitor.getNetworkData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get network data' });
  }
});

router.get('/network/:iface', async (req: Request, res: Response) => {
  try {
    const data = await hardwareMonitor.getNetworkData();
    const iface = data.find(n => n.iface === req.params.iface || n.ifaceName === req.params.iface);
    if (iface) {
      res.json(iface);
    } else {
      res.status(404).json({ error: `Network interface ${req.params.iface} not found` });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to get network data' });
  }
});

router.get('/bluetooth', async (_req: Request, res: Response) => {
  try {
    const data = await hardwareMonitor.getBluetoothData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get bluetooth data' });
  }
});

router.get('/audio', async (_req: Request, res: Response) => {
  try {
    const data = await hardwareMonitor.getAudioData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get audio data' });
  }
});

router.get('/battery', async (_req: Request, res: Response) => {
  try {
    const data = await hardwareMonitor.getBatteryData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get battery data' });
  }
});

router.get('/usb', async (_req: Request, res: Response) => {
  try {
    const data = await hardwareMonitor.getUSBData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get USB data' });
  }
});

router.get('/motherboard', async (_req: Request, res: Response) => {
  try {
    const data = await hardwareMonitor.getMotherboardData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get motherboard data' });
  }
});

router.get('/bios', async (_req: Request, res: Response) => {
  try {
    const data = await hardwareMonitor.getBiosData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get BIOS data' });
  }
});

router.get('/processes', async (_req: Request, res: Response) => {
  try {
    const data = await hardwareMonitor.getProcessData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get process data' });
  }
});

router.get('/system', async (_req: Request, res: Response) => {
  try {
    const [system, os] = await Promise.all([
      hardwareMonitor.getSystemInfo(),
      hardwareMonitor.getOSInfo()
    ]);
    res.json({ system, os });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get system info' });
  }
});

router.get('/sensors', (_req: Request, res: Response) => {
  const readings = hardwareMonitor.getSensorReadings();
  res.json(readings);
});

router.get('/sensors/paths', (_req: Request, res: Response) => {
  const paths = hardwareMonitor.getSensorPaths();
  res.json(paths);
});

router.get('/sensors/:path', (req: Request, res: Response) => {
  const readings = hardwareMonitor.getSensorReadings(req.params.path);
  res.json(readings);
});

router.get('/alerts', (_req: Request, res: Response) => {
  const alerts = alertService.getAllAlerts();
  res.json(alerts);
});

router.post('/alerts', (req: Request, res: Response) => {
  try {
    const alertData = req.body as Omit<Alert, 'id' | 'lastTriggered' | 'triggerCount'>;
    const alert = alertService.createAlert(alertData);
    res.status(201).json(alert);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create alert' });
  }
});

router.get('/alerts/:id', (req: Request, res: Response) => {
  const alert = alertService.getAlert(req.params.id);
  if (alert) {
    res.json(alert);
  } else {
    res.status(404).json({ error: 'Alert not found' });
  }
});

router.put('/alerts/:id', (req: Request, res: Response) => {
  const updated = alertService.updateAlert(req.params.id, req.body);
  if (updated) {
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Alert not found' });
  }
});

router.delete('/alerts/:id', (req: Request, res: Response) => {
  const deleted = alertService.deleteAlert(req.params.id);
  if (deleted) {
    res.status(204).send();
  } else {
    res.status(404).json({ error: 'Alert not found' });
  }
});

router.post('/alerts/:id/enable', (req: Request, res: Response) => {
  const success = alertService.enableAlert(req.params.id);
  res.json({ success });
});

router.post('/alerts/:id/disable', (req: Request, res: Response) => {
  const success = alertService.disableAlert(req.params.id);
  res.json({ success });
});

router.get('/alerts/history', (_req: Request, res: Response) => {
  const history = alertService.getAlertHistory();
  res.json(history);
});

router.post('/alerts/history/:id/acknowledge', (req: Request, res: Response) => {
  const success = alertService.acknowledgeAlert(req.params.id);
  res.json({ success });
});

router.get('/config', (_req: Request, res: Response) => {
  const config = getConfig();
  res.json(config);
});

router.put('/config', (req: Request, res: Response) => {
  try {
    const updated = updateConfig(req.body);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: 'Invalid configuration' });
  }
});

router.post('/config/reset', (_req: Request, res: Response) => {
  const config = resetConfig();
  res.json(config);
});

router.get('/plugins', (_req: Request, res: Response) => {
  const plugins = pluginManager.getAllInstances();
  res.json(plugins);
});

router.post('/plugins/:id/start', async (req: Request, res: Response) => {
  const success = await pluginManager.startPlugin(req.params.id);
  res.json({ success });
});

router.post('/plugins/:id/stop', async (req: Request, res: Response) => {
  const success = await pluginManager.stopPlugin(req.params.id);
  res.json({ success });
});

router.delete('/plugins/:id', async (req: Request, res: Response) => {
  const success = await pluginManager.uninstallPlugin(req.params.id);
  if (success) {
    res.status(204).send();
  } else {
    res.status(404).json({ error: 'Plugin not found' });
  }
});

router.get('/status', (_req: Request, res: Response) => {
  res.json({
    monitoring: hardwareMonitor.isActive(),
    alerts: alertService.getAllAlerts().length,
    plugins: pluginManager.getLoadedPlugins().length,
    config: getConfig()
  });
});

router.use('/optimization', optimizationRoutes);
router.use('/history', historyRoutes);
router.use('/gpu', gpuRoutes);
router.use('/info', infoRoutes);
router.use('/ai', aiRoutes);
router.use('/raspberry-pi', raspberryPiRoutes);

router.get('/advanced', async (_req: Request, res: Response) => {
  try {
    const data = await advancedMonitors.getAdvancedData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get advanced hardware data' });
  }
});

router.get('/advanced/vrm', async (_req: Request, res: Response) => {
  try {
    const data = await advancedMonitors.getAdvancedData();
    res.json(data.vrm);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get VRM data' });
  }
});

router.get('/advanced/chipset', async (_req: Request, res: Response) => {
  try {
    const data = await advancedMonitors.getAdvancedData();
    res.json(data.chipset);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get chipset data' });
  }
});

router.get('/advanced/pcie', async (_req: Request, res: Response) => {
  try {
    const data = await advancedMonitors.getAdvancedData();
    res.json(data.pcieBandwidth);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get PCIe bandwidth data' });
  }
});

router.get('/advanced/power', async (_req: Request, res: Response) => {
  try {
    const data = await advancedMonitors.getAdvancedData();
    res.json(data.powerDelivery);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get power delivery data' });
  }
});

router.get('/advanced/thermal-zones', async (_req: Request, res: Response) => {
  try {
    const data = await advancedMonitors.getAdvancedData();
    res.json(data.thermalZones);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get thermal zones' });
  }
});

router.get('/inferred', async (_req: Request, res: Response) => {
  try {
    const snapshot = hardwareMonitor.getLastSnapshot();
    if (!snapshot) {
      res.status(503).json({ error: 'No hardware data available yet' });
      return;
    }
    const data = await inferredMetrics.calculate(
      snapshot.cpu,
      snapshot.gpu ? [snapshot.gpu] : [],
      snapshot.memory,
      snapshot.disks || [],
      snapshot.network
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate inferred metrics' });
  }
});

router.get('/inferred/thermal-headroom', async (_req: Request, res: Response) => {
  try {
    const snapshot = hardwareMonitor.getLastSnapshot();
    if (!snapshot) {
      res.status(503).json({ error: 'No hardware data available yet' });
      return;
    }
    const data = await inferredMetrics.calculate(
      snapshot.cpu,
      snapshot.gpu ? [snapshot.gpu] : [],
      snapshot.memory,
      snapshot.disks || [],
      snapshot.network
    );
    res.json(data.thermalHeadroom);
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate thermal headroom' });
  }
});

router.get('/inferred/efficiency', async (_req: Request, res: Response) => {
  try {
    const snapshot = hardwareMonitor.getLastSnapshot();
    if (!snapshot) {
      res.status(503).json({ error: 'No hardware data available yet' });
      return;
    }
    const data = await inferredMetrics.calculate(
      snapshot.cpu,
      snapshot.gpu ? [snapshot.gpu] : [],
      snapshot.memory,
      snapshot.disks || [],
      snapshot.network
    );
    res.json(data.efficiencyScore);
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate efficiency score' });
  }
});

router.get('/inferred/bottleneck', async (_req: Request, res: Response) => {
  try {
    const snapshot = hardwareMonitor.getLastSnapshot();
    if (!snapshot) {
      res.status(503).json({ error: 'No hardware data available yet' });
      return;
    }
    const data = await inferredMetrics.calculate(
      snapshot.cpu,
      snapshot.gpu ? [snapshot.gpu] : [],
      snapshot.memory,
      snapshot.disks || [],
      snapshot.network
    );
    res.json(data.bottleneck);
  } catch (err) {
    res.status(500).json({ error: 'Failed to analyze bottleneck' });
  }
});

router.get('/inferred/workload', async (_req: Request, res: Response) => {
  try {
    const snapshot = hardwareMonitor.getLastSnapshot();
    if (!snapshot) {
      res.status(503).json({ error: 'No hardware data available yet' });
      return;
    }
    const data = await inferredMetrics.calculate(
      snapshot.cpu,
      snapshot.gpu ? [snapshot.gpu] : [],
      snapshot.memory,
      snapshot.disks || [],
      snapshot.network
    );
    res.json(data.workloadProfile);
  } catch (err) {
    res.status(500).json({ error: 'Failed to detect workload profile' });
  }
});

router.get('/inferred/health', async (_req: Request, res: Response) => {
  try {
    const snapshot = hardwareMonitor.getLastSnapshot();
    if (!snapshot) {
      res.status(503).json({ error: 'No hardware data available yet' });
      return;
    }
    const data = await inferredMetrics.calculate(
      snapshot.cpu,
      snapshot.gpu ? [snapshot.gpu] : [],
      snapshot.memory,
      snapshot.disks || [],
      snapshot.network
    );
    res.json(data.healthPrediction);
  } catch (err) {
    res.status(500).json({ error: 'Failed to predict health' });
  }
});

router.get('/inferred/balance', async (_req: Request, res: Response) => {
  try {
    const snapshot = hardwareMonitor.getLastSnapshot();
    if (!snapshot) {
      res.status(503).json({ error: 'No hardware data available yet' });
      return;
    }
    const data = await inferredMetrics.calculate(
      snapshot.cpu,
      snapshot.gpu ? [snapshot.gpu] : [],
      snapshot.memory,
      snapshot.disks || [],
      snapshot.network
    );
    res.json(data.systemBalance);
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate system balance' });
  }
});

router.get('/monitors', async (_req: Request, res: Response) => {
  try {
    const data = await unifiedMonitors.getAllData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get unified monitor data' });
  }
});

router.get('/monitors/sources', async (_req: Request, res: Response) => {
  try {
    const sources = unifiedMonitors.getSources();
    res.json(sources);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get monitor sources' });
  }
});

router.get('/monitors/temperatures', async (_req: Request, res: Response) => {
  try {
    const temps = await unifiedMonitors.getTemperatures();
    res.json(temps);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get temperatures' });
  }
});

router.get('/monitors/fans', async (_req: Request, res: Response) => {
  try {
    const fans = await unifiedMonitors.getFans();
    res.json(fans);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get fan data' });
  }
});

router.get('/monitors/voltages', async (_req: Request, res: Response) => {
  try {
    const voltages = await unifiedMonitors.getVoltages();
    res.json(voltages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get voltage data' });
  }
});

router.get('/monitors/powers', async (_req: Request, res: Response) => {
  try {
    const powers = await unifiedMonitors.getPowers();
    res.json(powers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get power data' });
  }
});

router.get('/monitors/critical', async (_req: Request, res: Response) => {
  try {
    const critical = await unifiedMonitors.getCriticalSensors();
    res.json(critical);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get critical sensors' });
  }
});

router.get('/monitors/warnings', async (_req: Request, res: Response) => {
  try {
    const warnings = await unifiedMonitors.getWarningSensors();
    res.json(warnings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get warning sensors' });
  }
});

router.get('/smart', async (_req: Request, res: Response) => {
  try {
    const data = await smartMonitor.getAllData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get SMART data' });
  }
});

router.get('/smart/failing', async (_req: Request, res: Response) => {
  try {
    const failing = await smartMonitor.getFailingDisks();
    res.json(failing);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get failing disks' });
  }
});

router.get('/smart/temperatures', async (_req: Request, res: Response) => {
  try {
    const temps = await smartMonitor.getTemperatures();
    res.json(temps);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get disk temperatures' });
  }
});

router.get('/fans', async (_req: Request, res: Response) => {
  try {
    const data = await fanController.getAllData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get fan controller data' });
  }
});

router.get('/fans/controllers', async (_req: Request, res: Response) => {
  try {
    const controllers = fanController.getControllers();
    res.json(controllers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get fan controllers' });
  }
});

router.get('/fans/controllers/:id', async (req: Request, res: Response) => {
  try {
    const controller = fanController.getController(req.params.id);
    if (!controller) {
      res.status(404).json({ error: 'Controller not found' });
      return;
    }
    res.json(controller);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get fan controller' });
  }
});

router.post('/fans/controllers/:controllerId/channels/:channelId/speed', async (req: Request, res: Response) => {
  try {
    const { speed } = req.body;
    if (typeof speed !== 'number') {
      res.status(400).json({ error: 'Speed must be a number (0-100)' });
      return;
    }
    const success = await fanController.setFanSpeed(req.params.controllerId, req.params.channelId, speed);
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: 'Failed to set fan speed' });
  }
});

router.post('/fans/controllers/:controllerId/channels/:channelId/mode', async (req: Request, res: Response) => {
  try {
    const { mode } = req.body;
    if (mode !== 'auto' && mode !== 'manual') {
      res.status(400).json({ error: 'Mode must be "auto" or "manual"' });
      return;
    }
    const success = await fanController.setFanMode(req.params.controllerId, req.params.channelId, mode);
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: 'Failed to set fan mode' });
  }
});

router.get('/mainboard', async (_req: Request, res: Response) => {
  try {
    const data = await mainboardSensors.getAllData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get mainboard data' });
  }
});

router.get('/mainboard/voltages', async (_req: Request, res: Response) => {
  try {
    const data = await mainboardSensors.getAllData();
    res.json(data.voltages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get voltage data' });
  }
});

router.get('/mainboard/temperatures', async (_req: Request, res: Response) => {
  try {
    const data = await mainboardSensors.getAllData();
    res.json(data.temperatures);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get temperature data' });
  }
});

router.get('/mainboard/fans', async (_req: Request, res: Response) => {
  try {
    const data = await mainboardSensors.getAllData();
    res.json(data.fans);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get fan data' });
  }
});

router.get('/mainboard/vrm', async (_req: Request, res: Response) => {
  try {
    const data = await mainboardSensors.getAllData();
    res.json(data.vrm);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get VRM data' });
  }
});

router.get('/mainboard/chipset', async (_req: Request, res: Response) => {
  try {
    const data = await mainboardSensors.getAllData();
    res.json(data.chipset);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get chipset data' });
  }
});

router.get('/mainboard/superio', async (_req: Request, res: Response) => {
  try {
    const data = await mainboardSensors.getAllData();
    res.json(data.superIO);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get SuperIO data' });
  }
});

router.get('/cpu/sensors', async (_req: Request, res: Response) => {
  try {
    const data = await cpuSensors.getAllData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get CPU sensor data' });
  }
});

router.get('/cpu/sensors/cores', async (_req: Request, res: Response) => {
  try {
    const data = await cpuSensors.getAllData();
    res.json(data.cores);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get CPU core data' });
  }
});

router.get('/cpu/sensors/temperatures', async (_req: Request, res: Response) => {
  try {
    const temps = await cpuSensors.getPerCoreTemperatures();
    res.json(temps);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get CPU temperatures' });
  }
});

router.get('/cpu/sensors/frequencies', async (_req: Request, res: Response) => {
  try {
    const freqs = await cpuSensors.getPerCoreFrequencies();
    res.json(freqs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get CPU frequencies' });
  }
});

router.get('/cpu/sensors/loads', async (_req: Request, res: Response) => {
  try {
    const loads = await cpuSensors.getPerCoreLoads();
    res.json(loads);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get CPU loads' });
  }
});

router.get('/cpu/sensors/power', async (_req: Request, res: Response) => {
  try {
    const power = await cpuSensors.getPowerConsumption();
    res.json(power);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get CPU power data' });
  }
});

router.get('/cpu/sensors/throttling', async (_req: Request, res: Response) => {
  try {
    const data = await cpuSensors.getAllData();
    res.json(data.throttling);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get CPU throttling data' });
  }
});

router.get('/cpu/sensors/cache', async (_req: Request, res: Response) => {
  try {
    const data = await cpuSensors.getAllData();
    res.json(data.cache);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get CPU cache data' });
  }
});

router.get('/cpu/sensors/features', async (_req: Request, res: Response) => {
  try {
    const data = await cpuSensors.getAllData();
    res.json(data.features);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get CPU features' });
  }
});

router.get('/settings/monitors', async (_req: Request, res: Response) => {
  try {
    const settings = monitorSettings.getSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get monitor settings' });
  }
});

router.put('/settings/monitors', async (req: Request, res: Response) => {
  try {
    const updates = req.body as Partial<MonitorSettings>;
    const settings = await monitorSettings.updateSettings(updates);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update monitor settings' });
  }
});

router.get('/settings/monitors/enabled', async (_req: Request, res: Response) => {
  try {
    res.json({
      enabled: monitorSettings.getEnabledMonitors(),
      disabled: monitorSettings.getDisabledMonitors(),
      profile: monitorSettings.getPerformanceProfile()
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get enabled monitors' });
  }
});

router.post('/settings/monitors/:monitor/enable', async (req: Request, res: Response) => {
  try {
    const monitor = req.params.monitor as keyof MonitorSettings;
    await monitorSettings.setMonitorEnabled(monitor, true);
    res.json({ success: true, monitor, enabled: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to enable monitor' });
  }
});

router.post('/settings/monitors/:monitor/disable', async (req: Request, res: Response) => {
  try {
    const monitor = req.params.monitor as keyof MonitorSettings;
    await monitorSettings.setMonitorEnabled(monitor, false);
    res.json({ success: true, monitor, enabled: false });
  } catch (err) {
    res.status(500).json({ error: 'Failed to disable monitor' });
  }
});

router.post('/settings/monitors/:monitor/:subMonitor/enable', async (req: Request, res: Response) => {
  try {
    const { monitor, subMonitor } = req.params;
    await monitorSettings.setSubMonitorEnabled(monitor as keyof MonitorSettings, subMonitor, true);
    res.json({ success: true, monitor, subMonitor, enabled: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to enable sub-monitor' });
  }
});

router.post('/settings/monitors/:monitor/:subMonitor/disable', async (req: Request, res: Response) => {
  try {
    const { monitor, subMonitor } = req.params;
    await monitorSettings.setSubMonitorEnabled(monitor as keyof MonitorSettings, subMonitor, false);
    res.json({ success: true, monitor, subMonitor, enabled: false });
  } catch (err) {
    res.status(500).json({ error: 'Failed to disable sub-monitor' });
  }
});

router.post('/settings/monitors/preset/:preset', async (req: Request, res: Response) => {
  try {
    const preset = req.params.preset as 'minimal' | 'balanced' | 'full' | 'gaming' | 'server';
    const settings = await monitorSettings.applyPreset(preset);
    res.json({ success: true, preset, settings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to apply preset' });
  }
});

router.post('/settings/monitors/reset', async (_req: Request, res: Response) => {
  try {
    const settings = await monitorSettings.resetToDefaults();
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset settings' });
  }
});

router.get('/ai/gemini/status', async (_req: Request, res: Response) => {
  try {
    const status = geminiAI.getStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get Gemini status' });
  }
});

router.post('/ai/gemini/configure', async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      res.status(400).json({ error: 'API key is required' });
      return;
    }
    
    const success = await geminiAI.setApiKey(apiKey);
    if (success) {
      res.json({ success: true, message: 'Gemini AI configured successfully' });
    } else {
      res.status(400).json({ error: 'Invalid API key' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to configure Gemini' });
  }
});

router.delete('/ai/gemini/configure', async (_req: Request, res: Response) => {
  try {
    await geminiAI.removeApiKey();
    res.json({ success: true, message: 'Gemini API key removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove API key' });
  }
});

router.post('/ai/gemini/enable', async (_req: Request, res: Response) => {
  try {
    await geminiAI.setEnabled(true);
    res.json({ success: true, enabled: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to enable Gemini' });
  }
});

router.post('/ai/gemini/disable', async (_req: Request, res: Response) => {
  try {
    await geminiAI.setEnabled(false);
    res.json({ success: true, enabled: false });
  } catch (err) {
    res.status(500).json({ error: 'Failed to disable Gemini' });
  }
});

router.put('/ai/gemini/model', async (req: Request, res: Response) => {
  try {
    const { model } = req.body;
    if (!model) {
      res.status(400).json({ error: 'Model name is required' });
      return;
    }
    await geminiAI.setModel(model);
    res.json({ success: true, model });
  } catch (err) {
    res.status(500).json({ error: 'Failed to set model' });
  }
});

router.get('/ai/gemini/analyze/health', async (_req: Request, res: Response) => {
  try {
    const snapshot = hardwareMonitor.getLastSnapshot();
    if (!snapshot) {
      res.status(503).json({ error: 'No hardware data available' });
      return;
    }
    const analysis = await geminiAI.analyzeHardwareHealth(snapshot);
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: 'Failed to analyze hardware health' });
  }
});

router.get('/ai/gemini/analyze/thermals', async (_req: Request, res: Response) => {
  try {
    const snapshot = hardwareMonitor.getLastSnapshot();
    if (!snapshot) {
      res.status(503).json({ error: 'No hardware data available' });
      return;
    }
    const analysis = await geminiAI.analyzeThermals(snapshot);
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: 'Failed to analyze thermals' });
  }
});

router.get('/ai/gemini/analyze/performance', async (_req: Request, res: Response) => {
  try {
    const snapshot = hardwareMonitor.getLastSnapshot();
    if (!snapshot) {
      res.status(503).json({ error: 'No hardware data available' });
      return;
    }
    const analysis = await geminiAI.analyzePerformance(snapshot);
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: 'Failed to analyze performance' });
  }
});

router.post('/ai/gemini/chat', async (req: Request, res: Response) => {
  try {
    const { message, includeContext } = req.body;
    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }
    
    let context = null;
    if (includeContext) {
      context = hardwareMonitor.getLastSnapshot();
    }
    
    const response = await geminiAI.chat(message, context);
    res.json({ response });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process chat' });
  }
});

export default router;
