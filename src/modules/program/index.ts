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

import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import {
  all,
  call,
  cancel,
  put,
  select,
  take,
  takeLatest
} from "redux-saga/effects";

import { ServiceState } from "../service";
import { tableSaga } from "./table";
import { listSaga } from "./list";
import { rankingSaga } from "./ranking";

export type {
  ProgramTableData,
  ProgramTableProgram,
  ProgramTableColumn
} from "./table";
export type { ProgramListData, ProgramListProgram } from "./list";
export type { ProgramRankingData, ProgramRankingProgram } from "./ranking";

const modules: {
  [key: string]: () => void;
} = {
  table: tableSaga,
  list: listSaga,
  ranking: rankingSaga
};

function* initSaga() {
  yield put(ProgramActions.load());
}

function* loadSaga() {
  const { backendActive }: ServiceState = yield select(
    ({ service }) => service
  );
  if (!backendActive) {
    yield take("service/backendReady");
  }

  const { module: name }: { module: string } = yield select(
    ({ program }) => program
  );
  if (modules[name]) {
    yield call(modules[name]);
  }
}

export type ProgramState = {
  initialized: boolean;
  module?: string;
  [key: string]: any;
};
const initialState: ProgramState = {
  initialized: false,
  module: "table"
};
const programSlice = createSlice({
  name: "program",
  initialState,
  reducers: {
    init: ({module}) => ({ module, initialized: false }),
    load: (state, action: PayloadAction<string | undefined>) => ({
      ...state,
      module: action.payload || state.module
    }),
    update: {
      reducer: (state, action: PayloadAction<{ [key: string]: any }>) => ({
        ...state,
        initialized: true,
        [action.payload.key]: {
          ...state[action.payload.key],
          ...action.payload.data
        }
      }),
      prepare: (key: string, data: any) => ({
        payload: { key, data },
        meta: null,
        error: null
      })
    }
  }
});
export const ProgramActions = programSlice.actions;
export default programSlice.reducer;

export function* programSaga() {
  let tasks = [];
  while (true) {
    yield take("service/backendReady");
    yield cancel(tasks);
    tasks = yield all([
      takeLatest("program/init", initSaga),
      takeLatest(["service/commentReady", "program/load"], loadSaga)
    ]);
    yield put(ProgramActions.init());
  }
}
