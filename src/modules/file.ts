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

import { AnyAction } from "redux";
import {
  all,
  delay,
  put,
  select,
  take,
  takeEvery,
  takeLatest
} from "redux-saga/effects";
import { Platform } from "react-native";
import { NavigationState, StackActions } from "react-navigation";
import moment from "moment";

import { SettingState } from "./setting";
import { ServiceState, COMMENT_READY } from "./service";
import { Program } from "../services/BackendService";
import searchNavRoute from "../utils/searchNavRoute";

export const FILE_ADD = "FILE_ADD";
function add(uris: string[]) {
  return {
    type: FILE_ADD,
    uris
  };
}
function* addSaga(action: AnyAction & { uris: string[] }) {
  const { uris } = action;
  const { commentChannels }: ServiceState = yield select(
    ({ service }) => service
  );
  const { file = {} }: SettingState = yield select(({ setting }) => setting);
  const dateFormat = file.dateFormat || "YYMMDDHHmm";
  const programs: FileProgram[] = [];
  for (const uri of uris) {
    const basename = uri.replace(/^.*[\/\\]/g, "");
    const normalizedName = basename
      .replace(/\.[^.]+$/, "")
      .replace(/[！-～]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
      .replace("　", " ");
    const channel = commentChannels
      .filter(({ id }) => normalizedName.indexOf(id) >= 0)
      .pop() || { id: "", type: "" };
    let time = moment(normalizedName, dateFormat);
    for (const dateFormat of ["YYYYMMDDHHmm", "YYMMDDHHmm", "MMDDHHmm"]) {
      if (time.isValid()) {
        break;
      }
      time = moment(normalizedName, dateFormat);
    }
    programs.push({
      id: normalizedName,
      type: "file",
      channel: channel.type,
      channelName: channel.id,
      title: basename,
      fullTitle: basename,
      detail: uri,
      category: { code: 15, name: "etc" },
      duration: 0,
      start: time.isValid() ? time.toDate() : new Date(),
      end: time.isValid() ? time.toDate() : new Date(),
      preview: Platform.OS === "web" ? "" : uri,
      stream: uri
    });
  }
  if (programs.length > 0) {
    yield put(append(programs));
  }
}

export const FILE_APPEND = "FILE_APPEND";
function append(programs: FileProgram[]) {
  return {
    type: FILE_APPEND,
    programs
  };
}
function* appendSaga() {
  yield delay(500);
  const nav: NavigationState = yield select(({ nav }) => nav);
  const current = searchNavRoute(nav, "File");
  if (!current) {
    yield put(StackActions.push({ routeName: "File" }));
  }
}

export const FILE_UPDATE = "FILE_UPDATE";
function update(index: number, data: any) {
  return {
    type: FILE_UPDATE,
    index,
    data
  };
}

export const FILE_REMOVE = "FILE_REMOVE";
function remove(index: number) {
  return {
    type: FILE_REMOVE,
    index
  };
}

export const FileActions = {
  add,
  append,
  update,
  remove
};

export type FileProgram = Program;
export type FileState = {
  programs: FileProgram[];
};
const initilalState: FileState = {
  programs: []
};
export default function fileReducer(state = initilalState, action: AnyAction) {
  switch (action.type) {
    case FILE_APPEND: {
      const programs = [...state.programs, ...action.programs];
      return { ...state, programs };
    }
    case FILE_UPDATE: {
      const programs = [...state.programs];
      const { index, data } = action;
      programs[index] = { ...programs[index], ...data };
      return { ...state, programs };
    }
    case FILE_REMOVE: {
      const { index } = action;
      const programs = state.programs.filter(({}, i) => i !== index);
      return { ...state, programs };
    }
    default:
      return state;
  }
}

export function* fileSaga() {
  yield all([
    takeEvery(FILE_ADD, addSaga),
    takeLatest(FILE_APPEND, appendSaga)
  ]);
  const { commentActive }: ServiceState = yield select(
    ({ service }) => service
  );
  if (!commentActive) {
    yield take(COMMENT_READY);
    const { commentChannels }: ServiceState = yield select(
      ({ service }) => service
    );
    const { programs }: FileState = yield select(({ file }) => file);
    for (let i = 0; i < programs.length; i++) {
      const program = programs[i];
      if (!program.channelName) {
        const { id: normalizedName } = program;
        const channel = commentChannels
          .filter(({ id }) => normalizedName.indexOf(id) >= 0)
          .pop();
        if (channel) {
          yield put(
            FileActions.update(i, {
              channel: channel.type,
              channelName: channel.id
            })
          );
        }
      }
    }
  }
}
