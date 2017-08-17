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
import { app, shell, BrowserWindow, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

declare namespace NodeJS {
  interface Global {
    contextMenu: Electron.Menu;
  }
}
declare const global: NodeJS.Global;

let win: Electron.BrowserWindow = null;
const nodeEnv: string = process.env.NODE_ENV;

try {
  require('electron-reload')(__dirname, {
    electron: (
      /^0/.test(process.versions.electron) ?
        require('electron-prebuilt') : process.execPath
    ),
  });
} catch (e) { }

if (process.platform === 'win32' && !process.env.VLC_PLUGIN_PATH) {
  process.env.VLC_PLUGIN_PATH = path.join(
    path.dirname(process.execPath),
    'node_modules/wcjs-prebuilt/bin/plugins',
  );
  try {
    fs.statSync(process.env.VLC_PLUGIN_PATH);
  } catch (e) {
    process.env.VLC_PLUGIN_PATH = path.resolve('node_modules/wcjs-prebuilt/bin/plugins');
  }
}

function buildAppMenu(): Electron.Menu {
  const template: Electron.MenuItemOptions[] = [];

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [{
        label: `${app.getName()}について`,
        role: 'about',
      }, {
        type: 'separator',
      }, {
        label: `${app.getName()}を隠す`,
        role: 'hide',
      }, {
        label: 'ほかを隠す',
        role: 'hideothers',
      }, {
        label: 'すべてを表示',
        role: 'unhide',
      }, {
        type: 'separator',
      }, {
        label: 'MiyouTVを終了',
        role: 'quit',
        click: (): void => app.quit(),
      }],
    });
  } else {
    template.push({
      label: 'ファイル',
      submenu: [{
        label: 'MiyouTVを終了',
        role: 'quit',
        click: (): void => app.quit(),
      }],
    });
  }
  template.push({
    label: '編集',
    submenu: [{
      label: '元に戻す',
      role: 'undo',
    }, {
      label: 'やり直す',
      role: 'redo',
    }, {
      type: 'separator',
    }, {
      label: '切り取り',
      role: 'cut',
    }, {
      label: 'コピー',
      role: 'copy',
    }, {
      label: '貼り付け',
      role: 'paste',
    }, {
      label: '削除',
      role: 'delete',
      click: (): void => win.webContents.delete(),
    }, {
      type: 'separator',
    }, {
      label: 'すべて選択',
      role: 'selectall',
    }],
  });
  template.push({
    label: '表示',
    submenu: [{
      label: 'MiyouTVを再読み込み',
      role: 'reload',
      accelerator: 'CmdOrCtrl+R',
      click: (): void => win.webContents.reload(),
    }, {
      label: '開発者ツール',
      role: 'toggledevtools',
      accelerator: 'CmdOrCtrl+Shift+I',
      click: (): void => win.webContents.toggleDevTools(),
    }, {
      type: 'separator',
    }, {
      label: '全画面表示',
      role: 'togglefullscreen',
      accelerator: 'F11',
      click: (): void => win.setFullScreen(!win.isFullScreen()),
    }],
  });
  template.push({
    label: 'ヘルプ',
    submenu: [{
      label: app.getName() + 'について',
      click: (): void => {
        shell.openExternal('http://miyou.tv');
      },
    }],
  });

  return Menu.buildFromTemplate(template);
}

function buildContextMenu(params?: Electron.ContextMenuParams): Electron.Menu {
  const noParams: boolean = typeof params !== 'object';
  const template: Electron.MenuItemOptions[] = [{
    label: '戻る',
    click: (): void => win.webContents.goBack(),
    visible: noParams || win.webContents.canGoBack(),
  }, {
    label: '進む',
    click: (): void => win.webContents.goForward(),
    visible: noParams || win.webContents.canGoForward(),
  }, {
    label: 'MiyouTVを再読み込み',
    role: 'reload',
    click: (): void => win.webContents.reload(),
  }, {
    type: 'separator',
  }, {
    label: '元に戻す',
    role: 'undo',
    visible: noParams || params.editFlags.canUndo,
  }, {
    label: 'やり直す',
    role: 'redo',
    visible: noParams || params.editFlags.canRedo,
  }, {
    type: 'separator',
    visible: noParams || params.editFlags.canUndo || params.editFlags.canRedo,
  }, {
    label: '切り取り',
    role: 'cut',
    visible: noParams || params.editFlags.canCut,
  }, {
    label: 'コピー',
    role: 'copy',
    visible: noParams || params.editFlags.canCopy,
  }, {
    label: '貼り付け',
    role: 'paste',
    visible: noParams || params.editFlags.canPaste,
  }, {
    label: '削除',
    role: 'delete',
    visible: noParams || params.editFlags.canDelete,
    click: (): void => win.webContents.delete(),
  }, {
    type: 'separator',
    visible: noParams || params.isEditable || params.editFlags.canCopy,
  }, {
    label: 'すべて選択',
    role: 'selectall',
    visible: noParams || params.editFlags.canSelectAll,
  }, {
    type: 'separator',
    visible: noParams || params.editFlags.canSelectAll,
  }, {
    label: 'MiyouTVを終了',
    role: 'quit',
    click: (): void => app.quit(),
  }];
  template.forEach((a: Electron.MenuItemOptions): void => {
    if (a.visible === false) {
      a.type = null;
      a.role = null;
    }
  });

  return Menu.buildFromTemplate(template);
}

function createWindow(): void {
  win = new BrowserWindow({
    width: 1440,
    height: 789,
    center: true,
    minWidth: 300,
    minHeight: 500,
    frame: false,
    autoHideMenuBar: true,
  });
  win.loadURL('file://' + path.join(__dirname, '/index.html'));

  win.on('closed', (): void => {
    win = null;
  });
  win.webContents.on(
    'context-menu',
    (e: Electron.Event, params: Electron.ContextMenuParams): void => {
      buildContextMenu(params).popup();
    },
  );

  Menu.setApplicationMenu(buildAppMenu());
  if (/^0/.test(process.versions.electron)) {
    global.contextMenu = buildContextMenu();
  }

  if (nodeEnv !== 'production') {
    win.webContents.openDevTools();
  }
}

app.on('ready', createWindow);

app.on('window-all-closed', (): void => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', (): void => {
  if (win === null) {
    createWindow();
  }
});
