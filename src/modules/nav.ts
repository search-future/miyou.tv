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

export type NavState = {
  tab: string;
};
const initialState: NavState = {
  tab: "table"
};
const navSlice = createSlice({
  name: "nav",
  initialState,
  reducers: {
    change: (state, action: PayloadAction<string>) => ({
      tab: action.payload
    })
  }
});

export const NavActions = navSlice.actions;
export default navSlice.reducer;
