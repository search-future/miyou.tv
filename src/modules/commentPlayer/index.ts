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
  COMMENT_PLAYER_INIT,
  COMMENT_PLAYER_INTERVALS,
  COMMENT_PLAYER_PUSH,
  COMMENT_PLAYER_SEEK,
  COMMENT_PLAYER_FILTERS,
  COMMENT_PLAYER_AUTOSCROLL,
  CommentInterval,
  CommentData
} from "./actions";

export {
  COMMENT_PLAYER_INIT,
  COMMENT_PLAYER_LOAD,
  COMMENT_PLAYER_INTERVALS,
  COMMENT_PLAYER_PUSH,
  COMMENT_PLAYER_SEEK,
  COMMENT_PLAYER_FILTERS,
  COMMENT_PLAYER_AUTOSCROLL,
  CommentPlayerActions,
  CommentInterval,
  CommentData
} from "./actions";
export { commentPlayerSaga } from "./saga";

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
export default function commentPlayerReducer(
  state = initialState,
  action: AnyAction
) {
  switch (action.type) {
    case COMMENT_PLAYER_INIT: {
      const { channel, start, end } = action;
      return {
        ...state,
        channel,
        start,
        end,
        intervals: [],
        data: [],
        titles: [],
        speed: 0
      };
    }
    case COMMENT_PLAYER_INTERVALS: {
      const { intervals } = action;
      return { ...state, intervals };
    }
    case COMMENT_PLAYER_PUSH: {
      if (action.data && action.data.length > 0) {
        const data = [...state.data];
        data.push(...action.data);
        data.sort((a, b) => a.time - b.time);
        const titles = [...state.titles];
        const filters = [...state.filters];
        for (const comment of action.data) {
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
    }
    case COMMENT_PLAYER_SEEK: {
      let { pointer } = action;
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
    }
    case COMMENT_PLAYER_FILTERS: {
      const { filters } = action;
      return { ...state, filters };
    }
    case COMMENT_PLAYER_AUTOSCROLL: {
      const { enabled } = action;
      return { ...state, autoScroll: enabled };
    }
    default:
      return state;
  }
}
