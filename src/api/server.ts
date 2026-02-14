import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import routes from './routes.js';
import { wsAPI } from './websocket.js';
import { setupStaticFiles } from './static.js';
import { getConfig } from '../core/config.js';
import { createChildLogger } from '../core/logger.js';

const logger = createChildLogger('api-server');

export class APIServer {
  private app = express();
  private server = createServer(this.app);
  private rateLimiter = new RateLimiterMemory({
    points: 100,
    duration: 60
  });

  constructor() {
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(helmet({
      contentSecurityPolicy: false
    }));
    this.app.use(cors());
    this.app.use(compression());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    this.app.use(async (req, res, next) => {
      try {
        await this.rateLimiter.consume(req.ip || 'unknown');
        next();
      } catch {
        res.status(429).json({ error: 'Too many requests' });
      }
    });

    this.app.use((req, res, next) => {
      const config = getConfig();
      
      if (!config.enableAuth) {
        return next();
      }

      const apiKey = req.headers['x-api-key'] || req.query.apiKey;
      
      if (apiKey === config.apiKey) {
        return next();
      }

      res.status(401).json({ error: 'Unauthorized' });
    });
  }

  private setupRoutes(): void {
    setupStaticFiles(this.app);
    this.app.use('/api/v1', routes);

    this.app.use((_req, res) => {
      res.status(404).json({ error: 'Not found' });
    });

    this.app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      logger.error('Unhandled error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      const config = getConfig();
      
      this.server.listen(config.apiPort, () => {
        logger.info(`API server listening on port ${config.apiPort}`);
        
        wsAPI.start(this.server);
        
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      wsAPI.close();
      
      this.server.close((err) => {
        if (err) {
          reject(err);
        } else {
          logger.info('API server stopped');
          resolve();
        }
      });
    });
  }

  getApp() {
    return this.app;
  }

  getServer() {
    return this.server;
  }
}

export const apiServer = new APIServer();
export default apiServer;
