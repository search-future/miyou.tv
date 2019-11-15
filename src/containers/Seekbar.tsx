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
import { TouchableOpacity, View, StyleSheet } from "react-native";
import { Text } from "react-native-elements";
import FontAwesome5Icon from "react-native-vector-icons/FontAwesome5";
import { connect } from "react-redux";
import { Dispatch } from "redux";

import CommentChart from "./CommentChart";
import CustomSlider from "../components/CustomSlider";
import colorStyle, { gray, light } from "../styles/color";
import containerStyle from "../styles/container";
import { PlayerState, PlayerActions } from "../modules/player";
import { SettingState } from "../modules/setting";
import { ViewerState, ViewerActions } from "../modules/viewer";
import DateFormatter from "../utils/DateFormatter";
import formatTime from "../utils/formatTime";

type Props = {
  dispatch: Dispatch;
  player: PlayerState;
  setting: SettingState & {
    view?: {
      hourFirst?: string;
      hourFormat?: string;
    };
  };
  viewer: ViewerState;
};
class Seekbar extends Component<Props> {
  options: { [key: string]: string } = {
    "ad-lavc-o": "dual_mono_mode=auto"
  };
  observers: { [name: string]: (value: any) => void } = {};

  render() {
    const { player, setting, viewer } = this.props;
    const { duration, time, position, useClock } = player;
    const { view = {} } = setting;
    const { hourFirst = "4", hourFormat = "" } = view;
    const { programs, index, extraIndex } = viewer;

    const program = programs[index];
    const recordedProgram = this.getRecorded();
    const date = new Date(recordedProgram.start);

    const dateFormatter = new DateFormatter(
      parseInt(hourFirst, 10),
      hourFormat
    );

    return (
      <View style={[containerStyle.row, styles.container]}>
        {program.recorded && (
          <TouchableOpacity
            style={styles.button}
            disabled={!program.recorded[extraIndex - 1]}
            onPress={() => {
              this.prev();
            }}
          >
            <FontAwesome5Icon
              name="step-backward"
              solid
              color={program.recorded[extraIndex - 1] ? light : gray}
              size={24}
            />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => {
            const { dispatch, player } = this.props;
            const { useClock } = player;
            dispatch(PlayerActions.useClock(!useClock));
          }}
        >
          <Text style={colorStyle.light}>
            {useClock
              ? dateFormatter.format(
                  new Date(date.getTime() + time),
                  "HHHH:mm:ss"
                )
              : formatTime(time)}
          </Text>
        </TouchableOpacity>
        <View style={styles.sliderContainer}>
          <CommentChart />
          <CustomSlider
            style={styles.slider}
            maximumValue={1}
            minimumValue={0}
            step={0.00001}
            value={position}
            maximumTrackTintColor="#ffffff20"
            minimumTrackTintColor="#ffffffe2"
            onValueChange={position => {
              const { dispatch } = this.props;
              dispatch(PlayerActions.position(position));
            }}
          />
        </View>
        <TouchableOpacity
          onPress={() => {
            const { dispatch, player } = this.props;
            const { useClock } = player;
            dispatch(PlayerActions.useClock(!useClock));
          }}
        >
          <Text style={colorStyle.light}>
            {useClock
              ? dateFormatter.format(
                  new Date(date.getTime() + duration),
                  "HHHH:mm:ss"
                )
              : formatTime(duration)}
          </Text>
        </TouchableOpacity>
        {program.recorded && (
          <TouchableOpacity
            style={styles.button}
            disabled={!program.recorded[extraIndex + 1]}
            onPress={() => {
              this.next();
            }}
          >
            <FontAwesome5Icon
              name="step-forward"
              solid
              color={program.recorded[extraIndex + 1] ? light : gray}
              size={24}
            />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  shouldComponentUpdate(nextProps: Props) {
    const { player } = this.props;
    return (
      nextProps.player === player ||
      (nextProps.player.time === player.time &&
        nextProps.player.position === player.position) ||
      Math.floor(nextProps.player.time / 1000) !==
        Math.floor(player.time / 1000)
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

  next() {
    const { dispatch, viewer } = this.props;
    const { programs, index, extraIndex } = viewer;
    const program = programs[index];
    const nextExtraIndex = extraIndex + 1;
    if (program.recorded && program.recorded[nextExtraIndex]) {
      dispatch(
        ViewerActions.update({ extraIndex: nextExtraIndex, peakPlay: false })
      );
    }
  }

  prev() {
    const { dispatch, viewer } = this.props;
    const { programs, index, extraIndex } = viewer;
    const program = programs[index];
    const prevExtraIndex = extraIndex - 1;
    if (program.recorded && program.recorded[prevExtraIndex]) {
      dispatch(
        ViewerActions.update({ extraIndex: prevExtraIndex, peakPlay: false })
      );
    }
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
)(Seekbar);

const styles = StyleSheet.create({
  container: {
    minHeight: 40
  },
  sliderContainer: {
    flex: 1,
    height: 40
  },
  slider: {
    bottom: 0,
    position: "absolute",
    left: 0,
    right: 0,
    top: 0
  },
  button: {
    alignItems: "center",
    flexDirection: "row",
    height: 40,
    justifyContent: "center",
    width: 40
  }
});
