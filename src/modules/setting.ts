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

export const SETTING_UPDATE = "SETTING_UPDATE";
function update(key: string, setting: any) {
  return {
    type: SETTING_UPDATE,
    key,
    setting
  };
}

export const SETTING_RESTORE = "SETTING_RESTORE";
function restore(setting: any) {
  return {
    type: SETTING_RESTORE,
    setting
  };
}

export const SettingActions = { update, restore };

export type SettingState = {
  [key: string]: any;
};
const initialState: SettingState = {};
export default function settingReducer(
  state = initialState,
  action: AnyAction
) {
  switch (action.type) {
    case SETTING_UPDATE: {
      const { key, setting } = action;
      if (typeof setting === "object" && setting != null) {
        return {
          ...state,
          [key]: { ...state[key], ...setting }
        };
      }
      return {
        ...state,
        [key]: setting
      };
    }
    case SETTING_RESTORE: {
      const { setting } = action;
      return {
        ...setting
      };
    }
    default: {
      return state;
    }
  }
}
