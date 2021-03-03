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

const viewer = {
  setViewSize: (layout: Electron.Rectangle) =>
    ipcRenderer.invoke("viewer-view-setsize", layout),
  hasWindow: () => {
    return ipcRenderer.invoke("viewer-haswindow");
  },
  createWindow: (onClose?: () => void) => {
    if (onClose) {
      ipcRenderer.once("viewer-window-closed", onClose);
    }
    return ipcRenderer.invoke("viewer-window-create");
  },
  showWindow: () => ipcRenderer.invoke("viewer-window-show"),
  hideWindow: () => ipcRenderer.invoke("viewer-window-hide"),
  closeWindow: () => ipcRenderer.invoke("viewer-window-close")
};
export default viewer;
