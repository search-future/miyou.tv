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

import { BrowserWindow, ipcMain, DownloadItem } from "electron";
import electronDl from "electron-dl";

const { download } = electronDl;
electronDl({
  saveAs: true,
  openFolderWhenDone: true
});
let downloadItem: DownloadItem;
ipcMain.handle("download-request", async ({ sender }, { filename, url }) => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    try {
      await download(win, url, {
        filename,
        saveAs: true,
        openFolderWhenDone: true,
        onStarted: (item: DownloadItem) => {
          downloadItem = item;
          sender.send(`download-started`);
        },
        onCancel: () => {
          sender.send(`download-cancel`);
        },
        onProgress: (progress: electronDl.Progress) => {
          sender.send(`download-progress`, progress);
        }
      });
      sender.send(`download-success`);
    } catch (e) {
      sender.send(`download-failure`, e);
    }
  }
});
ipcMain.handle("download-abort", () => {
  downloadItem?.cancel();
});
