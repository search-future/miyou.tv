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
import { View, StyleSheet, ART } from "react-native";
import { connect } from "react-redux";
import { Dispatch } from "redux";

import Balloon from "../components/Balloon";
import { CommentPlayerState } from "../modules/commentPlayer";
import { PlayerActions } from "../modules/player";
import { active } from "../styles/color";
import { SettingState } from "../modules/setting";

type Props = {
  dispatch: Dispatch;
  commentPlayer: CommentPlayerState;
  setting: SettingState & {
    commentPlayer?: {
      delay?: string;
    };
  };
};
type State = {
  containerWidth: number;
  containerHeight: number;
};
class CommentChart extends Component<Props, State> {
  state = {
    containerWidth: 0,
    containerHeight: 0
  };
  layoutCallbackId?: number;

  render() {
    const { commentPlayer, setting } = this.props;
    const { start, end, intervals } = commentPlayer;
    const { commentPlayer: commentPlayerSetting = {} } = setting;
    const { containerWidth, containerHeight } = this.state;
    const delay = parseInt(commentPlayerSetting.delay || "0", 10);
    const length = end - start;
    const max = Math.max(...intervals.map(({ n_hits }) => n_hits));
    const path = [`M -1,${containerHeight}`];
    for (const interval of intervals) {
      const x =
        ((interval.start - start + 60000 + delay) * containerWidth) / length;
      const y = containerHeight - (interval.n_hits * containerHeight) / max;
      if (!isNaN(x) && !isNaN(y)) {
        path.push(`L ${x},${y}`);
      }
    }
    let threshold = Math.max(...intervals.map(({ n_hits }) => n_hits)) / 2;
    if (threshold < 10) {
      threshold = 10;
    }
    const peaks = intervals.filter(
      ({ n_hits, start }, i, array) =>
        n_hits >= threshold &&
        start >= start &&
        start < end &&
        (!array[i - 1] || n_hits >= array[i - 1].n_hits) &&
        (!array[i + 1] || n_hits >= array[i + 1].n_hits)
    );
    peaks.sort((a, b) => a.n_hits - b.n_hits);
    return (
      <View
        style={styles.container}
        onLayout={({ nativeEvent }) => {
          if (this.layoutCallbackId != null) {
            clearTimeout(this.layoutCallbackId);
          }
          const { layout } = nativeEvent;
          const containerWidth = layout.width;
          const containerHeight = layout.height;
          this.layoutCallbackId = setTimeout(() => {
            this.setState({ containerWidth: 0, containerHeight: 0 });
            this.setState({ containerWidth, containerHeight });
          }, 200);
        }}
      >
        {containerHeight > 0 && (
          <ART.Surface
            style={{ flex: 1 }}
            width={containerWidth}
            height={containerHeight}
          >
            <ART.Shape stroke={active} strokeWidth={2} d={path.join(" ")} />
          </ART.Surface>
        )}
        {containerWidth > 0 &&
          peaks.slice(-5).map(({ n_hits, start }, index) => {
            const { commentPlayer, setting } = this.props;
            const { commentPlayer: commentPlayerSetting = {} } = setting;
            const delay = parseInt(commentPlayerSetting.delay || "0", 10);
            const { containerWidth } = this.state;
            const length = commentPlayer.end - commentPlayer.start;
            const time = start - commentPlayer.start + delay;
            const position = (time + 60000) / length;
            const left = position * containerWidth - 20;
            return (
              <Balloon
                key={index}
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
                onPress={() => {
                  const { dispatch } = this.props;
                  dispatch(PlayerActions.time(time));
                }}
              >
                {n_hits}
              </Balloon>
            );
          })}
      </View>
    );
  }

  shouldComponentUpdate(nextProps: Props) {
    const { commentPlayer } = this.props;
    return (
      nextProps.commentPlayer === commentPlayer ||
      nextProps.commentPlayer.pointer === commentPlayer.pointer
    );
  }

  componentWillUnmount() {
    clearTimeout(this.layoutCallbackId);
  }
}

export default connect(
  ({
    commentPlayer,
    setting
  }: {
    commentPlayer: CommentPlayerState;
    setting: SettingState;
  }) => ({
    commentPlayer,
    setting
  })
)(CommentChart);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: 4
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
