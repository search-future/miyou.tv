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

import { WINDOW_UPDATE, WINDOW_TITLE } from "./actions";

export {
  WINDOW_ALWAYSONTOP,
  WINDOW_FULLSCREEN,
  WINDOW_MAXIMIZE,
  WINDOW_MINIMIZE,
  WINDOW_RESTORE,
  WINDOW_CLOSE,
  WINDOW_UPDATE,
  WINDOW_TITLE,
  WindowActions
} from "./actions";
export { windowSaga } from "./saga";

export type WindowState = {
  alwaysOnTop: boolean;
  fullScreen: boolean;
  maximized: boolean;
  minimized: boolean;
  title?: string;
};
const initialState: WindowState = {
  alwaysOnTop: false,
  fullScreen: false,
  maximized: false,
  minimized: false,
  title: ""
};
export default function windowReducer(state = initialState, action: AnyAction) {
  switch (action.type) {
    case WINDOW_UPDATE: {
      return { ...state, ...action.state };
    }
    case WINDOW_TITLE: {
      const { title } = action;
      return { ...state, title };
    }
    default:
      return state;
  }
}
