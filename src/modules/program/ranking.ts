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

import { call, delay, put, select } from "redux-saga/effects";
import Toast from "react-native-root-toast";

import { ProgramActions } from ".";
import { LoadingActions } from "../loading";
import { getBackendService, getCommentService } from "../../services";
import BackendService, {
  Channel,
  Program,
  SearchResult
} from "../../services/BackendService";
import CommentService from "../../services/CommentService";
import { toastOptions } from "../../config/constants";

export type ProgramRankingTarget = {
  label: string;
  value: string;
};
export type ProgramRankingProgram = Program & {
  rank?: number;
  commentCount?: number;
  commentSpeed?: number;
  commentMaxSpeed?: number;
  commentMaxSpeedTime?: number;
};
export type ProgramRankingData = {
  channels?: Channel[];
  end?: number;
  maxDate?: number;
  minDate?: number;
  programs?: ProgramRankingProgram[];
  start?: number;
  target?: string;
  targets?: ProgramRankingTarget[];
  unique?: boolean;
  view?: number;
};

export function* init() {
  const { backend: backendSetting = {}, useArchive = true } = yield select(
    ({ setting }) => setting
  );
  const backendService: BackendService = yield call(() =>
    getBackendService(backendSetting)
  );
  const data: ProgramRankingData = {};

  const { programs: last }: SearchResult = yield call(() =>
    backendService.search({
      page: 1,
      view: 1,
      reverse: true,
      useArchive: false
    })
  );
  if (last.length > 0) {
    const [{ end }] = last;
    data.maxDate = end;
  }

  const { programs: first }: SearchResult = yield call(() =>
    backendService.search({
      page: 1,
      view: 1,
      reverse: false,
      useArchive: false
    })
  );
  if (first.length > 0) {
    const [{ start }] = first;
    data.minDate = start;
  }

  const channels: Channel[] = yield call(() =>
    backendService.getChannels({ useArchive })
  );
  data.channels = channels;

  const types: string[] = [];
  for (const { type } of channels) {
    if (types.indexOf(type) < 0) {
      types.push(type);
    }
  }

  const targets: ProgramRankingTarget[] = [];
  targets.push({
    label: "総合(24時間)",
    value: ",,1"
  });
  if (types.length > 1) {
    for (const type of types) {
      targets.push({
        label: `${/GR|[1-9]S/.test(type) ? "地上波" : type}(24時間)`,
        value: `${type},,1`
      });
    }
  }
  for (const { type, channel, channelName } of channels) {
    targets.push({
      label: `${channelName}(24時間)`,
      value: `${type},${channel},1`
    });
    targets.push({
      label: `${channelName}(1週間)`,
      value: `${type},${channel},7`
    });
  }
  data.targets = targets;

  yield put(ProgramActions.update("ranking", data));
}

export function* rankingSaga() {
  try {
    yield put(LoadingActions.start(true));
    yield put(ProgramActions.update("ranking", { programs: [] }));
    yield delay(0);

    const { initilized }: { initilized: boolean } = yield select(
      ({ program = {} }) => program
    );
    let { ranking: data }: { ranking: ProgramRankingData } = yield select(
      ({ program = {} }) => program
    );
    if (!initilized || !data) {
      yield call(init);
      data = yield select(({ program: { ranking = {} } = {} }) => ranking);
    }

    const {
      backend: backendSetting = {},
      comment: commentSetting = {},
      queryTable = {},
      rankingOptions = {},
      useArchive = true,
      view: viewSetting = {}
    }: {
      backend?: any;
      comment?: any;
      queryTable?: any;
      rankingOptions?: {
        unique?: boolean;
        view?: string;
      };
      useArchive?: boolean;
      view?: {
        hourFirst?: string;
      };
    } = yield select(({ setting }) => setting);
    const { unique = true, view = "25" } = rankingOptions;
    const hourFirst = parseInt(viewSetting.hourFirst || "4", 10);
    const { channels = [], target = ",,1" } = data;
    const [channelType, channelNum, length] = target.split(",");
    const maxDate = new Date(data.maxDate || Date.now());
    const minDate = new Date(data.minDate || Date.now() - 86400000);
    const date = data.start
      ? new Date(data.start)
      : new Date(
          maxDate.getFullYear(),
          maxDate.getMonth(),
          maxDate.getDate() - 1
        );
    date.setHours(hourFirst);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    if (date.getTime() < minDate.getTime()) {
      date.setTime(minDate.getTime());
    }
    const start = date.getTime();
    date.setDate(date.getDate() + parseInt(length, 10));
    date.setHours(hourFirst);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    if (date.getTime() > maxDate.getTime()) {
      date.setTime(maxDate.getTime());
      date.setDate(date.getDate() - parseInt(length, 10));
      if (date.getTime() < minDate.getTime()) {
        date.setTime(minDate.getTime());
      }
    }
    const end = date.getTime();

    yield put(ProgramActions.update("ranking", { start, end }));
    yield delay(0);

    const targetChannels = channels.filter(
      ({ type, channel }) =>
        (!channelType || type === channelType) &&
        (!channelNum || channel === channelNum)
    );

    const commentService: CommentService = yield call(() =>
      getCommentService(commentSetting)
    );
    const backendService: BackendService = yield call(() =>
      getBackendService(backendSetting)
    );

    const intervals: (Channel & {
      n_hits: number;
      start: number;
    })[] = [];
    for (const channel of targetChannels) {
      const {
        status,
        data
      }: {
        data: {
          n_hits: number;
          intervals: {
            n_hits: number;
            start: number;
          }[];
        };
        status: string;
      } = yield call(() =>
        commentService.request("intervals", {
          params: {
            channel: CommentService.channelToQueries(
              channel.channelName,
              queryTable
            ).join("||"),
            start,
            end,
            interval: "1m"
          }
        })
      );
      if (status === "OK" && data.n_hits > 0) {
        intervals.push(...data.intervals.map(a => ({ ...a, ...channel })));
      }
    }
    intervals.sort((a, b) => a.n_hits - b.n_hits);

    const limit = parseInt(view, 10);
    let current = 0;
    let index = 0;
    let rank = 0;

    yield put(LoadingActions.start());

    let programs: ProgramRankingProgram[] = [];
    while (programs.length < limit) {
      const interval = intervals.pop();
      if (interval == null) {
        break;
      }
      let program = programs.find(
        ({ type, channel, start, end }) =>
          type === interval.type &&
          channel === interval.channel &&
          start <= interval.start + 60000 &&
          end > interval.start
      );
      if (program == null || !unique) {
        if (program == null) {
          const { programs }: SearchResult = yield call(() =>
            backendService.search({
              page: 1,
              view: 1,
              type: interval.type,
              channel: interval.channel,
              end: interval.start + 60000,
              reverse: true,
              useArchive
            })
          );

          program = programs.find(
            ({ start, end }) =>
              start <= interval.start + 60000 && end > interval.start
          );
          if (program != null) {
            const minutes = (program.end - program.start) / 60000;
            let commentCount = 0;
            try {
              const {
                data,
                status
              }: {
                data: { n_hits: number };
                status: string;
              } = yield call(
                program =>
                  commentService.request("comments", {
                    params: {
                      channel: CommentService.channelToQueries(
                        program.channelName,
                        queryTable
                      ).join("||"),
                      start: program.start,
                      end: program.end,
                      limit: 0
                    }
                  }),
                program
              );
              if (status === "OK") {
                commentCount = data.n_hits;
              }
            } catch (e) {
              commentCount = 0;
            }
            program.commentCount = commentCount;
            program.commentSpeed = commentCount / minutes;
          }
        }
        if (program != null) {
          const commentMaxSpeed = interval.n_hits;
          const commentMaxSpeedTime = interval.start;
          index++;
          if (current !== interval.n_hits) {
            rank = index;
            current = commentMaxSpeed;
          }
          programs = [
            ...programs,
            {
              ...program,
              commentMaxSpeed,
              commentMaxSpeedTime,
              rank
            }
          ];
          yield put(ProgramActions.update("ranking", { programs }));
          yield delay(0);
        }
      }
    }
  } catch (e: any) {
    Toast.show(e.message || JSON.stringify(e, null, 2), {
      ...toastOptions,
      duration: Toast.durations.LONG
    });
  }
  yield put(LoadingActions.complete());
}
