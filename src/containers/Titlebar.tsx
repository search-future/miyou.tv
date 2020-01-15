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
import { TouchableOpacity, View, StyleSheet, Platform } from "react-native";
import { Image, Text } from "react-native-elements";
import FontAwesome5Icon from "react-native-vector-icons/FontAwesome5";
import { connect } from "react-redux";
import { Dispatch } from "redux";

import colorStyle, { active, black, dark, light } from "../styles/color";
import containerStyle from "../styles/container";
import { WindowActions, WindowState } from "../modules/window";
import { appName } from "../config/constants";

type Props = {
  dispatch: Dispatch;
  window: WindowState;
};
type State = {
  containerWidth: number;
};
class Titlebar extends Component<Props, State> {
  state = {
    containerWidth: 0
  };
  layoutCallbackId?: number;

  render() {
    const { window } = this.props;
    const { containerWidth } = this.state;
    const { alwaysOnTop, fullScreen, maximized, title } = window;
    if (Platform.OS !== "web" || fullScreen) {
      return null;
    }
    return (
      <div className="titlebar">
        <style>{cssStyles}</style>
        <View
          style={[containerStyle.row, colorStyle.bgBlack]}
          onLayout={({ nativeEvent }) => {
            if (this.layoutCallbackId != null) {
              clearTimeout(this.layoutCallbackId);
            }
            const { layout } = nativeEvent;
            const containerWidth = layout.width;
            this.layoutCallbackId = setTimeout(() => {
              this.setState({ containerWidth });
            }, 200);
          }}
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
              style={[
                styles.contents,
                containerStyle.row,
                containerStyle.center
              ]}
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
              <TouchableOpacity
                style={styles.button}
                onPress={() => {
                  const { dispatch, window } = this.props;
                  const { alwaysOnTop } = window;
                  dispatch(WindowActions.setAlwaysOnTop(!alwaysOnTop));
                }}
              >
                <FontAwesome5Icon
                  name="thumbtack"
                  solid
                  color={alwaysOnTop ? active : light}
                />
              </TouchableOpacity>
            </div>
            <div className="button">
              <TouchableOpacity
                style={styles.button}
                onPress={() => {
                  const { dispatch } = this.props;
                  dispatch(WindowActions.minimize());
                }}
              >
                <FontAwesome5Icon name="window-minimize" solid color={light} />
              </TouchableOpacity>
            </div>

            {maximized ? (
              <div className="button">
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => {
                    const { dispatch } = this.props;
                    dispatch(WindowActions.restore());
                  }}
                >
                  <FontAwesome5Icon name="window-restore" solid color={light} />
                </TouchableOpacity>
              </div>
            ) : (
              <div className="button">
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => {
                    const { dispatch } = this.props;
                    dispatch(WindowActions.maximize());
                  }}
                >
                  <FontAwesome5Icon
                    name="window-maximize"
                    solid
                    color={light}
                  />
                </TouchableOpacity>
              </div>
            )}
            <div className="button">
              <TouchableOpacity
                style={styles.button}
                onPress={() => {
                  const { dispatch, window } = this.props;
                  const { fullScreen } = window;
                  dispatch(WindowActions.setFullScreen(!fullScreen));
                }}
              >
                <FontAwesome5Icon name="square-full" solid color={light} />
              </TouchableOpacity>
            </div>
            <div className="button close">
              <TouchableOpacity
                style={styles.button}
                onPress={() => {
                  const { dispatch } = this.props;
                  dispatch(WindowActions.close());
                }}
              >
                <FontAwesome5Icon name="times" solid color={light} />
              </TouchableOpacity>
            </div>
          </View>
        </View>
      </div>
    );
  }

  componentWillUnmount() {
    clearTimeout(this.layoutCallbackId);
  }
}

export default connect(({ window }: { window: WindowState }) => ({ window }))(
  Titlebar
);

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
