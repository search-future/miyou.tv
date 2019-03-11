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

import React, { Component } from "react";
import { StyleSheet, View } from "react-native";
import {
  createSwitchNavigator,
  NavigationProp,
  NavigationScreenProp
} from "react-navigation";

import AppFooter from "../containers/AppFooter";
import AppHeader from "../containers/AppHeader";
import Loading from "../containers/Loading";
import ProgramTable from "../containers/ProgramTable";

const SwitchNavigator = createSwitchNavigator(
  {
    Table: {
      screen: ProgramTable
    },
    List: {
      screen: View
    },
    Ranking: {
      screen: View
    }
  },
  {
    initialRouteName: "Table"
  }
);

type Props = {
  navigation: NavigationScreenProp<{}> & NavigationProp<{}>;
};
export default class MainNavigator extends Component<Props> {
  static router = SwitchNavigator.router;
  render() {
    const { navigation } = this.props;
    return (
      <View style={styles.container}>
        <AppHeader />
        <View style={styles.main}>
          <SwitchNavigator navigation={navigation} />
        </View>
        <AppFooter />
        <Loading />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  main: {
    flex: 1
  }
});
