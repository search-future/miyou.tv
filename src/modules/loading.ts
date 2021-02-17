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

export const LOADING_START = "LOADING_START";
function start(blocking = false) {
  return {
    type: LOADING_START,
    blocking
  };
}

export const LOADING_COMPLETE = "LOADING_COMPLETE";
function complete() {
  return {
    type: LOADING_COMPLETE
  };
}

export const LoadingActions = {
  start,
  complete
};

export type LoadingState = {
  enabled: boolean;
  blocking: boolean;
};
const initialState: LoadingState = {
  enabled: false,
  blocking: false
};
export default function loadingReducer(
  state = initialState,
  action: AnyAction
) {
  switch (action.type) {
    case LOADING_START: {
      const { blocking } = action;
      return {
        enabled: true,
        blocking
      };
    }
    case LOADING_COMPLETE: {
      return {
        enabled: false,
        blocking: false
      };
    }
    default:
      return state;
  }
}
