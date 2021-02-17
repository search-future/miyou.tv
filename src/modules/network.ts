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
import { NetInfoState } from "@react-native-community/netinfo";

export const NETWORK_UPDATE = "NETWORK_UPDATE";
function update(info: NetInfoState) {
  return {
    type: NETWORK_UPDATE,
    info
  };
}

export const NetworkActions = {
  update
};

export type NetworkState = {
  type: string;
  details: any;
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
};
const initialState: NetworkState = {
  type: "unknown",
  details: null,
  isConnected: true,
  isInternetReachable: true
};
export default function networkReducer(
  state = initialState,
  action: AnyAction
) {
  switch (action.type) {
    case NETWORK_UPDATE:
      return action.info;
    default:
      return state;
  }
}
