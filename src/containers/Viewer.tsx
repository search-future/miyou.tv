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
import { ButtonGroup, Image, Text } from "react-native-elements";
import FontAwesome5Icon from "react-native-vector-icons/FontAwesome5";
import { connect } from "react-redux";
import { Dispatch } from "redux";

import ViewerInfo from "./ViewerInfo";
import colorStyle, { dark, grayDark, light } from "../styles/color";
import containerStyle from "../styles/container";
import { SettingState } from "../modules/setting";
import { ViewerState, ViewerActions } from "../modules/viewer";

type Props = {
  dispatch: Dispatch;
  setting: SettingState;
  viewer: ViewerState;
};
type State = {
  containerWidth: number;
  containerHeight: number;
  isLandscape: boolean;
  selectedIndex: number;
};
class Viewer extends Component<Props, State> {
  state = {
    containerWidth: 0,
    containerHeight: 0,
    isLandscape: false,
    selectedIndex: 0
  };
  layoutCallbackId?: number;

  render() {
    const { viewer } = this.props;
    const { programs, index } = viewer;
    const {
      containerWidth,
      containerHeight,
      isLandscape,
      selectedIndex
    } = this.state;
    const program = programs[index];
    const maxScreenHeight = containerHeight / 2 - 40;
    let screenHeight = (containerWidth / 16) * 9;
    if (screenHeight > maxScreenHeight) {
      screenHeight = maxScreenHeight;
    }

    return (
      <View
        style={[colorStyle.bgLight, styles.container]}
        onLayout={({ nativeEvent }) => {
          if (this.layoutCallbackId != null) {
            clearTimeout(this.layoutCallbackId);
          }
          const { layout } = nativeEvent;
          const containerWidth = layout.width;
          const containerHeight = layout.height;
          const isLandscape =
            Platform.OS === "web"
              ? layout.width > breakpoint
              : layout.width > layout.height;
          this.layoutCallbackId = setTimeout(() => {
            this.setState({ containerWidth, containerHeight, isLandscape });
          }, 200);
        }}
      >
        {program && containerWidth > 0 && (
          <View
            style={
              isLandscape ? [containerStyle.row, styles.view] : styles.view
            }
          >
            <View
              style={[isLandscape ? styles.primaryColumn : styles.primaryRow]}
            >
              <View
                style={[isLandscape ? { flex: 1 } : { height: screenHeight }]}
              >
                <Image
                  containerStyle={[styles.screenContent, styles.imageContainer]}
                  style={styles.image}
                  source={{ uri: program.preview }}
                  resizeMode="contain"
                />
              </View>
              <View
                style={[
                  containerStyle.row,
                  containerStyle.nowrap,
                  colorStyle.bgDark,
                  isLandscape && styles.primaryHeaderExpand
                ]}
              >
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => {
                    this.close();
                  }}
                >
                  <FontAwesome5Icon
                    name="chevron-circle-left"
                    solid
                    color={light}
                    size={24}
                  />
                </TouchableOpacity>
                <Text h4 style={[colorStyle.light, styles.title]}>
                  {program.rank ? `${program.rank}. ` : ""}
                  {program.fullTitle}
                </Text>
              </View>
              {programs[index - 1] && (
                <TouchableOpacity
                  style={[styles.button, styles.buttonPrevious]}
                  onPress={() => {
                    const { viewer } = this.props;
                    const { index = 0 } = viewer;
                    this.setIndex(index - 1);
                  }}
                >
                  <FontAwesome5Icon
                    name="chevron-left"
                    solid
                    style={styles.iconShadow}
                    size={24}
                    color={light}
                  />
                </TouchableOpacity>
              )}
              {programs[index + 1] && (
                <TouchableOpacity
                  style={[styles.button, styles.buttonNext]}
                  onPress={() => {
                    const { viewer } = this.props;
                    const { index = 0 } = viewer;
                    this.setIndex(index + 1);
                  }}
                >
                  <FontAwesome5Icon
                    name="chevron-right"
                    solid
                    style={styles.iconShadow}
                    color={light}
                    size={24}
                  />
                </TouchableOpacity>
              )}
            </View>
            <View
              style={[
                colorStyle.bgDark,
                isLandscape ? styles.secondaryColumn : styles.secondaryRow
              ]}
            >
              <ButtonGroup
                containerStyle={[colorStyle.bgDark, colorStyle.borderGrayDark]}
                containerBorderRadius={0}
                selectedButtonStyle={colorStyle.bgBlack}
                innerBorderStyle={{ color: grayDark }}
                buttons={[
                  {
                    element: () => <Text style={colorStyle.light}>情報</Text>
                  }
                ]}
                selectedIndex={selectedIndex}
                onPress={selectedIndex => {
                  this.setState({ selectedIndex });
                }}
              />
              {selectedIndex === 0 && <ViewerInfo />}
            </View>
          </View>
        )}
      </View>
    );
  }

  componentWillUnmount() {
    clearTimeout(this.layoutCallbackId);
  }

  close() {
    const { dispatch } = this.props;
    dispatch(ViewerActions.close());
  }

  setIndex(value: number) {
    let index = value;
    const { dispatch, viewer } = this.props;
    const { programs = [], index: current } = viewer;

    if (index >= programs.length) {
      index = programs.length - 1;
    }
    if (index < 0) {
      index = 0;
    }
    if (index !== current) {
      dispatch(ViewerActions.update({ index }));
    }
  }
}

export default connect(
  ({ setting, viewer }: { setting: SettingState; viewer: ViewerState }) => ({
    setting,
    viewer
  })
)(Viewer);

const breakpoint = 640;

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  title: {
    flex: 1,
    marginHorizontal: 16,
    height: 30,
    overflow: "hidden"
  },
  view: {
    flex: 1,
    alignItems: "stretch"
  },
  primaryRow: {
    flexDirection: "column-reverse"
  },
  secondaryRow: {
    flex: 1
  },
  primaryColumn: {
    flex: 5
  },
  secondaryColumn: {
    flex: 4,
    maxWidth: 480
  },
  primaryHeaderExpand: {
    backgroundColor: "#3a3a3aa8",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  screenContent: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  imageContainer: {
    backgroundColor: "#000000"
  },
  image: {
    flex: 1
  },
  iconShadow: {
    opacity: 0.6,
    textShadowColor: dark,
    textShadowOffset: {
      height: 1,
      width: 1
    },
    textShadowRadius: 5
  },
  button: {
    alignItems: "center",
    flexDirection: "row",
    height: 40,
    justifyContent: "center",
    width: 40
  },
  buttonPrevious: {
    left: 0,
    position: "absolute",
    top: 40
  },
  buttonNext: {
    position: "absolute",
    right: 0,
    top: 40
  }
});
