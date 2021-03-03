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

import { all, call, put, select, take, takeEvery } from "redux-saga/effects";
import { AnyAction } from "redux";
import Toast from "react-native-root-toast";

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

function dispatchMain(action: AnyAction) {
  try {
    window.ipc.dispatchMain(action);
  } catch (e) {
    Toast.show(e.message || JSON.stringify(e, null, 2), {
      ...toastOptions,
      duration: Toast.durations.SHORT
    });
  }
}

function dispatchChild(action: AnyAction) {
  try {
    window.ipc.dispatchChild(action);
  } catch (e) {
    Toast.show(e.message || JSON.stringify(e, null, 2), {
      ...toastOptions,
      duration: Toast.durations.SHORT
    });
  }
}

function dispatchView(action: AnyAction) {
  try {
    window.ipc.dispatchView(action);
  } catch (e) {
    Toast.show(e.message || JSON.stringify(e, null, 2), {
      ...toastOptions,
      duration: Toast.durations.SHORT
    });
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
    if (docking) {
      yield call(window.viewer.closeWindow);
      const setting: SettingState = yield select(({ setting }) => setting);
      const { commentChannels }: ServiceState = yield select(
        ({ service }) => service
      );
      const { programs, index, layout }: ViewerState = yield select(
        ({ viewer }) => viewer
      );
      yield call(() => window.viewer.setViewSize(layout));
      dispatchView(SettingActions.restore(setting));
      dispatchView(ServiceActions.commentReady(commentChannels));
      dispatchView(ViewerActions.update({ programs, index }));
    } else {
      yield call(() =>
        window.viewer.setViewSize({ x: 0, y: 0, width: 0, height: 0 })
      );
      if (!((yield call(window.viewer.hasWindow)) as boolean)) {
        yield call(() =>
          window.viewer.createWindow(() => {
            dispatchMain(ViewerActions.close());
          })
        );
        yield take(VIEWER_READY);
      }
      yield call(window.viewer.showWindow);

      const setting: SettingState = yield select(({ setting }) => setting);
      const { commentChannels }: ServiceState = yield select(
        ({ service }) => service
      );
      const { programs, index }: ViewerState = yield select(
        ({ viewer }) => viewer
      );
      dispatchChild(SettingActions.restore(setting));
      dispatchChild(ServiceActions.commentReady(commentChannels));
      dispatchChild(ViewerActions.update({ programs, index }));
    }
  } else {
    dispatchMain(action);
  }
}

function* closeSaga(action: AnyAction) {
  const { mode }: ViewerState = yield select(({ viewer }) => viewer);
  if (mode === "stack") {
    yield call(window.viewer.closeWindow);
    window.viewer.setViewSize({ x: 0, y: 0, width: 0, height: 0 });
    window.utils.stopPowerSaveBlocker();
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
    dispatchView(ViewerActions.update({ playing: false }));
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
      yield call(() => window.viewer.setViewSize(layout));
    }
  }
}

function* updateSaga(action: AnyAction) {
  const viewer: ViewerState = yield select(({ viewer }) => viewer);
  const { mode, playing } = viewer;
  if (mode === "stack") {
    if (playing) {
      window.utils.startPowerSaveBlocker();
    } else {
      window.utils.stopPowerSaveBlocker();
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
    dispatchView(SettingActions.restore(setting));
    dispatchChild(SettingActions.restore(setting));
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
