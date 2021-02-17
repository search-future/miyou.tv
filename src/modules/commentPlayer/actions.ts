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

export const COMMENT_PLAYER_INIT = "COMMENT_PLAYER_INIT";
function init(channel: string, start: number, end: number) {
  return {
    type: COMMENT_PLAYER_INIT,
    channel,
    start,
    end
  };
}

export const COMMENT_PLAYER_LOAD = "COMMENT_PLAYER_LOAD";
function load(time: number) {
  return {
    type: COMMENT_PLAYER_LOAD,
    time
  };
}

export const COMMENT_PLAYER_INTERVALS = "COMMENT_PLAYER_INTERVALS";
function intervals(intervals: CommentInterval[]) {
  return {
    type: COMMENT_PLAYER_INTERVALS,
    intervals
  };
}

export const COMMENT_PLAYER_PUSH = "COMMENT_PLAYER_PUSH";
function push(data: CommentData[]) {
  return {
    type: COMMENT_PLAYER_PUSH,
    data
  };
}

export const COMMENT_PLAYER_SEEK = "COMMENT_PLAYER_SEEK";
function seek(pointer: number) {
  return {
    type: COMMENT_PLAYER_SEEK,
    pointer
  };
}

export const COMMENT_PLAYER_FILTERS = "COMMENT_PLAYER_FILTERS";
function setFilters(filters: string[]) {
  return {
    type: COMMENT_PLAYER_FILTERS,
    filters
  };
}

export const COMMENT_PLAYER_AUTOSCROLL = "COMMENT_PLAYER_AUTOSCROLL";
function setAutoScroll(enabled: boolean) {
  return {
    type: COMMENT_PLAYER_AUTOSCROLL,
    enabled
  };
}

export const CommentPlayerActions = {
  init,
  load,
  intervals,
  push,
  seek,
  setFilters,
  setAutoScroll
};
