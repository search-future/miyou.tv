/*!
Copyright 2016-2025 Brazil Ltd.
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
  Pressable,
  View,
  ViewStyle,
  StyleSheet,
  PressableStateCallbackType,
  StyleProp,
  TextStyle,
  ActionSheetIOS
} from "react-native";
import { Text } from "react-native-elements";

type Props = {
  containerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  itemStyle?: StyleProp<TextStyle>;
  color?: string;
  icon?: JSX.Element;
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

  const pressableStyle = useCallback<
    (state: PressableStateCallbackType) => StyleProp<ViewStyle>
  >(
    ({ pressed }) => [
      styles.container,
      containerStyle,
      pressed && { opacity: 0.5 }
    ],
    [containerStyle]
  );
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
    <Pressable style={pressableStyle} onPress={onPress}>
      {icon && <View style={styles.iconWrapper}>{icon}</View>}
      <View style={[styles.textWrapper, style]}>
        <Text style={[{ color }, itemStyle]}>
          {selected ? selected.label : selectedValue}
        </Text>
      </View>
    </Pressable>
  );
};
export default IconSelector;

const styles = StyleSheet.create({
  container: {
    alignItems: "stretch",
    backgroundColor: "#ffffff",
    flexDirection: "row"
  },
  iconWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingRight: 8,
    width: 40
  },
  textWrapper: {
    justifyContent: "center",
    flex: 1
  }
});
