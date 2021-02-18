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

import { Store, AnyAction } from "redux";
import Toast from "react-native-root-toast";
import Mousetrap from "mousetrap";

import { FileActions } from "../../modules/file";
import { ServiceActions } from "../../modules/service";
import { SettingActions } from "../../modules/setting";
import { ViewerActions } from "../../modules/viewer";
import { WindowActions } from "../../modules/window";
import { toastOptions } from "../../config/constants";
import common from "./common";

export default function init(store: Store) {
  let mode: "stack" | "view" | "child";
  let boundsSettingName = "";
  document.addEventListener("dragover", e => e.preventDefault());
  document.body.addEventListener("drop", dropFileDispatcher);
  if (location.hash.indexOf("view") >= 0) {
    mode = "view";
  } else if (location.hash.indexOf("child") >= 0) {
    mode = "child";
    boundsSettingName = "childBounds";
  } else {
    mode = "stack";
    boundsSettingName = "bounds";
    window.addEventListener("beforeunload", () => {
      const win = window.remote.getCurrentWindow();
      win.removeAllListeners();
      const view = win.getBrowserView();
      if (view) {
        view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
        view.webContents.reload();
      }

      window.remote.BrowserWindow.getAllWindows()
        .sort(({ id: a }, { id: b }) => a - b)
        .slice(1)
        .forEach(({ isDestroyed, close }) => {
          !isDestroyed() && close();
        });
    });
    Mousetrap.bind("mod+r", () => {
      store.dispatch(ServiceActions.backendInit());
      store.dispatch(ServiceActions.commentInit());
      return false;
    });
    const { argv }: { argv: string[] } = window.remote.process;
    const paths = argv.slice(1).filter(a => a !== "." && window.fs.existsSync(a));
    if (paths.length > 0) {
      store.dispatch(FileActions.add(paths.map(path => `file://${path}`)));
    }
    common(store);
  }
  store.dispatch(ViewerActions.init(mode));

  const win = window.remote.getCurrentWindow();
  const windowStateDispatcher = () => {
    store.dispatch(
      WindowActions.update({
        alwaysOnTop: win.isAlwaysOnTop(),
        fullScreen: win.isFullScreen(),
        maximized: win.isMaximized(),
        minimized: win.isMinimized()
      })
    );
  };
  win
    .on("maximize", windowStateDispatcher)
    .on("unmaximize", windowStateDispatcher)
    .on("minimize", windowStateDispatcher)
    .on("restore", windowStateDispatcher)
    .on("enter-full-screen", windowStateDispatcher)
    .on("leave-full-screen", windowStateDispatcher)
    .on("always-on-top-changed", windowStateDispatcher);
  windowStateDispatcher();

  if (boundsSettingName) {
    const { setting } = store.getState();
    let boundsDispatcherId: number;
    const windowBoundsDispatcher = () => {
      if (boundsDispatcherId != null) {
        clearTimeout(boundsDispatcherId);
      }
      if (!win.isFullScreen() && !win.isMaximized()) {
        boundsDispatcherId = setTimeout(
          () =>
            store.dispatch(
              SettingActions.update(boundsSettingName, win.getBounds())
            ),
          500
        );
      }
    };
    win.on("resize", windowBoundsDispatcher).on("move", windowBoundsDispatcher);
    const bounds = setting[boundsSettingName] || {};
    win.setBounds({ ...win.getBounds(), ...bounds });
  }

  window.ipcRenderer.on("dispatch", ({}, data: string) => {
    const action = JSON.parse(data);
    store.dispatch(action);
  });

  Mousetrap.bind("esc", () => {
    dispatchWindow(WindowActions.setFullScreen(false));
  });
  Mousetrap.bind("mod+I", () => {
    win.webContents.toggleDevTools();
    return false;
  });
}

function dispatchWindow(action: AnyAction) {
  try {
    const win = window.remote.getCurrentWindow();
    const data = JSON.stringify(action);
    win.webContents.send("dispatch", data);
  } catch (e) {
    Toast.show(e.message || JSON.stringify(e, null, 2), {
      ...toastOptions,
      duration: Toast.durations.SHORT
    });
  }
}

function dropFileDispatcher({ dataTransfer }: DragEvent) {
  if (dataTransfer) {
    const { files } = dataTransfer;
    const uris = [];
    for (let i = 0; i < files.length; i++) {
      const file = files.item(i);
      if (file) {
        uris.push(`file://${file.path}`);
      }
    }
    dispatchWindow(FileActions.add(uris));
  }
}
