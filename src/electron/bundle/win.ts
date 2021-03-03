/*!
Copyright 2016-2021 Brazil Ltd.
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

import { app, BrowserWindow, ipcMain } from "electron";

ipcMain.handle("window-alwaysontop", ({ sender }, enabled: boolean) => {
  const win = BrowserWindow.fromWebContents(sender);
  win?.setAlwaysOnTop(enabled);
});
ipcMain.handle("window-fullscreen", ({ sender }, enabled: boolean) => {
  const win = BrowserWindow.fromWebContents(sender);
  win?.setFullScreen(enabled);
});
ipcMain.handle("window-maximize", ({ sender }) => {
  const win = BrowserWindow.fromWebContents(sender);
  win?.maximize();
});
ipcMain.handle("window-minimize", ({ sender }) => {
  const win = BrowserWindow.fromWebContents(sender);
  win?.minimize();
});
ipcMain.handle("window-restore", ({ sender }) => {
  const win = BrowserWindow.fromWebContents(sender);
  win?.restore();
});
ipcMain.handle("window-is-alwaysontop", ({ sender }) => {
  const win = BrowserWindow.fromWebContents(sender);
  return win?.isAlwaysOnTop();
});
ipcMain.handle("window-is-fullscreen", ({ sender }) => {
  const win = BrowserWindow.fromWebContents(sender);
  return win?.isFullScreen();
});
ipcMain.handle("window-is-maximized", ({ sender }) => {
  const win = BrowserWindow.fromWebContents(sender);
  return win?.isMaximized();
});
ipcMain.handle("window-is-minimized", ({ sender }) => {
  const win = BrowserWindow.fromWebContents(sender);
  return win?.isMinimized();
});
ipcMain.handle("window-setbounds", ({ sender }, bounds: Electron.Rectangle) => {
  const win = BrowserWindow.fromWebContents(sender);
  win?.setBounds({ ...win?.getBounds(), ...bounds });
});
ipcMain.handle("window-getbounds", ({ sender }) => {
  const win = BrowserWindow.fromWebContents(sender);
  return win?.getBounds();
});
ipcMain.handle("window-close", ({ sender }) => {
  const win = BrowserWindow.fromWebContents(sender);
  win?.close();
});
ipcMain.handle("window-close-all", ({ sender }) => {
  const win = BrowserWindow.fromWebContents(sender);
  win?.removeAllListeners();
  const view = win?.getBrowserView();
  if (view) {
    view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
    view.webContents.reload();
  }

  BrowserWindow.getAllWindows()
    .sort(({ id: a }, { id: b }) => a - b)
    .slice(1)
    .forEach(a => {
      !a.isDestroyed() && a.close();
    });
});

app.on("web-contents-created", (event, webContents) => {
  webContents.on("dom-ready", () => {
    const win = BrowserWindow.fromWebContents(webContents);
    const stateListener = () => {
      win?.webContents.send("window-state-changed");
    };
    const resizeListener = () => {
      win?.webContents.send("window-bounds-changed");
    };
    if (win != null) {
      win
        .on("maximize", stateListener)
        .on("unmaximize", stateListener)
        .on("minimize", stateListener)
        .on("restore", stateListener)
        .on("enter-full-screen", stateListener)
        .on("leave-full-screen", stateListener)
        .on("always-on-top-changed", stateListener);
      win.on("resize", resizeListener).on("move", resizeListener);
    }
  });
});
