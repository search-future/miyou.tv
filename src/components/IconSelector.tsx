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
import {
  Picker,
  View,
  ViewStyle,
  StyleSheet,
  StyleProp,
  TextStyle
} from "react-native";
import { IconObject } from "react-native-elements";

type Props = {
  containerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  itemStyle?: StyleProp<TextStyle>;
  color?: string;
  icon?: IconObject;
  items?: { label: string; value: any }[];
  selectedValue?: any;
  onValueChange?: (value: number | string) => void;
};
export default class IconSelector extends Component<Props> {
  render() {
    const {
      containerStyle,
      color,
      style,
      itemStyle,
      icon,
      items = [],
      selectedValue,
      onValueChange
    } = this.props;
    return (
      <View style={[styles.container, containerStyle]}>
        <View style={styles.iconWrapper}>{icon}</View>
        <Picker
          style={[{ color } as ViewStyle, styles.picker, style]}
          itemStyle={itemStyle}
          selectedValue={selectedValue}
          onValueChange={onValueChange}
        >
          {items.map(({ label, value }, index) => (
            <Picker.Item key={index} label={label} value={value} />
          ))}
        </Picker>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
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
