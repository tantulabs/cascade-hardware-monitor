import WebSocket from 'ws';
import type { Snapshot, UnifiedSensor } from './types';

export type WebSocketChannel = 'snapshot' | 'alerts' | 'readings';

export interface WebSocketOptions {
  host?: string;
  port?: number;
  reconnect?: boolean;
  reconnectInterval?: number;
}

export interface WebSocketMessage {
  type: string;
  data?: unknown;
  channels?: WebSocketChannel[];
  resource?: string;
}

export interface AlertEvent {
  id: string;
  name: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: number;
}

type SnapshotHandler = (snapshot: Snapshot) => void;
type AlertHandler = (alert: AlertEvent) => void;
type ReadingsHandler = (readings: UnifiedSensor[]) => void;
type ErrorHandler = (error: Error) => void;

/**
 * WebSocket client for real-time hardware monitoring updates
 * 
 * @example
 * ```typescript
 * const ws = new CascadeWebSocket();
 * 
 * ws.onSnapshot((snapshot) => {
 *   console.log(`CPU Load: ${snapshot.cpu.load}%`);
 * });
 * 
 * ws.connect();
 * ws.subscribe(['snapshot', 'alerts']);
 * ```
 */
export class CascadeWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnect: boolean;
  private reconnectInterval: number;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  
  private snapshotHandlers: SnapshotHandler[] = [];
  private alertHandlers: AlertHandler[] = [];
  private readingsHandlers: ReadingsHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];
  private connectHandlers: (() => void)[] = [];
  private disconnectHandlers: (() => void)[] = [];

  constructor(options: WebSocketOptions = {}) {
    const host = options.host || 'localhost';
    const port = options.port || 8085;
    this.url = `ws://${host}:${port}`;
    this.reconnect = options.reconnect ?? true;
    this.reconnectInterval = options.reconnectInterval ?? 5000;
  }

  /** Connect to the WebSocket server */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.ws = new WebSocket(this.url);

    this.ws.on('open', () => {
      this.connectHandlers.forEach(h => h());
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString()) as WebSocketMessage;
        this.handleMessage(message);
      } catch (err) {
        this.errorHandlers.forEach(h => h(err as Error));
      }
    });

    this.ws.on('close', () => {
      this.disconnectHandlers.forEach(h => h());
      if (this.reconnect) {
        this.scheduleReconnect();
      }
    });

    this.ws.on('error', (err) => {
      this.errorHandlers.forEach(h => h(err));
    });
  }

  /** Disconnect from the WebSocket server */
  disconnect(): void {
    this.reconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /** Subscribe to channels */
  subscribe(channels: WebSocketChannel[]): void {
    this.send({ type: 'subscribe', channels });
  }

  /** Unsubscribe from channels */
  unsubscribe(channels: WebSocketChannel[]): void {
    this.send({ type: 'unsubscribe', channels });
  }

  /** Request specific resource */
  get(resource: string): void {
    this.send({ type: 'get', resource });
  }

  /** Send ping */
  ping(): void {
    this.send({ type: 'ping' });
  }

  /** Register snapshot handler */
  onSnapshot(handler: SnapshotHandler): void {
    this.snapshotHandlers.push(handler);
  }

  /** Register alert handler */
  onAlert(handler: AlertHandler): void {
    this.alertHandlers.push(handler);
  }

  /** Register readings handler */
  onReadings(handler: ReadingsHandler): void {
    this.readingsHandlers.push(handler);
  }

  /** Register error handler */
  onError(handler: ErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /** Register connect handler */
  onConnect(handler: () => void): void {
    this.connectHandlers.push(handler);
  }

  /** Register disconnect handler */
  onDisconnect(handler: () => void): void {
    this.disconnectHandlers.push(handler);
  }

  /** Check if connected */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'snapshot':
        this.snapshotHandlers.forEach(h => h(message.data as Snapshot));
        break;
      case 'alert':
        this.alertHandlers.forEach(h => h(message.data as AlertEvent));
        break;
      case 'readings':
        this.readingsHandlers.forEach(h => h(message.data as UnifiedSensor[]));
        break;
      case 'pong':
        // Heartbeat response
        break;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectInterval);
  }
}
