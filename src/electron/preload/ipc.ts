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
import { AnyAction } from "redux";

const ipc = {
  addDispatchListener: (listener: (data: string) => void) => {
    ipcRenderer.on("dispatch", (event, data) => {
      listener(data);
    });
  },
  dispatchWindow: (action: AnyAction) => {
    const data = JSON.stringify(action);
    ipcRenderer.invoke("dispatch-window", data);
  },
  dispatchMain: (action: AnyAction) => {
    const data = JSON.stringify(action);
    ipcRenderer.invoke("dispatch-main", data);
  },
  dispatchChild: (action: AnyAction) => {
    const data = JSON.stringify(action);
    ipcRenderer.invoke("dispatch-child", data);
  },
  dispatchView: (action: AnyAction) => {
    const data = JSON.stringify(action);
    ipcRenderer.invoke("dispatch-view", data);
  }
};
export default ipc;
