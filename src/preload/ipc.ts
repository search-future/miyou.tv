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

import { ipcRenderer, remote } from "electron";
import { AnyAction } from "redux";

const ipc = {
  addDispatchListener: (listener: (data: string) => void) => {
    ipcRenderer.on("dispatch", (event, data) => {
      listener(data);
    });
  },
  dispatchWindow: (action: AnyAction) => {
    const win = remote.getCurrentWindow();
    const data = JSON.stringify(action);
    win.webContents.send("dispatch", data);
  },
  dispatchMain: (action: AnyAction) => {
    const [win] = remote.BrowserWindow.getAllWindows().sort(
      ({ id: a }, { id: b }) => a - b
    );
    const data = JSON.stringify(action);
    win.webContents.send("dispatch", data);
  },
  dispatchChild: (action: AnyAction) => {
    const [win = null] = remote.BrowserWindow.getAllWindows()
      .sort(({ id: a }, { id: b }) => a - b)
      .slice(1)
      .filter(({ isDestroyed }) => !isDestroyed());
    const data = JSON.stringify(action);
    win?.webContents.send("dispatch", data);
  },
  dispatchView: (action: AnyAction) => {
    const view = remote.getCurrentWindow().getBrowserView();
    const data = JSON.stringify(action);
    view?.webContents.send("dispatch", data);
  },
};
export default ipc;
