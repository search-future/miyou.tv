/*!
Copyright 2016-2025 Brazil Ltd.
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
import { PayloadAction } from "@reduxjs/toolkit";
import Toast from "react-native-root-toast";

import { ProgramActions } from "../program";
import { ServiceActions, ServiceState } from "../service";
import { SettingActions, SettingState } from "../setting";
import { WindowActions, WindowState } from "../window";
import { toastOptions } from "../../config/constants";
import { ViewerActions, ViewerState } from ".";
import navigationRef from "../../navigators/navigation";

function dispatchMain(action: PayloadAction<any>) {
  try {
    window.ipc.dispatchMain(action);
  } catch (e: any) {
    Toast.show(e.message || JSON.stringify(e, null, 2), {
      ...toastOptions,
      duration: Toast.durations.SHORT
    });
  }
}

function dispatchChild(action: PayloadAction<any>) {
  try {
    window.ipc.dispatchChild(action);
  } catch (e: any) {
    Toast.show(e.message || JSON.stringify(e, null, 2), {
      ...toastOptions,
      duration: Toast.durations.SHORT
    });
  }
}

function dispatchView(action: PayloadAction<any>) {
  try {
    window.ipc.dispatchView(action);
  } catch (e: any) {
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

function* openSaga(action: PayloadAction<any>) {
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
        yield take("viewer/ready");
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

function* closeSaga(action: PayloadAction<any>) {
  const { mode }: ViewerState = yield select(({ viewer }) => viewer);
  if (mode === "stack") {
    yield call(window.viewer.closeWindow);
    window.viewer.setViewSize({ x: 0, y: 0, width: 0, height: 0 });
    window.utils.stopPowerSaveBlocker();
  } else {
    dispatchMain(action);
  }
}

function* dockSaga(action: PayloadAction<any>) {
  const { mode }: ViewerState = yield select(({ viewer }) => viewer);
  if (mode === "stack") {
    yield put(SettingActions.update("docking", true));
    yield openSaga(action.payload);
  } else {
    dispatchMain(action);
  }
}

function* undockSaga(action: PayloadAction<any>) {
  const { mode }: ViewerState = yield select(({ viewer }) => viewer);
  if (mode === "stack") {
    dispatchView(ViewerActions.update({ playing: false }));
    yield put(SettingActions.update("docking", false));
    yield openSaga(action.payload);
  } else {
    dispatchMain(action);
  }
}

function* searchSaga(action: PayloadAction<string>) {
  const viewer: ViewerState = yield select(({ viewer }) => viewer);
  const { mode } = viewer;
  if (mode === "stack") {
    const query = action.payload;
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

function* updateSaga(action: PayloadAction<any>) {
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

function* windowSaga() {
  const window: WindowState = yield select(({ window }) => window);
  const viewer: ViewerState = yield select(({ viewer }) => viewer);
  const { mode } = viewer;

  if (mode === "stack") {
    dispatchView(WindowActions.update(window));
  }
}

export function* viewerSaga() {
  yield all([
    takeEvery("viewer/init", initSaga),
    takeEvery("viewer/open", openSaga),
    takeEvery("viewer/close", closeSaga),
    takeEvery("viewer/dock", dockSaga),
    takeEvery("viewer/undock", undockSaga),
    takeEvery("viewer/search", searchSaga),
    takeEvery("viewer/resize", resizeSaga),
    takeEvery("viewer/update", updateSaga),
    takeEvery("setting/update", settingSaga),
    takeEvery("window/update", windowSaga)
  ]);
}
