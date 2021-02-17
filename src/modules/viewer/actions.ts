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

import { LayoutRectangle } from "react-native";

import { Program } from "../../services/BackendService";

export type ViewerProgram = Program & {
  commentCount?: number;
  commentSpeed?: number;
  commentMaxSpeed?: number;
  commentMaxSpeedTime?: Date;
  rank?: number;
};

export const VIEWER_INIT = "VIEWER_INIT";
function init(mode: "stack" | "view" | "child") {
  return {
    type: VIEWER_INIT,
    mode
  };
}

export const VIEWER_READY = "VIEWER_READY";
function ready() {
  return {
    type: VIEWER_READY
  };
}

export const VIEWER_OPEN = "VIEWER_OPEN";
function open(programs: ViewerProgram[], index: number) {
  return {
    type: VIEWER_OPEN,
    programs,
    index
  };
}

export const VIEWER_CLOSE = "VIEWER_CLOSE";
function close() {
  return {
    type: VIEWER_CLOSE
  };
}

export const VIEWER_DOCK = "VIEWER_DOCK";
function dock() {
  return {
    type: VIEWER_DOCK
  };
}

export const VIEWER_UNDOCK = "VIEWER_UNDOCK";
function undock() {
  return {
    type: VIEWER_UNDOCK
  };
}

export const VIEWER_SEARCH = "VIEWER_SEARCH";
function search(query: string) {
  return {
    type: VIEWER_SEARCH,
    query
  };
}

export const VIEWER_RESIZE = "VIEWER_RESIZE";
function resize(layout: LayoutRectangle) {
  return {
    type: VIEWER_RESIZE,
    layout
  };
}

export const VIEWER_UPDATE = "VIEWER_UPDATE";
function update(data: {
  programs?: ViewerProgram[];
  index?: number;
  extraIndex?: number;
  stacking?: boolean;
  playing?: boolean;
  peakPlay?: boolean;
  control?: boolean;
}) {
  return {
    type: VIEWER_UPDATE,
    data
  };
}

export const ViewerActions = {
  init,
  ready,
  open,
  close,
  dock,
  undock,
  search,
  resize,
  update
};
