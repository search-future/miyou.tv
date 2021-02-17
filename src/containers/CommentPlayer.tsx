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
  useRef,
  useMemo
} from "react";
import {
  View,
  StyleSheet,
  LayoutChangeEvent,
  Animated,
  Easing,
  Platform
} from "react-native";
import { useDispatch, useSelector, shallowEqual } from "react-redux";

import containerStyle from "../styles/container";
import { RootState } from "../modules";
import { CommentPlayerActions, CommentData } from "../modules/commentPlayer";
import { ViewerProgram } from "../modules/viewer";
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

type Setting = SettingState & {
  commentPlayer?: {
    duration?: string;
    maxLines?: string;
    maxComments?: string;
  };
  queryTable?: { [channel: string]: string[] };
};
type State = RootState & {
  setting: Setting;
};

const CommentPlayer = memo(() => {
  const layoutCallbackId = useRef<number>();
  const lines = useRef<(Comment | null)[]>([]);
  const queue = useRef<{ index: number; width: number }[]>([]);
  const cp = useRef(0);
  const timeRef = useRef(0);

  const dispatch = useDispatch();
  const commentDuration = useSelector<State, number>(({ setting }) =>
    parseInt(setting.commentPlayer?.duration || "5000", 10)
  );
  const maxComments = useSelector<State, number>(({ setting }) =>
    parseInt(setting.commentPlayer?.maxComments || "50", 10)
  );
  const maxLines = useSelector<State, number>(({ setting }) =>
    parseInt(setting.commentPlayer?.maxLines || "10", 10)
  );
  const channel = useSelector<State, string>(
    ({ commentPlayer }) => commentPlayer.channel
  );
  const start = useSelector<State, number>(
    ({ commentPlayer }) => commentPlayer.start
  );
  const end = useSelector<State, number>(
    ({ commentPlayer }) => commentPlayer.end
  );
  const data = useSelector<State, CommentData[]>(
    ({ commentPlayer }) => commentPlayer.data,
    shallowEqual
  );
  const pointer = useSelector<State, number>(
    ({ commentPlayer }) => commentPlayer.pointer
  );
  const filters = useSelector<State, string[]>(
    ({ commentPlayer }) => commentPlayer.filters,
    shallowEqual
  );
  const duration = useSelector<State, number>(({ player }) => player.duration);
  const time = useSelector<State, number>(
    ({ player }) => player.time,
    (left, right) =>
      Math.floor(left / updateInterval) === Math.floor(right / updateInterval)
  );
  const program = useSelector<State, ViewerProgram>(
    ({ viewer }) => viewer.programs[viewer.index],
    shallowEqual
  );
  const extraIndex = useSelector<State, number>(
    ({ viewer }) => viewer.extraIndex
  );
  const queryTable = useSelector<
    State,
    { [channel: string]: string[] } | undefined
  >(({ setting }) => setting.queryTable, shallowEqual);

  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);

  const recordedProgram = useMemo(
    () => program.recorded?.[extraIndex] || program,
    [program, extraIndex]
  );
  const height = useMemo(() => containerHeight / (lines.current.length + 1), [
    containerHeight,
    lines.current.length
  ]);
  const fontSize = useMemo(() => (height * 2) / 3, [height]);

  useEffect(
    () => () => {
      clearTimeout(layoutCallbackId.current);
    },
    []
  );
  useEffect(() => {
    cp.current = 0;
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
    const commentLines = [];
    for (let i = 0; i < maxLines; i++) {
      commentLines.push(null);
    }
    lines.current = commentLines;
    setComments(comments);
  }, [maxComments, maxLines, containerWidth, containerHeight]);
  useEffect(() => {
    const { channelName } = program;
    const { start, end } = recordedProgram;
    dispatch(
      CommentPlayerActions.init(
        channelName,
        new Date(start).getTime(),
        new Date(end).getTime()
      )
    );
  }, [program, recordedProgram, queryTable]);
  useEffect(() => {
    const selectLine = (comment: Comment) => {
      const reachTime =
        ((comment.time + commentDuration - time) * containerWidth) /
        (containerWidth + comment.width);
      let candidateLife = Infinity;
      let candidateRight = Infinity;
      let candidateIndex = 0;
      for (let i = 0; i < lines.current.length; i += 1) {
        const line = lines.current[i];
        if (!line || !line.text) {
          return i;
        }
        const remainingTime = line.time + commentDuration - time;
        const right =
          line.width +
          containerWidth -
          ((line.width + containerWidth) * (time - line.time)) /
            commentDuration;
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
    };

    let dp = pointer;
    let { current } = timeRef;
    let hasUpdate = false;

    if (start === end) {
      if (duration > 0) {
        dispatch(CommentPlayerActions.init(channel, start, end + duration));
      }
    } else if (time < current) {
      current = time;
      for (const comment of comments) {
        comment.active = false;
        comment.text = "";
      }
      dp = 0;
      hasUpdate = true;
    } else {
      if (time - current > commentDuration) {
        current = time - commentDuration;
      }
      for (const comment of comments) {
        if (comment.active && comment.time + commentDuration < time) {
          comment.active = false;
          comment.text = "";
          hasUpdate = true;
        }
      }
      while (dp < data.length) {
        const commentData = data[dp];
        if (commentData.time >= time + start) {
          break;
        }
        if (
          commentData.time >= current + start &&
          filters.indexOf(commentData.title) >= 0
        ) {
          const comment = comments[cp.current];
          if (comment) {
            comment.active = false;
            comment.id = commentData.id;
            comment.text = commentData.text
              .replace(/>{1,2}[0-9-]+/g, "")
              .replace(/^>.+$/g, "")
              .replace(/[a-zA-Z]+:\/\/\S+/g, "")
              .trim();
            comment.time = Infinity;
            comment.width = 0;
            cp.current++;
            if (cp.current >= comments.length) {
              cp.current = 0;
            }
            hasUpdate = true;
          }
        }
        dp++;
      }
    }

    while (queue.current.length > 0) {
      const info = queue.current.shift();
      if (info) {
        const { index, width } = info;
        const comment = comments[index];
        if (comment?.text) {
          comment.active = true;
          comment.time = time;
          comment.width = width;
          comment.line = selectLine(comment);
          lines.current[Math.floor(comment.line)] = comment;
          comment.x.setValue(containerWidth);
          Animated.timing(comment.x, {
            duration: commentDuration,
            easing: Easing.linear,
            toValue: -comment.width,
            useNativeDriver: Platform.OS !== "web"
          }).start();
          hasUpdate = true;
        }
      }
    }

    if (dp !== pointer) {
      dispatch(CommentPlayerActions.seek(dp));
    }
    if (hasUpdate) {
      setComments(comments);
    }
    dispatch(CommentPlayerActions.load(time));
    timeRef.current = time;
  }, [time]);

  const onLayout = useCallback(({ nativeEvent }: LayoutChangeEvent) => {
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
  const onLayoutComment = useCallback(
    (active: boolean, index: number, { nativeEvent }: LayoutChangeEvent) => {
      const { layout } = nativeEvent;
      const { width } = layout;
      if (!active && width > 0) {
        queue.current.push({ index, width });
      }
    },
    []
  );
  const commentRenderer = useCallback(
    (comment: Comment, index: number) => (
      <CommentText
        key={index}
        index={index}
        fontSize={fontSize}
        height={height}
        onLayout={onLayoutComment}
        {...comment}
      />
    ),
    [height, fontSize, onLayoutComment]
  );

  return (
    <View
      style={[containerStyle.container, styles.container]}
      onLayout={onLayout}
    >
      <View style={styles.view}>{comments.map(commentRenderer)}</View>
    </View>
  );
});
export default CommentPlayer;

const CommentText = memo(
  ({
    active,
    line,
    x,
    text,
    index,
    fontSize,
    height,
    onLayout
  }: Comment & {
    index: number;
    fontSize: number;
    height: number;
    onLayout?: (
      active: boolean,
      index: number,
      event: LayoutChangeEvent
    ) => void;
  }) => {
    const onLayoutWithInfo = useCallback(
      (event: LayoutChangeEvent) => {
        if (onLayout) {
          onLayout(active, index, event);
        }
      },
      [active, index, onLayout]
    );

    return (
      <Animated.Text
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
        onLayout={onLayoutWithInfo}
      >
        {text}
      </Animated.Text>
    );
  }
);

const updateInterval = 1000;

const styles = StyleSheet.create({
  container: {
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
