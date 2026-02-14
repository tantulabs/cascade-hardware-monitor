import { Router, Request, Response } from 'express';
import { 
  applyOptimizationProfile, 
  getCurrentProfile, 
  getAvailableProfiles,
  analyzeResourceUsage 
} from '../services/optimization.js';

const router = Router();

router.get('/profiles', (_req: Request, res: Response) => {
  const profiles = getAvailableProfiles();
  const current = getCurrentProfile();
  res.json({ profiles, current });
});

router.get('/profiles/current', (_req: Request, res: Response) => {
  const current = getCurrentProfile();
  res.json({ current });
});

router.post('/profiles/:name', (req: Request, res: Response) => {
  const success = applyOptimizationProfile(req.params.name);
  if (success) {
    res.json({ success: true, profile: req.params.name });
  } else {
    res.status(400).json({ success: false, error: 'Invalid profile name' });
  }
});

router.get('/analyze', async (_req: Request, res: Response) => {
  try {
    const analysis = await analyzeResourceUsage();
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: 'Failed to analyze resource usage' });
  }
});

export default router;
