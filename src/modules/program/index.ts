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
  call,
  cancel,
  put,
  select,
  take,
  takeLatest
} from "redux-saga/effects";

import { BACKEND_READY, COMMENT_READY, ServiceState } from "../service";
import {
  PROGRAM_INIT,
  PROGRAM_LOAD,
  PROGRAM_UPDATE,
  ProgramActions
} from "./actions";
import { tableSaga } from "./table";
import { listSaga } from "./list";
import { rankingSaga } from "./ranking";

export {
  ProgramTableData,
  ProgramTableProgram,
  ProgramTableColumn
} from "./table";
export { ProgramListData, ProgramListProgram } from "./list";
export { ProgramRankingData, ProgramRankingProgram } from "./ranking";

export {
  PROGRAM_INIT,
  PROGRAM_LOAD,
  PROGRAM_UPDATE,
  ProgramActions
} from "./actions";

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
    yield take(BACKEND_READY);
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
  initialized: false
};
export default function programReducer(
  state = initialState,
  action: AnyAction
) {
  switch (action.type) {
    case PROGRAM_INIT: {
      return {
        ...state,
        initialized: false
      };
    }
    case PROGRAM_LOAD: {
      const { module = state.module } = action;
      return {
        ...state,
        module
      };
    }
    case PROGRAM_UPDATE: {
      const { key, data = {} } = action;
      return {
        ...state,
        initialized: true,
        [key]: { ...state[key], ...data }
      };
    }
    default:
      return state;
  }
}

export function* programSaga() {
  let tasks = [];
  while (true) {
    yield take(BACKEND_READY);
    yield cancel(tasks);
    tasks = yield all([
      takeLatest(PROGRAM_INIT, initSaga),
      takeLatest([COMMENT_READY, PROGRAM_LOAD], loadSaga)
    ]);
    yield put(ProgramActions.init());
  }
}
