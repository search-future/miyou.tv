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

import React, { useContext, useEffect, useMemo, useState } from "react";
import { Platform, useColorScheme } from "react-native";
import { ThemeContext } from "react-native-elements";
import { useSelector } from "react-redux";

import MainNavigator from "./MainNavigator";
import { RootState } from "../modules";
import getTheme from "../themes";

const AppNavigator = () => {
  const configColorScheme = useSelector<RootState, string>(
    ({ setting }) => setting.view?.colorScheme
  );
  const systemColorScheme = useColorScheme();

  const [reset, setReset] = useState(false);

  const { replaceTheme } = useContext(ThemeContext);

  const colorScheme = useMemo(() => configColorScheme || systemColorScheme, [
    configColorScheme,
    systemColorScheme
  ]);

  useEffect(() => {
    replaceTheme(getTheme(colorScheme));
    if (Platform.OS === "ios") {
      setReset(true);
    }
  }, [colorScheme]);
  useEffect(() => {
    setReset(false);
  }, [reset]);

  if (reset) {
    return null;
  }

  return <MainNavigator />;
};
export default AppNavigator;
