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
import { Platform } from "react-native";
import { Colors, Theme } from "react-native-elements";
import FontAwesome5Icon from "react-native-vector-icons/FontAwesome5";
import { DefaultTheme } from "@react-navigation/native";

import dark from "./dark";
import light from "./light";

const colorSchemes: { [key: string]: Partial<Colors> } = {
  dark,
  light
};

function getTheme(colorScheme: string | null = "") {
  const colors = colorSchemes[colorScheme || ""] || light;
  const theme: Theme = {
    colors,
    Navigation: {
      dark: false,
      colors: {
        ...DefaultTheme.colors,
        background: colors.appBg as string
      }
    },
    Badge: {
      badgeStyle: [{ borderColor: colors.divider }]
    },
    Button: {
      titleStyle: [{ fontSize: 16 }]
    },
    Image: {
      placeholderStyle: [{ backgroundColor: "transparent" }]
    },
    Input: {
      placeholderTextColor: colors.disabled,
      renderErrorMessage: false,
      containerStyle: [
        {
          paddingLeft: 0,
          paddingRight: 0
        }
      ],
      inputContainerStyle: [
        {
          backgroundColor: colors.background,
          borderColor: colors.border
        }
      ],
      inputStyle: [
        {
          color: colors.default,
          fontSize: 16
        }
      ],
      labelStyle: [
        {
          color: colors.default,
          fontSize: 16,
          fontWeight: "normal"
        }
      ]
    },
    ListItem: {
      containerStyle: [{ backgroundColor: colors.background }]
    },
    ListItemTitle: {
      style: [{ color: colors.default, fontWeight: "bold" }]
    },
    SearchBar: {
      containerStyle: [
        {
          backgroundColor: "transparent",
          borderBottomWidth: 0,
          borderTopWidth: 0,
          borderLeftWidth: 0,
          borderRightWidth: 0,
          padding: 0
        }
      ],
      inputContainerStyle: [{ height: 32, overflow: "hidden" }],
      inputStyle: [
        {
          color: colors.control,
          fontSize: 16,
          minHeight: Platform.OS === "web" ? 32 : 64,
          padding: 0,
          textAlign: "center"
        }
      ],
      searchIcon: (
        <FontAwesome5Icon
          name="search"
          solid
          color={colors.disabled}
          size={16}
        />
      )
    },
    Slider: {
      allowTouchTrack: true,
      thumbTintColor: colors.primary,
      thumbTouchSize: { height: 0, width: 0 },
      thumbStyle: [{ height: 24, width: 24 }]
    },
    Text: {
      style: [{ fontSize: 16, color: colors.default }],
      h1Style: [{ fontSize: 24 }],
      h2Style: [
        {
          flex: 1,
          fontSize: 24,
          height: 40,
          lineHeight: 40,
          marginHorizontal: 16,
          overflow: "hidden"
        }
      ],
      h3Style: [{ fontSize: 22, fontWeight: "bold" }],
      h4Style: [{ fontSize: 20 }]
    }
  };
  return theme;
}

export default getTheme;
