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
  useContext,
  useCallback,
  useRef,
  useMemo
} from "react";
import { View, StyleSheet } from "react-native";
import { ThemeContext } from "react-native-elements";
import { Svg, Path } from "react-native-svg";
import { useDispatch, useSelector, shallowEqual } from "react-redux";

import Balloon from "../components/Balloon";
import { CommentInterval } from "../modules/commentPlayer";
import { PlayerActions } from "../modules/player";
import containerStyle from "../styles/container";
import { RootState } from "../modules";
import { SettingState } from "../modules/setting";

type Setting = SettingState & {
  commentPlayer?: {
    delay?: string;
  };
};
type State = RootState & {
  setting: Setting;
};

const CommentChart = memo(() => {
  const layoutCallbackId = useRef<number>();

  const dispatch = useDispatch();
  const start = useSelector<State, number>(
    ({ commentPlayer }) => commentPlayer.start
  );
  const end = useSelector<State, number>(
    ({ commentPlayer }) => commentPlayer.end
  );
  const intervals = useSelector<State, CommentInterval[]>(
    ({ commentPlayer }) => commentPlayer.intervals,
    shallowEqual
  );
  const delay = useSelector<State, number>(({ setting }) =>
    parseInt(setting.commentPlayer?.delay || "0", 10)
  );

  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  const { theme } = useContext(ThemeContext);

  const offset = useMemo(() => start - delay, [delay, start]);
  const length = useMemo(() => end - start, [start, end]);
  const path = useMemo(() => {
    const max = Math.max(...intervals.map(({ n_hits }) => n_hits));
    const path = [`M -1,${containerHeight}`];
    for (const interval of intervals) {
      const x = ((interval.start - offset + 60000) * containerWidth) / length;
      const y = containerHeight - (interval.n_hits * containerHeight) / max;
      if (isFinite(x) && isFinite(y)) {
        path.push(`L ${x},${y}`);
      }
    }
    return path.join(" ");
  }, [intervals, containerWidth, containerHeight, offset, length]);
  const peaks = useMemo(() => {
    let threshold = Math.max(...intervals.map(({ n_hits }) => n_hits)) / 2;
    if (threshold < 10) {
      threshold = minPeakThreshold;
    }
    const peaks = intervals.filter(
      (interval, i, array) =>
        interval.n_hits >= threshold &&
        interval.start >= start &&
        interval.start < end &&
        (!array[i - 1] || interval.n_hits >= array[i - 1].n_hits) &&
        (!array[i + 1] || interval.n_hits >= array[i + 1].n_hits)
    );
    peaks.sort((a, b) => a.n_hits - b.n_hits);
    return peaks.slice(-displayPeaks);
  }, [start, end, intervals]);

  useEffect(
    () => () => {
      clearTimeout(layoutCallbackId.current);
    },
    []
  );

  const onLayout = useCallback(({ nativeEvent }) => {
    if (layoutCallbackId.current != null) {
      clearTimeout(layoutCallbackId.current);
    }
    const { layout } = nativeEvent;
    const containerWidth = layout.width;
    const containerHeight = layout.height;
    layoutCallbackId.current = setTimeout(() => {
      setContainerWidth(containerWidth);
      setContainerHeight(containerHeight);
    }, 200);
  }, []);
  const onBalloonPress = useCallback((time: number) => {
    dispatch(PlayerActions.time(time));
  }, []);
  const peakRenderer = useCallback(
    ({ n_hits, start }: CommentInterval) => {
      const time = start - offset;
      const position = (time + 30000) / length;
      const left = position * containerWidth - 20;
      if (isFinite(left)) {
        return (
          <PeakBalloon
            key={start}
            count={n_hits}
            time={time}
            left={left}
            onPress={onBalloonPress}
          />
        );
      }
      return null;
    },
    [offset, length, containerWidth, onBalloonPress]
  );

  return (
    <View
      style={[containerStyle.container, styles.container]}
      onLayout={onLayout}
    >
      {containerHeight > 0 && (
        <Svg style={styles.svg} width={containerWidth} height={containerHeight}>
          <Path
            fill="none"
            stroke={theme.colors?.primary}
            strokeWidth={2}
            d={path}
          />
        </Svg>
      )}
      {containerWidth > 0 && peaks.map(peakRenderer)}
    </View>
  );
});
export default CommentChart;

const displayPeaks = 5;
const minPeakThreshold = 10;

const PeakBalloon = memo(
  ({
    count,
    time,
    left,
    onPress
  }: {
    count: number;
    time: number;
    left: string | number;
    onPress?: (time: number) => void;
  }) => {
    const onPressHandler = useCallback(() => {
      if (onPress) {
        onPress(time);
      }
    }, [time, onPress]);

    return (
      <Balloon
        wrapperStyle={[
          styles.balloonWrapper,
          {
            left
          }
        ]}
        containerStyle={styles.balloonContainer}
        textStyle={styles.balloonText}
        backgroundColor="#ffff33cc"
        pointing="left"
        onPress={onPressHandler}
      >
        {count}
      </Balloon>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 4
  },
  svg: {
    flex: 1
  },
  balloonWrapper: {
    position: "absolute",
    top: -30
  },
  balloonContainer: {
    minWidth: 40
  },
  balloonText: {
    textAlign: "center"
  }
});
