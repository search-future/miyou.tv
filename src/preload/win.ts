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

const win = {
  setAlwaysOnTop: (enabled: boolean) => {
    const win = remote.getCurrentWindow();
    win.setAlwaysOnTop(enabled);
  },
  setFullScreen: (enabled: boolean) => {
    const win = remote.getCurrentWindow();
    win.setFullScreen(enabled);
  },
  maximize: () => {
    const win = remote.getCurrentWindow();
    win.maximize();
  },
  minimize: () => {
    const win = remote.getCurrentWindow();
    win.minimize();
  },
  restore: () => {
    const win = remote.getCurrentWindow();
    win.restore();
  },
  isAlwaysOnTop: () => {
    const win = remote.getCurrentWindow();
    return win.isAlwaysOnTop();
  },
  isFullScreen: () => {
    const win = remote.getCurrentWindow();
    return win.isFullScreen();
  },
  isMaximized: () => {
    const win = remote.getCurrentWindow();
    return win.isMaximized();
  },
  isMinimized: () => {
    const win = remote.getCurrentWindow();
    return win.isMinimized();
  },
  setBounds: (bounds: Electron.Rectangle) => {
    const win = remote.getCurrentWindow();
    win.setBounds({ ...win.getBounds(), ...bounds });
  },
  getBounds: () => {
    const win = remote.getCurrentWindow();
    return win.getBounds();
  },
  close: () => {
    const win = remote.getCurrentWindow();
    win.close();
  },
  closeAll: () => {
    const win = remote.getCurrentWindow();
    win.removeAllListeners();
    const view = win.getBrowserView();
    if (view) {
      view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
      view.webContents.reload();
    }

    remote.BrowserWindow.getAllWindows()
      .sort(({ id: a }, { id: b }) => a - b)
      .slice(1)
      .forEach(({ isDestroyed, close }) => {
        !isDestroyed() && close();
      });
  },
  addStateListener: (listener: () => void) => {
    const win = remote.getCurrentWindow();
    win
      .on("maximize", listener)
      .on("unmaximize", listener)
      .on("minimize", listener)
      .on("restore", listener)
      .on("enter-full-screen", listener)
      .on("leave-full-screen", listener)
      .on("always-on-top-changed", listener);
  },
  addBoundsListener: (listener: () => void) => {
    const win = remote.getCurrentWindow();
    win.on("resize", listener).on("move", listener);
  }
};
export default win;
