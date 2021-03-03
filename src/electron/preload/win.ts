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

const win = {
  setAlwaysOnTop: (enabled: boolean) => {
    ipcRenderer.invoke("window-alwaysontop", enabled);
  },
  setFullScreen: (enabled: boolean) => {
    ipcRenderer.invoke("window-fullscreen", enabled);
  },
  maximize: () => {
    ipcRenderer.invoke("window-maximize");
  },
  minimize: () => {
    ipcRenderer.invoke("window-minimize");
  },
  restore: () => {
    ipcRenderer.invoke("window-restore");
  },
  isAlwaysOnTop: () => ipcRenderer.invoke("window-is-alwaysontop"),
  isFullScreen: () => ipcRenderer.invoke("window-is-fullscreen"),
  isMaximized: () => ipcRenderer.invoke("window-is-maximized"),
  isMinimized: () => ipcRenderer.invoke("window-is-minimized"),
  setBounds: (bounds: Electron.Rectangle) => {
    ipcRenderer.invoke("window-setbounds", bounds);
  },
  getBounds: () => {
    return ipcRenderer.invoke("window-getbounds");
  },
  close: () => {
    ipcRenderer.invoke("window-close");
  },
  closeAll: () => {
    ipcRenderer.invoke("window-close-all");
  },
  addStateListener: (listener: () => void) => {
    ipcRenderer.on("window-state-changed", listener);
  },
  addBoundsListener: (listener: () => void) => {
    ipcRenderer.on("window-bounds-changed", listener);
  }
};
export default win;
