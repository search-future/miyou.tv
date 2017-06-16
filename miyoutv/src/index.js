var path = require('path');
var app;
var BrowserWindow;

var win;

/* eslint-disable */
if (/^0/.test(process.versions.electron)) {
  if (process.env.npm_lifecycle_script) {
    require('electron-reload')(__dirname, {
      electron: require('electron-prebuilt')
    });
  }
  app = require('app');
  BrowserWindow = require('browser-window');
} else {
  if (process.env.npm_lifecycle_script) {
    require('electron-reload')(__dirname, {
      electron: process.execPath
    });
  }
  app = require('electron').app;
  BrowserWindow = require('electron').BrowserWindow;
}
/* eslint-enable */

if (process.platform === 'win32' && !process.env.VLC_PLUGIN_PATH) {
  process.env.VLC_PLUGIN_PATH = path.join(
    path.dirname(process.env.npm_lifecycle_script ? '.' : process.execPath), 'node_modules/wcjs-prebuilt/bin/plugins'
  );
}

function createWindow() {
  win = new BrowserWindow({
    minWidth: 300,
    minHeight: 500,
    show: false
  });

  if (process.env.npm_lifecycle_script) {
    win.webContents.openDevTools();
  } else {
    win.setMenu(null);
  }

  win.loadURL('file://' + path.join(__dirname, '/index.html'));

  win.on('closed', function () {
    win = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (win === null) {
    createWindow();
  }
});
