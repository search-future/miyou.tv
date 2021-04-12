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

import React, { memo, useContext, useCallback, useMemo } from "react";
import { TouchableOpacity, View, StyleSheet } from "react-native";
import { Text, ThemeContext } from "react-native-elements";
import FontAwesome5Icon from "react-native-vector-icons/FontAwesome5";
import { useDispatch, useSelector, shallowEqual } from "react-redux";

import CommentChart from "./CommentChart";
import CustomSlider from "../components/CustomSlider";
import containerStyle from "../styles/container";
import { RootState } from "../modules";
import { PlayerActions } from "../modules/player";
import { SettingState } from "../modules/setting";
import { ViewerActions, ViewerProgram } from "../modules/viewer";
import DateFormatter from "../utils/DateFormatter";
import formatTime from "../utils/formatTime";

type Setting = SettingState & {
  view?: {
    hourFirst?: string;
    hourFormat?: string;
  };
};
type State = RootState & {
  setting: Setting;
};

const Seekbar = () => {
  const dispatch = useDispatch();
  const useClock = useSelector<State, boolean>(({ player }) => player.useClock);
  const hourFirst = useSelector<State, number>(({ setting }) =>
    parseInt(setting.view?.hourFirst || "4", 10)
  );
  const hourFormat = useSelector<State, string>(
    ({ setting }) => setting.view?.hourFormat || ""
  );
  const program = useSelector<State, ViewerProgram>(
    ({ viewer }) => viewer.programs[viewer.index],
    shallowEqual
  );
  const extraIndex = useSelector<State, number>(
    ({ viewer }) => viewer.extraIndex
  );

  const { theme } = useContext(ThemeContext);

  const dateFormatter = useMemo(
    () => new DateFormatter(hourFirst, hourFormat),
    [hourFirst, hourFormat]
  );
  const date = useMemo(() => {
    if (program.recorded?.[extraIndex]) {
      return new Date(program.recorded[extraIndex].start);
    }
    return new Date(program.start);
  }, [program, extraIndex]);

  const formatter = useCallback(
    (date: Date) => dateFormatter.format(date, "HHHH:mm:ss"),
    [dateFormatter]
  );
  const timePress = useCallback(() => {
    dispatch(PlayerActions.useClock(!useClock));
  }, [useClock]);
  const positionChange = useCallback(position => {
    dispatch(PlayerActions.position(position));
  }, []);
  const next = useCallback(() => {
    const nextExtraIndex = extraIndex + 1;
    if (program.recorded?.[nextExtraIndex]) {
      dispatch(
        ViewerActions.update({ extraIndex: nextExtraIndex, peakPlay: false })
      );
    }
  }, [program, extraIndex]);
  const prev = useCallback(() => {
    const prevExtraIndex = extraIndex - 1;
    if (program.recorded?.[prevExtraIndex]) {
      dispatch(
        ViewerActions.update({ extraIndex: prevExtraIndex, peakPlay: false })
      );
    }
  }, [program, extraIndex]);

  return (
    <View style={[containerStyle.row, styles.container]}>
      {program.recorded && (
        <TouchableOpacity
          style={styles.button}
          disabled={!program.recorded[extraIndex - 1]}
          onPress={prev}
        >
          <FontAwesome5Icon
            name="step-backward"
            solid
            color={
              program.recorded[extraIndex - 1]
                ? theme.colors?.control
                : theme.colors?.disabled
            }
            size={24}
          />
        </TouchableOpacity>
      )}
      <StartText
        useClock={useClock}
        date={date}
        formatter={formatter}
        onPress={timePress}
      />
      <View style={styles.sliderContainer}>
        <CommentChart />
        <SeekSlider onChange={positionChange} />
      </View>
      <EndText
        useClock={useClock}
        date={date}
        formatter={formatter}
        onPress={timePress}
      />
      {program.recorded && (
        <TouchableOpacity
          style={styles.button}
          disabled={!program.recorded[extraIndex + 1]}
          onPress={next}
        >
          <FontAwesome5Icon
            name="step-forward"
            solid
            color={
              program.recorded[extraIndex + 1]
                ? theme.colors?.control
                : theme.colors?.disabled
            }
            size={24}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};
export default Seekbar;

const TimeText = memo(
  ({
    time,
    useClock = false,
    date,
    formatter = date => date.toTimeString(),
    onPress
  }: {
    time: number;
    useClock?: boolean;
    date?: Date;
    formatter: (date: Date) => string;
    onPress?: () => void;
  }) => {
    const { theme } = useContext(ThemeContext);

    const timeText = useMemo(
      () =>
        useClock && date
          ? formatter(new Date(date.getTime() + time))
          : formatTime(time),
      [useClock, date, formatter, time]
    );

    const onPressHandler = useCallback(() => {
      if (onPress) {
        onPress();
      }
    }, [onPress]);

    return (
      <TouchableOpacity onPress={onPressHandler}>
        <Text style={[{ color: theme.colors?.control }]}>{timeText}</Text>
      </TouchableOpacity>
    );
  }
);

const StartText = memo(
  ({
    useClock = false,
    date,
    formatter = date => date.toTimeString(),
    onPress
  }: {
    useClock?: boolean;
    date?: Date;
    formatter?: (date: Date) => string;
    onPress?: () => void;
  }) => {
    const time = useSelector<State, number>(
      ({ player }) => Math.floor(player.time / 1000) * 1000
    );

    return (
      <TimeText
        time={time}
        useClock={useClock}
        date={date}
        formatter={formatter}
        onPress={onPress}
      />
    );
  }
);

const EndText = memo(
  ({
    useClock = false,
    date,
    formatter = date => date.toTimeString(),
    onPress
  }: {
    useClock?: boolean;
    date?: Date;
    formatter?: (date: Date) => string;
    onPress?: () => void;
  }) => {
    const duration = useSelector<State, number>(
      ({ player }) => player.duration
    );

    return (
      <TimeText
        time={duration}
        useClock={useClock}
        date={date}
        formatter={formatter}
        onPress={onPress}
      />
    );
  }
);

const SeekSlider = memo(
  ({ onChange }: { onChange?: (position: number) => void }) => {
    const position = useSelector<State, number>(({ player }) =>
      isNaN(player.position) ? 0 : player.position
    );

    const onChangeHandler = useCallback(
      (position: number) => {
        if (onChange) {
          onChange(position);
        }
      },
      [onChange]
    );

    return (
      <CustomSlider
        style={styles.slider}
        maximumValue={1}
        minimumValue={0}
        step={0.00001}
        value={position}
        maximumTrackTintColor="#ffffff20"
        minimumTrackTintColor="#ffffffe2"
        onValueChange={onChangeHandler}
      />
    );
  }
);

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
