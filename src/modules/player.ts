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

export const PLAYER_PROGRESS = "PLAYER_PROGRESS";
export function progress(progress: {
  duration?: number;
  time?: number;
  position?: number;
}) {
  return {
    type: PLAYER_PROGRESS,
    progress
  };
}

export const PLAYER_PLAY = "PLAYER_PLAY";
function play() {
  return { type: PLAYER_PLAY };
}

export const PLAYER_PAUSE = "PLAYER_PAUSE";
function pause() {
  return { type: PLAYER_PAUSE };
}

export const PLAYER_TOGGLE = "PLAYER_TOGGLE";
function toggle() {
  return { type: PLAYER_TOGGLE };
}

export const PLAYER_TIME = "PLAYER_TIME";
function time(time: number) {
  return {
    type: PLAYER_TIME,
    time
  };
}

export const PLAYER_POSITION = "PLAYER_POSITION";
function position(position: number) {
  return {
    type: PLAYER_POSITION,
    position
  };
}

export const PLAYER_TRACK = "PLAYER_TRACK";
function track(track: { [type: string]: number }) {
  return {
    type: PLAYER_TRACK,
    track
  };
}

export const PLAYER_TRACK_COUNT = "PLAYER_TRACK_COUNT";
function trackCount(trackCount: { [type: string]: number }) {
  return {
    type: PLAYER_TRACK_COUNT,
    trackCount
  };
}

export const PLAYER_DUALMONO = "PLAYER_DUALMONO";
function dualMonoMode(mode: string) {
  return {
    type: PLAYER_DUALMONO,
    mode
  };
}

export const PLAYER_CLOCK = "PLAYER_CLOCK";
function useClock(enabled: boolean) {
  return {
    type: PLAYER_CLOCK,
    enabled
  };
}

export const PlayerActions = {
  progress,
  play,
  pause,
  toggle,
  time,
  position,
  track,
  trackCount,
  dualMonoMode,
  useClock
};

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
export default function playerReducer(state = initialState, action: AnyAction) {
  switch (action.type) {
    case PLAYER_PROGRESS: {
      const { progress } = action;
      return {
        ...state,
        ...progress,
        seekTime: null,
        seekPosition: null
      };
    }
    case PLAYER_PAUSE: {
      return { ...state, pause: true };
    }
    case PLAYER_PLAY: {
      return { ...state, pause: false };
    }
    case PLAYER_TOGGLE: {
      const { pause } = state;
      return { ...state, pause: !pause };
    }
    case PLAYER_TIME: {
      const { time } = action;
      return {
        ...state,
        seekTime: time > 0 ? time : 0
      };
    }
    case PLAYER_POSITION: {
      const { position } = action;
      return {
        ...state,
        seekPosition: position > 0 ? position : 0
      };
    }
    case PLAYER_TRACK: {
      return { ...state, track: { ...state.track, ...action.track } };
    }
    case PLAYER_TRACK_COUNT: {
      return {
        ...state,
        trackCount: { ...state.trackCount, ...action.trackCount }
      };
    }
    case PLAYER_DUALMONO: {
      const { mode } = action;
      return {
        ...state,
        dualMonoMode: mode
      };
    }
    case PLAYER_CLOCK: {
      const { enabled } = action;
      return {
        ...state,
        useClock: enabled
      };
    }
    default:
      return state;
  }
}
