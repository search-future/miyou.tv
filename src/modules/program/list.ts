/*!
Copyright 2016-2025 Brazil Ltd.
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

import { call, delay, put, select } from "redux-saga/effects";
import Toast from "react-native-root-toast";

import { ProgramActions } from ".";
import { LoadingActions } from "../loading";
import { ServiceState } from "../service";
import { getBackendService, getCommentService } from "../../services";
import BackendService, {
  SearchResult,
  Program
} from "../../services/BackendService";
import CommentService from "../../services/CommentService";
import { toastOptions } from "../../config/constants";

export type ProgramListProgram = Program & {
  commentCount?: number;
  commentSpeed?: number;
  commentMaxSpeed?: number;
  commentMaxSpeedTime?: number;
};
export type ProgramListData = {
  hits?: number;
  page?: number;
  programs?: ProgramListProgram[];
  query?: string;
};

export function* listSaga() {
  try {
    yield put(LoadingActions.start(true));
    yield put(ProgramActions.update("list", { programs: [] }));
    yield delay(0);

    const {
      backend: backendSetting = {},
      useArchive = true,
      listOptions: options = {},
      view: viewSetting = {}
    }: {
      backend?: any;
      useArchive?: boolean;
      listOptions?: {
        reverse?: boolean;
        view?: string;
      };
      view?: {
        countMode?: string;
      };
    } = yield select(({ setting }) => setting);
    const { view = "25", reverse = true } = options;
    const { countMode = "speed" } = viewSetting;
    const { list: data = {} }: { list: ProgramListData } = yield select(
      ({ program }) => program
    );
    const { page = 1, query } = data;

    const backendService: BackendService = yield call(() =>
      getBackendService(backendSetting)
    );

    const result: SearchResult = yield call(() =>
      backendService.search({
        view: parseInt(view, 10),
        page,
        reverse,
        query,
        useArchive
      })
    );
    const { hits } = result;
    let programs = result.programs;
    yield put(ProgramActions.update("list", { hits, programs }));
    yield delay(0);

    const { commentActive }: ServiceState = yield select(
      ({ service }) => service
    );
    if (countMode !== "none" && commentActive) {
      yield put(LoadingActions.start(false));

      const { comment: commentSetting, queryTable } = yield select(
        ({ setting }) => setting
      );
      const commentService: CommentService = yield call(() =>
        getCommentService(commentSetting)
      );

      const basePrograms = programs;
      programs = [];
      for (const program of basePrograms) {
        const {
          data: result
        }: {
          data: {
            n_hits: number;
            intervals: {
              n_hits: number;
              start: number;
            }[];
          };
        } = yield call(() =>
          commentService.request("intervals", {
            params: {
              channel: CommentService.channelToQueries(
                program.channelName,
                queryTable
              ).join("||"),
              start: program.start,
              end: program.end,
              interval: "1m"
            }
          })
        );
        const { n_hits, intervals } = result;
        const commentInfo: {
          commentCount?: number;
          commentSpeed?: number;
          commentMaxSpeed?: number;
          commentMaxSpeedTime?: number;
        } = {};
        if (n_hits > 0) {
          commentInfo.commentCount = n_hits;
          const minutes =
            (program.end - program.start) / 60000;
          intervals.sort((a, b) => b.n_hits - a.n_hits);
          const [maxInterval] = intervals;
          commentInfo.commentSpeed = commentInfo.commentCount / minutes;
          commentInfo.commentMaxSpeed = maxInterval && maxInterval.n_hits;
          commentInfo.commentMaxSpeedTime =
            maxInterval && maxInterval.start;
        }
        programs.push({ ...program, ...commentInfo });
      }
      yield put(ProgramActions.update("list", { programs }));
      yield delay(0);
    }
  } catch (e: any) {
    Toast.show(e.message || JSON.stringify(e, null, 2), {
      ...toastOptions,
      duration: Toast.durations.LONG
    });
  }
  yield put(LoadingActions.complete());
}
