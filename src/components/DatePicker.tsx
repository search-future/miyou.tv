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

import React, { useState, useCallback, useMemo } from "react";
import { ViewStyle, StyleSheet, StyleProp } from "react-native";
import { Button } from "react-native-elements";
import FontAwesome5Icon from "react-native-vector-icons/FontAwesome5";
import DateTimePicker from "react-native-modal-datetime-picker";

import moment from "../utils/moment-with-locale";

type Props = {
  value?: Date;
  minDate?: Date;
  maxDate?: Date;
  onChange?: (value: Date) => void;
  containerStyle?: ViewStyle | StyleProp<ViewStyle>;
  color?: string;
  backgroundColor?: string;
};
const DatePicker = ({
  containerStyle,
  color = "#000000",
  backgroundColor = "#ffffff",
  value = new Date(),
  minDate,
  maxDate,
  onChange
}: Props) => {
  const [visible, setVisible] = useState(false);
  const title = useMemo(() => moment(value).format("YYYY/MM/DD"), [value]);
  const Icon = useMemo(
    () => (
      <FontAwesome5Icon
        name="calendar"
        solid
        color={color}
        style={styles.icon}
      />
    ),
    [color]
  );
  const onPress = useCallback(() => {
    setVisible(true);
  }, []);
  const onConfirm = useCallback(
    (date: Date) => {
      setVisible(false);
      onChange && onChange(date);
    },
    [onChange]
  );
  const onCancel = useCallback(() => {
    setVisible(false);
  }, []);

  return (
    <>
      <Button
        containerStyle={StyleSheet.flatten([
          styles.container,
          containerStyle,
          {
            backgroundColor
          }
        ])}
        buttonStyle={styles.button}
        titleStyle={[{ color }]}
        title={title}
        icon={Icon}
        onPress={onPress}
      />
      <DateTimePicker
        isVisible={visible}
        date={value}
        minimumDate={minDate}
        maximumDate={maxDate}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </>
  );
};
export default DatePicker;

const styles = StyleSheet.create({
  container: {
    borderRadius: 0,
    borderWidth: 0
  },
  button: {
    backgroundColor: "transparent",
    height: 32,
    justifyContent: "flex-start",
    paddingVertical: 0
  },
  title: {
    fontSize: 16
  },
  icon: {
    width: 32,
    paddingHorizontal: 3
  }
});
