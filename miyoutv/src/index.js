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
var shell = require('electron').shell;
var BrowserWindow = require('electron').BrowserWindow;
var Menu = require('electron').Menu;

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

function buildAppMenu() {
  var template = [];

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [{
        label: app.getName() + 'について',
        role: 'about'
      }, {
        type: 'separator'
      }, {
        label: app.getName() + 'を隠す',
        role: 'hide'
      }, {
        label: 'ほかを隠す',
        role: 'hideothers'
      }, {
        label: 'すべてを表示',
        role: 'unhide'
      }, {
        type: 'separator'
      }, {
        label: 'MiyouTVを終了',
        role: 'quit',
        click: function () {
          app.quit();
        }
      }]
    });
  } else {
    template.push({
      label: 'ファイル',
      submenu: [{
        label: 'MiyouTVを終了',
        role: 'quit',
        click: function () {
          app.quit();
        }
      }]
    });
  }
  template.push({
    label: '編集',
    submenu: [{
      label: '元に戻す',
      role: 'undo'
    }, {
      label: 'やり直す',
      role: 'redo'
    }, {
      type: 'separator'
    }, {
      label: '切り取り',
      role: 'cut'
    }, {
      label: 'コピー',
      role: 'copy'
    }, {
      label: '貼り付け',
      role: 'paste'
    }, {
      label: '削除',
      role: 'delete',
      click: function () {
        win.webContents.delete();
      }
    }, {
      type: 'separator'
    }, {
      label: 'すべて選択',
      role: 'selectall'
    }]
  });
  template.push({
    label: '表示',
    submenu: [{
      label: 'MiyouTVを再読み込み',
      role: 'reload',
      key: 'CmdOrCtrl+R',
      click: function () {
        win.webContents.reload();
      }
    }, {
      label: '開発者ツール',
      role: 'toggledevtools',
      key: 'CmdOrCtrl+Shift+I',
      click: function () {
        win.webContents.toggleDevTools();
      }
    }, {
      type: 'separator'
    }, {
      label: '全画面表示',
      role: 'togglefullscreen',
      key: 'F11',
      click: function () {
        win.setFullScreen(!win.isFullScreen());
      }
    }]
  });
  template.push({
    label: 'ヘルプ',
    submenu: [{
      label: app.getName() + 'について',
      click: function () {
        shell.openExternal('http://miyou.tv');
      }
    }]
  });

  return Menu.buildFromTemplate(template);
}

function buildContextMenu(params) {
  var noParams = typeof params !== 'object';
  var template = [{
    label: '戻る',
    click: function () {
      win.webContents.goBack();
    },
    visible: noParams || win.webContents.canGoBack()
  }, {
    label: '進む',
    click: function () {
      win.webContents.goForward();
    },
    visible: noParams || win.webContents.canGoForward()
  }, {
    label: 'MiyouTVを再読み込み',
    role: 'reload',
    click: function () {
      win.webContents.reload();
    }
  }, {
    type: 'separator'
  }, {
    label: '元に戻す',
    role: 'undo',
    visible: noParams || params.editFlags.canUndo
  }, {
    label: 'やり直す',
    role: 'redo',
    visible: noParams || params.editFlags.canRedo
  }, {
    type: 'separator',
    visible: noParams || params.editFlags.canUndo || params.editFlags.canRedo
  }, {
    label: '切り取り',
    role: 'cut',
    visible: noParams || params.editFlags.canCut
  }, {
    label: 'コピー',
    role: 'copy',
    visible: noParams || params.editFlags.canCopy
  }, {
    label: '貼り付け',
    role: 'paste',
    visible: noParams || params.editFlags.canPaste
  }, {
    label: '削除',
    role: 'delete',
    visible: noParams || params.editFlags.canDelete,
    click: function () {
      win.webContents.delete();
    }
  }, {
    type: 'separator',
    visible: noParams || params.isEditable || params.editFlags.canCopy
  }, {
    label: 'すべて選択',
    role: 'selectall',
    visible: noParams || params.editFlags.canSelectAll
  }, {
    type: 'separator',
    visible: noParams || params.editFlags.canSelectAll
  }, {
    label: 'MiyouTVを終了',
    role: 'quit',
    click: function () {
      app.quit();
    }
  }];
  template.forEach(function (a) {
    var item = a;

    if (item.visible === false) {
      item.type = null;
      item.role = null;
    }
  });

  return Menu.buildFromTemplate(template);
}

function createWindow() {
  win = new BrowserWindow({
    minWidth: 300,
    minHeight: 500,
    autoHideMenuBar: true,
    show: nodeEnv !== 'production'
  });

  if (nodeEnv !== 'production') {
    win.webContents.openDevTools();
  }

  win.loadURL('file://' + path.join(__dirname, '/index.html'));

  win.on('closed', function () {
    win = null;
  });
  win.webContents.on('context-menu', function (e, params) {
    buildContextMenu(params).popup();
  });

  Menu.setApplicationMenu(buildAppMenu());
  if (/^0/.test(process.versions.electron)) {
    global.contextMenu = buildContextMenu();
  }
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
