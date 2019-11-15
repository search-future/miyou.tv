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
import { View, StyleSheet } from "react-native";
import { connect } from "react-redux";
import { Dispatch } from "redux";

import {
  CommentPlayerState,
  CommentPlayerActions,
  CommentData
} from "../modules/commentPlayer";
import { PlayerState } from "../modules/player";
import { SettingState } from "../modules/setting";
import { ViewerState } from "../modules/viewer";

type Comment = {
  line: number;
  time: number;
  element: HTMLElement;
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
  comments: number[];
};
class CommentPlayer extends Component<Props, State> {
  screen: HTMLElement | null = null;
  state = {
    comments: []
  };
  updaterId?: number;
  lines: (Comment | null)[] = [];
  cp = 0;
  time = 0;

  render() {
    const { comments } = this.state;
    return (
      <View
        style={styles.container}
        onLayout={() => {
          this.adjust();
        }}
      >
        <style>
          {`
            .commentPlayer {
              flex: 1;
              overflow: hidden;
            }
            .comment {
              color: #ffffff;
              lineHeight: 150%;
              position: absolute;
              text-shadow: 1px 1px 5px #000000;
              white-space: nowrap;
            }
          `}
        </style>
        <div
          className="commentPlayer"
          ref={ref => {
            this.screen = ref;
            this.adjust();
          }}
        >
          {comments.map(key => (
            <div
              key={key}
              className="comment"
              onTransitionEnd={({ target }) => {
                const element = target as HTMLElement;
                element.innerHTML = "";
              }}
            />
          ))}
        </div>
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
      comments.push(i);
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
    let { pointer } = commentPlayer;

    if (player.time < this.time) {
      this.clear();
      pointer = 0;
    } else {
      const { start, data, filters } = commentPlayer;
      const { commentPlayer: commentPlayerSetting = {} } = setting;
      const duration = parseInt(commentPlayerSetting.duration || "5000", 10);
      let time = this.time;
      if (player.time - time > duration + updateInterval) {
        time = player.time - duration;
        this.clear();
      }
      while (pointer < data.length) {
        const commentData = data[pointer];
        if (commentData.time >= player.time + start) {
          break;
        }
        if (
          commentData.time >= time + start &&
          filters.indexOf(commentData.title) >= 0
        ) {
          this.deploy(commentData);
        }
        pointer++;
      }
    }

    if (pointer !== commentPlayer.pointer) {
      dispatch(CommentPlayerActions.seek(pointer));
    }
    dispatch(CommentPlayerActions.load(player.time));
    this.time = player.time;

    this.updaterId = setTimeout(() => {
      this.runUpdater();
    }, updateInterval);
  }

  adjust() {
    if (this.screen) {
      const elements = this.screen.getElementsByClassName("comment");
      const fontSize = ((this.screen.clientHeight / this.lines.length) * 2) / 3;
      for (let i = 0; i < elements.length; i++) {
        const element = elements.item(i) as HTMLElement;
        element.style.fontSize = `${fontSize}px`;
      }
    }
  }

  clear() {
    if (this.screen) {
      const elements = this.screen.getElementsByClassName("comment");
      for (let i = 0; i < elements.length; i++) {
        const element = elements.item(i) as HTMLElement;
        element.innerText = "";
      }
    }
  }

  deploy(data: CommentData) {
    if (this.screen) {
      const elements = this.screen.getElementsByClassName("comment");
      const element = elements.item(this.cp) as HTMLElement;
      if (element) {
        const { commentPlayer } = this.props;
        const { start } = commentPlayer;
        const comment = {
          line: -1,
          time: data.time - start,
          element
        };
        element.style.visibility = "hidden";
        element.innerText = data.text
          .replace(/>{1,2}[0-9-]+/g, "")
          .replace(/^>.+$/g, "")
          .replace(/[a-zA-Z]+:\/\/\S+/g, "")
          .trim();

        this.activate(comment);
      }
      this.cp++;
      if (this.cp >= elements.length) {
        this.cp = 0;
      }
    }
  }

  activate(comment: Comment) {
    comment.line = this.selectLine(comment);
    this.lines[Math.floor(comment.line)] = comment;

    const { player, setting } = this.props;
    const { commentPlayer: commentPlayerSetting = {} } = setting;
    const duration = parseInt(commentPlayerSetting.duration || "5000", 10);
    const delay = comment.time - player.time + updateInterval;

    const { element } = comment;
    element.style.transitionDelay = `${delay}ms`;
    element.style.transitionDuration = `${duration}ms`;
    element.style.transitionProperty = "none";
    element.style.transitionTimingFunction = "linear";
    element.style.top = `${(comment.line * 100) / (this.lines.length + 1)}%`;
    element.style.right = `${-element.offsetWidth}px`;
    element.style.visibility = "visible";
    setTimeout(() => {
      element.style.transitionProperty = "right";
      element.style.right = "100%";
    }, 0);
  }

  selectLine(comment: Comment) {
    const { player, setting } = this.props;
    const { commentPlayer: commentPlayerSetting = {} } = setting;
    const duration = parseInt(commentPlayerSetting.duration || "5000", 10);
    const containerWidth = this.screen ? this.screen.clientWidth : 0;
    const reachTime =
      ((comment.time + duration - player.time) * containerWidth) /
      (containerWidth + comment.element.offsetWidth);
    let candidateLife = Infinity;
    let candidateRight = Infinity;
    let candidateIndex = 0;
    for (let i = 0; i < this.lines.length; i += 1) {
      const line = this.lines[i];
      if (!line || !line.element.innerText) {
        return i;
      }
      const remainingTime = line.time + duration - player.time;
      const right = line.element.offsetLeft + line.element.offsetWidth;
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
    flex: 1
  }
});
