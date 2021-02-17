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
import { View } from "react-native";
import { useDispatch, useSelector, shallowEqual } from "react-redux";

import containerStyle from "../styles/container";
import { RootState } from "../modules";
import { CommentPlayerActions, CommentData } from "../modules/commentPlayer";
import { SettingState } from "../modules/setting";
import { ViewerProgram } from "../modules/viewer";

type Comment = {
  line: number;
  time: number;
  element: HTMLElement;
};

type Setting = SettingState & {
  commentPlayer?: {
    duration?: string;
    maxComments?: string;
    maxLines?: string;
  };
  queryTable?: { [channel: string]: string[] };
};
type State = RootState & {
  setting: Setting;
};

const CommentPlayer = memo(() => {
  const screenRef = useRef<HTMLDivElement | null>(null);
  const lines = useRef<(Comment | null)[]>([]);
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

  const [comments, setComments] = useState<(number | null)[]>([]);

  const recordedProgram = useMemo(
    () => program.recorded?.[extraIndex] || program,
    [program, extraIndex]
  );

  useEffect(() => {
    cp.current = 0;
    dispatch(CommentPlayerActions.seek(0));

    const comments = [];
    for (let i = 0; i < maxComments; i++) {
      comments.push(i);
    }
    const commentLines = [];
    for (let i = 0; i < maxLines; i++) {
      commentLines.push(null);
    }
    lines.current = commentLines;
    setComments(comments);
  }, [maxComments, maxLines]);
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
    const clear = () => {
      if (screenRef.current) {
        const elements = screenRef.current.getElementsByClassName("comment");
        for (let i = 0; i < elements.length; i++) {
          const element = elements.item(i) as HTMLElement;
          element.innerText = "";
        }
      }
    };
    const deploy = (data: CommentData) => {
      if (screenRef.current) {
        const elements = screenRef.current.getElementsByClassName("comment");
        const element = elements.item(cp.current) as HTMLElement;
        if (element) {
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

          activate(comment);
        }
        cp.current++;
        if (cp.current >= elements.length) {
          cp.current = 0;
        }
      }
    };
    const activate = (comment: Comment) => {
      comment.line = selectLine(comment);
      lines.current[Math.floor(comment.line)] = comment;

      const delay = comment.time - time + updateInterval;

      const { element } = comment;
      element.style.transitionDelay = `${delay}ms`;
      element.style.transitionDuration = `${commentDuration}ms`;
      element.style.transitionProperty = "none";
      element.style.transitionTimingFunction = "linear";
      element.style.top = `${
        (comment.line * 100) / (lines.current.length + 1)
      }%`;
      element.style.right = `${-element.offsetWidth}px`;
      element.style.visibility = "visible";
      setTimeout(() => {
        element.style.transitionProperty = "right";
        element.style.right = "100%";
      }, 0);
    };
    const selectLine = (comment: Comment) => {
      const containerWidth = screenRef.current
        ? screenRef.current.clientWidth
        : 0;
      const reachTime =
        ((comment.time + commentDuration - time) * containerWidth) /
        (containerWidth + comment.element.offsetWidth);
      let candidateLife = Infinity;
      let candidateRight = Infinity;
      let candidateIndex = 0;
      for (let i = 0; i < lines.current.length; i += 1) {
        const line = lines.current[i];
        if (!line || !line.element.innerText) {
          return i;
        }
        const remainingTime = line.time + commentDuration - time;
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
    };

    let dp = pointer;
    let { current } = timeRef;
    if (start === end) {
      if (duration > 0) {
        dispatch(CommentPlayerActions.init(channel, start, end + duration));
      }
    } else if (time < current) {
      clear();
      dp = 0;
    } else {
      if (time - current > commentDuration + updateInterval) {
        current = time - commentDuration;
        clear();
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
          deploy(commentData);
        }
        dp++;
      }
    }

    if (dp !== pointer) {
      dispatch(CommentPlayerActions.seek(dp));
    }
    dispatch(CommentPlayerActions.load(time));
    timeRef.current = time;
  }, [time]);

  const onLayout = useCallback(() => {
    if (screenRef.current) {
      const elements = screenRef.current.getElementsByClassName("comment");
      const fontSize =
        ((screenRef.current.clientHeight / lines.current.length) * 2) / 3;
      for (let i = 0; i < elements.length; i++) {
        const element = elements.item(i) as HTMLElement | null;
        if (element) {
          element.style.fontSize = `${fontSize}px`;
        }
      }
    }
  }, []);
  const commentRenderer = useCallback(
    key => <CommentText key={String(key)} />,
    []
  );

  return (
    <View style={containerStyle.container} onLayout={onLayout}>
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
      <div className="commentPlayer" ref={screenRef}>
        {comments.map(commentRenderer)}
      </div>
    </View>
  );
});
export default CommentPlayer;

const CommentText = memo(() => {
  const ref = useRef<HTMLDivElement>(null);

  const onTransitionEnd = useCallback(() => {
    if (ref.current) {
      ref.current.innerHTML = "";
    }
  }, []);

  return (
    <div ref={ref} className="comment" onTransitionEnd={onTransitionEnd} />
  );
});

const updateInterval = 1000;
