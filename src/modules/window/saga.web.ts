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

import { AnyAction } from "redux";
import { all, takeLatest } from "redux-saga/effects";
import { remote } from "electron";

import {
  WINDOW_ALWAYSONTOP,
  WINDOW_FULLSCREEN,
  WINDOW_MAXIMIZE,
  WINDOW_MINIMIZE,
  WINDOW_RESTORE,
  WINDOW_CLOSE
} from "./actions";

function setAlwaysOnTopSaga(action: AnyAction) {
  const { enabled = true } = action;
  const win = remote.getCurrentWindow();
  win.setAlwaysOnTop(enabled);
}

function setFullScreenSaga(action: AnyAction) {
  const { enabled = true } = action;
  const win = remote.getCurrentWindow();
  win.setFullScreen(enabled);
}

function maximizeSaga() {
  const win = remote.getCurrentWindow();
  win.maximize();
}

function minimizeSaga() {
  const win = remote.getCurrentWindow();
  win.minimize();
}

function restoreSaga() {
  const win = remote.getCurrentWindow();
  win.restore();
}

function closeSaga() {
  const win = remote.getCurrentWindow();
  win.close();
}

export function* windowSaga() {
  yield all([
    takeLatest(WINDOW_ALWAYSONTOP, setAlwaysOnTopSaga),
    takeLatest(WINDOW_FULLSCREEN, setFullScreenSaga),
    takeLatest(WINDOW_MAXIMIZE, maximizeSaga),
    takeLatest(WINDOW_MINIMIZE, minimizeSaga),
    takeLatest(WINDOW_RESTORE, restoreSaga),
    takeLatest(WINDOW_CLOSE, closeSaga)
  ]);
}
