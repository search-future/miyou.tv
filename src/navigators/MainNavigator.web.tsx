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

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useContext
} from "react";
import {
  View,
  StyleSheet,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle
} from "react-native";
import { ThemeContext } from "react-native-elements";
import { useDispatch, useSelector } from "react-redux";
import { MenuProvider } from "react-native-popup-menu";

import Titlebar from "../containers/Titlebar";
import Viewer from "../containers/Viewer";
import { RootState } from "../modules";
import { SettingState } from "../modules/setting";
import { ViewerActions } from "../modules/viewer";
import { toastOptions } from "../config/constants";
import { NavigationContainer } from "@react-navigation/native";
import navigationRef from "./navigation";
import StackNavigator from "./StackNavigator";
import containerStyle from "../styles/container";

type Setting = SettingState & {
  docking?: boolean;
};
type State = RootState & {
  setting: Setting;
};

const MainNavigator = () => {
  const mode = useSelector<State, string>(({ viewer: { mode } }) => mode);
  switch (mode) {
    case "view": {
      return <ChildView />;
    }
    case "child": {
      return <ChildWindow />;
    }
    case "stack":
    default: {
      return <MainWindow />;
    }
  }
};
export default MainNavigator;

const ChildView = () => (
  <MenuProvider backHandler>
    <Viewer />
  </MenuProvider>
);

const ChildWindow = () => (
  <>
    <Titlebar />
    <MenuProvider backHandler>
      <Viewer />
    </MenuProvider>
  </>
);

const MainWindow = () => {
  const layoutCallbackId = useRef<number>();

  const dispatch = useDispatch();
  const docking = useSelector<State, boolean>(
    ({ setting }) => setting.docking == null || setting.docking
  );
  const isOpened = useSelector<State, boolean>(({ viewer }) => viewer.isOpened);
  const stacking = useSelector<State, boolean>(({ viewer }) => viewer.stacking);
  const fullScreen = useSelector<State, boolean>(
    ({ window }) => window.fullScreen
  );

  const [viewerLayout, setViewerLayout] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0
  });

  const { theme } = useContext(ThemeContext);

  const mainViewStyle: StyleProp<ViewStyle> =
    docking && isOpened && !stacking
      ? {
          borderColor: theme.colors?.appBorder,
          borderRightWidth: 1,
          right: viewerLayout.width
        }
      : null;
  const covered = docking && isOpened && stacking;

  useEffect(
    () => () => {
      clearTimeout(layoutCallbackId.current);
    },
    []
  );
  useEffect(() => {
    if (docking && isOpened && !stacking) {
      toastOptions.containerStyle = {
        marginLeft: 0,
        marginRight: viewerLayout.width
      };
    } else {
      toastOptions.containerStyle = {};
    }
  }, [docking, isOpened, stacking]);

  const onLayout = useCallback(
    ({ nativeEvent }: LayoutChangeEvent) => {
      if (layoutCallbackId.current != null) {
        clearTimeout(layoutCallbackId.current);
      }
      const { layout } = nativeEvent;
      const { x, y, width, height } = layout;
      layoutCallbackId.current = setTimeout(() => {
        const viewerLayout = {
          x: Math.floor(x),
          y: Math.floor(y),
          width: Math.ceil(width),
          height: Math.ceil(height)
        };
        let stacking = true;
        if (!fullScreen) {
          stacking = false;
          if (width > 1920) {
            viewerLayout.width = Math.ceil((width * 2) / 5);
          } else if (width > 1280) {
            viewerLayout.width = Math.ceil(width / 2);
          } else if (width > 768) {
            viewerLayout.width = Math.ceil((width * 3) / 5);
          } else if (width > 540) {
            viewerLayout.width = 320;
          } else {
            stacking = true;
          }
          viewerLayout.x = Math.floor(width - viewerLayout.width);
          viewerLayout.x += 2;
          viewerLayout.y += 2;
          viewerLayout.height += 1;
        }
        setViewerLayout(viewerLayout);
        dispatch(ViewerActions.update({ stacking }));
        dispatch(ViewerActions.resize(viewerLayout));
      }, 200);
    },
    [fullScreen]
  );

  return (
    <>
      <Titlebar />
      <View style={[containerStyle.container]} onLayout={onLayout}>
        <View style={[StyleSheet.absoluteFill, mainViewStyle]}>
          <MenuProvider backHandler>
            <NavigationContainer ref={navigationRef} theme={theme.Navigation}>
              <StackNavigator />
            </NavigationContainer>
          </MenuProvider>
        </View>
        {covered && <View style={[StyleSheet.absoluteFill]} />}
      </View>
    </>
  );
};
