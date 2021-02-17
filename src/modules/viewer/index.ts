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
import { LayoutRectangle } from "react-native";

import {
  VIEWER_INIT,
  VIEWER_OPEN,
  VIEWER_CLOSE,
  VIEWER_RESIZE,
  VIEWER_UPDATE,
  ViewerProgram
} from "./actions";

export {
  VIEWER_INIT,
  VIEWER_READY,
  VIEWER_OPEN,
  VIEWER_CLOSE,
  VIEWER_DOCK,
  VIEWER_UNDOCK,
  VIEWER_SEARCH,
  VIEWER_RESIZE,
  VIEWER_UPDATE,
  ViewerProgram,
  ViewerActions
} from "./actions";
export { viewerSaga } from "./saga";

export type ViewerState = {
  isOpened: boolean;
  mode: "stack" | "view" | "child";
  programs: ViewerProgram[];
  index: number;
  extraIndex: number;
  layout: LayoutRectangle;
  stacking: boolean;
  playing: boolean;
  peakPlay: boolean;
  control: boolean;
};
const initialState: ViewerState = {
  isOpened: false,
  mode: "stack",
  programs: [],
  index: 0,
  extraIndex: 0,
  layout: { x: 0, y: 0, width: 0, height: 0 },
  stacking: false,
  playing: false,
  peakPlay: false,
  control: true
};
export default function viewerReducer(state = initialState, action: AnyAction) {
  switch (action.type) {
    case VIEWER_INIT: {
      const { mode } = action;
      return { ...state, mode };
    }
    case VIEWER_OPEN: {
      const { programs = [], index = 0 } = action;
      return { ...state, programs, index, isOpened: true, extraIndex: 0 };
    }
    case VIEWER_CLOSE: {
      return { ...state, isOpened: false, playing: false };
    }
    case VIEWER_RESIZE: {
      const { layout } = action;
      return {
        ...state,
        layout
      };
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
