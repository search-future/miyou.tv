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
      window.win.closeAll();
    });
    Mousetrap.bind("mod+r", () => {
      store.dispatch(ServiceActions.backendInit());
      store.dispatch(ServiceActions.commentInit());
      return false;
    });

    (async () => {
      const argv = await window.utils.getArgv();
      const paths = argv
        .slice(1)
        .filter(a => a !== "." && window.utils.fileExists(a));
      if (paths.length > 0) {
        store.dispatch(FileActions.add(paths.map(path => `file://${path}`)));
      }
    })();
    common(store);
  }
  store.dispatch(ViewerActions.init(mode));

  const windowStateDispatcher = async () => {
    store.dispatch(
      WindowActions.update({
        alwaysOnTop: await window.win.isAlwaysOnTop(),
        fullScreen: await window.win.isFullScreen(),
        maximized: await window.win.isMaximized(),
        minimized: await window.win.isMinimized()
      })
    );
  };
  window.win.addStateListener(windowStateDispatcher);
  windowStateDispatcher();

  if (boundsSettingName) {
    const { setting } = store.getState();
    let boundsDispatcherId: number;
    const windowBoundsDispatcher = async () => {
      if (boundsDispatcherId != null) {
        clearTimeout(boundsDispatcherId);
      }
      if (
        !(await window.win.isFullScreen()) &&
        !(await window.win.isMaximized())
      ) {
        boundsDispatcherId = setTimeout(
          async () =>
            store.dispatch(
              SettingActions.update(
                boundsSettingName,
                await window.win.getBounds()
              )
            ),
          500
        );
      }
    };
    window.win.addBoundsListener(windowBoundsDispatcher);
    const bounds = setting[boundsSettingName] || {};
    (async () => {
      window.win.setBounds({ ...(await window.win.getBounds()), ...bounds });
    })();
  }

  window.ipc.addDispatchListener((data: string) => {
    const action = JSON.parse(data);
    store.dispatch(action);
  });

  Mousetrap.bind("esc", () => {
    dispatchWindow(WindowActions.setFullScreen(false));
  });
  Mousetrap.bind("mod+I", () => {
    window.utils.toggleDevTools();
    return false;
  });
}

function dispatchWindow(action: AnyAction) {
  try {
    window.ipc.dispatchWindow(action);
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
