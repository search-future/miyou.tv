/*!
Copyright 2016-2019 Brazil Ltd.
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

import { Store } from "redux";
import { BackHandler, Platform } from "react-native";
import { NavigationState, StackActions } from "react-navigation";
import NetInfo from "@react-native-community/netinfo";
import KeepAwake from "react-native-keep-awake";
// @ts-ignore
import { Immersive } from "react-native-immersive";

import { NetworkActions } from "../../modules/network";
import common from "./common";

export default function init(store: Store) {
  BackHandler.addEventListener("hardwareBackPress", () => {
    const { nav }: { nav: NavigationState } = store.getState();
    const { index } = nav;
    if (index > 0) {
      store.dispatch(StackActions.pop({}));
      return true;
    }
    return false;
  });

  NetInfo.fetch().then(state => {
    store.dispatch(NetworkActions.update(state));
  });
  NetInfo.addEventListener(state => {
    if (typeof state === "object") {
      store.dispatch(NetworkActions.update(state));
    }
  });

  if (Platform.OS === "android") {
    Immersive.off();
  }
  KeepAwake.deactivate();

  common(store);
}
