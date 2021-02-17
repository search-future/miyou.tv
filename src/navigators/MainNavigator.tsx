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

import React, { useContext } from "react";
import { StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { MenuProvider } from "react-native-popup-menu";

import StackNavigator from "./StackNavigator";
import navigationRef from "./navigation";
import { ThemeContext } from "react-native-elements";

const MainNavigator = () => {
  const { theme } = useContext(ThemeContext);

  return (
    <MenuProvider backHandler>
      <StatusBar barStyle="light-content" />
      <NavigationContainer ref={navigationRef} theme={theme.Navigation}>
        <StackNavigator />
      </NavigationContainer>
    </MenuProvider>
  );
};
export default MainNavigator;
