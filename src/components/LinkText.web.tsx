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

import React, { useCallback, PropsWithChildren } from "react";
import { TouchableOpacity, StyleProp, ViewStyle } from "react-native";
import { Text, TextProps } from "react-native-elements";
import { remote } from "electron";

type Props = PropsWithChildren<
  {
    activeOpacity?: number;
    containerStyle?: StyleProp<ViewStyle>;
    url: string;
  } & TextProps
>;
const CustomLink = ({
  activeOpacity,
  containerStyle,
  url,
  ...props
}: Props) => {
  const openUrl = useCallback(() => {
    remote.shell.openExternal(url);
  }, [url]);

  return (
    <TouchableOpacity
      activeOpacity={activeOpacity}
      style={containerStyle}
      onPress={openUrl}
    >
      <Text {...props} />
    </TouchableOpacity>
  );
};
export default CustomLink;
