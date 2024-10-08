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
const windowSlice = createSlice({
  name: "window",
  initialState,
  reducers: {
    setAlwaysOnTop: (state, action: PayloadAction<boolean>) => state,
    setFullScreen: (state, action: PayloadAction<boolean>) => state,
    maximize: state => state,
    minimize: state => state,
    restore: state => state,
    close: state => state,
    update: (
      state,
      action: PayloadAction<{
        alwaysOnTop?: boolean;
        fullScreen?: boolean;
        maximized?: boolean;
        minimized?: boolean;
      }>
    ) => ({
      ...state,
      ...action.payload
    }),
    setTitle: (state, action: PayloadAction<string>) => ({
      ...state,
      title: action.payload
    })
  }
});

export const WindowActions = windowSlice.actions;
export default windowSlice.reducer;