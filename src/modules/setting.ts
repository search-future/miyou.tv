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

export type SettingState = {
  [key: string]: any;
};
const initialState: SettingState = {};
const settingSlice = createSlice({
  name: "setting",
  initialState,
  reducers: {
    update: {
      reducer: (state, action) => {
        const { key, setting } = action.payload;
        if (typeof setting === "object" && setting != null) {
          return { ...state, [key]: { ...state[key], ...setting } };
        }
        return { ...state, [key]: setting };
      },
      prepare: (key: string, setting: any) => ({
        payload: { key, setting },
        meta: null,
        error: null
      })
    },
    restore: (state, action: PayloadAction<SettingState>) => {
      return {
        ...action.payload
      };
    }
  }
});

export const SettingActions = settingSlice.actions;
export default settingSlice.reducer;
