/*!
Copyright 2016 Brazil Ltd.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
var path = require('path');
var app;
var BrowserWindow;

var win;
var nodeEnv = process.env.NODE_ENV;

/* eslint-disable */
if (/^0/.test(process.versions.electron)) {
  if (nodeEnv !== 'production') {
    require('electron-reload')(__dirname, {
      electron: require('electron-prebuilt')
    });
  }
  app = require('app');
  BrowserWindow = require('browser-window');
} else {
  if (nodeEnv !== 'production') {
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

  if (nodeEnv !== 'production') {
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
