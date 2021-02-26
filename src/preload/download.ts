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

import { ipcRenderer, IpcRendererEvent } from "electron";

type DownloadChannel =
  | "started"
  | "cancel"
  | "progress"
  | "success"
  | "failure";

const listeners: {
  started: ((event: IpcRendererEvent, ...args: any[]) => void)[];
  cancel: ((event: IpcRendererEvent, ...args: any[]) => void)[];
  progress: ((event: IpcRendererEvent, ...args: any[]) => void)[];
  success: ((event: IpcRendererEvent, ...args: any[]) => void)[];
  failure: ((event: IpcRendererEvent, ...args: any[]) => void)[];
} = {
  started: [],
  cancel: [],
  progress: [],
  success: [],
  failure: []
};

ipcRenderer.on("download-started", (event, ...args) => {
  for (const listner of listeners.started) {
    listner(event, ...args);
  }
});
ipcRenderer.on("download-cancel", (event, ...args) => {
  for (const listner of listeners.cancel) {
    listner(event, ...args);
  }
});
ipcRenderer.on("download-progress", (event, ...args) => {
  for (const listner of listeners.progress) {
    listner(event, ...args);
  }
});
ipcRenderer.on("download-success", (event, ...args) => {
  for (const listner of listeners.success) {
    listner(event, ...args);
  }
});
ipcRenderer.on("download-failure", (event, ...args) => {
  for (const listner of listeners.failure) {
    listner(event, ...args);
  }
});

const download = {
  request: (uri: string, filename: string) => {
    ipcRenderer.invoke("download-request", { filename, url: uri });
  },
  abort: () => {
    ipcRenderer.invoke("download-abort");
  },
  on: (
    channel: DownloadChannel,
    listener: (event: IpcRendererEvent, ...args: any[]) => void
  ) => {
    listeners[channel].push(listener);
  },
  off: (
    channel: DownloadChannel,
    listener: (event: IpcRendererEvent, ...args: any[]) => void
  ) => {
    listeners[channel] = listeners[channel].filter(a => a !== listener);
  }
};
export default download;
