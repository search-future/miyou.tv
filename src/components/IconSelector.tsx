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
import {
  View,
  ViewStyle,
  StyleSheet,
  StyleProp,
  TextStyle
} from "react-native";
import { Picker } from "@react-native-community/picker";
import { IconObject } from "react-native-elements";

type Props = {
  containerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  itemStyle?: StyleProp<TextStyle>;
  color?: string;
  icon?: IconObject;
  items?: { label: string; value: number | string }[];
  selectedValue?: number | string;
  onValueChange?: (value: number | string) => void;
};
const IconSelector = ({
  containerStyle,
  color,
  style,
  itemStyle,
  icon,
  items = [],
  selectedValue,
  onValueChange
}: Props) => (
  <View style={[styles.container, containerStyle]}>
    {icon && <View style={styles.iconWrapper}>{icon}</View>}
    <Picker
      style={[{ color }, styles.picker, style]}
      itemStyle={itemStyle}
      selectedValue={selectedValue}
      onValueChange={onValueChange}
    >
      {items.map(itemRenderer)}
    </Picker>
  </View>
);
export default IconSelector;

const itemRenderer = (
  { label, value }: { label: string; value: number | string },
  index: number
) => <Picker.Item key={index} label={label} value={value} />;

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    flexDirection: "row"
  },
  iconWrapper: {
    alignItems: "center",
    width: 32
  },
  picker: {
    borderWidth: 0,
    flex: 1,
    height: 32
  }
});
