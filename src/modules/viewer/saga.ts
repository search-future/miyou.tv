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

import { all, put, select, takeLatest } from "redux-saga/effects";
import { AnyAction } from "redux";
import { NavigationActions, StackActions } from "react-navigation";

import { VIEWER_OPEN, VIEWER_CLOSE, VIEWER_SEARCH } from "./actions";
import { ProgramActions } from "../program";
import searchNavRoute from "../../utils/searchNavRoute";

function* openSaga() {
  const { nav } = yield select(({ nav }) => ({ nav }));
  const current = searchNavRoute(nav, "Viewer");
  if (!current) {
    yield put(StackActions.push({ routeName: "Viewer" }));
  }
}

function* closeSaga() {
  yield put(StackActions.pop({}));
}

function* searchSaga(action: AnyAction) {
  const { query = "" } = action;
  yield put(StackActions.popToTop({}));
  yield put(ProgramActions.update("list", { query }));
  yield put(NavigationActions.navigate({ routeName: "List" }));
}

export function* viewerSaga() {
  yield all([
    takeLatest(VIEWER_OPEN, openSaga),
    takeLatest(VIEWER_CLOSE, closeSaga),
    takeLatest(VIEWER_SEARCH, searchSaga)
  ]);
}
