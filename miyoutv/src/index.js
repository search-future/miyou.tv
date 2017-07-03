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
var app = require('electron').app;
var BrowserWindow = require('electron').BrowserWindow;

var path = require('path');
var fs = require('fs');

var win;
var nodeEnv = process.env.NODE_ENV;

/* eslint-disable */
try {
  require('electron-reload')(__dirname, {
    electron: /^0/.test(process.versions.electron) ? require('electron-prebuilt') : process.execPath
  });
} catch (e) {}
/* eslint-enable */

if (process.platform === 'win32' && !process.env.VLC_PLUGIN_PATH) {
  process.env.VLC_PLUGIN_PATH = path.join(path.dirname(process.execPath), 'node_modules/wcjs-prebuilt/bin/plugins');
  try {
    fs.statSync(process.env.VLC_PLUGIN_PATH);
  } catch (e) {
    process.env.VLC_PLUGIN_PATH = path.resolve('node_modules/wcjs-prebuilt/bin/plugins');
  }
}

function createWindow() {
  win = new BrowserWindow({
    minWidth: 300,
    minHeight: 500,
    show: nodeEnv !== 'production'
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
