/*!
Copyright 2016-2020 Brazil Ltd.
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

import { all, put, select, take, takeEvery } from "redux-saga/effects";
import { AnyAction } from "redux";
import Toast from "react-native-root-toast";
import { remote, BrowserWindow, BrowserView } from "electron";

import {
  VIEWER_INIT,
  VIEWER_READY,
  VIEWER_OPEN,
  VIEWER_CLOSE,
  VIEWER_DOCK,
  VIEWER_UNDOCK,
  VIEWER_SEARCH,
  VIEWER_RESIZE,
  VIEWER_UPDATE,
  ViewerActions
} from "./actions";
import { ProgramActions } from "../program";
import { ServiceActions, ServiceState } from "../service";
import { SettingActions, SettingState, SETTING_UPDATE } from "../setting";
import { WindowActions } from "../window";
import { toastOptions } from "../../config/constants";
import { ViewerState } from ".";
import navigationRef from "../../navigators/navigation";

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

function dispatchMain(action: AnyAction) {
  try {
    const [win] = remote.BrowserWindow.getAllWindows().sort(
      ({ id: a }, { id: b }) => a - b
    );
    const data = JSON.stringify(action);
    win.webContents.send("dispatch", data);
  } catch (e) {
    Toast.show(e.message || JSON.stringify(e, null, 2), {
      ...toastOptions,
      duration: Toast.durations.SHORT
    });
  }
}

function dispatchViewer(child: BrowserWindow | BrowserView, action: AnyAction) {
  try {
    const data = JSON.stringify(action);
    child.webContents.send("dispatch", data);
  } catch (e) {
    Toast.show(e.message || JSON.stringify(e, null, 2), {
      ...toastOptions,
      duration: Toast.durations.SHORT
    });
  }
}

let powerSaveBlockerId: number | undefined;

function startPowerSaveBlocker() {
  const { powerSaveBlocker } = remote;
  powerSaveBlockerId = powerSaveBlocker.start("prevent-display-sleep");
}

function stopPowerSaveBlocker() {
  const { powerSaveBlocker } = remote;
  if (
    powerSaveBlockerId != null &&
    powerSaveBlocker.isStarted(powerSaveBlockerId)
  ) {
    powerSaveBlocker.stop(powerSaveBlockerId);
  }
}

function* initSaga() {
  const { mode }: ViewerState = yield select(({ viewer }) => viewer);
  if (mode !== "stack") {
    dispatchMain(ViewerActions.ready());
  }
}

function* openSaga(action: AnyAction) {
  const { mode }: ViewerState = yield select(({ viewer }) => viewer);
  if (mode === "stack") {
    const { docking = true } = yield select(({ setting }) => setting);
    const viewerView = getViewerView();
    let viewerWindow = getViewerWindow();
    if (docking) {
      if (viewerWindow) {
        viewerWindow.destroy();
      }
      if (viewerView) {
        const setting: SettingState = yield select(({ setting }) => setting);
        const { commentChannels }: ServiceState = yield select(
          ({ service }) => service
        );
        const { programs, index, layout }: ViewerState = yield select(
          ({ viewer }) => viewer
        );
        viewerView.setBounds(layout);
        dispatchViewer(viewerView, SettingActions.restore(setting));
        dispatchViewer(
          viewerView,
          ServiceActions.commentReady(commentChannels)
        );
        dispatchViewer(viewerView, ViewerActions.update({ programs, index }));
      }
    } else {
      if (viewerView) {
        viewerView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
      }
      if (!viewerWindow || viewerWindow.isDestroyed()) {
        viewerWindow = new remote.BrowserWindow({
          width: 800,
          height: 600,
          minWidth: 320,
          minHeight: 480,
          frame: false,
          show: false,
          webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
            plugins: true
          }
        });
        viewerWindow.on("close", () => {
          dispatchMain(ViewerActions.close());
        });
        viewerWindow.loadURL(`${location.href}#child`);
        yield take(VIEWER_READY);
      }
      if (!viewerWindow.isVisible()) {
        viewerWindow.show();
      }

      const setting: SettingState = yield select(({ setting }) => setting);
      const { commentChannels }: ServiceState = yield select(
        ({ service }) => service
      );
      const { programs, index }: ViewerState = yield select(
        ({ viewer }) => viewer
      );
      dispatchViewer(viewerWindow, SettingActions.restore(setting));
      dispatchViewer(
        viewerWindow,
        ServiceActions.commentReady(commentChannels)
      );
      dispatchViewer(viewerWindow, ViewerActions.update({ programs, index }));
    }
  } else {
    dispatchMain(action);
  }
}

function* closeSaga(action: AnyAction) {
  const { mode }: ViewerState = yield select(({ viewer }) => viewer);
  if (mode === "stack") {
    const viewerView = getViewerView();
    const viewerWindow = getViewerWindow();
    if (viewerView) {
      viewerView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
      dispatchViewer(viewerView, ViewerActions.update({ playing: false }));
    }
    if (viewerWindow) {
      viewerWindow.destroy();
    }
    stopPowerSaveBlocker();
  } else {
    dispatchMain(action);
  }
}

function* dockSaga(action: AnyAction) {
  const { mode }: ViewerState = yield select(({ viewer }) => viewer);
  if (mode === "stack") {
    yield put(SettingActions.update("docking", true));
    yield openSaga(action);
  } else {
    dispatchMain(action);
  }
}

function* undockSaga(action: AnyAction) {
  const { mode }: ViewerState = yield select(({ viewer }) => viewer);
  if (mode === "stack") {
    const viewerView = getViewerView();
    if (viewerView) {
      dispatchViewer(viewerView, ViewerActions.update({ playing: false }));
    }
    yield put(SettingActions.update("docking", false));
    yield openSaga(action);
  } else {
    dispatchMain(action);
  }
}

function* searchSaga(action: AnyAction) {
  const viewer: ViewerState = yield select(({ viewer }) => viewer);
  const { mode } = viewer;
  if (mode === "stack") {
    const { query = "" } = action;
    yield put(ProgramActions.update("list", { query, page: 1 }));
    navigationRef.current?.navigate("list");

    const { docking = true }: SettingState = yield select(
      ({ setting }) => setting
    );
    const { isOpened, stacking } = viewer;
    if (docking && isOpened && stacking) {
      yield put(ViewerActions.close());
    }
  } else {
    dispatchMain(action);
  }
}

function* resizeSaga() {
  const { mode }: ViewerState = yield select(({ viewer }) => viewer);
  if (mode === "stack") {
    const { docking = true }: SettingState = yield select(
      ({ setting }) => setting
    );
    const { isOpened, layout }: ViewerState = yield select(
      ({ viewer }) => viewer
    );
    if (docking && isOpened) {
      const viewerView = getViewerView();
      if (viewerView) {
        viewerView.setBounds(layout);
      }
    }
  }
}

function* updateSaga(action: AnyAction) {
  const viewer: ViewerState = yield select(({ viewer }) => viewer);
  const { mode, playing } = viewer;
  if (mode === "stack") {
    if (playing) {
      startPowerSaveBlocker();
    } else {
      stopPowerSaveBlocker();
    }
  } else {
    dispatchMain(action);
    if (mode === "child") {
      const { programs, index } = viewer;
      const program = programs[index];
      if (program) {
        yield put(WindowActions.setTitle(program.title));
      }
    }
  }
}

function* settingSaga() {
  const setting: SettingState = yield select(({ setting }) => setting);
  const viewer: ViewerState = yield select(({ viewer }) => viewer);
  const { mode } = viewer;

  if (mode === "stack") {
    const viewerView = getViewerView();
    const viewerWindow = getViewerWindow();
    if (viewerView) {
      dispatchViewer(viewerView, SettingActions.restore(setting));
    }
    if (viewerWindow) {
      dispatchViewer(viewerWindow, SettingActions.restore(setting));
    }
  } else {
    dispatchMain(SettingActions.restore(setting));
  }
}

export function* viewerSaga() {
  yield all([
    takeEvery(VIEWER_INIT, initSaga),
    takeEvery(VIEWER_OPEN, openSaga),
    takeEvery(VIEWER_CLOSE, closeSaga),
    takeEvery(VIEWER_DOCK, dockSaga),
    takeEvery(VIEWER_UNDOCK, undockSaga),
    takeEvery(VIEWER_SEARCH, searchSaga),
    takeEvery(VIEWER_RESIZE, resizeSaga),
    takeEvery(VIEWER_UPDATE, updateSaga),
    takeEvery(SETTING_UPDATE, settingSaga)
  ]);
}
