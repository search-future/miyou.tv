/*!
Copyright 2016-2023 Brazil Ltd.
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

import React, { useCallback, PropsWithChildren, useContext } from "react";
import {
  Pressable,
  PressableStateCallbackType,
  StyleProp,
  ViewStyle
} from "react-native";
import { Text, TextProps, ThemeContext } from "react-native-elements";

type Props = PropsWithChildren<
  {
    activeOpacity?: number;
    containerStyle?: StyleProp<ViewStyle>;
    url: string;
  } & TextProps
>;
const LinkText = ({
  activeOpacity,
  containerStyle,
  url,
  style,
  ...props
}: Props) => {
  const { theme } = useContext(ThemeContext);

  const pressableStyle = useCallback<
    (state: PressableStateCallbackType) => StyleProp<ViewStyle>
  >(
    ({ pressed }) => [containerStyle, pressed && { opacity: activeOpacity }],
    [containerStyle, activeOpacity]
  );
  const openUrl = useCallback(() => {
    window.utils.openExternal(url);
  }, [url]);

  return (
    <Pressable style={pressableStyle} onPress={openUrl}>
      <Text style={[{ color: theme.colors?.primary }, style]} {...props} />
    </Pressable>
  );
};
export default LinkText;
