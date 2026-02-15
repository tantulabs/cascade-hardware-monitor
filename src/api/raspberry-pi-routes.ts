import { Router, Request, Response } from 'express';
import { raspberryPiService } from '../services/raspberry-pi.js';
import { createChildLogger } from '../core/logger.js';

const router = Router();
const logger = createChildLogger('raspberry-pi-routes');

router.get('/', async (req: Request, res: Response) => {
  try {
    if (!raspberryPiService.isAvailable()) {
      return res.status(404).json({
        error: 'Not a Raspberry Pi',
        message: 'This endpoint is only available on Raspberry Pi devices'
      });
    }

    const data = await raspberryPiService.getAllData();
    res.json(data);
  } catch (error) {
    logger.error('Failed to get Raspberry Pi data:', error);
    res.status(500).json({ error: 'Failed to get Raspberry Pi data' });
  }
});

router.get('/info', async (req: Request, res: Response) => {
  try {
    if (!raspberryPiService.isAvailable()) {
      return res.status(404).json({ error: 'Not a Raspberry Pi' });
    }

    const info = raspberryPiService.getPiInfo();
    res.json(info);
  } catch (error) {
    logger.error('Failed to get Pi info:', error);
    res.status(500).json({ error: 'Failed to get Pi info' });
  }
});

router.get('/thermals', async (req: Request, res: Response) => {
  try {
    if (!raspberryPiService.isAvailable()) {
      return res.status(404).json({ error: 'Not a Raspberry Pi' });
    }

    const thermals = await raspberryPiService.getThermals();
    res.json(thermals);
  } catch (error) {
    logger.error('Failed to get Pi thermals:', error);
    res.status(500).json({ error: 'Failed to get Pi thermals' });
  }
});

router.get('/voltages', async (req: Request, res: Response) => {
  try {
    if (!raspberryPiService.isAvailable()) {
      return res.status(404).json({ error: 'Not a Raspberry Pi' });
    }

    const voltages = await raspberryPiService.getVoltages();
    res.json(voltages);
  } catch (error) {
    logger.error('Failed to get Pi voltages:', error);
    res.status(500).json({ error: 'Failed to get Pi voltages' });
  }
});

router.get('/clocks', async (req: Request, res: Response) => {
  try {
    if (!raspberryPiService.isAvailable()) {
      return res.status(404).json({ error: 'Not a Raspberry Pi' });
    }

    const clocks = await raspberryPiService.getClocks();
    res.json(clocks);
  } catch (error) {
    logger.error('Failed to get Pi clocks:', error);
    res.status(500).json({ error: 'Failed to get Pi clocks' });
  }
});

router.get('/throttling', async (req: Request, res: Response) => {
  try {
    if (!raspberryPiService.isAvailable()) {
      return res.status(404).json({ error: 'Not a Raspberry Pi' });
    }

    const throttling = await raspberryPiService.getThrottling();
    res.json(throttling);
  } catch (error) {
    logger.error('Failed to get Pi throttling:', error);
    res.status(500).json({ error: 'Failed to get Pi throttling' });
  }
});

router.get('/memory', async (req: Request, res: Response) => {
  try {
    if (!raspberryPiService.isAvailable()) {
      return res.status(404).json({ error: 'Not a Raspberry Pi' });
    }

    const memory = await raspberryPiService.getMemorySplit();
    res.json(memory);
  } catch (error) {
    logger.error('Failed to get Pi memory:', error);
    res.status(500).json({ error: 'Failed to get Pi memory' });
  }
});

router.get('/health', async (req: Request, res: Response) => {
  try {
    if (!raspberryPiService.isAvailable()) {
      return res.status(404).json({ error: 'Not a Raspberry Pi' });
    }

    const health = await raspberryPiService.getHealthStatus();
    res.json(health);
  } catch (error) {
    logger.error('Failed to get Pi health:', error);
    res.status(500).json({ error: 'Failed to get Pi health' });
  }
});

export default router;
