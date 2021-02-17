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

import { combineReducers } from "redux";
import { all, fork } from "redux-saga/effects";

import commentPlayerReducer, { commentPlayerSaga } from "./commentPlayer";
import fileReducer, { fileSaga } from "./file";
import loadingReducer from "./loading";
import navReducer from "./nav";
import networkReducer from "./network";
import playerReducer from "./player";
import programReducer, { programSaga } from "./program";
import serviceReducer, { serviceSaga } from "./service";
import settingReducer from "./setting";
import viewerReducer, { viewerSaga } from "./viewer";
import windowReducer, { windowSaga } from "./window";

const rootReducer = combineReducers({
  commentPlayer: commentPlayerReducer,
  file: fileReducer,
  loading: loadingReducer,
  nav: navReducer,
  network: networkReducer,
  player: playerReducer,
  program: programReducer,
  service: serviceReducer,
  setting: settingReducer,
  viewer: viewerReducer,
  window: windowReducer
});
export default rootReducer;

export type RootState = ReturnType<typeof rootReducer>;

export function* rootSaga() {
  yield all([
    fork(commentPlayerSaga),
    fork(fileSaga),
    fork(programSaga),
    fork(serviceSaga),
    fork(viewerSaga),
    fork(windowSaga)
  ]);
}
