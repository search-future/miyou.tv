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

import { SettingState } from "./setting";
import navigationRef from "../navigators/navigation";
import { ServiceState, COMMENT_READY } from "./service";
import { Program } from "../services/BackendService";
import moment from "../utils/moment-with-locale";

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
  let { count }: SettingState = yield select(({ file }) => file);
  const dateFormat = file.dateFormat || "YYMMDDHHmm";
  const programs: FileProgram[] = [];
  for (const uri of uris) {
    const basename = decodeURIComponent(uri.replace(/^.*[\/\\]/g, ""));
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
      id: String(count),
      type: "file",
      channel: channel.type,
      channelName: channel.id,
      title: normalizedName,
      fullTitle: basename,
      detail: uri,
      category: { code: 15, name: "etc" },
      duration: 0,
      start: time.isValid() ? time.toDate() : new Date(),
      end: time.isValid() ? time.toDate() : new Date(),
      preview: Platform.OS === "web" ? "" : uri,
      stream: uri
    });
    count++;
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
  if (navigationRef.current?.getCurrentRoute()?.name !== "file") {
    navigationRef.current?.navigate("file");
  }
}

export const FILE_UPDATE = "FILE_UPDATE";
function update(id: string, data: any) {
  return {
    type: FILE_UPDATE,
    id,
    data
  };
}

export const FILE_REMOVE = "FILE_REMOVE";
function remove(id: string) {
  return {
    type: FILE_REMOVE,
    id
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
  count: number;
};
const initilalState: FileState = {
  programs: [],
  count: 0
};
export default function fileReducer(state = initilalState, action: AnyAction) {
  switch (action.type) {
    case FILE_APPEND: {
      const programs = [...state.programs, ...action.programs];
      const count = state.count + action.programs.length;
      return { ...state, programs, count };
    }
    case FILE_UPDATE: {
      const programs = [...state.programs];
      const { id, data } = action;
      const index = programs.findIndex(a => a.id === id);
      programs[index] = { ...programs[index], ...data };
      return { ...state, programs };
    }
    case FILE_REMOVE: {
      const { id } = action;
      const programs = state.programs.filter(a => a.id !== id);
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
    for (const program of programs) {
      if (!program.channelName) {
        const { title } = program;
        const channel = commentChannels
          .filter(({ id }) => title.indexOf(id) >= 0)
          .pop();
        if (channel) {
          yield put(
            FileActions.update(program.id, {
              channel: channel.type,
              channelName: channel.id
            })
          );
        }
      }
    }
  }
}
