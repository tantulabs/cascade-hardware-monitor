import { Router, Request, Response } from 'express';
import { hardwareMonitor } from '../services/hardware-monitor.js';
import { hardwareControl } from '../services/hardware-control.js';
import { alertService } from '../services/alert-service.js';
import { gpuManager } from '../services/gpu/index.js';

const router = Router();

// AI-friendly structured data endpoint
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const snapshot = hardwareMonitor.getLastSnapshot();
    const alerts = alertService.getAllAlerts();
    const activeAlerts = alerts.filter(a => a.enabled);
    const capabilities = hardwareControl.getCapabilities();

    res.json({
      timestamp: Date.now(),
      system: {
        healthy: activeAlerts.length === 0,
        alertCount: activeAlerts.length,
        monitoringActive: hardwareMonitor.isActive()
      },
      summary: {
        cpu: snapshot?.cpu ? {
          load: snapshot.cpu.load,
          temperature: snapshot.cpu.temperature,
          status: getCPUStatus(snapshot.cpu.load, snapshot.cpu.temperature)
        } : null,
        gpu: snapshot?.gpu?.map((g, i) => ({
          index: i,
          name: g.model,
          load: g.utilizationGpu,
          temperature: g.temperature,
          status: getGPUStatus(g.utilizationGpu, g.temperature)
        })) || [],
        memory: snapshot?.memory ? {
          usedPercent: snapshot.memory.usedPercent,
          status: getMemoryStatus(snapshot.memory.usedPercent)
        } : null,
        storage: snapshot?.disks?.map(d => ({
          mount: d.mount,
          usedPercent: d.usePercent,
          status: getStorageStatus(d.usePercent)
        })) || []
      },
      alerts: activeAlerts.map((a: any) => ({
        id: a.id,
        name: a.name,
        severity: a.severity,
        sensorPath: a.sensorPath,
        message: a.message
      })),
      capabilities,
      actions: getAvailableActions(capabilities)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get AI status' });
  }
});

// Semantic analysis endpoint
router.get('/analysis', async (_req: Request, res: Response) => {
  try {
    const snapshot = hardwareMonitor.getLastSnapshot();
    if (!snapshot) {
      res.status(503).json({ error: 'No data available' });
      return;
    }

    const analysis = {
      timestamp: Date.now(),
      recommendations: [] as string[],
      warnings: [] as string[],
      opportunities: [] as string[],
      metrics: {
        overallHealth: 100,
        performanceScore: 0,
        thermalScore: 0,
        resourceScore: 0
      }
    };

    // CPU Analysis
    if (snapshot.cpu) {
      if (snapshot.cpu.load > 90) {
        analysis.warnings.push('CPU load critically high (>90%). Consider closing applications or upgrading hardware.');
        analysis.metrics.overallHealth -= 20;
      } else if (snapshot.cpu.load > 70) {
        analysis.recommendations.push('CPU load elevated. Monitor for sustained high usage.');
      }

      if (snapshot.cpu.temperature > 85) {
        analysis.warnings.push('CPU temperature critical (>85°C). Check cooling system immediately.');
        analysis.metrics.overallHealth -= 25;
      } else if (snapshot.cpu.temperature > 70) {
        analysis.recommendations.push('CPU temperature elevated. Ensure adequate cooling.');
      }

      analysis.metrics.performanceScore = Math.max(0, 100 - snapshot.cpu.load);
      analysis.metrics.thermalScore = Math.max(0, 100 - (snapshot.cpu.temperature - 30) * 1.5);
    }

    // GPU Analysis
    if (snapshot.gpu && snapshot.gpu.length > 0) {
      for (const gpu of snapshot.gpu) {
        if (gpu.temperature > 85) {
          analysis.warnings.push(`GPU ${gpu.model} temperature critical (${gpu.temperature}°C).`);
          analysis.metrics.overallHealth -= 20;
        }
        if (gpu.utilizationGpu > 95) {
          analysis.opportunities.push(`GPU ${gpu.model} at maximum utilization. Consider GPU power limit adjustment.`);
        }
      }
    }

    // Memory Analysis
    if (snapshot.memory) {
      if (snapshot.memory.usedPercent > 90) {
        analysis.warnings.push('Memory usage critical (>90%). System may become unstable.');
        analysis.metrics.overallHealth -= 15;
      } else if (snapshot.memory.usedPercent > 75) {
        analysis.recommendations.push('Memory usage high. Consider closing unused applications.');
      }
      analysis.metrics.resourceScore = Math.max(0, 100 - snapshot.memory.usedPercent);
    }

    // Storage Analysis
    if (snapshot.disks) {
      for (const disk of snapshot.disks) {
        if (disk.usePercent > 95) {
          analysis.warnings.push('Storage ' + disk.mount + ' nearly full (' + disk.usePercent + '%). Free up space immediately.');
          analysis.metrics.overallHealth -= 10;
        } else if (disk.usePercent > 80) {
          analysis.recommendations.push('Storage ' + disk.mount + ' usage high (' + disk.usePercent + '%). Consider cleanup.');
        }
      }
    }

    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: 'Failed to analyze system' });
  }
});

// Execute AI action
router.post('/action', async (req: Request, res: Response) => {
  try {
    const { action, params } = req.body;

    if (!action) {
      res.status(400).json({ error: 'Action required' });
      return;
    }

    let result: any = { success: false, message: 'Unknown action' };

    switch (action) {
      case 'set_power_profile':
        if (params?.profileId) {
          const success = await hardwareControl.setActivePowerProfile(params.profileId);
          result = { success, message: success ? 'Power profile changed' : 'Failed to change power profile' };
        }
        break;

      case 'set_gpu_power_limit':
        if (params?.gpuIndex !== undefined && params?.powerLimit) {
          const success = await hardwareControl.setGPUPowerLimit(params.gpuIndex, params.powerLimit);
          result = { success, message: success ? 'GPU power limit set' : 'Failed to set GPU power limit' };
        }
        break;

      case 'set_process_priority':
        if (params?.pid && params?.priority) {
          const success = await hardwareControl.setProcessPriority(params.pid, params.priority);
          result = { success, message: success ? 'Process priority changed' : 'Failed to change priority' };
        }
        break;

      case 'set_cpu_affinity':
        if (params?.pid && params?.cpuMask) {
          const success = await hardwareControl.setProcessAffinity(params.pid, params.cpuMask);
          result = { success, message: success ? 'CPU affinity set' : 'Failed to set affinity' };
        }
        break;

      case 'set_brightness':
        if (params?.level !== undefined) {
          const success = await hardwareControl.setDisplayBrightness(params.level);
          result = { success, message: success ? 'Brightness changed' : 'Failed to change brightness' };
        }
        break;

      case 'set_volume':
        if (params?.level !== undefined) {
          const success = await hardwareControl.setVolume(params.level);
          result = { success, message: success ? 'Volume changed' : 'Failed to change volume' };
        }
        break;

      case 'set_muted':
        if (params?.muted !== undefined) {
          const success = await hardwareControl.setMuted(params.muted);
          result = { success, message: success ? 'Mute state changed' : 'Failed to change mute state' };
        }
        break;

      case 'set_dark_mode':
        if (params?.enabled !== undefined) {
          const success = await hardwareControl.setDarkMode(params.enabled);
          result = { success, message: success ? 'Dark mode changed' : 'Failed to change dark mode' };
        }
        break;

      case 'prevent_sleep':
        {
          const sleepResult = await hardwareControl.preventSleep();
          result = { success: sleepResult.success, message: sleepResult.success ? 'Sleep prevention enabled' : 'Failed to prevent sleep', pid: sleepResult.pid };
        }
        break;

      case 'allow_sleep':
        {
          const success = await hardwareControl.allowSleep(params?.pid);
          result = { success, message: success ? 'Sleep allowed' : 'Failed to allow sleep' };
        }
        break;

      case 'kill_process':
        if (params?.pid) {
          const success = await hardwareControl.killProcess(params.pid, params.force || false);
          result = { success, message: success ? 'Process terminated' : 'Failed to terminate process' };
        }
        break;

      case 'create_alert':
        if (params?.name && params?.sensorPath && params?.condition) {
          const alert = alertService.createAlert({
            name: params.name,
            sensorPath: params.sensorPath,
            condition: params.condition,
            thresholdMin: params.thresholdMin,
            thresholdMax: params.thresholdMax,
            enabled: true,
            cooldown: params.cooldownMs ? params.cooldownMs / 1000 : 60,
            duration: params.duration || 0,
            actions: []
          });
          result = { success: true, message: 'Alert created', data: alert };
        }
        break;

      case 'dismiss_alert':
        if (params?.alertId) {
          alertService.acknowledgeAlert(params.alertId);
          result = { success: true, message: 'Alert acknowledged' };
        }
        break;

      default:
        result = { success: false, message: `Unknown action: ${action}` };
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to execute action', details: String(err) });
  }
});

// Get available actions
router.get('/actions', async (_req: Request, res: Response) => {
  const capabilities = hardwareControl.getCapabilities();
  res.json({
    actions: getAvailableActions(capabilities),
    capabilities
  });
});

// Hardware control endpoints
router.get('/control/power-profiles', async (_req: Request, res: Response) => {
  try {
    const profiles = await hardwareControl.getPowerProfiles();
    res.json(profiles);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get power profiles' });
  }
});

router.post('/control/power-profiles/:id', async (req: Request, res: Response) => {
  try {
    const success = await hardwareControl.setActivePowerProfile(req.params.id);
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: 'Failed to set power profile' });
  }
});

router.get('/control/gpu-power', async (_req: Request, res: Response) => {
  try {
    const limits = await hardwareControl.getGPUPowerLimits();
    res.json(limits);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get GPU power limits' });
  }
});

router.post('/control/gpu-power/:index', async (req: Request, res: Response) => {
  try {
    const { powerLimit } = req.body;
    const success = await hardwareControl.setGPUPowerLimit(parseInt(req.params.index), powerLimit);
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: 'Failed to set GPU power limit' });
  }
});

router.get('/control/brightness', async (_req: Request, res: Response) => {
  try {
    const brightness = await hardwareControl.getDisplayBrightness();
    res.json({ brightness });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get brightness' });
  }
});

router.post('/control/brightness', async (req: Request, res: Response) => {
  try {
    const { level } = req.body;
    const success = await hardwareControl.setDisplayBrightness(level);
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: 'Failed to set brightness' });
  }
});

router.post('/control/process/:pid/priority', async (req: Request, res: Response) => {
  try {
    const { priority } = req.body;
    const success = await hardwareControl.setProcessPriority(parseInt(req.params.pid), priority);
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: 'Failed to set process priority' });
  }
});

router.post('/control/process/:pid/affinity', async (req: Request, res: Response) => {
  try {
    const { cpuMask } = req.body;
    const success = await hardwareControl.setProcessAffinity(parseInt(req.params.pid), cpuMask);
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: 'Failed to set CPU affinity' });
  }
});

router.delete('/control/process/:pid', async (req: Request, res: Response) => {
  try {
    const force = req.query.force === 'true';
    const success = await hardwareControl.killProcess(parseInt(req.params.pid), force);
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: 'Failed to kill process' });
  }
});

// Helper functions
function getCPUStatus(load: number, temp: number): string {
  if (load > 90 || temp > 85) return 'critical';
  if (load > 70 || temp > 70) return 'warning';
  return 'normal';
}

function getGPUStatus(load: number, temp: number): string {
  if (load > 95 || temp > 85) return 'critical';
  if (load > 80 || temp > 75) return 'warning';
  return 'normal';
}

function getMemoryStatus(usedPercent: number): string {
  if (usedPercent > 90) return 'critical';
  if (usedPercent > 75) return 'warning';
  return 'normal';
}

function getStorageStatus(usedPercent: number): string {
  if (usedPercent > 95) return 'critical';
  if (usedPercent > 80) return 'warning';
  return 'normal';
}

function getAvailableActions(capabilities: any): any[] {
  const actions = [];

  if (capabilities.powerProfiles) {
    actions.push({
      id: 'set_power_profile',
      name: 'Set Power Profile',
      description: 'Change Windows power plan (Balanced, High Performance, Power Saver)',
      params: [{ name: 'profileId', type: 'string', required: true }]
    });
  }

  if (capabilities.gpuPowerLimit) {
    actions.push({
      id: 'set_gpu_power_limit',
      name: 'Set GPU Power Limit',
      description: 'Adjust NVIDIA GPU power limit in watts',
      params: [
        { name: 'gpuIndex', type: 'number', required: true },
        { name: 'powerLimit', type: 'number', required: true }
      ]
    });
  }

  if (capabilities.processPriority) {
    actions.push({
      id: 'set_process_priority',
      name: 'Set Process Priority',
      description: 'Change process priority (idle, below_normal, normal, above_normal, high, realtime)',
      params: [
        { name: 'pid', type: 'number', required: true },
        { name: 'priority', type: 'string', required: true }
      ]
    });
  }

  if (capabilities.cpuAffinity) {
    actions.push({
      id: 'set_cpu_affinity',
      name: 'Set CPU Affinity',
      description: 'Bind process to specific CPU cores using bitmask',
      params: [
        { name: 'pid', type: 'number', required: true },
        { name: 'cpuMask', type: 'number', required: true }
      ]
    });
  }

  if (capabilities.displayBrightness) {
    actions.push({
      id: 'set_brightness',
      name: 'Set Display Brightness',
      description: 'Adjust display brightness (0-100)',
      params: [{ name: 'level', type: 'number', required: true }]
    });
  }

  if (capabilities.volume) {
    actions.push({
      id: 'set_volume',
      name: 'Set Volume (macOS)',
      description: 'Adjust system volume (0-100)',
      params: [{ name: 'level', type: 'number', required: true }]
    });
    actions.push({
      id: 'set_muted',
      name: 'Set Mute (macOS)',
      description: 'Mute or unmute system audio',
      params: [{ name: 'muted', type: 'boolean', required: true }]
    });
  }

  if (capabilities.darkMode) {
    actions.push({
      id: 'set_dark_mode',
      name: 'Set Dark Mode (macOS)',
      description: 'Enable or disable dark mode',
      params: [{ name: 'enabled', type: 'boolean', required: true }]
    });
  }

  if (capabilities.preventSleep) {
    actions.push({
      id: 'prevent_sleep',
      name: 'Prevent Sleep',
      description: 'Prevent system from sleeping (macOS: caffeinate, Windows: powercfg)',
      params: []
    });
    actions.push({
      id: 'allow_sleep',
      name: 'Allow Sleep',
      description: 'Allow system to sleep again',
      params: [{ name: 'pid', type: 'number', required: false }]
    });
  }

  actions.push({
    id: 'kill_process',
    name: 'Kill Process',
    description: 'Terminate a running process',
    params: [
      { name: 'pid', type: 'number', required: true },
      { name: 'force', type: 'boolean', required: false }
    ]
  });

  actions.push({
    id: 'create_alert',
    name: 'Create Alert',
    description: 'Create a new monitoring alert',
    params: [
      { name: 'name', type: 'string', required: true },
      { name: 'sensorPath', type: 'string', required: true },
      { name: 'condition', type: 'string', required: true },
      { name: 'thresholdMax', type: 'number', required: false },
      { name: 'thresholdMin', type: 'number', required: false },
      { name: 'severity', type: 'string', required: false }
    ]
  });

  actions.push({
    id: 'dismiss_alert',
    name: 'Dismiss Alert',
    description: 'Dismiss an active alert',
    params: [{ name: 'alertId', type: 'string', required: true }]
  });

  return actions;
}

export default router;
