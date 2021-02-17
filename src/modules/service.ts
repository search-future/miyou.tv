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

import { all, delay, call, put, select, takeLatest } from "redux-saga/effects";
import { AnyAction } from "redux";
import Toast from "react-native-root-toast";

import {
  initBackendService,
  getBackendService,
  initCommentService,
  getCommentService
} from "../services";
import BackendService from "../services/BackendService";
import CommentService from "../services/CommentService";
import { LoadingActions } from "./loading";
import { SettingState } from "./setting";
import { toastOptions } from "../config/constants";
import { Platform } from "react-native";

const backendSettingBase = {
  streamType: Platform.OS === "web" ? "m2ts" : "mp4",
  streamParams: "c:v=copy&c:a=copy",
  previewParams: "size=1280x720"
};

export const BACKEND_INIT = "BACKEND_INIT";
function backendInit() {
  return {
    type: BACKEND_INIT
  };
}
function* backendInitSaga() {
  try {
    yield put(LoadingActions.start(true));
    const { backend: backendSetting = {} }: SettingState = yield select(
      ({ setting }) => setting
    );
    yield call(() =>
      initBackendService({
        ...backendSettingBase,
        ...backendSetting
      })
    );

    const backendService: BackendService = yield call(() =>
      getBackendService({
        ...backendSettingBase,
        ...backendSetting
      })
    );
    yield put(LoadingActions.complete());
    yield put(backendReady(backendService.hasArchive));
    const reloadIntervalSeconds = parseInt(
      backendSetting.reloadIntervalSeconds || "0",
      10
    );
    if (reloadIntervalSeconds > 10) {
      yield delay(reloadIntervalSeconds * 1000);
      yield put(backendInit());
    }
  } catch (e) {
    yield put(LoadingActions.complete());
    Toast.show(e.message || JSON.stringify(e, null, 2), {
      ...toastOptions,
      duration: Toast.durations.LONG
    });
  }
}

export const BACKEND_READY = "BACKEND_READY";
function backendReady(archiveActive = false) {
  return {
    type: BACKEND_READY,
    archiveActive
  };
}

export const COMMENT_INIT = "COMMENT_INIT";
function commentInit() {
  return {
    type: COMMENT_INIT
  };
}
function* commentInitSaga() {
  try {
    yield put(LoadingActions.start(true));
    const { comment: commentSetting = {} }: SettingState = yield select(
      ({ setting }) => setting
    );
    yield call(() => initCommentService(commentSetting));
    const commentService: CommentService = yield call(() =>
      getCommentService(commentSetting)
    );
    const channels: CommentChannel[] = yield call(() =>
      commentService.request("channels").then(({ status, data }) => {
        if (status === "OK" && Array.isArray(data.channels)) {
          return data.channels;
        }
        return [];
      })
    );
    const types = ["gr", "bs", "cs"];
    channels.sort((a, b) => {
      const aType = types.indexOf(a.type.slice(0, 2));
      const aNum = parseInt(a.type.slice(2), 10);
      const bType = types.indexOf(b.type.slice(0, 2));
      const bNum = parseInt(b.type.slice(2), 10);
      return (aType - bType) * 100 + (aNum - bNum);
    });
    yield put(LoadingActions.complete());
    yield put(commentReady(channels));
  } catch (e) {
    yield put(LoadingActions.complete());
    Toast.show(e.message || JSON.stringify(e, null, 2), {
      ...toastOptions,
      duration: Toast.durations.LONG
    });
  }
}

export const COMMENT_READY = "COMMENT_READY";
function commentReady(channels: CommentChannel[] = []) {
  return {
    type: COMMENT_READY,
    channels
  };
}

export const ServiceActions = {
  backendInit,
  backendReady,
  commentInit,
  commentReady
};

export type CommentChannel = {
  id: string;
  type: string;
};
export type ServiceState = {
  backendActive: boolean;
  archiveActive: boolean;
  commentActive: boolean;
  commentChannels: CommentChannel[];
};
const initialState: ServiceState = {
  backendActive: false,
  archiveActive: false,
  commentActive: false,
  commentChannels: []
};
export default function serviceReducer(
  state = initialState,
  action: AnyAction
) {
  switch (action.type) {
    case BACKEND_INIT: {
      return { ...state, backendActive: false, archiveActive: false };
    }
    case BACKEND_READY: {
      const { archiveActive } = action;
      return { ...state, backendActive: true, archiveActive };
    }
    case COMMENT_INIT: {
      return { ...state, commentActive: false, commentChannels: [] };
    }
    case COMMENT_READY: {
      const { channels: commentChannels } = action;
      return {
        ...state,
        commentActive: true,
        commentChannels
      };
    }
    default:
      return state;
  }
}

export function* serviceSaga() {
  yield all([
    takeLatest(BACKEND_INIT, backendInitSaga),
    takeLatest(COMMENT_INIT, commentInitSaga)
  ]);
}
