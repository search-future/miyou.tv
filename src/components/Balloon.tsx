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
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  ViewStyle,
  StyleSheet,
  StyleProp,
  TextStyle
} from "react-native";
import { Text } from "react-native-elements";

type Props = {
  color?: string;
  backgroundColor?: string;
  pointing?: "left" | "right" | "center";
  wrapperStyle?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  triangleStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
} & TouchableOpacityProps;
export default class Balloon extends Component<Props> {
  render() {
    const {
      children,
      color = "#000000",
      backgroundColor = "#ffff00",
      pointing,
      wrapperStyle,
      containerStyle,
      triangleStyle,
      textStyle,
      onPress,
      onLongPress
    } = this.props;
    const pointingStyle: StyleProp<ViewStyle> = {
      borderTopColor: backgroundColor
    };
    if (pointing === "left") {
      pointingStyle.borderLeftWidth = 0;
      pointingStyle.borderRightWidth = 8;
    } else if (pointing === "right") {
      pointingStyle.borderLeftWidth = 8;
      pointingStyle.borderRightWidth = 0;
    }
    const Wrapper: any = onPress || onLongPress ? TouchableOpacity : View;
    return (
      <Wrapper
        style={[styles.wrapper, wrapperStyle]}
        onPress={onPress}
        onLongPress={onLongPress}
      >
        <View style={[styles.container, { backgroundColor }, containerStyle]}>
          <Text
            style={StyleSheet.flatten([styles.text, { color }, textStyle])}
            children={children}
          />
        </View>
        <View style={[styles.triangle, pointingStyle, triangleStyle]} />
      </Wrapper>
    );
  }
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    backgroundColor: "transparent"
  },
  container: {
    borderRadius: 10,
    padding: 1,
    paddingLeft: 8,
    paddingRight: 8
  },
  triangle: {
    borderLeftWidth: 4,
    borderLeftColor: "transparent",
    borderRightWidth: 4,
    borderRightColor: "transparent",
    borderTopWidth: 8,
    borderTopColor: "transparent",
    height: 0,
    top: 0,
    width: 0
  },
  text: {
    textAlign: "center"
  }
});
