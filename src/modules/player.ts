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

export type PlayerState = {
  useClock: boolean;
  pause: boolean;
  duration: number;
  ss: number;
  time: number;
  position: number;
  track: { [type: string]: number };
  trackCount: { [type: string]: number };
  dualMonoMode: string;
  seekTime: number | null;
  seekPosition: number | null;
};
const initialState: PlayerState = {
  useClock: true,
  pause: false,
  duration: 0,
  ss: 0,
  time: 0,
  position: 0,
  track: {},
  trackCount: {},
  dualMonoMode: "auto",
  seekTime: null,
  seekPosition: null
};
const playerSlice = createSlice({
  name: "player",
  initialState,
  reducers: {
    progress: (
      state,
      action: PayloadAction<{
        duration?: number;
        time?: number;
        position?: number;
      }>
    ) => ({
      ...state,
      ...action.payload,
      seekTime: null,
      seekPosition: null
    }),
    play: state => ({ ...state, pause: false }),
    pause: state => ({ ...state, pause: true }),
    toggle: state => ({ ...state, pause: !state.pause }),
    time: (state, action: PayloadAction<number>) => ({
      ...state,
      seekTime: action.payload > 0 ? action.payload : 0
    }),
    position: (state, action: PayloadAction<number>) => ({
      ...state,
      seekPosition: action.payload > 0 ? action.payload : 0
    }),
    track: (state, action: PayloadAction<{ [type: string]: number }>) => ({
      ...state,
      track: { ...state.track, ...action.payload }
    }),
    trackCount: (state, action: PayloadAction<{ [type: string]: number }>) => ({
      ...state,
      trackCount: { ...state.trackCount, ...action.payload }
    }),
    dualMonoMode: (state, action: PayloadAction<string>)=> ({
      ...state,
      dualMonoMode: action.payload
    }),
    useClock: (state, action: PayloadAction<boolean>) => ({
      ...state,
      useClock: action.payload
    })
  }
});

export const PlayerActions = playerSlice.actions;
export default playerSlice.reducer;