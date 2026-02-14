import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import notifier from 'node-notifier';
import type { Alert, AlertEvent, AlertAction, SensorReading } from '../types/hardware.js';
import { hardwareMonitor } from './hardware-monitor.js';
import { createChildLogger } from '../core/logger.js';

const logger = createChildLogger('alert-service');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ALERTS_PATH = path.join(__dirname, '../../config/alerts.json');

export class AlertService extends EventEmitter {
  private alerts: Map<string, Alert> = new Map();
  private alertHistory: AlertEvent[] = [];
  private cooldowns: Map<string, number> = new Map();

  constructor() {
    super();
    this.loadAlerts();
    this.setupMonitorListener();
  }

  private setupMonitorListener(): void {
    hardwareMonitor.on('readings', (readings: SensorReading[]) => {
      this.checkAlerts(readings);
    });
  }

  private loadAlerts(): void {
    try {
      if (fs.existsSync(ALERTS_PATH)) {
        const data = fs.readFileSync(ALERTS_PATH, 'utf-8');
        const parsed = JSON.parse(data) as Alert[];
        for (const alert of parsed) {
          this.alerts.set(alert.id, alert);
        }
        logger.info(`Loaded ${this.alerts.size} alerts`);
      }
    } catch (err) {
      logger.error('Failed to load alerts:', err);
    }
  }

  private saveAlerts(): void {
    try {
      const dir = path.dirname(ALERTS_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = Array.from(this.alerts.values());
      fs.writeFileSync(ALERTS_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Failed to save alerts:', err);
    }
  }

  private checkAlerts(readings: SensorReading[]): void {
    const now = Date.now();

    for (const reading of readings) {
      for (const alert of this.alerts.values()) {
        if (!alert.enabled) continue;
        if (!this.matchesSensorPath(reading, alert.sensorPath)) continue;

        const cooldownEnd = this.cooldowns.get(alert.id) || 0;
        if (now < cooldownEnd) continue;

        const triggered = this.evaluateCondition(reading.value, alert);

        if (triggered) {
          this.triggerAlert(alert, reading);
          this.cooldowns.set(alert.id, now + (alert.cooldown * 1000));
        }
      }
    }
  }

  private matchesSensorPath(reading: SensorReading, sensorPath: string): boolean {
    const readingPath = `${reading.source}.${reading.name}`;
    if (sensorPath === '*') return true;
    if (sensorPath.endsWith('*')) {
      return readingPath.startsWith(sensorPath.slice(0, -1));
    }
    return readingPath === sensorPath || reading.source === sensorPath;
  }

  private evaluateCondition(value: number, alert: Alert): boolean {
    switch (alert.condition) {
      case 'above':
        return value > alert.thresholdMax;
      case 'below':
        return value < alert.thresholdMin;
      case 'between':
        return value >= alert.thresholdMin && value <= alert.thresholdMax;
      case 'outside':
        return value < alert.thresholdMin || value > alert.thresholdMax;
      default:
        return false;
    }
  }

  private async triggerAlert(alert: Alert, reading: SensorReading): Promise<void> {
    const event: AlertEvent = {
      id: uuidv4(),
      alertId: alert.id,
      alertName: alert.name,
      sensorPath: `${reading.source}.${reading.name}`,
      value: reading.value,
      threshold: alert.condition === 'below' ? alert.thresholdMin : alert.thresholdMax,
      condition: alert.condition,
      timestamp: Date.now(),
      acknowledged: false
    };

    this.alertHistory.push(event);
    alert.lastTriggered = event.timestamp;
    alert.triggerCount++;
    this.saveAlerts();

    logger.warn(`Alert triggered: ${alert.name} - ${reading.name} = ${reading.value}${reading.unit}`);
    this.emit('alert', event);

    for (const action of alert.actions) {
      await this.executeAction(action, event, reading);
    }
  }

  private async executeAction(action: AlertAction, event: AlertEvent, reading: SensorReading): Promise<void> {
    try {
      switch (action.type) {
        case 'notification':
          notifier.notify({
            title: `Hardware Alert: ${event.alertName}`,
            message: `${reading.name}: ${reading.value}${reading.unit}`,
            sound: action.config.sound !== false,
            wait: false
          });
          break;

        case 'webhook':
          if (action.config.url) {
            await fetch(action.config.url as string, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ event, reading })
            });
          }
          break;

        case 'command':
          if (action.config.command) {
            const { exec } = await import('child_process');
            exec(action.config.command as string, (err) => {
              if (err) logger.error('Command execution failed:', err);
            });
          }
          break;

        case 'sound':
          break;

        case 'email':
          logger.info('Email action not implemented - requires SMTP configuration');
          break;
      }
    } catch (err) {
      logger.error(`Failed to execute action ${action.type}:`, err);
    }
  }

  createAlert(data: Omit<Alert, 'id' | 'lastTriggered' | 'triggerCount'>): Alert {
    const alert: Alert = {
      ...data,
      id: uuidv4(),
      lastTriggered: null,
      triggerCount: 0
    };

    this.alerts.set(alert.id, alert);
    this.saveAlerts();
    logger.info(`Created alert: ${alert.name}`);
    return alert;
  }

  updateAlert(id: string, updates: Partial<Alert>): Alert | null {
    const alert = this.alerts.get(id);
    if (!alert) return null;

    const updated = { ...alert, ...updates, id: alert.id };
    this.alerts.set(id, updated);
    this.saveAlerts();
    logger.info(`Updated alert: ${updated.name}`);
    return updated;
  }

  deleteAlert(id: string): boolean {
    const deleted = this.alerts.delete(id);
    if (deleted) {
      this.saveAlerts();
      logger.info(`Deleted alert: ${id}`);
    }
    return deleted;
  }

  getAlert(id: string): Alert | null {
    return this.alerts.get(id) || null;
  }

  getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }

  getAlertHistory(limit = 100): AlertEvent[] {
    return this.alertHistory.slice(-limit);
  }

  acknowledgeAlert(eventId: string): boolean {
    const event = this.alertHistory.find(e => e.id === eventId);
    if (event) {
      event.acknowledged = true;
      return true;
    }
    return false;
  }

  clearHistory(): void {
    this.alertHistory = [];
  }

  enableAlert(id: string): boolean {
    const alert = this.alerts.get(id);
    if (alert) {
      alert.enabled = true;
      this.saveAlerts();
      return true;
    }
    return false;
  }

  disableAlert(id: string): boolean {
    const alert = this.alerts.get(id);
    if (alert) {
      alert.enabled = false;
      this.saveAlerts();
      return true;
    }
    return false;
  }
}

export const alertService = new AlertService();
export default alertService;
