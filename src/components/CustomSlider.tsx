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

import React from "react";
import { StyleSheet } from "react-native";
import { Slider, SliderProps } from "react-native-elements";

type Props = SliderProps & {
  thumbRound?: boolean;
};
const CustomSlider = ({ thumbStyle, thumbRound, ...props }: Props) => (
  <Slider
    thumbStyle={thumbRound ? [thumbStyle] : [styles.thumbSquare, thumbStyle]}
    {...props}
  />
);
export default CustomSlider;

const styles = StyleSheet.create({
  thumbSquare: {
    borderRadius: 0,
    width: 8
  }
});
