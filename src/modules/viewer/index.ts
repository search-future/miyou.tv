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
  VIEWER_OPEN,
  VIEWER_CLOSE,
  VIEWER_UPDATE,
  ViewerProgram
} from "./actions";

export {
  VIEWER_OPEN,
  VIEWER_CLOSE,
  VIEWER_SEARCH,
  VIEWER_SETTING,
  VIEWER_UPDATE,
  ViewerProgram,
  ViewerActions
} from "./actions";
export { viewerSaga } from "./saga";

export type ViewerState = {
  isOpened: boolean;
  programs: ViewerProgram[];
  index: number;
  extraIndex: number;
};
const initialState: ViewerState = {
  isOpened: false,
  programs: [],
  index: 0,
  extraIndex: 0
};
export default function viewerReducer(state = initialState, action: AnyAction) {
  switch (action.type) {
    case VIEWER_OPEN: {
      const { programs = [], index = 0 } = action;
      return { ...state, programs, index, isOpened: true, extraIndex: 0 };
    }
    case VIEWER_CLOSE: {
      return { ...state, isOpened: false };
    }
    case VIEWER_UPDATE: {
      const { data = {} } = action;
      return {
        ...state,
        ...data
      };
    }
    default:
      return state;
  }
}
