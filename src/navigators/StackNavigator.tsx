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

import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

import TabNavigator from "./TabNavigator";
import Setup from "../containers/Setup";
import FileLoader from "../containers/FileLoader";
import Viewer from "../containers/Viewer";

const Stack = createStackNavigator();

const StackNavigator = () => (
  <Stack.Navigator initialRouteName="tabs" mode="modal" headerMode="none">
    <Stack.Screen name="tabs" component={TabNavigator} />
    <Stack.Screen name="setup" component={Setup} />
    <Stack.Screen name="file" component={FileLoader} />
    <Stack.Screen name="viewer" component={Viewer} />
  </Stack.Navigator>
);
export default StackNavigator;
