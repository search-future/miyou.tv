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

import { all, put, takeLatest } from "redux-saga/effects";
import { PayloadAction } from "@reduxjs/toolkit";

import { ProgramActions } from "../program";
import navigationRef from "../../navigators/navigation";

function openSaga() {
  if (navigationRef.current?.getCurrentRoute()?.name !== "viewer") {
    navigationRef.current?.navigate("viewer");
  }
}

function closeSaga() {
  navigationRef.current?.goBack();
}

function* searchSaga(action: PayloadAction<string>) {
  yield put(ProgramActions.update("list", { query: action.payload }));
  navigationRef.current?.navigate("list");
}

export function* viewerSaga() {
  yield all([
    takeLatest("viewer/open", openSaga),
    takeLatest("viewer/close", closeSaga),
    takeLatest("viewer/search", searchSaga)
  ]);
}
