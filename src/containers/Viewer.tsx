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

import CommentPlayer from "./CommentPlayer";
import Controller from "./Controller";
import Player from "./Player";
import PlayerContainer from "./PlayerContainer";
import Seekbar from "./Seekbar";
import ViewerInfo from "./ViewerInfo";
import colorStyle, { dark, grayDark, light } from "../styles/color";
import containerStyle from "../styles/container";
import { SettingState } from "../modules/setting";
import { ViewerState, ViewerActions } from "../modules/viewer";
import CommentInfo from "./CommentInfo";

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
    selectedIndex: Platform.OS === "web" ? 1 : 0
  };
  layoutCallbackId?: number;

  render() {
    const { setting, viewer } = this.props;
    const { viewer: viewerSetting = {}, commentPlayer = {} } = setting;
    const { enabled: comment = true } = commentPlayer;
    const { programs, index, mode, playing, control } = viewer;
    const {
      containerWidth,
      containerHeight,
      isLandscape,
      selectedIndex
    } = this.state;
    const program = programs[index];

    let screenHeight = containerHeight;
    const expand = viewerSetting.expand && viewer.playing;
    if (!expand) {
      screenHeight = (containerWidth / 16) * 9;
      const maxScreenHeight = containerHeight / 2 - 40;
      if (screenHeight > maxScreenHeight) {
        screenHeight = maxScreenHeight;
      }
    }
    const tabIndex = playing ? selectedIndex : 0;

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
                <View
                  style={[
                    containerStyle.row,
                    containerStyle.center,
                    styles.screenContent
                  ]}
                >
                  <TouchableOpacity
                    style={styles.button}
                    onPress={() => {
                      const { dispatch } = this.props;
                      dispatch(
                        ViewerActions.update({ playing: true, peakPlay: false })
                      );
                    }}
                  >
                    <FontAwesome5Icon
                      name="play"
                      solid
                      color={light}
                      size={24}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.button}
                    onPress={() => {
                      const { dispatch, viewer } = this.props;
                      const { programs, index } = viewer;
                      const program = programs[index];
                      let extraIndex = 0;
                      if (
                        program &&
                        program.recorded &&
                        program.commentMaxSpeedTime
                      ) {
                        const peakTime = new Date(
                          program.commentMaxSpeedTime
                        ).getTime();
                        for (let i = 0; i < program.recorded.length; i++) {
                          const extraProgram = program.recorded[i];
                          const start = new Date(extraProgram.start).getTime();
                          const end = new Date(extraProgram.end).getTime();
                          if (start <= peakTime && end > peakTime) {
                            extraIndex = i;
                            break;
                          }
                        }
                      }
                      dispatch(
                        ViewerActions.update({
                          playing: true,
                          peakPlay: true,
                          extraIndex
                        })
                      );
                    }}
                  >
                    <FontAwesome5Icon
                      name="star"
                      solid
                      color={light}
                      size={24}
                    />
                  </TouchableOpacity>
                </View>
                {playing && (
                  <PlayerContainer style={styles.screenContent}>
                    <Player />
                    {comment && (
                      <View style={styles.screenContent}>
                        <CommentPlayer />
                      </View>
                    )}
                  </PlayerContainer>
                )}
                {playing && control && (
                  <View style={styles.control}>
                    <Seekbar />
                    <Controller />
                  </View>
                )}
              </View>
              {(!playing || control || (!expand && !isLandscape)) && (
                <View
                  style={[
                    containerStyle.row,
                    containerStyle.nowrap,
                    colorStyle.bgDark,
                    (expand || isLandscape) && styles.primaryHeaderExpand
                  ]}
                >
                  {mode === "stack" && (
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
                  )}
                  {mode === "view" && (
                    <TouchableOpacity
                      style={styles.button}
                      onPress={() => {
                        this.undock();
                      }}
                    >
                      <FontAwesome5Icon
                        name="external-link-alt"
                        solid
                        color={light}
                        size={24}
                      />
                    </TouchableOpacity>
                  )}
                  {mode === "child" && (
                    <TouchableOpacity
                      style={styles.button}
                      onPress={() => {
                        this.dock();
                      }}
                    >
                      <FontAwesome5Icon
                        name="columns"
                        solid
                        color={light}
                        size={24}
                      />
                    </TouchableOpacity>
                  )}
                  <Text h4 style={[colorStyle.light, styles.title]}>
                    {program.rank ? `${program.rank}. ` : ""}
                    {program.fullTitle}
                  </Text>
                  {mode === "view" && (
                    <TouchableOpacity
                      style={styles.button}
                      onPress={() => {
                        this.close();
                      }}
                    >
                      <FontAwesome5Icon
                        name="times"
                        solid
                        color={light}
                        size={24}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              )}
              {(!playing || control) && programs[index - 1] && (
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
              {(!playing || control) && programs[index + 1] && (
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
            {!expand && (
              <View
                style={[
                  colorStyle.bgDark,
                  isLandscape ? styles.secondaryColumn : styles.secondaryRow
                ]}
              >
                <ButtonGroup
                  containerStyle={[
                    colorStyle.bgDark,
                    colorStyle.borderGrayDark
                  ]}
                  containerBorderRadius={0}
                  selectedButtonStyle={colorStyle.bgBlack}
                  innerBorderStyle={{ color: grayDark }}
                  buttons={[
                    {
                      element: () => <Text style={colorStyle.light}>情報</Text>
                    },
                    {
                      element: () => (
                        <Text style={colorStyle.light}>コメント</Text>
                      )
                    }
                  ]}
                  selectedIndex={tabIndex}
                  onPress={selectedIndex => {
                    this.setState({ selectedIndex });
                  }}
                />
                {tabIndex === 0 && <ViewerInfo />}
                {tabIndex === 1 && <CommentInfo />}
              </View>
            )}
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

  dock() {
    const { dispatch } = this.props;
    dispatch(ViewerActions.dock());
  }

  undock() {
    const { dispatch } = this.props;
    dispatch(ViewerActions.undock());
  }

  setIndex(value: number) {
    let index = value;
    const { dispatch, viewer } = this.props;
    const { programs = [], index: current, peakPlay } = viewer;

    if (index >= programs.length) {
      index = programs.length - 1;
    }
    if (index < 0) {
      index = 0;
    }
    if (index !== current) {
      let extraIndex = 0;
      const program = programs[index];
      if (
        peakPlay &&
        program &&
        program.recorded &&
        program.commentMaxSpeedTime
      ) {
        const peakTime = new Date(program.commentMaxSpeedTime).getTime();
        for (let i = 0; i < program.recorded.length; i++) {
          const extraProgram = program.recorded[i];
          const start = new Date(extraProgram.start).getTime();
          const end = new Date(extraProgram.end).getTime();
          if (start <= peakTime && end > peakTime) {
            extraIndex = i;
            break;
          }
        }
      }
      dispatch(ViewerActions.update({ index, extraIndex }));
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
  control: {
    backgroundColor: "#3a3a3aa8",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0
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
