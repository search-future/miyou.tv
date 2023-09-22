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

import React from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { ThemeProvider } from "react-native-elements";
import { createStore, applyMiddleware } from "redux";
import createSagaMiddleware from "redux-saga";
import { persistReducer, persistStore, PersistConfig } from "redux-persist";

import AppNavigator from "./navigators";
import Splash from "./components/Splash";
import rootReducer, { rootSaga, RootState } from "./modules";
import init from "./utils/init";
import persistConfig from "./config/persist";

const App = () => (
  <Provider store={store}>
    <PersistGate
      loading={<Splash />}
      onBeforeLift={onBeforeLift}
      persistor={persistor}
    >
      <ThemeProvider>
        <AppNavigator />
      </ThemeProvider>
    </PersistGate>
  </Provider>
);
export default App;

const sagaMiddleware = createSagaMiddleware();
const persistedReducer = persistReducer(
  persistConfig as PersistConfig<RootState>,
  rootReducer
);
const store = createStore(persistedReducer, applyMiddleware(sagaMiddleware));
const persistor = persistStore(store);
sagaMiddleware.run(rootSaga);

const onBeforeLift = () => {
  init(store);
};
