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
  TouchableOpacity,
  View,
  ViewProps,
  StyleSheet,
  Animated,
  PanResponder,
  PanResponderInstance
} from "react-native";
import { connect } from "react-redux";
import { Dispatch } from "redux";

import containerStyle from "../styles/container";
import { PlayerState, PlayerActions } from "../modules/player";
import { ViewerState, ViewerActions } from "../modules/viewer";
import { SettingState, SettingActions } from "../modules/setting";
import DateFormatter from "../utils/DateFormatter";
import formatTime from "../utils/formatTime";

type Props = ViewProps & {
  children: React.ReactNode;
  dispatch: Dispatch;
  player: PlayerState;
  setting: SettingState & {
    commentPlayer?: {
      duration?: string;
      delay?: string;
      maxLines?: string;
      maxComments?: string;
    };
    player?: {
      mute?: boolean;
      volume?: string;
      speed?: string;
      deinterlace?: boolean;
      repeat?: string;
    };
  };
  viewer: ViewerState;
};
type State = {
  text: string;
  textOpacity: Animated.AnimatedValue;
};
class PlayerContainer extends Component<Props, State> {
  panResponder: PanResponderInstance;
  state = {
    text: "",
    textOpacity: new Animated.Value(0)
  };

  constructor(props: Props) {
    super(props);
    this.panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: ({}, { dx, dy }) =>
        Math.abs(dx) > 10 || Math.abs(dy) > 10,
      onPanResponderMove: ({}, { dx, dy }) => {
        if (Math.abs(dx) > Math.abs(dy)) {
          const { player } = this.props;
          let { time } = player;
          time += (dx - Math.sign(dx) * 10) * 5000;
          if (time < 0) {
            time = 0;
          } else if (time > player.duration) {
            time = player.duration;
          }
          const clock = new Date(this.getRecorded().start);
          clock.setTime(clock.getTime() + time);
          this.showText(
            `${formatTime(time)}(${this.dateFormat(clock, "HHHH:mm:ss")})`
          );
        } else if (Math.abs(dy) > Math.abs(dx)) {
          const { setting } = this.props;
          const { player: playerSetting = {} } = setting;
          const { volume = "100" } = playerSetting;
          let value = parseInt(volume, 10);
          value -= Math.floor((dy - Math.sign(dy) * 10) / 2);
          if (value < 0) {
            value = 0;
          } else if (value > 100) {
            value = 100;
          }
          this.showText(`音量 ${value}`);
        }
      },
      onPanResponderEnd: ({}, { dx, dy }) => {
        const { dispatch, player, setting } = this.props;
        const { player: playerSetting = {} } = setting;
        if (Math.abs(dx) > Math.abs(dy)) {
          let { time } = player;
          time += (dx - Math.sign(dx) * 10) * 5000;
          if (time < 0) {
            time = 0;
          }
          dispatch(PlayerActions.time(time));
        } else if (Math.abs(dy) > Math.abs(dx)) {
          const { volume = "100" } = playerSetting;
          let value = parseInt(volume, 10);
          value -= Math.floor((dy - Math.sign(dy) * 10) / 2);
          if (value > 100) {
            value = 100;
          } else if (value < 0) {
            value = 0;
          }
          dispatch(
            SettingActions.update("player", {
              volume: String(value)
            })
          );
        }
      }
    });
  }

  render() {
    const { children, player, viewer, onLayout, ...props } = this.props;
    const { text, textOpacity } = this.state;
    return (
      <View {...props} {...this.panResponder.panHandlers}>
        <TouchableOpacity
          style={styles.touchable}
          activeOpacity={1}
          onPress={() => {
            const { dispatch, viewer } = this.props;
            const { control } = viewer;
            dispatch(ViewerActions.update({ control: !control }));
          }}
        >
          {children}
          <View
            style={[
              StyleSheet.absoluteFill,
              containerStyle.column,
              containerStyle.center
            ]}
            pointerEvents="none"
          >
            <Animated.Text style={[styles.text, { opacity: textOpacity }]}>
              {text}
            </Animated.Text>
          </View>
        </TouchableOpacity>
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

  componentDidUpdate(prevProps: Props) {
    const { player, setting } = this.props;

    if (player.dualMonoMode !== prevProps.player.dualMonoMode) {
      switch (player.dualMonoMode) {
        case "auto":
          this.showText("デュアルモノラル 自動");
          break;
        case "both":
          this.showText("デュアルモノラル 主/副");
          break;
        case "main":
          this.showText("デュアルモノラル 主音声");
          break;
        case "sub":
          this.showText("デュアルモノラル 副音声");
          break;
      }
    }
    if (player.seekTime != null || player.seekPosition != null) {
      let time;
      if (
        player.seekTime != null &&
        prevProps.player.seekTime !== player.seekTime
      ) {
        time = player.seekTime;
      } else if (
        player.seekPosition != null &&
        prevProps.player.seekPosition !== player.seekPosition
      ) {
        time = player.seekPosition * player.duration;
      }
      if (time != null) {
        if (time < 0) {
          time = 0;
        } else if (time > player.duration) {
          time = player.duration;
        }
        const clock = new Date(this.getRecorded().start);
        clock.setTime(clock.getTime() + time);
        this.showText(
          `${formatTime(time)}(${this.dateFormat(clock, "HHHH:mm:ss")})`
        );
      }
    }

    const { commentPlayer: commentPlayerSetting = {} } = setting;
    const { commentPlayer: prevCommentPlayerSetting = {} } = prevProps.setting;
    if (
      commentPlayerSetting.delay !== prevCommentPlayerSetting.delay &&
      commentPlayerSetting.delay
    ) {
      const delay = parseInt(commentPlayerSetting.delay, 10);
      this.showText(`コメント遅延時間 ${(delay / 1000).toFixed(1)}秒`);
    }
    if (
      commentPlayerSetting.duration !== prevCommentPlayerSetting.duration &&
      commentPlayerSetting.duration
    ) {
      const duration = parseInt(commentPlayerSetting.duration, 10);
      this.showText(`コメント表示時間 ${(duration / 1000).toFixed(1)}秒`);
    }
    if (
      commentPlayerSetting.maxComments !==
        prevCommentPlayerSetting.maxComments &&
      commentPlayerSetting.maxComments
    ) {
      const maxComments = parseInt(commentPlayerSetting.maxComments, 10);
      this.showText(`コメント同時表示数 ${maxComments}`);
    }
    if (
      commentPlayerSetting.maxLines !== prevCommentPlayerSetting.maxLines &&
      commentPlayerSetting.maxLines
    ) {
      const maxLines = parseInt(commentPlayerSetting.maxLines, 10);
      this.showText(`コメントライン数 ${maxLines}`);
    }

    const { player: playerSetting = {} } = setting;
    const { player: prevPlayerSetting = {} } = prevProps.setting;
    if (playerSetting.mute !== prevPlayerSetting.mute) {
      this.showText(playerSetting.mute ? "ミュート" : "ミュート解除");
    }
    if (playerSetting.repeat !== prevPlayerSetting.repeat) {
      switch (playerSetting.repeat) {
        case "stop":
          this.showText("停止");
          break;
        case "continue":
          this.showText("連続再生");
          break;
        case "repeat":
          this.showText("リピート");
          break;
      }
    }
    if (
      playerSetting.speed !== prevPlayerSetting.speed &&
      playerSetting.speed
    ) {
      const speed = parseFloat(playerSetting.speed);
      this.showText(`再生速度 x${speed.toFixed(1)}`);
    }
    if (
      playerSetting.volume !== prevPlayerSetting.volume &&
      playerSetting.volume
    ) {
      let volume = parseInt(playerSetting.volume, 10);
      if (volume < 0) {
        volume = 0;
      } else if (volume > 100) {
        volume = 100;
      }
      this.showText(`音量 ${volume}`);
    }
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

  dateFormat(value: Date, format: string) {
    const { setting } = this.props;
    const { view = {} } = setting;
    const { hourFirst = "4", hourFormat = "" } = view;

    const dateFormatter = new DateFormatter(
      parseInt(hourFirst, 10),
      hourFormat
    );

    return dateFormatter.format(value, format);
  }

  showText(text: string) {
    const { textOpacity } = this.state;
    this.setState({ text });
    textOpacity.setValue(1);
    Animated.timing(textOpacity, {
      toValue: 0,
      duration: 1000,
      useNativeDriver: true
    }).start();
  }
}

export default connect(
  ({
    player,
    setting,
    viewer
  }: {
    player: PlayerState;
    setting: SettingState;
    viewer: ViewerState;
  }) => ({
    player,
    setting,
    viewer
  })
)(PlayerContainer);

const styles = StyleSheet.create({
  touchable: {
    flex: 1
  },
  text: {
    marginBottom: 40,
    color: "#ffffff",
    fontSize: 24,
    textAlign: "center",
    textShadowColor: "#000000",
    textShadowOffset: {
      width: 1,
      height: 1
    },
    textShadowRadius: 5
  }
});
