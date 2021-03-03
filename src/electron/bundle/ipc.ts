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

import { BrowserWindow, ipcMain } from "electron";

ipcMain.handle("dispatch-window", ({ sender }, data: string) => {
  const win = BrowserWindow.fromWebContents(sender);
  win?.webContents.send("dispatch", data);
});
ipcMain.handle("dispatch-main", (event, data: string) => {
  const [win] = BrowserWindow.getAllWindows().sort(
    ({ id: a }, { id: b }) => a - b
  );
  win?.webContents.send("dispatch", data);
});
ipcMain.handle("dispatch-child", (event, data: string) => {
  const [win = null] = BrowserWindow.getAllWindows()
    .sort(({ id: a }, { id: b }) => a - b)
    .slice(1)
  win?.webContents.send("dispatch", data);
});
ipcMain.handle("dispatch-view", ({ sender }, data: string) => {
  const win = BrowserWindow.fromWebContents(sender);
  const view = win?.getBrowserView();
  view?.webContents.send("dispatch", data);
});
