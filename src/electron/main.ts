import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { hardwareMonitor } from '../services/hardware-monitor.js';
import { alertService } from '../services/alert-service.js';
import { pluginManager } from '../services/plugin-manager.js';
import { apiServer } from '../api/server.js';
import { getConfig, updateConfig } from '../core/config.js';
import { createChildLogger } from '../core/logger.js';

const logger = createChildLogger('electron');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    icon: path.join(__dirname, '../../assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const config = getConfig();
  
  mainWindow.loadURL(`http://localhost:${config.apiPort}`);

  mainWindow.on('ready-to-show', () => {
    if (!config.startMinimized && mainWindow) {
      mainWindow.show();
    }
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray(): void {
  const iconPath = path.join(__dirname, '../../assets/tray-icon.png');
  let trayIcon: Electron.NativeImage;

  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) {
      trayIcon = nativeImage.createEmpty();
    }
  } catch {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('Cascade Hardware Monitor');

  updateTrayMenu();

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    }
  });

  setInterval(() => {
    updateTrayTooltip();
  }, 2000);
}

function updateTrayMenu(): void {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Dashboard',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Open in Browser',
      click: () => {
        const config = getConfig();
        shell.openExternal(`http://localhost:${config.apiPort}`);
      }
    },
    { type: 'separator' },
    {
      label: 'Start Monitoring',
      click: async () => {
        await hardwareMonitor.start();
        updateTrayMenu();
      },
      enabled: !hardwareMonitor.isActive()
    },
    {
      label: 'Stop Monitoring',
      click: () => {
        hardwareMonitor.stop();
        updateTrayMenu();
      },
      enabled: hardwareMonitor.isActive()
    },
    { type: 'separator' },
    {
      label: 'Settings',
      submenu: [
        {
          label: 'Start with Windows',
          type: 'checkbox',
          checked: getConfig().startWithWindows,
          click: (menuItem) => {
            updateConfig({ startWithWindows: menuItem.checked });
            setAutoLaunch(menuItem.checked);
          }
        },
        {
          label: 'Start Minimized',
          type: 'checkbox',
          checked: getConfig().startMinimized,
          click: (menuItem) => {
            updateConfig({ startMinimized: menuItem.checked });
          }
        }
      ]
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

function updateTrayTooltip(): void {
  if (!tray) return;

  const snapshot = hardwareMonitor.getLastSnapshot();
  if (!snapshot) {
    tray.setToolTip('Cascade Hardware Monitor - Starting...');
    return;
  }

  const cpuLoad = snapshot.cpu.load?.toFixed(1) || '0';
  const cpuTemp = snapshot.cpu.temperature?.toFixed(0) || 'N/A';
  const memUsed = ((snapshot.memory.used / snapshot.memory.total) * 100).toFixed(1);

  let gpuInfo = '';
  if (snapshot.gpu.length > 0 && snapshot.gpu[0].utilizationGpu !== undefined) {
    gpuInfo = `\nGPU: ${snapshot.gpu[0].utilizationGpu.toFixed(1)}%`;
    if (snapshot.gpu[0].temperature) {
      gpuInfo += ` | ${snapshot.gpu[0].temperature.toFixed(0)}°C`;
    }
  }

  tray.setToolTip(
    `Cascade Hardware Monitor\n` +
    `CPU: ${cpuLoad}% | ${cpuTemp}°C\n` +
    `RAM: ${memUsed}%${gpuInfo}`
  );
}

function setAutoLaunch(enable: boolean): void {
  app.setLoginItemSettings({
    openAtLogin: enable,
    path: app.getPath('exe')
  });
}

function setupIPC(): void {
  ipcMain.handle('get-snapshot', async () => {
    return hardwareMonitor.getLastSnapshot();
  });

  ipcMain.handle('get-config', () => {
    return getConfig();
  });

  ipcMain.handle('update-config', (_event, updates) => {
    return updateConfig(updates);
  });

  ipcMain.handle('get-alerts', () => {
    return alertService.getAllAlerts();
  });

  ipcMain.handle('get-plugins', () => {
    return pluginManager.getAllInstances();
  });

  ipcMain.handle('start-monitoring', async () => {
    await hardwareMonitor.start();
    return true;
  });

  ipcMain.handle('stop-monitoring', () => {
    hardwareMonitor.stop();
    return true;
  });
}

async function initialize(): Promise<void> {
  logger.info('Initializing Cascade Hardware Monitor...');

  try {
    await apiServer.start();
    logger.info('API server started');

    await hardwareMonitor.start();
    logger.info('Hardware monitoring started');

    await pluginManager.loadPlugins();
    await pluginManager.startAll();
    logger.info('Plugins loaded and started');

    hardwareMonitor.on('snapshot', () => {
      updateTrayMenu();
    });

    alertService.on('alert', (event) => {
      if (mainWindow) {
        mainWindow.webContents.send('alert', event);
      }
    });

  } catch (err) {
    logger.error('Initialization error:', err);
  }
}

app.whenReady().then(async () => {
  await initialize();
  await createWindow();
  createTray();
  setupIPC();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Don't quit on Windows/Linux, keep running in tray
  }
});

app.on('before-quit', async () => {
  isQuitting = true;
  hardwareMonitor.stop();
  await pluginManager.stopAll();
  await apiServer.stop();
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', reason);
});
