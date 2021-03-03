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
import path from "path";

function getViewerWindow() {
  const [viewerWindow = null] = BrowserWindow.getAllWindows()
    .sort(({ id: a }, { id: b }) => a - b)
    .slice(1)
    .filter(a => !a.isDestroyed());
  return viewerWindow;
}

ipcMain.handle(
  "viewer-view-setsize",
  ({ sender }, bounds: Electron.Rectangle) => {
    const win = BrowserWindow.fromWebContents(sender);
    const view = win?.getBrowserView();
    view?.setBounds(bounds);
  }
);

ipcMain.handle("viewer-haswindow", () => {
  const win = getViewerWindow();
  return !!win;
});
ipcMain.handle("viewer-window-create", ({ sender }) => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 320,
    minHeight: 480,
    frame: false,
    show: false,
    webPreferences: {
      preload: path.join(app.getAppPath(), "dist/preload.js"),
      contextIsolation: true,
      plugins: true
    }
  });
  win.on("close", () => {
    sender.send("viewer-window-closed");
  });
  win.loadURL(`${sender.getURL()}#child`);
});
ipcMain.handle("viewer-window-show", () => {
  const win = getViewerWindow();
  win?.show();
});
ipcMain.handle("viewer-window-hide", () => {
  const win = getViewerWindow();
  win?.hide();
});
ipcMain.handle("viewer-window-close", () => {
  const win = getViewerWindow();
  win?.destroy();
});
