/*!
Copyright 2016-2023 Brazil Ltd.
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

const utils = {
  fileExists: (path: string) => ipcRenderer.invoke("file-exists", path),
  getArgv: () => ipcRenderer.invoke("argv") as Promise<string[]>,
  toggleDevTools: () => {
    ipcRenderer.invoke("devtool-toggle");
  },
  startPowerSaveBlocker: () => {
    ipcRenderer.invoke("powersaveblocker-start");
  },
  stopPowerSaveBlocker: () => {
    ipcRenderer.invoke("powersaveblocker-stop");
  },
  openExternal: (url: string) => {
    ipcRenderer.invoke("open-external", url);
  }
};

export default utils;
