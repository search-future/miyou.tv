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
import { NetInfo } from "react-native";
import { StackActions } from "react-navigation";

import { ServiceActions } from "../../modules/service";
import { NetworkActions } from "../../modules/network";

export default function common(store: Store) {
  const { setting } = store.getState();
  const { isConfigured } = setting;
  store.dispatch(StackActions.popToTop({}));
  if (!isConfigured) {
    store.dispatch(StackActions.push({ routeName: "Setup" }));
  } else {
    store.dispatch(ServiceActions.backendInit());
    store.dispatch(ServiceActions.commentInit());
  }

  NetInfo.getConnectionInfo().then(connectionInfo => {
    store.dispatch(NetworkActions.update(connectionInfo));
  });
  NetInfo.addEventListener("connectionChange", connectionInfo => {
    if (typeof connectionInfo === "object") {
      store.dispatch(NetworkActions.update(connectionInfo));
    }
  });
}
