/*!
Copyright 2016-2020 Brazil Ltd.
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
import { StyleSheet, StatusBar } from "react-native";
import { MenuProvider } from "react-native-popup-menu";
import { SafeAreaProvider } from "react-native-safe-area-context";
import SafeAreaView from "react-native-safe-area-view";

import AppNavigator from "../navigators";
import colorStyle from "../styles/color";

const Main = () => {
  return (
    <MenuProvider backHandler>
      <StatusBar barStyle="light-content" />
      <SafeAreaProvider>
        <SafeAreaView style={[colorStyle.bgBlack, styles.container]}>
          <AppNavigator />
        </SafeAreaView>
      </SafeAreaProvider>
    </MenuProvider>
  );
};
export default Main;

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});
