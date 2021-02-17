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

import React, { useCallback } from "react";
import {
  View,
  ViewStyle,
  StyleSheet,
  StyleProp,
  TouchableOpacity,
  TextStyle,
  ActionSheetIOS
} from "react-native";
import { IconObject, Text } from "react-native-elements";

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
  style,
  itemStyle,
  color,
  icon,
  items = [],
  selectedValue,
  onValueChange
}: Props) => {
  const selected = items.find(({ value }) => value === selectedValue);
  const onPress = useCallback(() => {
    if (onValueChange) {
      const options = items.map(({ label }) => label);
      options.push("キャンセル");
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1
        },
        (index: number) => {
          if (items[index]) {
            onValueChange(items[index].value);
          }
        }
      );
    }
  }, [items, onValueChange]);

  return (
    <View style={[styles.container, containerStyle]}>
      {icon && <View style={styles.iconWrapper}>{icon}</View>}
      <TouchableOpacity style={[styles.button, style]} onPress={onPress}>
        <Text style={[{ color }, itemStyle]}>
          {selected ? selected.label : selectedValue}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
export default IconSelector;

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
  button: {
    alignItems: "center",
    flexDirection: "row",
    borderWidth: 0,
    flex: 1,
    height: 32
  }
});
