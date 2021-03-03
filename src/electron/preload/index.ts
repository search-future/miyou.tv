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

import { contextBridge } from "electron";

import dialog from "./dialog";
import utils from "./utils";
import win from "./win";
import ipc from "./ipc";
import viewer from "./viewer";
import download from "./download";

declare global {
  interface Window {
    dialog: typeof dialog;
    utils: typeof utils;
    win: typeof win;
    ipc: typeof ipc;
    viewer: typeof viewer;
    download: typeof download;
  }
}

contextBridge.exposeInMainWorld("dialog", dialog);
contextBridge.exposeInMainWorld("utils", utils);
contextBridge.exposeInMainWorld("win", win);
contextBridge.exposeInMainWorld("ipc", ipc);
contextBridge.exposeInMainWorld("viewer", viewer);
contextBridge.exposeInMainWorld("download", download);
