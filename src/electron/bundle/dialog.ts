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

import { dialog, ipcMain } from "electron";

ipcMain.handle(
  "dialog-message",
  (event, options: Electron.MessageBoxOptions) => {
    return dialog.showMessageBox(options);
  }
);

ipcMain.handle("dialog-error", (event, title: string, content: string) => {
  return dialog.showErrorBox(title, content);
});

ipcMain.handle("dialog-open", (event, options: Electron.OpenDialogOptions) => {
  return dialog.showOpenDialog(options);
});

ipcMain.handle("dialog-save", (event, options: Electron.SaveDialogOptions) => {
  return dialog.showSaveDialog(options);
});
