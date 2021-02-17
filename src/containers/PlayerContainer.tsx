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
  memo,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  PropsWithChildren
} from "react";
import {
  TouchableOpacity,
  View,
  ViewProps,
  StyleSheet,
  Animated,
  PanResponder,
  Platform
} from "react-native";
import { useDispatch, useSelector } from "react-redux";

import containerStyle from "../styles/container";
import { RootState } from "../modules";
import { PlayerActions } from "../modules/player";
import { SettingState, SettingActions } from "../modules/setting";
import { ViewerActions } from "../modules/viewer";
import DateFormatter from "../utils/DateFormatter";
import formatTime from "../utils/formatTime";

type Setting = SettingState & {
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
  view?: {
    hourFirst?: string;
    hourFormat?: string;
  };
};
type State = RootState & {
  setting: Setting;
};

const PlayerContainer = memo(
  ({ children, onLayout, ...props }: PropsWithChildren<ViewProps>) => {
    const textOpacity = useRef(new Animated.Value(0)).current;
    const timeRef = useRef(0);

    const dispatch = useDispatch();
    const time = useSelector<State, number>(
      ({ player }) => player.time,
      (left, right) => Math.floor(left / 1000) === Math.floor(right / 1000)
    );
    const duration = useSelector<State, number>(
      ({ player }) => player.duration
    );
    const dualMonoMode = useSelector<State, string>(
      ({ player }) => player.dualMonoMode
    );
    const seekTime = useSelector<State, number>(
      ({ player }) => player.seekTime
    );
    const seekPosition = useSelector<State, number>(
      ({ player }) => player.seekPosition
    );
    const commentDelay = useSelector<State, number>(({ setting }) =>
      parseInt(setting.commentPlayer?.delay || "0", 10)
    );
    const commentDuration = useSelector<State, number>(({ setting }) =>
      parseInt(setting.commentPlayer?.duration || "5000", 10)
    );
    const maxComments = useSelector<State, number>(({ setting }) =>
      parseInt(setting.commentPlayer?.maxComments || "50", 10)
    );
    const maxLines = useSelector<State, number>(({ setting }) =>
      parseInt(setting.commentPlayer?.maxLines || "10", 10)
    );
    const mute = useSelector<State, boolean>(
      ({ setting }) => setting.player?.mute
    );
    const repeat = useSelector<State, string>(
      ({ setting }) => setting.player?.repeat || "repeat"
    );
    const speed = useSelector<State, number>(({ setting }) =>
      parseFloat(setting.player?.speed || "1")
    );
    const volume = useSelector<State, number>(({ setting }) =>
      parseInt(
        setting.player?.volume != null ? setting.player?.volume : "100",
        10
      )
    );
    const hourFirst = useSelector<State, number>(({ setting }) =>
      parseInt(setting.view?.hourFirst || "4", 10)
    );
    const hourFormat = useSelector<State, string>(
      ({ setting }) => setting.view?.hourFormat || ""
    );
    const start = useSelector<State, Date>(
      ({ viewer }) =>
        viewer.programs[viewer.index]?.recorded?.[viewer.extraIndex]?.start ||
        viewer.programs[viewer.index]?.start
    );
    const control = useSelector<State, boolean>(({ viewer }) => viewer.control);

    const [text, setText] = useState("");

    const dateFormatter = useMemo(
      () => new DateFormatter(hourFirst, hourFormat),
      [hourFirst, hourFormat]
    );
    const panResponder = useMemo(
      () =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: ({}, { dx, dy }) =>
            Math.abs(dx) > 10 || Math.abs(dy) > 10,
          onPanResponderMove: ({}, { dx, dy }) => {
            if (Math.abs(dx) > Math.abs(dy)) {
              let time = timeRef.current;
              time += (dx - Math.sign(dx) * 10) * 5000;
              if (time < 0) {
                time = 0;
              } else if (duration > 0 && time > duration) {
                time = duration;
              }
              const clock = new Date(start);
              clock.setTime(clock.getTime() + time);
              setText(
                `${formatTime(time)}(${dateFormatter.format(
                  clock,
                  "HHHH:mm:ss"
                )})`
              );
            } else if (Math.abs(dy) > Math.abs(dx)) {
              let value = volume;
              value -= Math.floor((dy - Math.sign(dy) * 10) / 2);
              if (value < 0) {
                value = 0;
              } else if (value > 100) {
                value = 100;
              }
              setText(`音量 ${value}`);
            }
          },
          onPanResponderEnd: ({}, { dx, dy }) => {
            if (Math.abs(dx) > Math.abs(dy)) {
              let time = timeRef.current;
              time += (dx - Math.sign(dx) * 10) * 5000;
              if (time < 0) {
                time = 0;
              }
              dispatch(PlayerActions.time(time));
            } else if (Math.abs(dy) > Math.abs(dx)) {
              let value = volume;
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
        }),
      [duration, volume, dateFormatter]
    );

    useEffect(() => {
      timeRef.current = time;
    }, [time]);
    useEffect(() => {
      if (Platform.OS === "web") {
        switch (dualMonoMode) {
          case "auto":
            setText("デュアルモノラル 自動");
            break;
          case "both":
            setText("デュアルモノラル 主/副");
            break;
          case "main":
            setText("デュアルモノラル 主音声");
            break;
          case "sub":
            setText("デュアルモノラル 副音声");
            break;
        }
      } else {
        switch (dualMonoMode) {
          case "auto":
            setText("ステレオモード 自動");
            break;
          case "both":
            setText("ステレオモード 左/右");
            break;
          case "main":
            setText("ステレオモード 左");
            break;
          case "sub":
            setText("ステレオモード 右");
            break;
        }
      }
    }, [dualMonoMode]);
    useEffect(() => {
      if (seekTime != null) {
        let time = seekTime;
        if (time < 0) {
          time = 0;
        } else if (duration > 0 && time > duration) {
          time = duration;
        }
        const clock = new Date(start);
        clock.setTime(clock.getTime() + time);
        setText(
          `${formatTime(time)}(${dateFormatter.format(clock, "HHHH:mm:ss")})`
        );
      }
    }, [seekTime]);
    useEffect(() => {
      if (seekPosition != null) {
        let time = seekPosition * duration;
        if (time < 0) {
          time = 0;
        } else if (duration > 0 && time > duration) {
          time = duration;
        }
        const clock = new Date(start);
        clock.setTime(clock.getTime() + time);
        setText(
          `${formatTime(time)}(${dateFormatter.format(clock, "HHHH:mm:ss")})`
        );
      }
    }, [seekPosition]);
    useEffect(() => {
      const delay = commentDelay;
      setText(`コメント遅延時間 ${(delay / 1000).toFixed(1)}秒`);
    }, [commentDelay]);
    useEffect(() => {
      const duration = commentDuration;
      setText(`コメント表示時間 ${(duration / 1000).toFixed(1)}秒`);
    }, [commentDuration]);
    useEffect(() => {
      setText(`コメント同時表示数 ${maxComments}`);
    }, [maxComments]);
    useEffect(() => {
      setText(`コメントライン数 ${maxLines}`);
    }, [maxLines]);
    useEffect(() => {
      setText(mute ? "ミュート" : "ミュート解除");
    }, [mute]);
    useEffect(() => {
      switch (repeat) {
        case "stop":
          setText("停止");
          break;
        case "continue":
          setText("連続再生");
          break;
        case "repeat":
          setText("リピート");
          break;
      }
    }, [repeat]);
    useEffect(() => {
      if (speed) {
        const speedNum = speed;
        setText(`再生速度 x${speedNum.toFixed(1)}`);
      }
    }, [speed]);
    useEffect(() => {
      if (volume) {
        let volumeNum = volume;
        if (volumeNum < 0) {
          volumeNum = 0;
        } else if (volumeNum > 100) {
          volumeNum = 100;
        }
        setText(`音量 ${volumeNum}`);
      }
    }, [volume]);
    useEffect(() => {
      setText("");
    }, []);
    useEffect(() => {
      textOpacity.setValue(1);
      Animated.timing(textOpacity, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: Platform.OS !== "web"
      }).start();
    }, [text]);

    const onPress = useCallback(() => {
      dispatch(ViewerActions.update({ control: !control }));
    }, [control]);

    return (
      <View {...props} {...panResponder.panHandlers}>
        <TouchableOpacity
          style={styles.touchable}
          activeOpacity={1}
          onPress={onPress}
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
);
export default PlayerContainer;

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
