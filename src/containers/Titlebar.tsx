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

import React, { memo, useState, useEffect, useCallback, useRef } from "react";
import {
  TouchableOpacity,
  View,
  StyleSheet,
  LayoutChangeEvent
} from "react-native";
import { Image, Text } from "react-native-elements";
import FontAwesome5Icon from "react-native-vector-icons/FontAwesome5";
import { useDispatch, useSelector } from "react-redux";

import colorStyle, { active, black, dark, light } from "../styles/color";
import containerStyle from "../styles/container";
import { RootState } from "../modules";
import { WindowActions } from "../modules/window";
import { appName } from "../config/constants";

const Titlebar = memo(() => {
  const layoutCallbackId = useRef<number>();

  const dispatch = useDispatch();
  const alwaysOnTop = useSelector<RootState, boolean>(
    ({ window }) => window.alwaysOnTop
  );
  const fullScreen = useSelector<RootState, boolean>(
    ({ window }) => window.fullScreen
  );
  const maximized = useSelector<RootState, boolean>(
    ({ window }) => window.maximized
  );
  const title = useSelector<RootState, string>(({ window }) => window.title);

  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(
    () => () => {
      clearTimeout(layoutCallbackId.current);
    },
    []
  );

  const onLayout = useCallback(({ nativeEvent }: LayoutChangeEvent) => {
    if (layoutCallbackId.current != null) {
      clearTimeout(layoutCallbackId.current);
    }
    const { layout } = nativeEvent;
    const containerWidth = layout.width;
    layoutCallbackId.current = setTimeout(() => {
      setContainerWidth(containerWidth);
    }, 200);
  }, []);
  const toggleAlwaysOnTop = useCallback(() => {
    dispatch(WindowActions.setAlwaysOnTop(!alwaysOnTop));
  }, [alwaysOnTop]);
  const minimize = useCallback(() => {
    dispatch(WindowActions.minimize());
  }, []);
  const restore = useCallback(() => {
    dispatch(WindowActions.restore());
  }, []);
  const maximize = useCallback(() => {
    dispatch(WindowActions.maximize());
  }, []);
  const toggleFullScreen = useCallback(() => {
    dispatch(WindowActions.setFullScreen(!fullScreen));
  }, [fullScreen]);
  const close = useCallback(() => {
    dispatch(WindowActions.close());
  }, []);

  if (fullScreen) {
    return null;
  }
  return (
    <div className="titlebar">
      <style>{cssStyles}</style>
      <View
        style={[containerStyle.row, colorStyle.bgBlack]}
        onLayout={onLayout}
      >
        <View
          style={[styles.contents, containerStyle.row, containerStyle.left]}
        >
          <Image
            containerStyle={styles.iconContainer}
            placeholderStyle={colorStyle.bgTransparent}
            style={styles.icon}
            source={require("../../assets/icon_16x16.png")}
            resizeMode="center"
          />
        </View>
        {containerWidth > breakpoint && (
          <View
            style={[styles.contents, containerStyle.row, containerStyle.center]}
          >
            <Text style={[colorStyle.light, styles.title]}>
              {title || appName}
            </Text>
          </View>
        )}
        <View
          style={[styles.contents, containerStyle.row, containerStyle.right]}
        >
          <div className="button">
            <TouchableOpacity style={styles.button} onPress={toggleAlwaysOnTop}>
              <FontAwesome5Icon
                name="thumbtack"
                solid
                color={alwaysOnTop ? active : light}
              />
            </TouchableOpacity>
          </div>
          <div className="button">
            <TouchableOpacity style={styles.button} onPress={minimize}>
              <FontAwesome5Icon name="window-minimize" solid color={light} />
            </TouchableOpacity>
          </div>
          {maximized ? (
            <div className="button">
              <TouchableOpacity style={styles.button} onPress={restore}>
                <FontAwesome5Icon name="window-restore" solid color={light} />
              </TouchableOpacity>
            </div>
          ) : (
            <div className="button">
              <TouchableOpacity style={styles.button} onPress={maximize}>
                <FontAwesome5Icon name="window-maximize" solid color={light} />
              </TouchableOpacity>
            </div>
          )}
          <div className="button">
            <TouchableOpacity style={styles.button} onPress={toggleFullScreen}>
              <FontAwesome5Icon name="square-full" solid color={light} />
            </TouchableOpacity>
          </div>
          <div className="button close">
            <TouchableOpacity style={styles.button} onPress={close}>
              <FontAwesome5Icon name="times" solid color={light} />
            </TouchableOpacity>
          </div>
        </View>
      </View>
    </div>
  );
});
export default Titlebar;

const breakpoint = 768;
const styles = StyleSheet.create({
  contents: {
    flex: 1
  },
  iconContainer: {
    alignItems: "center",
    height: 24,
    justifyContent: "center",
    width: 24
  },
  icon: {
    height: 16,
    width: 16
  },
  title: {
    height: 19,
    overflow: "hidden"
  },
  button: {
    alignItems: "center",
    flexDirection: "row",
    height: 24,
    justifyContent: "center",
    width: 32
  }
});

const cssStyles = `
  #react-app{
    border: 2px solid ${dark};
  }

  .titlebar {
    border-bottom: 2px solid ${black};
    user-select: none;
    -webkit-app-region: drag;
  }

  .titlebar .button {
    -webkit-app-region: no-drag;
  }
  .titlebar .button:hover {
    background-color: #070707;
  }
  .titlebar .close:hover {
    background-color: #d32535;
  }
`;
