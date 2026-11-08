'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// ─── Constants ────────────────────────────────────────────────────────────────
const IS_DEV = !app.isPackaged;
const BACKEND_PORT = 4000;
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;
const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');
const DB_DIR = path.join(app.getPath('userData'), 'database');
const BACKUP_DIR = path.join(app.getPath('userData'), 'backups');
const PROD_DB_PATH = path.join(DB_DIR, 'lekvanta.db');
const LOG_FILE = path.join(app.getPath('userData'), 'lekvanta-backend.log');

// Logging helper for desktop diagnostics
function writeLog(line) {
  const ts = new Date().toISOString();
  const entry = `[${ts}] ${line}\n`;
  try {
    fs.appendFileSync(LOG_FILE, entry);
  } catch (_) {}
  console.log(line);
}

// Source DB (bundled with app or dev location)
const SOURCE_DB_PATH = IS_DEV
  ? path.join(__dirname, '..', 'backend', 'prisma', 'lekvanta.db')
  : path.join(process.resourcesPath, 'backend', 'prisma', 'lekvanta.db');

// Active DB path used by backend
let ACTIVE_DB_PATH = IS_DEV ? SOURCE_DB_PATH : PROD_DB_PATH;

// ─── Backend Process ───────────────────────────────────────────────────────────
let backendProcess = null;
let mainWindow = null;

/**
 * Ensure user-data directories exist and copy initial SQLite DB if needed.
 */
function initUserData() {
  if (!IS_DEV) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    fs.mkdirSync(BACKUP_DIR, { recursive: true });

    writeLog(`[Init] Checking database at ${PROD_DB_PATH}`);
    const dbMissing = !fs.existsSync(PROD_DB_PATH);
    const dbEmpty = !dbMissing && fs.statSync(PROD_DB_PATH).size === 0;

    if (dbMissing || dbEmpty) {
      if (fs.existsSync(SOURCE_DB_PATH)) {
        try {
          fs.copyFileSync(SOURCE_DB_PATH, PROD_DB_PATH);
          fs.chmodSync(PROD_DB_PATH, 0o666);
          writeLog(`[Init] Successfully initialized database (${fs.statSync(PROD_DB_PATH).size} bytes) from ${SOURCE_DB_PATH}`);
        } catch (copyErr) {
          writeLog(`[Init:ERROR] Failed to copy database: ${copyErr.message}`);
        }
      } else {
        writeLog(`[Init:WARN] Bundled source DB not found at: ${SOURCE_DB_PATH}`);
      }
    } else {
      try {
        fs.chmodSync(PROD_DB_PATH, 0o666);
      } catch (_) {}
      writeLog(`[Init] Existing database found (${fs.statSync(PROD_DB_PATH).size} bytes)`);
    }
    ACTIVE_DB_PATH = PROD_DB_PATH;
  }
}

/**
 * Spawn the Express backend as a child process (production mode).
 * In dev mode the backend is already running via `npm run dev:backend`.
 */
function startBackend() {
  if (IS_DEV) {
    writeLog(`[Lekvanta] Dev mode — using existing backend on ${BACKEND_URL}`);
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const backendEntry = path.join(process.resourcesPath, 'backend', 'dist', 'index.js');
    const backendCwd = path.join(process.resourcesPath, 'backend');
    const prismaDir = path.join(backendCwd, 'prisma');
    const http = require('http');

    const normalizedDbUrl = `file:${ACTIVE_DB_PATH.replace(/\\/g, '/')}`;

    const env = {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      PORT: String(BACKEND_PORT),
      DATABASE_URL: normalizedDbUrl,
      JWT_SECRET: process.env.JWT_SECRET || 'lekvanta_offline_secure_secret_key_2026',
      JWT_EXPIRES_IN: '30d',
      FRONTEND_URL: BACKEND_URL,
      PRISMA_SCHEMA_PATH: path.join(prismaDir, 'schema.prisma'),
    };

    writeLog(`[Backend] Spawning node backend from ${backendEntry}`);
    writeLog(`[Backend] Database URL: ${normalizedDbUrl}`);

    backendProcess = spawn(process.execPath, [backendEntry], {
      env,
      cwd: app.getPath('userData'),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    backendProcess.stdout.on('data', (data) => {
      const msg = data.toString().trim();
      writeLog(`[backend] ${msg}`);
    });

    backendProcess.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      writeLog(`[backend:err] ${msg}`);
    });

    backendProcess.on('error', (err) => {
      writeLog(`[backend:fatal] Failed to spawn: ${err.message}`);
      reject(err);
    });

    backendProcess.on('exit', (code, signal) => {
      writeLog(`[backend:exit] Exited with code ${code}, signal ${signal}`);
      if (code !== 0 && code !== null) {
        dialog.showErrorBox(
          'Backend Service Error',
          `The local database service exited with code ${code}.\n\nDiagnostics log:\n${LOG_FILE}`
        );
      }
    });

    // Actively poll /api/health until backend and Prisma are confirmed ready
    let attempts = 0;
    const maxAttempts = 30; // 15 seconds max

    function checkHealth() {
      attempts++;
      const req = http.get(`${BACKEND_URL}/api/health`, (res) => {
        if (res.statusCode === 200) {
          writeLog(`[backend] Health check verified on attempt ${attempts}`);
          resolve();
        } else {
          retryOrTimeout();
        }
      });

      req.on('error', () => {
        retryOrTimeout();
      });

      req.setTimeout(800, () => {
        req.destroy();
        retryOrTimeout();
      });
    }

    function retryOrTimeout() {
      if (attempts < maxAttempts) {
        setTimeout(checkHealth, 500);
      } else {
        writeLog(`[backend:WARN] Health check timed out after ${maxAttempts} attempts. Launching window.`);
        resolve();
      }
    }

    setTimeout(checkHealth, 500);
  });
}

function stopBackend() {
  if (backendProcess) {
    writeLog('[Lekvanta] Stopping backend process...');
    backendProcess.kill('SIGTERM');
    backendProcess = null;
  }
}

// ─── Window Creation ───────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'Lekvanta',
    icon: fs.existsSync(path.join(__dirname, '..', 'frontend', 'public', 'favicon.ico')) ? path.join(__dirname, '..', 'frontend', 'public', 'favicon.ico') : path.join(__dirname, '..', 'frontend', 'public', 'favicon.svg'),
    backgroundColor: '#0f172a',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Remove default menu in production
  if (!IS_DEV) {
    Menu.setApplicationMenu(null);
  }

  const loadURL = IS_DEV ? 'http://localhost:5173' : BACKEND_URL;

  // Resilient load URL with automatic retry until Express is accepting connections
  let retries = 0;
  function tryLoadURL() {
    mainWindow.loadURL(loadURL).catch((err) => {
      console.log(`[Lekvanta] Waiting for server at ${loadURL}... (attempt ${retries + 1})`);
      if (retries < 15 && mainWindow && !mainWindow.isDestroyed()) {
        retries++;
        setTimeout(tryLoadURL, 1000);
      }
    });
  }
  tryLoadURL();

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.warn(`[Lekvanta] Load failed (${errorCode}): ${errorDescription}`);
    if (retries < 15 && mainWindow && !mainWindow.isDestroyed()) {
      retries++;
      setTimeout(tryLoadURL, 1000);
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (IS_DEV) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external link clicks — open in OS browser, not Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ─── App Lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  try {
    initUserData();
    await startBackend();
    createWindow();
  } catch (err) {
    console.error('[Lekvanta] Startup error:', err);
    dialog.showErrorBox('Startup Error', `Failed to start Lekvanta:\n${err.message}`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  autoBackupOnExit();
  stopBackend();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ─── Auto-Backup on Exit ───────────────────────────────────────────────────────
function autoBackupOnExit() {
  try {
    const settings = loadSettings();
    if (!settings.autoBackupOnExit) return;

    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dest = path.join(BACKUP_DIR, `lekvanta-backup-${ts}.db`);
    if (fs.existsSync(ACTIVE_DB_PATH)) {
      fs.copyFileSync(ACTIVE_DB_PATH, dest);
      console.log('[Lekvanta] Auto-backup saved to:', dest);
    }
  } catch (e) {
    console.error('[Lekvanta] Auto-backup failed:', e.message);
  }
}

// ─── Settings Helpers ──────────────────────────────────────────────────────────
function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    }
  } catch (_) { }
  return {
    defaultInvoicePrinter: '',
    thermalPrinter: '',
    thermalPaperWidth: '80mm',
    autoBackupOnExit: false,
    backupDir: BACKUP_DIR,
    defaultInvoiceFormat: 'A4',
    gstState: '',
  };
}

function saveSettings(settings) {
  fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

// App version
ipcMain.handle('app:get-version', () => app.getVersion());

// ── Database Info ──
ipcMain.handle('db:info', async () => {
  try {
    const stat = fs.existsSync(ACTIVE_DB_PATH)
      ? fs.statSync(ACTIVE_DB_PATH)
      : null;
    const sizeBytes = stat ? stat.size : 0;
    return {
      path: ACTIVE_DB_PATH,
      sizeKB: (sizeBytes / 1024).toFixed(1),
      sizeMB: (sizeBytes / (1024 * 1024)).toFixed(2),
    };
  } catch (err) {
    return { error: err.message };
  }
});

// ── Database Backup ──
ipcMain.handle('db:backup', async (_event, customDestPath) => {
  try {
    if (!fs.existsSync(ACTIVE_DB_PATH)) {
      return { success: false, error: 'Database file not found.' };
    }

    let destPath = customDestPath;

    if (!destPath) {
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const defaultName = `lekvanta-backup-${ts}.db`;
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Database Backup',
        defaultPath: path.join(BACKUP_DIR, defaultName),
        filters: [{ name: 'SQLite Database', extensions: ['db', 'bak', 'sqlite'] }],
      });
      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true };
      }
      destPath = result.filePath;
    }

    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(ACTIVE_DB_PATH, destPath);
    return { success: true, path: destPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── Database Restore ──
ipcMain.handle('db:restore', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Backup File to Restore',
      filters: [{ name: 'SQLite Database', extensions: ['db', 'bak', 'sqlite'] }],
      properties: ['openFile'],
    });

    if (result.canceled || !result.filePaths[0]) {
      return { success: false, canceled: true };
    }

    const srcPath = result.filePaths[0];

    // Validate SQLite header
    const fd = fs.openSync(srcPath, 'r');
    const header = Buffer.alloc(16);
    fs.readSync(fd, header, 0, 16, 0);
    fs.closeSync(fd);

    if (!header.toString('utf8', 0, 15).startsWith('SQLite format 3')) {
      return { success: false, error: 'The selected file is not a valid SQLite database.' };
    }

    // Confirm with user
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: 'Restore Database',
      message: 'This will replace your current database with the backup.\nAll unsaved data will be lost.',
      detail: `Restoring from:\n${srcPath}`,
      buttons: ['Cancel', 'Restore & Restart'],
      defaultId: 0,
      cancelId: 0,
    });

    if (response !== 1) {
      return { success: false, canceled: true };
    }

    // Backup current DB before overwriting
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const preRestoreBackup = path.join(BACKUP_DIR, `pre-restore-${ts}.db`);
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    if (fs.existsSync(ACTIVE_DB_PATH)) {
      fs.copyFileSync(ACTIVE_DB_PATH, preRestoreBackup);
    }

    // Overwrite
    fs.copyFileSync(srcPath, ACTIVE_DB_PATH);

    // Reload the app window
    if (mainWindow) {
      mainWindow.reload();
    }

    return { success: true, backedUpPrevious: preRestoreBackup };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── Printers ──
ipcMain.handle('printers:get', async () => {
  if (!mainWindow) return [];
  try {
    const printers = await mainWindow.webContents.getPrintersAsync();
    return printers.map((p) => ({
      name: p.name,
      displayName: p.displayName || p.name,
      isDefault: p.isDefault,
      status: p.status,
    }));
  } catch (err) {
    console.error('[printers:get]', err);
    return [];
  }
});

// ── Thermal Print ──
ipcMain.handle('print:thermal', async (_event, options) => {
  const { html, printerName, paperWidth = '80mm' } = options || {};
  if (!html) return { success: false, error: 'No HTML content provided.' };

  const mmWidth = paperWidth === '58mm' ? 58 : 80;

  return new Promise((resolve) => {
    const thermalWin = new BrowserWindow({
      width: mmWidth * 4,
      height: 600,
      show: false,
      webPreferences: { contextIsolation: true, nodeIntegration: false },
    });

    thermalWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    thermalWin.webContents.once('did-finish-load', () => {
      const printOptions = {
        silent: true,
        printBackground: true,
        margins: { marginType: 'none' },
        pageSize: { width: mmWidth * 1000, height: 297000 }, // microns
      };

      if (printerName) printOptions.deviceName = printerName;

      thermalWin.webContents.print(printOptions, (success, errorType) => {
        thermalWin.destroy();
        if (success) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: errorType });
        }
      });
    });

    thermalWin.webContents.on('did-fail-load', (_e, code, desc) => {
      thermalWin.destroy();
      resolve({ success: false, error: `Page load failed: ${desc}` });
    });
  });
});

// ── A4 / Document Print ──
ipcMain.handle('print:document', async (_event, options) => {
  const { html, printerName, silent = false, copies = 1 } = options || {};
  if (!html) return { success: false, error: 'No HTML content provided.' };

  return new Promise((resolve) => {
    const printWin = new BrowserWindow({
      width: 794,
      height: 1123,
      show: false,
      webPreferences: { contextIsolation: true, nodeIntegration: false },
    });

    printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    printWin.webContents.once('did-finish-load', () => {
      const printOptions = {
        silent,
        printBackground: true,
        copies,
        margins: { marginType: 'printableArea' },
        pageSize: 'A4',
      };

      if (printerName) printOptions.deviceName = printerName;

      printWin.webContents.print(printOptions, (success, errorType) => {
        printWin.destroy();
        resolve(success ? { success: true } : { success: false, error: errorType });
      });
    });
  });
});

// ── PDF Save ──
ipcMain.handle('pdf:save', async (_event, options) => {
  const { title = 'invoice', landscape = false } = options || {};

  if (!mainWindow) return { success: false, error: 'No main window.' };

  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Invoice as PDF',
      defaultPath: path.join(app.getPath('documents'), `${title}.pdf`),
      filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
    });

    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true };
    }

    const pdfBuffer = await mainWindow.webContents.printToPDF({
      printBackground: true,
      landscape,
      pageSize: 'A4',
      margins: { marginType: 'printableArea' },
    });

    await fs.promises.writeFile(result.filePath, pdfBuffer);
    return { success: true, path: result.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── Settings ──
ipcMain.handle('settings:get', () => loadSettings());

ipcMain.handle('settings:save', (_event, settings) => {
  try {
    saveSettings(settings);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── System Utilities ──
ipcMain.handle('system:open-path', (_event, filePath) => {
  shell.showItemInFolder(filePath);
  return { success: true };
});

ipcMain.handle('system:open-external', (_event, url) => {
  // Only allow http/https
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    shell.openExternal(url);
    return { success: true };
  }
  return { success: false, error: 'Only http/https URLs are allowed.' };
});

ipcMain.handle('system:open-log-file', () => {
  if (fs.existsSync(LOG_FILE)) {
    shell.showItemInFolder(LOG_FILE);
    return { success: true, path: LOG_FILE };
  }
  return { success: false, error: 'No diagnostics log file created yet.' };
});
