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

import React, { useContext, useCallback, ChangeEvent } from "react";
import { View } from "react-native";
import { SliderProps, ThemeContext } from "react-native-elements";

type Props = SliderProps & {
  thumbRound?: boolean;
};
const CustomSlider = ({
  disabled,
  maximumValue,
  minimumValue,
  step,
  style,
  thumbTintColor = "",
  value,
  onValueChange,
  thumbRound = false
}: Props) => {
  const { theme } = useContext(ThemeContext);

  const cssStyles = `
    .slider {
      padding: 0;
      flex: 1;
      min-width: 0;
      outline: none;
      border-color: transparent;
      background-color: transparent;

      -webkit-appearance: none;
    }
    .slider:focus {
      outline: none;
    }
    .slider::-webkit-slider-runnable-track {
      height: 1px;
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.2);
      cursor: pointer;
    }
    .slider::-webkit-slider-thumb {
      background: ${
        thumbTintColor || theme.Slider?.thumbTintColor || "#ff0000"
      };
      position: relative;
      top: -8px;
      width: 8px;
      height: 16px;
      cursor: pointer;

      -webkit-appearance: none;
    }

    .slider.slider-round::-webkit-slider-thumb {
      width: 16px;
      border-radius: 16px;
    }
  `;

  const onChange = useCallback(
    ({ currentTarget }: ChangeEvent<HTMLInputElement>) => {
      const { value } = currentTarget;
      if (onValueChange) {
        onValueChange(parseFloat(value));
      } else if (theme.Slider?.onValueChange) {
        theme.Slider.onValueChange(parseFloat(value));
      }
    },
    [onValueChange]
  );

  return (
    <View style={style}>
      <style>{cssStyles}</style>
      <input
        type="range"
        className={thumbRound ? "slider slider-round" : "slider"}
        disabled={disabled != null ? disabled : theme.Slider?.disabled}
        max={maximumValue || theme.Slider?.maximumValue}
        min={minimumValue || theme.Slider?.minimumValue}
        step={step || theme.Slider?.step}
        value={`${value || theme.Slider?.value}`}
        onChange={onChange}
      />
    </View>
  );
};
export default CustomSlider;
