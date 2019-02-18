/*!
Copyright 2016-2019 Brazil Ltd.
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

import { Store } from "redux";
import { remote } from "electron";
import Mousetrap from "mousetrap";

import { SettingActions } from "../../modules/setting";
import { WindowActions } from "../../modules/window";
import common from "./common";

export default function init(store: Store) {
  const { setting } = store.getState();
  const win = remote.getCurrentWindow();

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

  let boundsDispatcherId: number;
  const windowBoundsDispatcher = () => {
    if (boundsDispatcherId != null) {
      clearTimeout(boundsDispatcherId);
    }
    if (!win.isFullScreen() && !win.isMaximized()) {
      boundsDispatcherId = setTimeout(
        () => store.dispatch(SettingActions.update("bounds", win.getBounds())),
        500
      );
    }
  };
  win.on("resize", windowBoundsDispatcher).on("move", windowBoundsDispatcher);
  const { bounds = {} } = setting;
  win.setBounds({ ...win.getBounds(), ...bounds });

  window.addEventListener("beforeunload", () => {
    win.removeAllListeners();
  });

  Mousetrap.bind("esc", () => {
    store.dispatch(WindowActions.setFullScreen(false));
  });
  Mousetrap.bind("mod+I", () => {
    win.webContents.toggleDevTools();
    return false;
  });

  common(store);
}
