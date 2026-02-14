import { Router, Request, Response } from 'express';
import { hardwareMonitor } from '../services/hardware-monitor.js';
import { gpuManager } from '../services/gpu/index.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const data = await hardwareMonitor.getGPUData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get GPU data' });
  }
});

router.get('/enhanced', async (_req: Request, res: Response) => {
  try {
    const data = await hardwareMonitor.getEnhancedGPUData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get enhanced GPU data' });
  }
});

router.get('/system', async (_req: Request, res: Response) => {
  try {
    const info = await gpuManager.getSystemInfo();
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get GPU system info' });
  }
});

router.get('/vendors', (_req: Request, res: Response) => {
  res.json({
    available: gpuManager.getAvailableVendors(),
    initialized: gpuManager.isInitialized()
  });
});

router.get('/all', async (_req: Request, res: Response) => {
  try {
    const gpus = await gpuManager.getAllGPUData();
    res.json(gpus);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get all GPU data' });
  }
});

router.get('/:index', async (req: Request, res: Response) => {
  try {
    const index = parseInt(req.params.index);
    const gpu = await gpuManager.getGPUByIndex(index);
    if (gpu) {
      res.json(gpu);
    } else {
      res.status(404).json({ error: `GPU ${index} not found` });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to get GPU data' });
  }
});

router.get('/:index/processes', async (req: Request, res: Response) => {
  try {
    const index = parseInt(req.params.index);
    const gpu = await gpuManager.getGPUByIndex(index);
    if (gpu) {
      res.json(gpu.processes || []);
    } else {
      res.status(404).json({ error: `GPU ${index} not found` });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to get GPU processes' });
  }
});

router.get('/vendor/:vendor', async (req: Request, res: Response) => {
  try {
    const vendor = req.params.vendor as 'nvidia' | 'amd' | 'intel';
    const gpus = await gpuManager.getGPUsByVendor(vendor);
    res.json(gpus);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get GPU data by vendor' });
  }
});

router.get('/nvidia/raw', async (_req: Request, res: Response) => {
  try {
    const gpus = await gpuManager.getGPUsByVendor('nvidia');
    if (gpus.length > 0) {
      res.json(gpus);
    } else {
      res.status(404).json({ error: 'NVIDIA GPU not available' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to get NVIDIA GPU data' });
  }
});

router.get('/amd/raw', async (_req: Request, res: Response) => {
  try {
    const gpus = await gpuManager.getGPUsByVendor('amd');
    if (gpus.length > 0) {
      res.json(gpus);
    } else {
      res.status(404).json({ error: 'AMD GPU not available' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to get AMD GPU data' });
  }
});

router.get('/intel/raw', async (_req: Request, res: Response) => {
  try {
    const gpus = await gpuManager.getGPUsByVendor('intel');
    if (gpus.length > 0) {
      res.json(gpus);
    } else {
      res.status(404).json({ error: 'Intel GPU not available' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to get Intel GPU data' });
  }
});

export default router;
