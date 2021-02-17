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

export const WINDOW_ALWAYSONTOP = "WINDOW_ALWAYSONTOP";
function setAlwaysOnTop(enabled = true) {
  return {
    type: WINDOW_ALWAYSONTOP,
    enabled
  };
}

export const WINDOW_FULLSCREEN = "WINDOW_FULLSCREEN";
function setFullScreen(enabled = true) {
  return {
    type: WINDOW_FULLSCREEN,
    enabled
  };
}

export const WINDOW_MAXIMIZE = "WINDOW_MAXIMIZE";
function maximize() {
  return {
    type: WINDOW_MAXIMIZE
  };
}

export const WINDOW_MINIMIZE = "WINDOW_MINIMIZE";
function minimize() {
  return {
    type: WINDOW_MINIMIZE
  };
}

export const WINDOW_RESTORE = "WINDOW_RESTORE";
function restore() {
  return {
    type: WINDOW_RESTORE
  };
}

export const WINDOW_CLOSE = "WINDOW_CLOSE";
function close() {
  return {
    type: WINDOW_CLOSE
  };
}

export const WINDOW_UPDATE = "WINDOW_UPDATE";
function update(state: {
  alwaysOnTop?: boolean;
  fullScreen?: boolean;
  maximized?: boolean;
  minimized?: boolean;
}) {
  return {
    type: WINDOW_UPDATE,
    state
  };
}

export const WINDOW_TITLE = "WINDOW_TITLE";
function setTitle(title: string) {
  return {
    type: WINDOW_TITLE,
    title
  };
}

export const WindowActions = {
  setAlwaysOnTop,
  setFullScreen,
  maximize,
  minimize,
  restore,
  close,
  update,
  setTitle
};
