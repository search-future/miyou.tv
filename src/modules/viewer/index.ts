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
import { LayoutRectangle } from "react-native";

import { Program } from "../../services/BackendService";

export { viewerSaga } from "./saga";

export type ViewerProgram = Program & {
  commentCount?: number;
  commentSpeed?: number;
  commentMaxSpeed?: number;
  commentMaxSpeedTime?: number;
  rank?: number;
};

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
const viewerSlice = createSlice({
  name: "viewer",
  initialState,
  reducers: {
    init: (state, action: PayloadAction<"stack" | "view" | "child">) => ({
      ...state,
      mode: action.payload
    }),
    ready: state => state,
    open: {
      reducer: (
        state,
        action: PayloadAction<{ programs: ViewerProgram[]; index: number }>
      ) => ({
        ...state,
        ...action.payload,
        isOpened: true,
        extraIndex: 0
      }),
      prepare: (programs: ViewerProgram[], index: number) => ({
        payload: { programs, index },
        meta: null,
        error: null
      })
    },
    close: state => ({ ...state, isOpened: false, playing: false }),
    dock: state => state,
    undock: state => state,
    search: (state, action: PayloadAction<string>) => state,
    resize: (state, action: PayloadAction<LayoutRectangle>) => ({
      ...state,
      layout: action.payload
    }),
    update: (
      state,
      action: PayloadAction<{
        programs?: ViewerProgram[];
        index?: number;
        extraIndex?: number;
        stacking?: boolean;
        playing?: boolean;
        peakPlay?: boolean;
        control?: boolean;
      }>
    ) => ({ ...state, ...action.payload })
  }
});

export const ViewerActions = viewerSlice.actions;
export default viewerSlice.reducer;
