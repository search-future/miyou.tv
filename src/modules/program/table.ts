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

import { ProgramActions, ProgramState } from ".";
import { LoadingActions } from "../loading";
import { ServiceState } from "../service";
import { getBackendService, getCommentService } from "../../services";
import BackendService, {
  Channel,
  Program,
  SearchResult
} from "../../services/BackendService";
import CommentService from "../../services/CommentService";
import { toastOptions } from "../../config/constants";

export type ProgramTableProgram = Program & {
  position?: number;
  size?: number;
  commentCount?: number;
  commentSpeed?: number;
  commentMaxSpeed?: number;
  commentMaxSpeedTime?: Date;
};

export type ProgramTableColumn = Channel & {
  programs: ProgramTableProgram[];
};

export type ProgramTableData = {
  columns?: ProgramTableColumn[];
  maxDate?: Date;
  minDate?: Date;
  offset?: number;
  start?: Date;
};

function* init() {
  const {
    backend: backendSetting = {},
    useArchive = true
  }: {
    backend: any;
    useArchive: boolean;
  } = yield select(({ setting }) => setting);
  const backendService: BackendService = yield call(() =>
    getBackendService(backendSetting)
  );

  const data: ProgramTableData = {};

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
  data.columns = channels.map(channel => ({ ...channel, programs: [] }));

  yield put(ProgramActions.update("table", data));
}

export function* tableSaga() {
  try {
    yield put(LoadingActions.start(true));
    yield put(ProgramActions.update("table", { columns: [] }));
    yield delay(0);

    const { initilized }: ProgramState = yield select(
      ({ program = {} }) => program
    );
    let { table: data }: { table: ProgramTableData } = yield select(
      ({ program = {} }) => program
    );
    if (!initilized || !data) {
      yield call(init);
      data = yield select(({ program: { table = {} } }) => table);
    }

    const {
      backend: backendSetting,
      useArchive = true,
      view: viewSetting = {}
    }: {
      backend?: any;
      useArchive?: boolean;
      view?: {
        countMode?: string;
        hourFirst?: string;
      };
    } = yield select(({ setting }) => setting);
    const { countMode = "speed" } = viewSetting;
    const hourFirst = parseInt(viewSetting.hourFirst || "4", 10);

    const maxDate = new Date(data.maxDate || Date.now());
    const minDate = new Date(data.minDate || Date.now() - 86400000);
    const date = data.start
      ? new Date(data.start)
      : new Date(
          maxDate.getFullYear(),
          maxDate.getMonth(),
          maxDate.getDate(),
          hourFirst
        );
    date.setHours(hourFirst);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    if (date.getTime() < minDate.getTime()) {
      date.setTime(minDate.getTime());
      date.setHours(hourFirst);
      date.setMinutes(0);
      date.setSeconds(0);
      date.setMilliseconds(0);
    }
    if (date.getTime() > maxDate.getTime()) {
      date.setTime(maxDate.getTime());
      date.setHours(hourFirst);
      date.setMinutes(0);
      date.setSeconds(0);
      date.setMilliseconds(0);
    }

    const start = date.getTime();
    date.setDate(date.getDate() + 1);
    const end = date.getTime();

    const backendService: BackendService = yield call(() =>
      getBackendService(backendSetting)
    );

    let baseColumns = data.columns || [];
    let columns: ProgramTableColumn[] = [];
    for (const column of baseColumns) {
      const { type, channel } = column;
      const view = 100;
      let page = 0;
      let hits = view;
      const programs: ProgramTableProgram[] = [];
      while (hits > page * view) {
        page++;
        const result: SearchResult = yield call(() =>
          backendService.search({
            type,
            channel,
            start,
            end,
            page,
            view,
            useArchive
          })
        );
        hits = result.hits;
        programs.push(
          ...result.programs.map(program => {
            let position = (program.start.getTime() - start) / 3600000;
            let size = program.duration / 3600000;
            if (position < 0) {
              size += position;
              position = 0;
            }
            const overflow = position + size - 24;
            if (overflow > 0) {
              size -= overflow;
            }
            return { ...program, position, size };
          })
        );
      }
      columns.push({ ...column, programs });
    }
    yield put(ProgramActions.update("table", { columns }));
    yield delay(0);

    const { commentActive }: ServiceState = yield select(
      ({ service }) => service
    );
    if (countMode !== "none" && commentActive) {
      yield put(LoadingActions.start(false));

      const { comment: commentSetting, queryTable = {} } = yield select(
        ({ setting }) => setting
      );
      const commentService: CommentService = yield call(() =>
        getCommentService(commentSetting)
      );

      baseColumns = columns;
      columns = [];
      for (const column of baseColumns) {
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
              start,
              end,
              channel: CommentService.channelToQueries(
                column.channelName,
                queryTable
              ).join("||"),
              interval: "1m"
            }
          })
        );
        let programs: ProgramTableProgram[] = column.programs;
        if (result.n_hits > 0) {
          programs = column.programs.map(program => {
            const start = program.start.getTime();
            const end = program.end.getTime();
            const minutes = (end - start) / 60000;
            const intervals = result.intervals.filter(
              a => a.start >= start && a.start < end
            );
            intervals.sort((a, b) => b.n_hits - a.n_hits);
            const [maxInterval] = intervals;
            const commentCount = intervals
              .map(({ n_hits }) => n_hits)
              .reduce((a, b) => a + b, 0);
            const commentSpeed = commentCount / minutes;

            const commentMaxSpeed = maxInterval && maxInterval.n_hits;
            const commentMaxSpeedTime =
              maxInterval && new Date(maxInterval.start);
            return {
              ...program,
              commentCount,
              commentSpeed,
              commentMaxSpeed,
              commentMaxSpeedTime
            };
          });
        }
        columns.push({ ...column, programs });
      }
      yield put(
        ProgramActions.update("table", {
          columns,
          start: new Date(start)
        })
      );
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
