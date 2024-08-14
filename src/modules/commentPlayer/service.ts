/*!
Copyright 2016-2023 Brazil Ltd.
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

import { call, select, put } from "redux-saga/effects";
import Toast from "react-native-root-toast";

import { getCommentService } from "../../services";
import CommentService from "../../services/CommentService";
import { CommentPlayerActions, CommentInterval, CommentData, CommentPlayerState } from ".";
import { toastOptions } from "../../config/constants";

export function* requestIntervals(channel: string, start: number, end: number) {
  try {
    const {
      comment: commentSetting = {},
      commentPlayer: commentPlayerSetting = {},
      queryTable = {}
    } = yield select(({ setting }) => setting);
    const commentService: CommentService = yield call(() =>
      getCommentService(commentSetting)
    );
    const { delay = 0 } = commentPlayerSetting;
    const {
      status,
      data = {}
    }: {
      status: string;
      data?: {
        n_hits?: number;
        intervals?: CommentInterval[];
      };
    } = yield call(() =>
      commentService.request("intervals", {
        params: {
          channel: CommentService.channelToQueries(channel, queryTable).join(
            "||"
          ),
          start: Math.floor((start + delay) / 60000 - 1) * 60000,
          end: Math.ceil((end + delay) / 60000) * 60000,
          interval: "1m",
          fill: 1
        }
      })
    );
    if (status === "OK" && Array.isArray(data.intervals)) {
      return data.intervals;
    }
  } catch (e: any) {
    Toast.show(e.message || JSON.stringify(e, null, 2), {
      ...toastOptions,
      duration: Toast.durations.SHORT
    });
  }
  return [];
}

export function* requestComments(time: number) {
  try {
    const state: CommentPlayerState = yield select(({ commentPlayer }) => commentPlayer);
    const { commentPlayer: commentPlayerSetting = {} } = yield select(
      ({ setting }) => setting
    );
    const { delay = 0 } = commentPlayerSetting;
    const start = state.start + time + delay - 60000;
    const end = state.start + time + delay + 60000;
    const intervals: CommentInterval[] = [];
    const targets: CommentInterval[] = [];
    for (const interval of state.intervals) {
      if (
        !interval.isLoaded &&
        interval.n_hits > 0 &&
        interval.start > start &&
        interval.start < end
      ) {
        targets.push(interval);
        intervals.push({ ...interval, isLoaded: true });
      } else {
        intervals.push(interval);
      }
    }
    if (targets.length > 0) {
      yield put(CommentPlayerActions.intervals(intervals));
      const { comment: commentSetting = {}, queryTable = {} } = yield select(
        ({ setting }) => setting
      );
      const commentService: CommentService = yield call(() =>
        getCommentService(commentSetting)
      );
      const {
        status,
        data = {}
      }: {
        status: string;
        data?: {
          comments?: CommentData[];
        };
      } = yield call(() =>
        commentService.request("comments", {
          params: {
            channel: CommentService.channelToQueries(state.channel, queryTable).join(
              "||"
            ),
            start: targets[0].start,
            end: targets[targets.length - 1].start + 60000
          }
        })
      );
      if (status === "OK" && Array.isArray(data.comments)) {
        return data.comments;
      }
    }
  } catch (e) {}
  return [];
}
