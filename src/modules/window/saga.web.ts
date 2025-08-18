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

import { all, takeLatest } from "redux-saga/effects";
import { PayloadAction } from "@reduxjs/toolkit";

function setAlwaysOnTopSaga(action: PayloadAction<boolean>) {
  window.win.setAlwaysOnTop(action.payload);
}

function setFullScreenSaga(action: PayloadAction<boolean>) {
  window.win.setFullScreen(action.payload);
}

function maximizeSaga() {
  window.win.maximize();
}

function minimizeSaga() {
  window.win.minimize();
}

function restoreSaga() {
  window.win.restore();
}

function closeSaga() {
  window.win.close();
}

export function* windowSaga() {
  yield all([
    takeLatest("window/setAlwaysOnTop", setAlwaysOnTopSaga),
    takeLatest("window/setFullScreen", setFullScreenSaga),
    takeLatest("window/maximize", maximizeSaga),
    takeLatest("window/minimize", minimizeSaga),
    takeLatest("window/restore", restoreSaga),
    takeLatest("window/close", closeSaga)
  ]);
}
