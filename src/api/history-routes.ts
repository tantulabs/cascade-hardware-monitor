import { Router, Request, Response } from 'express';
import { historyService } from '../services/history.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const startTime = req.query.startTime ? parseInt(req.query.startTime as string) : undefined;
  const endTime = req.query.endTime ? parseInt(req.query.endTime as string) : undefined;
  const resolution = req.query.resolution as 'raw' | 'minute' | 'hour' | 'day' | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

  const data = historyService.query({ startTime, endTime, resolution, limit });
  res.json(data);
});

router.get('/sensor/:path', (req: Request, res: Response) => {
  const duration = req.query.duration ? parseInt(req.query.duration as string) : 3600000;
  const data = historyService.getSensorHistory(req.params.path, duration);
  res.json(data);
});

router.get('/latest', (_req: Request, res: Response) => {
  const readings = historyService.getLatestReadings();
  res.json(readings);
});

router.get('/stats', (_req: Request, res: Response) => {
  const stats = historyService.getStats();
  res.json(stats);
});

router.delete('/', (_req: Request, res: Response) => {
  historyService.clear();
  res.json({ success: true });
});

export default router;
