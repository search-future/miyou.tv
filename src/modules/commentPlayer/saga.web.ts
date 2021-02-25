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

import { all, put, select, takeLatest, throttle } from "redux-saga/effects";
import { AnyAction } from "redux";
import Toast from "react-native-root-toast";

import {
  COMMENT_PLAYER_INIT,
  COMMENT_PLAYER_LOAD,
  CommentPlayerActions,
  CommentInterval,
  CommentData
} from "./actions";
import { requestIntervals, requestComments } from "./service";
import { toastOptions } from "../../config/constants";

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

function dispatchViewer(action: AnyAction) {
  try {
    window.ipc.dispatchView(action);
    window.ipc.dispatchChild(action);
  } catch (e) {
    Toast.show(e.message || JSON.stringify(e, null, 2), {
      ...toastOptions,
      duration: Toast.durations.SHORT
    });
  }
}

function* initSaga(action: AnyAction) {
  const { mode } = yield select(({ viewer }) => viewer);
  if (mode === "stack") {
    const { channel, start, end } = action;
    const intervals: CommentInterval[] = yield requestIntervals(
      channel,
      start,
      end
    );
    for (const interval of intervals) {
      interval.isLoaded = false;
    }
    yield put(CommentPlayerActions.intervals(intervals));
    dispatchViewer(CommentPlayerActions.intervals(intervals));
  } else {
    dispatchMain(action);
  }
}

function* loadSaga(action: AnyAction) {
  const { time } = action;
  const { mode } = yield select(({ viewer }) => viewer);
  if (mode === "stack") {
    const data: CommentData[] = yield requestComments(time);
    dispatchViewer(CommentPlayerActions.push(data));
  } else {
    dispatchMain(action);
  }
}

export function* commentPlayerSaga() {
  yield all([
    takeLatest(COMMENT_PLAYER_INIT, initSaga),
    throttle(500, COMMENT_PLAYER_LOAD, loadSaga)
  ]);
}
