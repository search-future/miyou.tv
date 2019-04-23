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
import {
  Switch,
  TouchableOpacity,
  View,
  StyleSheet,
  Platform
} from "react-native";
import { Text } from "react-native-elements";
import FontAwesome5Icon from "react-native-vector-icons/FontAwesome5";
import { Menu, MenuTrigger, MenuOptions } from "react-native-popup-menu";
import { connect } from "react-redux";
import { Dispatch } from "redux";

import CustomSlider from "../components/CustomSlider";
import colorStyle, { light } from "../styles/color";
import containerStyle from "../styles/container";
import { SettingState, SettingActions } from "../modules/setting";
import { PlayerState, PlayerActions } from "../modules/player";
import { ViewerState } from "../modules/viewer";
import { WindowState, WindowActions } from "../modules/window";

type Props = {
  dispatch: Dispatch;
  player: PlayerState;
  setting: SettingState & {
    player?: {
      speed?: string;
      mute?: boolean;
      volume?: string;
      deinterlace?: boolean;
      repeat?: string;
    };
    commentPlayer?: {
      enabled?: boolean;
      duration?: string;
      delay?: string;
      maxLines?: string;
      maxComments?: string;
    };
  };
  viewer: ViewerState;
  window: WindowState;
};
class Controller extends Component<Props> {
  options: { [key: string]: string } = {
    "ad-lavc-o": "dual_mono_mode=auto"
  };
  observers: { [name: string]: (value: any) => void } = {};
  dualMonoTable: { [key: string]: string } = {
    auto: "自動",
    both: "主/副",
    main: "主音声",
    sub: "副音声"
  };
  repeatTable: { [key: string]: string } = {
    stop: "停止",
    continue: "連続再生",
    repeat: "リピート"
  };

  render() {
    const { player, setting, window } = this.props;
    const { pause, track, trackCount, dualMonoMode } = player;
    const {
      player: playerSetting = {},
      viewer: viewerSetting = {},
      commentPlayer: commentPlayerSetting = {}
    } = setting;
    const {
      speed = "1",
      mute = false,
      volume = "100",
      deinterlace = true,
      repeat = "continue"
    } = playerSetting;
    const { expand = false } = viewerSetting;
    const {
      enabled: comment = true,
      maxLines = "10",
      maxComments = "50",
      duration = "5000",
      delay = "0"
    } = commentPlayerSetting;
    const { fullScreen } = window;

    let volumeIcon = "volume-off";
    if (mute) {
      volumeIcon = "volume-mute";
    } else if (parseInt(volume, 10) > 50) {
      volumeIcon = "volume-up";
    } else if (parseInt(volume, 10) > 0) {
      volumeIcon = "volume-down";
    }

    return (
      <View style={[containerStyle.row, styles.container]}>
        <View style={[containerStyle.row, containerStyle.left, styles.left]}>
          <Menu>
            <MenuTrigger customStyles={{ triggerWrapper: styles.button }}>
              <FontAwesome5Icon
                name={volumeIcon}
                solid
                color={light}
                size={24}
              />
            </MenuTrigger>
            <MenuOptions>
              <View
                style={[
                  containerStyle.row,
                  colorStyle.bgBlack,
                  styles.optionRow
                ]}
              >
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => {
                    const { dispatch, setting } = this.props;
                    const { player = {} } = setting;
                    const { mute = false } = player;
                    dispatch(SettingActions.update("player", { mute: !mute }));
                  }}
                >
                  <FontAwesome5Icon
                    name={volumeIcon}
                    solid
                    color={light}
                    size={24}
                  />
                </TouchableOpacity>
                <CustomSlider
                  style={styles.slider}
                  maximumValue={100}
                  minimumValue={0}
                  step={1}
                  value={parseInt(volume, 10)}
                  maximumTrackTintColor="#ffffff20"
                  minimumTrackTintColor="#ffffffe2"
                  thumbRound
                  onValueChange={volume => {
                    const { dispatch } = this.props;
                    dispatch(SettingActions.update("player", { volume }));
                  }}
                />
              </View>
            </MenuOptions>
          </Menu>
        </View>
        <View
          style={[containerStyle.row, containerStyle.center, styles.center]}
        >
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              const { dispatch, player } = this.props;
              const { time } = player;
              dispatch(PlayerActions.time(time - 10000));
            }}
          >
            <FontAwesome5Icon name="caret-left" solid color={light} size={24} />
            <Text style={colorStyle.light}> 10</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              const { dispatch } = this.props;
              dispatch(PlayerActions.toggle());
            }}
          >
            <FontAwesome5Icon
              name={pause ? "play" : "pause"}
              solid
              color={light}
              size={24}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              const { dispatch, player } = this.props;
              const { time } = player;
              dispatch(PlayerActions.time(time + 30000));
            }}
          >
            <Text style={colorStyle.light}>30 </Text>
            <FontAwesome5Icon
              name="caret-right"
              solid
              color={light}
              size={24}
            />
          </TouchableOpacity>
        </View>
        <View style={[containerStyle.row, containerStyle.right, styles.right]}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              const { dispatch, setting } = this.props;
              const { commentPlayer = {} } = setting;
              const { enabled = true } = commentPlayer;
              dispatch(
                SettingActions.update("commentPlayer", { enabled: !enabled })
              );
            }}
          >
            {comment ? (
              <FontAwesome5Icon
                name="comment-dots"
                solid
                color={light}
                size={24}
              />
            ) : (
              <FontAwesome5Icon
                name="comment-slash"
                solid
                color={light}
                size={24}
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              const { dispatch, setting } = this.props;
              const { viewer = {} } = setting;
              const { expand = false } = viewer;
              dispatch(SettingActions.update("viewer", { expand: !expand }));
            }}
          >
            <FontAwesome5Icon
              name={expand ? "bars" : "arrows-alt"}
              solid
              color={light}
              size={24}
            />
          </TouchableOpacity>
          {Platform.OS === "web" && (
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                const { dispatch, window } = this.props;
                const { fullScreen } = window;
                dispatch(WindowActions.setFullScreen(!fullScreen));
              }}
            >
              <FontAwesome5Icon
                name={fullScreen ? "compress" : "expand"}
                color={light}
                size={24}
              />
            </TouchableOpacity>
          )}
          <Menu>
            <MenuTrigger customStyles={{ triggerWrapper: styles.button }}>
              <FontAwesome5Icon name="cog" solid color={light} size={24} />
            </MenuTrigger>
            <MenuOptions
              customStyles={{ optionsContainer: styles.optionContainer }}
            >
              <View
                style={[
                  containerStyle.row,
                  colorStyle.bgBlack,
                  styles.optionRow
                ]}
              >
                <Text style={[colorStyle.light, styles.optionLabel]}>
                  再生速度
                </Text>
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => {
                    const { dispatch, setting } = this.props;
                    const { player = {} } = setting;
                    const { speed: current = "1" } = player;
                    const speed = parseFloat(current) - 0.1;
                    if (speed > 0) {
                      dispatch(SettingActions.update("player", { speed }));
                    }
                  }}
                >
                  <FontAwesome5Icon
                    name="caret-left"
                    solid
                    color={light}
                    size={24}
                  />
                </TouchableOpacity>
                <Text style={[colorStyle.light, styles.optionValue]}>
                  {parseFloat(speed).toFixed(1)}
                </Text>
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => {
                    const { dispatch, setting } = this.props;
                    const { player = {} } = setting;
                    const { speed: current = "1" } = player;
                    const speed = parseFloat(current) + 0.1;
                    if (speed <= 8) {
                      dispatch(SettingActions.update("player", { speed }));
                    }
                  }}
                >
                  <FontAwesome5Icon
                    name="caret-right"
                    solid
                    color={light}
                    size={24}
                  />
                </TouchableOpacity>
              </View>
              {Platform.OS === "web" && (
                <View
                  style={[
                    containerStyle.row,
                    colorStyle.bgBlack,
                    styles.optionRow
                  ]}
                >
                  <Text style={[colorStyle.light, styles.optionLabel]}>
                    インターレース解除
                  </Text>
                  <Switch
                    style={styles.optionValue}
                    value={deinterlace}
                    onValueChange={deinterlace => {
                      const { dispatch } = this.props;
                      dispatch(
                        SettingActions.update("player", { deinterlace })
                      );
                    }}
                  />
                </View>
              )}
              {trackCount.audio > 1 && (
                <View
                  style={[
                    containerStyle.row,
                    colorStyle.bgBlack,
                    styles.optionRow
                  ]}
                >
                  <Text style={[colorStyle.light, styles.optionLabel]}>
                    音声トラック
                  </Text>
                  <TouchableOpacity
                    style={styles.button}
                    onPress={() => {
                      const { dispatch, player } = this.props;
                      const { track, trackCount } = player;
                      const audiotrack = track.audio - 1;
                      if (audiotrack > 0) {
                        dispatch(PlayerActions.track({ audio: audiotrack }));
                      } else {
                        dispatch(
                          PlayerActions.track({ audio: trackCount.audio })
                        );
                      }
                    }}
                  >
                    <FontAwesome5Icon
                      name="caret-left"
                      solid
                      color={light}
                      size={24}
                    />
                  </TouchableOpacity>
                  <Text style={[colorStyle.light, styles.optionValue]}>
                    {track.audio}
                  </Text>
                  <TouchableOpacity
                    style={styles.button}
                    onPress={() => {
                      const { dispatch, player } = this.props;
                      const { track, trackCount } = player;
                      const audiotrack = track.audio + 1;
                      if (audiotrack <= trackCount.audio) {
                        dispatch(PlayerActions.track({ audio: audiotrack }));
                      } else {
                        dispatch(PlayerActions.track({ audio: 1 }));
                      }
                    }}
                  >
                    <FontAwesome5Icon
                      name="caret-right"
                      solid
                      color={light}
                      size={24}
                    />
                  </TouchableOpacity>
                </View>
              )}
              {Platform.OS === "web" && (
                <View
                  style={[
                    containerStyle.row,
                    colorStyle.bgBlack,
                    styles.optionRow
                  ]}
                >
                  <Text style={[colorStyle.light, styles.optionLabel]}>
                    デュアルモノラル
                  </Text>
                  <TouchableOpacity
                    style={styles.button}
                    onPress={() => {
                      const { dispatch, player } = this.props;
                      const { dualMonoMode } = player;
                      const keys = Object.keys(this.dualMonoTable);
                      const index = keys.indexOf(dualMonoMode) + 1;
                      if (keys[index]) {
                        dispatch(PlayerActions.dualMonoMode(keys[index]));
                      } else {
                        dispatch(
                          PlayerActions.dualMonoMode(keys[keys.length - 1])
                        );
                      }
                    }}
                  >
                    <FontAwesome5Icon
                      name="caret-left"
                      solid
                      color={light}
                      size={24}
                    />
                  </TouchableOpacity>
                  <Text style={[colorStyle.light, styles.optionValue]}>
                    {this.dualMonoTable[dualMonoMode]}
                  </Text>
                  <TouchableOpacity
                    style={styles.button}
                    onPress={() => {
                      const { dispatch, player } = this.props;
                      const { dualMonoMode } = player;
                      const keys = Object.keys(this.dualMonoTable);
                      const index = keys.indexOf(dualMonoMode) + 1;
                      if (keys[index]) {
                        dispatch(PlayerActions.dualMonoMode(keys[index]));
                      } else {
                        dispatch(PlayerActions.dualMonoMode(keys[0]));
                      }
                    }}
                  >
                    <FontAwesome5Icon
                      name="caret-right"
                      solid
                      color={light}
                      size={24}
                    />
                  </TouchableOpacity>
                </View>
              )}
              <View
                style={[
                  containerStyle.row,
                  colorStyle.bgBlack,
                  styles.optionRow
                ]}
              >
                <Text style={[colorStyle.light, styles.optionLabel]}>
                  連続再生
                </Text>
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => {
                    const { dispatch, setting } = this.props;
                    const { player = {} } = setting;
                    const { repeat = "continue" } = player;
                    const keys = Object.keys(this.repeatTable);
                    const index = keys.indexOf(repeat) - 1;
                    if (keys[index]) {
                      dispatch(
                        SettingActions.update("player", {
                          repeat: keys[index]
                        })
                      );
                    } else {
                      dispatch(
                        SettingActions.update("player", {
                          repeat: keys[keys.length - 1]
                        })
                      );
                    }
                  }}
                >
                  <FontAwesome5Icon
                    name="caret-left"
                    solid
                    color={light}
                    size={24}
                  />
                </TouchableOpacity>
                <Text style={[colorStyle.light, styles.optionValue]}>
                  {this.repeatTable[repeat]}
                </Text>
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => {
                    const { dispatch, setting } = this.props;
                    const { player = {} } = setting;
                    const { repeat = "continue" } = player;
                    const keys = Object.keys(this.repeatTable);
                    const index = keys.indexOf(repeat) + 1;
                    if (keys[index]) {
                      dispatch(
                        SettingActions.update("player", {
                          repeat: keys[index]
                        })
                      );
                    } else {
                      dispatch(
                        SettingActions.update("player", {
                          repeat: keys[0]
                        })
                      );
                    }
                  }}
                >
                  <FontAwesome5Icon
                    name="caret-right"
                    solid
                    color={light}
                    size={24}
                  />
                </TouchableOpacity>
              </View>
              <View
                style={[
                  containerStyle.row,
                  colorStyle.bgBlack,
                  styles.optionRow
                ]}
              >
                <Text style={[colorStyle.light, styles.optionLabel]}>
                  コメント表示時間
                </Text>
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => {
                    const { dispatch, setting } = this.props;
                    const { commentPlayer = {} } = setting;
                    const duration =
                      parseInt(commentPlayer.duration || "5000", 10) - 500;
                    if (duration > 500) {
                      dispatch(
                        SettingActions.update("commentPlayer", { duration })
                      );
                    } else {
                      dispatch(
                        SettingActions.update("commentPlayer", {
                          duration: 1000
                        })
                      );
                    }
                  }}
                >
                  <FontAwesome5Icon
                    name="caret-left"
                    solid
                    color={light}
                    size={24}
                  />
                </TouchableOpacity>
                <Text style={[colorStyle.light, styles.optionValue]}>
                  {(parseInt(duration, 10) / 1000).toFixed(1)}秒
                </Text>
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => {
                    const { dispatch, setting } = this.props;
                    const { commentPlayer = {} } = setting;
                    const duration =
                      parseInt(commentPlayer.duration || "5000", 10) + 500;
                    dispatch(
                      SettingActions.update("commentPlayer", { duration })
                    );
                  }}
                >
                  <FontAwesome5Icon
                    name="caret-right"
                    solid
                    color={light}
                    size={24}
                  />
                </TouchableOpacity>
              </View>
              <View
                style={[
                  containerStyle.row,
                  colorStyle.bgBlack,
                  styles.optionRow
                ]}
              >
                <Text style={[colorStyle.light, styles.optionLabel]}>
                  コメント遅延時間
                </Text>
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => {
                    const { dispatch, setting } = this.props;
                    const { commentPlayer = {} } = setting;
                    const delay =
                      parseInt(commentPlayer.delay || "0", 10) - 500;
                    dispatch(SettingActions.update("commentPlayer", { delay }));
                  }}
                >
                  <FontAwesome5Icon
                    name="caret-left"
                    solid
                    color={light}
                    size={24}
                  />
                </TouchableOpacity>
                <Text style={[colorStyle.light, styles.optionValue]}>
                  {(parseInt(delay, 10) / 1000).toFixed(1)}秒
                </Text>
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => {
                    const { dispatch, setting } = this.props;
                    const { commentPlayer = {} } = setting;
                    const delay =
                      parseInt(commentPlayer.delay || "0", 10) + 500;
                    dispatch(SettingActions.update("commentPlayer", { delay }));
                  }}
                >
                  <FontAwesome5Icon
                    name="caret-right"
                    solid
                    color={light}
                    size={24}
                  />
                </TouchableOpacity>
              </View>
              <View
                style={[
                  containerStyle.row,
                  colorStyle.bgBlack,
                  styles.optionRow
                ]}
              >
                <Text style={[colorStyle.light, styles.optionLabel]}>
                  コメントライン数
                </Text>
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => {
                    const { dispatch, setting } = this.props;
                    const { commentPlayer = {} } = setting;
                    const maxLines =
                      parseInt(commentPlayer.maxLines || "10", 10) - 1;
                    if (maxLines > 5) {
                      dispatch(
                        SettingActions.update("commentPlayer", { maxLines })
                      );
                    } else {
                      dispatch(
                        SettingActions.update("commentPlayer", {
                          maxLines: 5
                        })
                      );
                    }
                  }}
                >
                  <FontAwesome5Icon
                    name="caret-left"
                    solid
                    color={light}
                    size={24}
                  />
                </TouchableOpacity>
                <Text style={[colorStyle.light, styles.optionValue]}>
                  {parseInt(maxLines, 10)}
                </Text>
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => {
                    const { dispatch, setting } = this.props;
                    const { commentPlayer = {} } = setting;
                    const maxLines =
                      parseInt(commentPlayer.maxLines || "10", 10) + 1;
                    dispatch(
                      SettingActions.update("commentPlayer", {
                        maxLines
                      })
                    );
                  }}
                >
                  <FontAwesome5Icon
                    name="caret-right"
                    solid
                    color={light}
                    size={24}
                  />
                </TouchableOpacity>
              </View>
              <View
                style={[
                  containerStyle.row,
                  colorStyle.bgBlack,
                  styles.optionRow
                ]}
              >
                <Text style={[colorStyle.light, styles.optionLabel]}>
                  コメント同時表示数
                </Text>
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => {
                    const { dispatch, setting } = this.props;
                    const { commentPlayer = {} } = setting;
                    const maxComments =
                      parseInt(commentPlayer.maxComments || "50", 10) - 5;
                    if (maxComments > 5) {
                      dispatch(
                        SettingActions.update("commentPlayer", { maxComments })
                      );
                    } else {
                      dispatch(
                        SettingActions.update("commentPlayer", {
                          maxComments: 5
                        })
                      );
                    }
                  }}
                >
                  <FontAwesome5Icon
                    name="caret-left"
                    solid
                    color={light}
                    size={24}
                  />
                </TouchableOpacity>
                <Text style={[colorStyle.light, styles.optionValue]}>
                  {parseInt(maxComments, 10)}
                </Text>
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => {
                    const { dispatch, setting } = this.props;
                    const { commentPlayer = {} } = setting;
                    const maxComments =
                      parseInt(commentPlayer.maxComments || "50", 10) + 5;
                    dispatch(
                      SettingActions.update("commentPlayer", {
                        maxComments
                      })
                    );
                  }}
                >
                  <FontAwesome5Icon
                    name="caret-right"
                    solid
                    color={light}
                    size={24}
                  />
                </TouchableOpacity>
              </View>
            </MenuOptions>
          </Menu>
        </View>
      </View>
    );
  }

  shouldComponentUpdate(nextProps: Props) {
    const { player } = this.props;
    return (
      nextProps.player === player ||
      (nextProps.player.time === player.time &&
        nextProps.player.position === player.position)
    );
  }

  getRecorded() {
    const { viewer } = this.props;
    const { programs, index, extraIndex } = viewer;
    const program = programs[index];
    if (program.recorded && program.recorded[extraIndex]) {
      return program.recorded[extraIndex];
    }
    return program;
  }
}

export default connect(
  ({
    player,
    setting,
    viewer,
    window
  }: {
    player: PlayerState;
    setting: SettingState;
    viewer: ViewerState;
    window: WindowState;
  }) => ({
    player,
    setting,
    viewer,
    window
  })
)(Controller);

const styles = StyleSheet.create({
  container: {
    minHeight: 40
  },
  left: {
    flex: 1,
    minWidth: Platform.OS === "web" ? 40 : 0
  },
  center: {
    flex: 1,
    minWidth: Platform.OS === "web" ? 120 : 0
  },
  right: {
    flex: 1,
    minWidth: Platform.OS === "web" ? 160 : 0
  },
  slider: {
    flex: 1,
    height: 40
  },
  button: {
    alignItems: "center",
    flexDirection: "row",
    height: 40,
    justifyContent: "center",
    width: 40
  },
  optionContainer: {
    width: 280
  },
  optionRow: {
    height: 40
  },
  optionLabel: {
    flex: 1,
    marginHorizontal: 8
  },
  optionValue: {
    marginHorizontal: 8
  }
});
