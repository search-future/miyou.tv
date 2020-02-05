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
import { View, ViewStyle, StyleSheet, StyleProp } from "react-native";
import { Button } from "react-native-elements";
import FontAwesome5Icon from "react-native-vector-icons/FontAwesome5";
import DateTimePicker from "react-native-modal-datetime-picker";

import moment from "../utils/moment-with-locale";

type Props = {
  value?: Date;
  minDate?: Date;
  maxDate?: Date;
  onChange?: (value: Date) => void;
  containerStyle?: StyleProp<ViewStyle>;
  color?: string;
  backgroundColor?: string;
};
type State = {
  isVisible: boolean;
};
export default class DatePicker extends Component<Props, State> {
  state = {
    isVisible: false
  };

  render() {
    const {
      containerStyle,
      color = "#000000",
      backgroundColor = "#ffffff",
      value = new Date(),
      minDate,
      maxDate,
      onChange
    } = this.props;
    const { isVisible } = this.state;
    return (
      <View>
        <Button
          containerStyle={StyleSheet.flatten([
            styles.container,
            containerStyle,
            {
              backgroundColor
            }
          ])}
          buttonStyle={styles.button}
          titleStyle={[styles.title, { color }]}
          title={moment(value).format("YYYY/MM/DD")}
          icon={
            <FontAwesome5Icon
              name="calendar"
              solid
              color={color}
              style={styles.icon}
            />
          }
          onPress={() => {
            this.setState({ isVisible: true });
          }}
        />
        <DateTimePicker
          isVisible={isVisible}
          date={value}
          minimumDate={minDate}
          maximumDate={maxDate}
          onConfirm={date => {
            onChange && onChange(date);
            this.setState({
              isVisible: false
            });
          }}
          onCancel={() => {
            this.setState({
              isVisible: false
            });
          }}
        />
      </View>
    );
  }
}

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
