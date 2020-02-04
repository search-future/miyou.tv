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
  View,
  StyleSheet,
  LayoutChangeEvent,
  Animated,
  Easing
} from "react-native";
import { connect } from "react-redux";
import { Dispatch } from "redux";

import {
  CommentPlayerActions,
  CommentPlayerState
} from "../modules/commentPlayer";
import { PlayerState } from "../modules/player";
import { ViewerState } from "../modules/viewer";
import { SettingState } from "../modules/setting";

type Comment = {
  id: string;
  active: boolean;
  line: number;
  time: number;
  text: string;
  width: number;
  x: Animated.AnimatedValue;
};

type Props = {
  dispatch: Dispatch;
  commentPlayer: CommentPlayerState;
  player: PlayerState;
  setting: SettingState & {
    commentPlayer?: {
      duration?: string;
      delay?: string;
      maxLines?: string;
      maxComments?: string;
    };
    queryTable?: { [channel: string]: string[] };
  };
  viewer: ViewerState;
};
type State = {
  containerWidth: number;
  containerHeight: number;
  comments: Comment[];
};
class CommentPlayer extends Component<Props, State> {
  state: State = {
    containerWidth: 0,
    containerHeight: 0,
    comments: []
  };
  layoutCallbackId?: number;
  updaterId?: number;
  lines: (Comment | null)[] = [];
  queue: { index: number; width: number }[] = [];
  cp = 0;
  time = 0;

  render() {
    const { containerHeight, comments } = this.state;
    const height = containerHeight / (this.lines.length + 1);
    const fontSize = (height * 2) / 3;
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
            this.setState({ containerWidth, containerHeight });
            this.clear();
          }, 200);
        }}
      >
        <View style={styles.view}>
          {comments.map(({ id, active, line, text, x }, index) => (
            <Animated.Text
              key={id}
              style={[
                styles.comment,
                {
                  fontSize,
                  height,
                  left: 0,
                  lineHeight: height,
                  opacity: active ? 1 : 0,
                  top: height * line,
                  transform: [{ translateX: x }]
                }
              ]}
              onLayout={({ nativeEvent }: LayoutChangeEvent) => {
                const { layout } = nativeEvent;
                const { width } = layout;
                if (!active && width > 0) {
                  this.queue.push({ index, width });
                }
              }}
            >
              {text}
            </Animated.Text>
          ))}
        </View>
      </View>
    );
  }

  componentDidMount() {
    this.init();
    this.load();
    this.runUpdater();
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
    const { setting, viewer } = this.props;
    const { commentPlayer: commentPlayerSetting = {} } = setting;
    const { commentPlayer: prevCommentPlayerSetting = {} } = prevProps.setting;
    if (
      commentPlayerSetting.maxComments !==
        prevCommentPlayerSetting.maxComments ||
      commentPlayerSetting.maxLines !== prevCommentPlayerSetting.maxLines
    ) {
      this.init();
    }
    if (
      viewer.programs !== prevProps.viewer.programs ||
      viewer.index !== prevProps.viewer.index ||
      viewer.extraIndex !== prevProps.viewer.extraIndex ||
      setting.queryTable !== prevProps.setting.queryTable
    ) {
      this.load();
    }
  }

  componentWillUnmount() {
    clearTimeout(this.layoutCallbackId);
    clearTimeout(this.updaterId);
  }

  init() {
    const { dispatch, setting } = this.props;
    const { commentPlayer: commentPlayerSetting = {} } = setting;
    const maxComments = parseInt(commentPlayerSetting.maxComments || "50", 10);
    const maxLines = parseInt(commentPlayerSetting.maxLines || "10", 10);

    this.cp = 0;
    dispatch(CommentPlayerActions.seek(0));

    const comments = [];
    for (let i = 0; i < maxComments; i++) {
      comments.push({
        id: String(i),
        active: false,
        line: -1,
        time: -1,
        text: "",
        width: 0,
        x: new Animated.Value(0)
      });
    }
    const lines = [];
    for (let i = 0; i < maxLines; i++) {
      lines.push(null);
    }
    this.lines = lines;
    this.setState({ comments });
  }

  load() {
    const { dispatch, viewer } = this.props;
    const { programs, index } = viewer;
    const { channelName } = programs[index];
    const { start, end } = this.getRecorded();
    dispatch(
      CommentPlayerActions.init(
        channelName,
        new Date(start).getTime(),
        new Date(end).getTime()
      )
    );
  }

  runUpdater() {
    const { dispatch, commentPlayer, player, setting } = this.props;
    const { comments, containerWidth } = this.state;
    const { commentPlayer: commentPlayerSetting = {} } = setting;
    const duration = parseInt(commentPlayerSetting.duration || "5000", 10);
    let { pointer } = commentPlayer;
    let hasUpdate = false;

    if (commentPlayer.start === commentPlayer.end) {
      if (player.duration > 0) {
        dispatch(
          CommentPlayerActions.init(
            commentPlayer.channel,
            commentPlayer.start,
            commentPlayer.end + player.duration
          )
        );
      }
    } else if (player.time < this.time) {
      this.time = player.time;
      for (const comment of comments) {
        comment.active = false;
        comment.text = "";
      }
      pointer = 0;
      hasUpdate = true;
    } else {
      const { start, data, filters } = commentPlayer;
      if (player.time - this.time > duration + updateInterval) {
        this.time = player.time - duration;
        for (const comment of comments) {
          comment.active = false;
          comment.text = "";
        }
        hasUpdate = true;
      }
      while (pointer < data.length) {
        const commentData = data[pointer];
        if (commentData.time >= player.time + start) {
          break;
        }
        if (
          commentData.time >= this.time + start &&
          filters.indexOf(commentData.title) >= 0
        ) {
          const comment = comments[this.cp];
          if (comment) {
            comment.active = false;
            comment.id = commentData.id;
            comment.text = commentData.text
              .replace(/>{1,2}[0-9-]+/g, "")
              .replace(/^>.+$/g, "")
              .replace(/[a-zA-Z]+:\/\/\S+/g, "")
              .trim();
            comment.time = commentData.time - commentPlayer.start;
            comment.width = 0;
            this.cp++;
            if (this.cp >= comments.length) {
              this.cp = 0;
            }
            hasUpdate = true;
          }
        }
        pointer++;
      }
    }

    while (this.queue.length > 0) {
      const info = this.queue.shift();
      if (info) {
        const { index, width } = info;
        const comment = comments[index];
        if (comment && comment.text) {
          comment.active = true;
          comment.width = width;
          comment.line = this.selectLine(comment);
          this.lines[Math.floor(comment.line)] = comment;
          comment.x.setValue(containerWidth);
          const delay = comment.time - player.time + updateInterval;
          Animated.timing(comment.x, {
            duration,
            delay,
            easing: Easing.linear,
            toValue: -comment.width,
            useNativeDriver: true
          }).start();
          hasUpdate = true;
        }
      }
    }

    if (pointer !== commentPlayer.pointer) {
      dispatch(CommentPlayerActions.seek(pointer));
    }
    if (hasUpdate) {
      this.setState({ comments });
    }
    dispatch(CommentPlayerActions.load(player.time));
    this.time = player.time;

    this.updaterId = setTimeout(() => {
      this.runUpdater();
    }, updateInterval);
  }

  clear() {
    const { comments } = this.state;
    for (const comment of comments) {
      comment.active = false;
      comment.text = "";
    }
    this.setState({ comments });
  }

  selectLine(comment: Comment) {
    const { player, setting } = this.props;
    const { commentPlayer: commentPlayerSetting = {} } = setting;
    const { containerWidth } = this.state;
    const duration = parseInt(commentPlayerSetting.duration || "5000", 10);
    const reachTime =
      ((comment.time + duration - player.time) * containerWidth) /
      (containerWidth + comment.width);
    let candidateLife = Infinity;
    let candidateRight = Infinity;
    let candidateIndex = 0;
    for (let i = 0; i < this.lines.length; i += 1) {
      const line = this.lines[i];
      if (!line || !line.text) {
        return i;
      }
      const remainingTime = line.time + duration - player.time;
      const right =
        line.width +
        containerWidth -
        ((line.width + containerWidth) * (player.time - line.time)) / duration;
      if (remainingTime <= reachTime && right <= containerWidth) {
        return i;
      }
      if (remainingTime <= candidateLife && right < candidateRight) {
        candidateLife = remainingTime;
        candidateRight = right;
        candidateIndex = line.line;
      }
    }
    if (Math.floor(candidateIndex + 0.25) > Math.floor(candidateIndex)) {
      candidateIndex -= 1;
    }
    return candidateIndex + 0.25;
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
    commentPlayer,
    player,
    setting,
    viewer
  }: {
    commentPlayer: CommentPlayerState;
    player: PlayerState;
    setting: SettingState;
    viewer: ViewerState;
  }) => ({
    commentPlayer,
    player,
    setting,
    viewer
  })
)(CommentPlayer);

const updateInterval = 1000;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden"
  },
  view: {
    width: "10000%"
  },
  comment: {
    color: "#ffffff",
    position: "absolute",
    textShadowColor: "#000000",
    textShadowOffset: {
      width: 1,
      height: 1
    },
    textShadowRadius: 5
  }
});
