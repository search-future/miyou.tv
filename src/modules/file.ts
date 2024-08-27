/*!
Copyright 2016-2023 Brazil Ltd.
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

import { PayloadAction, createSlice } from "@reduxjs/toolkit";
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
import { ServiceState } from "./service";
import { Program } from "../services/BackendService";
import moment from "../utils/moment-with-locale";

export type FileProgram = Program;
export type FileState = {
  programs: FileProgram[];
  count: number;
};
const initialState: FileState = {
  programs: [],
  count: 0
};
const fileSlice = createSlice({
  name: "file",
  initialState,
  reducers: {
    add: (state, action: PayloadAction<string[]>) => state,
    append: (state, action: PayloadAction<FileProgram[]>) => {
      const programs = [...state.programs, ...action.payload];
      const count = state.count + action.payload.length;
      return { programs, count };
    },
    update: {
      reducer: (state, action) => {
        const programs = [...state.programs];
        const { id, data } = action.payload;
        const index = programs.findIndex(a => a.id === id);
        programs[index] = { ...programs[index], ...data };
        return { ...state, programs };
      },
      prepare: (id: string, data: Partial<FileProgram>) => ({
        payload: { id, data },
        meta: null,
        error: null
      })
    },
    remove: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const programs = state.programs.filter(a => a.id !== id);
      return { ...state, programs };
    }
  }
});

export const FileActions = fileSlice.actions;
export default fileSlice.reducer;

function* addSaga(action: PayloadAction<string[]>) {
  const uris = action.payload;
  const { commentChannels }: ServiceState = yield select(
    ({ service }) => service
  );
  const { file = {} }: SettingState = yield select(({ setting }) => setting);
  let { count }: SettingState = yield select(({ file }) => file);
  const dateFormat = file.dateFormat || "YYMMDDHHmm";
  const programs: FileProgram[] = [];
  for (const uri of uris) {
    const basename = decodeURIComponent(uri).replace(/^.*[\/\\]/g, "");
    const normalizedName = basename
      .replace(/\.[^.]+$/, "")
      .replace(/[！-～]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
      .replace("テレ東", "テレビ東京")
      .replace("BSテレビ東京", "BSテレ東")
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
      start: time.isValid() ? +time : Date.now(),
      end: time.isValid() ? +time : Date.now(),
      preview: Platform.OS === "web" ? "" : uri,
      stream: uri
    });
    count++;
  }
  if (programs.length > 0) {
    yield put(FileActions.append(programs));
  }
}

function* appendSaga() {
  yield delay(500);
  if (navigationRef.current?.getCurrentRoute()?.name !== "file") {
    navigationRef.current?.navigate("file");
  }
}

export function* fileSaga() {
  yield all([
    takeEvery("file/add", addSaga),
    takeLatest("file/append", appendSaga)
  ]);
  const { commentActive }: ServiceState = yield select(
    ({ service }) => service
  );
  if (!commentActive) {
    yield take("service/commentReady");
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
