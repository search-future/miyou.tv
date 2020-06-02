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

import { StyleSheet } from "react-native";

export const white = "#ffffff";
export const light = "#e2e2e2";
export const gray = "#808080";
export const grayDark = "#3a3a3a";
export const dark = "#262626";
export const black = "#1a1a1a";
export const active = "#9991ff";

const colorStyle = StyleSheet.create({
  while: {
    color: white
  },
  light: {
    color: light
  },
  grayDark: {
    color: grayDark
  },
  gray: {
    color: gray
  },
  dark: {
    color: dark
  },
  black: {
    color: black
  },
  active: {
    color: active
  },
  bgWhite: {
    backgroundColor: white
  },
  bgLight: {
    backgroundColor: light
  },
  bgGrayDark: {
    backgroundColor: grayDark
  },
  bgGray: {
    backgroundColor: gray
  },
  bgDark: {
    backgroundColor: dark
  },
  bgBlack: {
    backgroundColor: black
  },
  bgTransparent: {
    backgroundColor: "transparent"
  },
  bgActive: {
    backgroundColor: active
  },
  borderWhite: {
    borderColor: white
  },
  borderLight: {
    borderColor: light
  },
  borderGrayDark: {
    borderColor: grayDark
  },
  borderGray: {
    borderColor: gray
  },
  borderDark: {
    borderColor: dark
  },
  borderBlack: {
    borderColor: black
  },
  borderTransparent: {
    borderColor: "transparent"
  },
  borderActive: {
    borderColor: active
  }
});
export default colorStyle;
