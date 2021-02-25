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

import { remote } from "electron";
import path from "path";

function getViewerView() {
  const win = remote.getCurrentWindow();
  const viewerView = win.getBrowserView();
  return viewerView;
}

function getViewerWindow() {
  const [viewerWindow = null] = remote.BrowserWindow.getAllWindows()
    .sort(({ id: a }, { id: b }) => a - b)
    .slice(1)
    .filter(({ isDestroyed }) => !isDestroyed());
  return viewerWindow;
}

const viewer = {
  setViewSize: (layout: Electron.Rectangle) => {
    const view = getViewerView();
    view?.setBounds(layout);
  },
  hasWindow: () => {
    const win = getViewerWindow();
    return win && !win.isDestroyed();
  },
  createWindow: (onClose?: () => void) => {
    const win = new remote.BrowserWindow({
      width: 800,
      height: 600,
      minWidth: 320,
      minHeight: 480,
      frame: false,
      show: false,
      webPreferences: {
        preload: path.join(remote.app.getAppPath(), "dist/preload.js"),
        contextIsolation: false,
        enableRemoteModule: true,
        plugins: true
      }
    });
    if (onClose) {
      win.on("close", onClose);
    }
    win.loadURL(`${location.href}#child`);
  },
  showWindow: () => {
    const win = getViewerWindow();
    win?.show();
  },
  hideWindow: () => {
    const win = getViewerWindow();
    win?.hide();
  },
  closeWindow: () => {
    const win = getViewerWindow();
    win?.destroy();
  }
};
export default viewer;
