import { hardwareMonitor } from './services/hardware-monitor.js';
import { alertService } from './services/alert-service.js';
import { pluginManager } from './services/plugin-manager.js';
import { historyService } from './services/history.js';
import { apiServer } from './api/server.js';
import { loadConfig } from './core/config.js';
import { geminiAI } from './services/gemini-ai.js';
import { raspberryPiService } from './services/raspberry-pi.js';
import logger from './core/logger.js';

async function main(): Promise<void> {
  logger.info('Starting Cascade Hardware Monitor...');

  loadConfig();

  try {
    await apiServer.start();
    logger.info('API server started');

    await hardwareMonitor.start();
    logger.info('Hardware monitoring started');

    hardwareMonitor.on('snapshot', (snapshot) => {
      historyService.addSnapshot(snapshot);
    });

    await pluginManager.loadPlugins();
    await pluginManager.startAll();
    logger.info('Plugins loaded');

    await geminiAI.initialize();
    logger.info('Gemini AI service initialized');

    const isPi = await raspberryPiService.init();
    if (isPi) {
      const piInfo = raspberryPiService.getPiInfo();
      logger.info(`Raspberry Pi detected: ${piInfo?.model}`);
    }

    logger.info('Cascade Hardware Monitor is running');
    logger.info('API available at http://localhost:8085/api/v1');
    logger.info('WebSocket available at ws://localhost:8085');

  } catch (err) {
    logger.error('Failed to start:', err);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  logger.info('Shutting down...');
  hardwareMonitor.stop();
  await pluginManager.stopAll();
  await apiServer.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down...');
  hardwareMonitor.stop();
  await pluginManager.stopAll();
  await apiServer.stop();
  process.exit(0);
});

main();
