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

import { ipcRenderer } from "electron";

const dialog = {
  showMessageBox: (options: Electron.MessageBoxOptions) => {
    return ipcRenderer.invoke(
      "dialog-message",
      options
    ) as Promise<Electron.MessageBoxReturnValue>;
  },
  showErrorBox: (title: string, content: string) => {
    ipcRenderer.invoke("dialog-error", title, content);
  },
  showOpenDialog: (options: Electron.OpenDialogOptions) => {
    return ipcRenderer.invoke(
      "dialog-open",
      options
    ) as Promise<Electron.OpenDialogReturnValue>;
  },
  showSaveDialog: (options: Electron.SaveDialogOptions) => {
    return ipcRenderer.invoke(
      "dialog-save",
      options
    ) as Promise<Electron.SaveDialogReturnValue>;
  }
};
export default dialog;
