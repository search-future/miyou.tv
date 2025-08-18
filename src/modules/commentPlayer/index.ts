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

export { commentPlayerSaga } from "./saga";

export type CommentInterval = {
  n_hits: number;
  start: number;
  isLoaded?: boolean;
};

export type CommentData = {
  title: string;
  name: string;
  email: string;
  text: string;
  id: string;
  time: number;
};

export type CommentPlayerState = {
  channel: string;
  start: number;
  end: number;
  intervals: CommentInterval[];
  data: CommentData[];
  pointer: number;
  titles: string[];
  filters: string[];
  speed: number;
  autoScroll: boolean;
};
const initialState: CommentPlayerState = {
  channel: "",
  start: 0,
  end: 0,
  intervals: [],
  data: [],
  pointer: 0,
  titles: [],
  filters: [],
  speed: 0,
  autoScroll: true
};
const commentPlayerSlice = createSlice({
  name: "commentPlayer",
  initialState,
  reducers: {
    init: {
      reducer: (
        state,
        action: PayloadAction<{ channel: string; start: number; end: number }>
      ) => ({
        ...state,
        ...action.payload,
        intervals: [],
        data: [],
        titles: [],
        speed: 0
      }),
      prepare: (channel: string, start: number, end: number) => ({
        payload: { channel, start, end },
        meta: null,
        error: null
      })
    },
    load: (state, action: PayloadAction<number>) => state,
    intervals: (state, action: PayloadAction<CommentInterval[]>) => ({
      ...state,
      intervals: action.payload
    }),
    push: (state, action: PayloadAction<CommentData[]>) => {
      if (action.payload && action.payload.length > 0) {
        const data = [...state.data, ...action.payload];
        data.sort((a, b) => a.time - b.time);
        const titles = [...state.titles];
        const filters = [...state.filters];
        for (const comment of action.payload) {
          const { title } = comment;
          if (titles.indexOf(title) < 0) {
            titles.push(title);
            filters.push(title);
          }
        }
        titles.sort();
        return { ...state, data, titles, filters };
      }
      return state;
    },
    seek: (state, action: PayloadAction<number>) => {
      let pointer = action.payload;
      const { intervals, data } = state;
      let { speed } = state;
      if (pointer >= data.length) {
        pointer = 0;
      }
      if (data[pointer]) {
        const { time } = data[pointer];
        const current = intervals.find(
          ({ start }) => start <= time && start + 60000 > time
        );
        if (current) {
          speed = current.n_hits;
        }
      }
      return { ...state, pointer, speed };
    },
    setFilters: (state, action: PayloadAction<string[]>) => ({
      ...state,
      filters: action.payload
    }),
    setAutoScroll: (state, action: PayloadAction<boolean>) => ({
      ...state,
      autoScroll: action.payload
    })
  }
});

export const CommentPlayerActions = commentPlayerSlice.actions;
export default commentPlayerSlice.reducer;
