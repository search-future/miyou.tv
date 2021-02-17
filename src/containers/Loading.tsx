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

import React, { memo, useContext } from "react";
import { ActivityIndicator, StyleSheet } from "react-native";
import { ThemeContext } from "react-native-elements";
import { useSelector } from "react-redux";

import { RootState } from "../modules";

const Loading = memo(() => {
  const enabled = useSelector<RootState, boolean>(
    ({ loading }) => loading.enabled
  );
  const blocking = useSelector<RootState, boolean>(
    ({ loading }) => loading.blocking
  );

  const { theme } = useContext(ThemeContext);

  return (
    <ActivityIndicator
      style={[styles.container, enabled && blocking && styles.blocker]}
      color={theme.colors?.primary}
      animating={enabled}
    />
  );
});
export default Loading;

const styles = StyleSheet.create({
  container: {
    bottom: "50%",
    left: "50%",
    position: "absolute",
    right: "50%",
    top: "50%"
  },
  blocker: {
    backgroundColor: "#ffffff80",
    bottom: 0,
    left: 0,
    right: 0,
    top: 0
  }
});
