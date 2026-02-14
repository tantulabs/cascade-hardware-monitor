import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { hardwareMonitor } from '../services/hardware-monitor.js';
import { alertService } from '../services/alert-service.js';
import { getConfig } from '../core/config.js';
import { createChildLogger } from '../core/logger.js';
import type { HardwareSnapshot, SensorReading, AlertEvent } from '../types/hardware.js';

const logger = createChildLogger('websocket');

interface WSClient {
  id: string;
  ws: WebSocket;
  subscriptions: Set<string>;
  authenticated: boolean;
}

export class WebSocketAPI {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WSClient> = new Map();

  start(server: Server): void {
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = uuidv4();
      const client: WSClient = {
        id: clientId,
        ws,
        subscriptions: new Set(['snapshot']),
        authenticated: !getConfig().enableAuth
      };

      this.clients.set(clientId, client);
      logger.info(`WebSocket client connected: ${clientId}`);

      this.send(ws, {
        type: 'connected',
        clientId,
        timestamp: Date.now()
      });

      ws.on('message', (data: Buffer) => {
        this.handleMessage(client, data);
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        logger.info(`WebSocket client disconnected: ${clientId}`);
      });

      ws.on('error', (err) => {
        logger.error(`WebSocket error for client ${clientId}:`, err);
      });
    });

    this.setupMonitorListeners();
    logger.info('WebSocket server started');
  }

  private setupMonitorListeners(): void {
    hardwareMonitor.on('snapshot', (snapshot: HardwareSnapshot) => {
      this.broadcast('snapshot', { type: 'snapshot', data: snapshot });
    });

    hardwareMonitor.on('readings', (readings: SensorReading[]) => {
      this.broadcast('readings', { type: 'readings', data: readings });
    });

    alertService.on('alert', (event: AlertEvent) => {
      this.broadcast('alerts', { type: 'alert', data: event });
    });
  }

  private handleMessage(client: WSClient, data: Buffer): void {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'auth':
          this.handleAuth(client, message);
          break;

        case 'subscribe':
          this.handleSubscribe(client, message);
          break;

        case 'unsubscribe':
          this.handleUnsubscribe(client, message);
          break;

        case 'ping':
          this.send(client.ws, { type: 'pong', timestamp: Date.now() });
          break;

        case 'get':
          this.handleGet(client, message);
          break;

        default:
          this.send(client.ws, { type: 'error', message: 'Unknown message type' });
      }
    } catch (err) {
      logger.error('Failed to parse WebSocket message:', err);
      this.send(client.ws, { type: 'error', message: 'Invalid message format' });
    }
  }

  private handleAuth(client: WSClient, message: { apiKey?: string }): void {
    const config = getConfig();

    if (!config.enableAuth) {
      client.authenticated = true;
      this.send(client.ws, { type: 'auth', success: true });
      return;
    }

    if (message.apiKey === config.apiKey) {
      client.authenticated = true;
      this.send(client.ws, { type: 'auth', success: true });
    } else {
      this.send(client.ws, { type: 'auth', success: false, error: 'Invalid API key' });
    }
  }

  private handleSubscribe(client: WSClient, message: { channels?: string[] }): void {
    if (!client.authenticated) {
      this.send(client.ws, { type: 'error', message: 'Not authenticated' });
      return;
    }

    const channels = message.channels || [];
    for (const channel of channels) {
      client.subscriptions.add(channel);
    }

    this.send(client.ws, {
      type: 'subscribed',
      channels: Array.from(client.subscriptions)
    });
  }

  private handleUnsubscribe(client: WSClient, message: { channels?: string[] }): void {
    const channels = message.channels || [];
    for (const channel of channels) {
      client.subscriptions.delete(channel);
    }

    this.send(client.ws, {
      type: 'unsubscribed',
      channels: Array.from(client.subscriptions)
    });
  }

  private async handleGet(client: WSClient, message: { resource?: string }): Promise<void> {
    if (!client.authenticated) {
      this.send(client.ws, { type: 'error', message: 'Not authenticated' });
      return;
    }

    try {
      let data: unknown;

      switch (message.resource) {
        case 'snapshot':
          data = hardwareMonitor.getLastSnapshot() || await hardwareMonitor.poll();
          break;
        case 'cpu':
          data = await hardwareMonitor.getCPUData();
          break;
        case 'gpu':
          data = await hardwareMonitor.getGPUData();
          break;
        case 'memory':
          data = await hardwareMonitor.getMemoryData();
          break;
        case 'disks':
          data = await hardwareMonitor.getDiskData();
          break;
        case 'network':
          data = await hardwareMonitor.getNetworkData();
          break;
        case 'sensors':
          data = hardwareMonitor.getSensorReadings();
          break;
        case 'alerts':
          data = alertService.getAllAlerts();
          break;
        default:
          this.send(client.ws, { type: 'error', message: 'Unknown resource' });
          return;
      }

      this.send(client.ws, { type: 'data', resource: message.resource, data });
    } catch (err) {
      this.send(client.ws, { type: 'error', message: 'Failed to get resource' });
    }
  }

  private send(ws: WebSocket, data: unknown): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  private broadcast(channel: string, data: unknown): void {
    for (const client of this.clients.values()) {
      if (client.authenticated && client.subscriptions.has(channel)) {
        this.send(client.ws, data);
      }
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }

  close(): void {
    if (this.wss) {
      for (const client of this.clients.values()) {
        client.ws.close();
      }
      this.wss.close();
      this.wss = null;
      logger.info('WebSocket server closed');
    }
  }
}

export const wsAPI = new WebSocketAPI();
export default wsAPI;
