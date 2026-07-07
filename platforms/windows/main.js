// Electron desktop wrapper for CareFlow HIS Windows client
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    title: "CareFlow Hospital Information System",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    },
    icon: path.join(__dirname, 'assets', 'icon.ico')
  });

  // Load deployed web application
  mainWindow.loadURL('https://careflow-med-inky.vercel.app');

  // Open Developer Tools to see what is failing
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  // Configure premium, clean menu layout
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Refresh Dashboard', role: 'reload' },
        { label: 'Toggle Fullscreen', role: 'togglefullscreen' },
        { type: 'separator' },
        { label: 'Exit CareFlow', role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Zoom In', role: 'zoomIn' },
        { label: 'Zoom Out', role: 'zoomOut' },
        { label: 'Reset Zoom', role: 'resetZoom' }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
