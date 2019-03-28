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
import { View, StyleSheet, LayoutRectangle } from "react-native";
import { connect } from "react-redux";
import { Dispatch } from "redux";
import { MenuProvider } from "react-native-popup-menu";

import AppNavigator from "../navigators";
import Titlebar from "./Titlebar";
import Viewer from "./Viewer";
import colorStyle from "../styles/color";
import { SettingState } from "../modules/setting";
import { ViewerState, ViewerActions } from "../modules/viewer";
import { WindowState } from "../modules/window";
import { toastOptions } from "../config/constants";

type Props = {
  dispatch: Dispatch;
  setting: SettingState & {
    docking?: boolean;
  };
  viewer: ViewerState;
  window: WindowState;
};
type State = {
  viewerLayout: LayoutRectangle;
};
class Main extends Component<Props, State> {
  state = {
    viewerLayout: { x: 0, y: 0, width: 0, height: 0 }
  };
  layoutCallbackId?: number;

  render() {
    const { viewer } = this.props;
    const { mode } = viewer;
    switch (mode) {
      case "view": {
        return (
          <MenuProvider backHandler>
            <Viewer />
          </MenuProvider>
        );
      }
      case "child": {
        return (
          <View style={styles.container}>
            <Titlebar />
            <MenuProvider backHandler>
              <Viewer />
            </MenuProvider>
          </View>
        );
      }
      case "stack":
      default: {
        const { setting, viewer } = this.props;
        const { docking = true } = setting;
        const { isOpened, stacking } = viewer;
        const { viewerLayout } = this.state;

        return (
          <View style={styles.container}>
            <Titlebar />
            <View
              style={[colorStyle.bgDark, styles.view]}
              onLayout={({ nativeEvent }) => {
                if (this.layoutCallbackId != null) {
                  clearTimeout(this.layoutCallbackId);
                }
                const { layout } = nativeEvent;
                const { x, y, width, height } = layout;
                this.layoutCallbackId = setTimeout(() => {
                  this.resize({ x, y, width, height });
                }, 200);
              }}
            >
              <View
                style={[
                  styles.content,
                  {
                    right:
                      docking && isOpened && !stacking ? viewerLayout.width : 0
                  }
                ]}
              >
                <MenuProvider backHandler>
                  <AppNavigator />
                </MenuProvider>
              </View>
              {docking && isOpened && stacking && (
                <View style={[colorStyle.bgDark, styles.content]} />
              )}
            </View>
          </View>
        );
      }
    }
  }

  componentDidUpdate() {
    const { setting, viewer } = this.props;
    const { docking = true } = setting;
    const { isOpened, stacking } = viewer;
    const { viewerLayout } = this.state;
    if (docking && isOpened && !stacking) {
      toastOptions.containerStyle = {
        marginLeft: 0,
        marginRight: viewerLayout.width
      };
    } else {
      toastOptions.containerStyle = {};
    }
  }

  componentWillUnmount() {
    clearTimeout(this.layoutCallbackId);
  }

  resize(layout: LayoutRectangle) {
    const { dispatch, window } = this.props;
    const { fullScreen } = window;

    const { x, y, width, height } = layout;
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
    this.setState({ viewerLayout });
    dispatch(ViewerActions.update({ stacking }));
    dispatch(ViewerActions.resize(viewerLayout));
  }
}

export default connect(
  ({
    setting,
    viewer,
    window
  }: {
    setting: SettingState;
    viewer: ViewerState;
    window: WindowState;
  }) => ({
    setting,
    viewer,
    window
  })
)(Main);

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  view: {
    flex: 1
  },
  content: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  }
});
