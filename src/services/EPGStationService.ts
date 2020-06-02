/*!
Copyright 2016-2020 Brazil Ltd.
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

import Axios, { AxiosRequestConfig } from "axios";
import qs from "qs";

import BackendService, { SearchOptions, Channel } from "./BackendService";
import { categoryTable } from "../config/constants";

type EPGStationSearchParams = {
  limit?: number;
  offset?: number;
  reverse?: boolean;
  rule?: number;
  genre1?: number;
  channel?: number;
  keyword?: string;
  hasTs?: boolean;
  recording?: boolean;
};
type EPGStationServiceItem = {
  id: number;
  serviceId: number;
  networkId: number;
  name: string;
  remoteControlKeyId?: number;
  hasLogoData: boolean;
  channelType: "GR" | "BS" | "CS" | "SKY";
  channel: string;
  type: number;
};
type EPGStationRecordedProgram = {
  id: number;
  channelId: number;
  channelType: "GR" | "BS" | "CS" | "SKY";
  startAt: number;
  endAt: number;
  name: string;
  description?: string;
  extended?: string;
  genre1?: number;
  genre2?: number;
  genre3?: number;
  genre4?: number;
  genre5?: number;
  genre6?: number;
  videoType?: "mpeg2" | "h.264" | "h.265";
  videoResolution?:
    | "240p"
    | "480i"
    | "480p"
    | "720p"
    | "1080i"
    | "2160p"
    | "4320p";
  videoStreamContent?: number;
  videoComponentType?: number;
  audioSamplingRate?: 16000 | 22050 | 24000 | 32000 | 44100 | 48000;
  audioComponentType?: number;
  recording: boolean;
  protection: boolean;
  filesize?: number;
  errorCnt?: number;
  dropCnt?: number;
  scramblingCnt?: number;
  hasThumbnail: boolean;
  original: boolean;
  filename?: string;
  encoded?: any[];
  encoding?: any[];
};
type EPGStationRecordedPrograms = {
  total: number;
  recorded: EPGStationRecordedProgram[];
};

export default class EPGStationService extends BackendService {
  url: string;
  user: string;
  password: string;
  streamType: string;
  streamParams: string;

  constructor({
    url = "http://127.0.0.1:8888/",
    user = "",
    password = "",
    streamType = "mp4",
    streamParams = "mode=0"
  } = {}) {
    super();
    this.url = url;
    this.user = user;
    this.password = password;
    this.streamType = streamType;
    this.streamParams = streamParams;
  }

  init() {
    return this.request("/api/config");
  }

  async search({ query = "", ...options }: SearchOptions = {}) {
    const {
      view = 100,
      page = 1,
      reverse = false,
      keyword,
      type,
      channel,
      category,
      start,
      end
    } = {
      ...BackendService.parseQuery(query),
      ...options
    };
    const channels: EPGStationServiceItem[] = await this.request(
      "/api/channels"
    );

    const params: EPGStationSearchParams = {};
    params.limit = 2 ** 31 - 1;
    params.reverse = !reverse;
    if (keyword) {
      params.keyword = keyword;
    }
    if (channel) {
      if (!isNaN(channel as any)) {
        params.channel = parseInt(channel, 10);
      } else {
        const { id } =
          channels.find(
            ({ serviceId, name }) =>
              String(serviceId) === channel || name === channel
          ) || {};
        params.channel = id;
      }
    }
    if (!isNaN(category as number)) {
      params.genre1 = category as number;
    } else if (category) {
      const { code = 15 } =
        categoryTable.find(
          ({ codeName, name }) => codeName === category || name === category
        ) || {};
      params.genre1 = code;
    }

    const result: EPGStationRecordedPrograms = await this.request(
      "/api/recorded",
      { params }
    );

    const recorded = result.recorded.filter(
      program =>
        (type == null || program.channelType === type) &&
        (end == null || isNaN(end) || program.startAt < end) &&
        (start == null || isNaN(start) || program.endAt > start)
    );

    const hits = recorded.length;
    const programs = [];
    const begin = (page - 1) * view;
    let length = page * view;
    if (length > recorded.length) {
      length = recorded.length;
    }
    for (let i = begin; i < length; i++) {
      const {
        id,
        channelType,
        channelId,
        name,
        description = "",
        genre1 = 15,
        startAt,
        endAt
      } = recorded[i];
      let duration = 0;
      try {
        const result = await this.request(`/api/recorded/${id}/duration`, {
          timeout: 1000,
          cancelToken: new Axios.CancelToken(cancel => {
            setTimeout(cancel, 1000);
          })
        });
        duration = result.duration * 1000;
      } catch (e) {
        duration = endAt - startAt;
      }
      programs.push({
        id: String(id),
        type: channelType,
        channel: String(channelId),
        channelName: (
          channels.find(({ id }) => id === channelId) || { name: "" }
        ).name,
        title: name,
        fullTitle: name,
        detail: description,
        category: categoryTable.find(({ code }) => code === genre1) || {
          code: 15,
          name: "etc"
        },
        duration,
        start: new Date(startAt),
        end: new Date(endAt),
        preview: this.getUrl(`/api/recorded/${id}/thumbnail`),
        stream: this.getUrl(
          this.streamType === "raw"
            ? `/api/recorded/${id}/file`
            : `/api/streams/recorded/${id}/${this.streamType}?${this.streamParams}`
        )
      });
    }
    return { hits, programs };
  }

  async getChannels({} = {}) {
    const result: EPGStationServiceItem[] = await this.request("/api/channels");
    const channels: Channel[] = [];
    for (const { id, channelType, name } of result) {
      const { total }: EPGStationRecordedPrograms = await this.request(
        "/api/recorded",
        {
          params: {
            channel: id,
            limit: 1
          }
        }
      );
      if (total > 0) {
        channels.push({
          type: channelType,
          channel: String(id),
          channelName: name
        });
      }
    }
    return channels;
  }

  clearCache() {}

  async request(
    path?: string,
    config: AxiosRequestConfig = {},
    useCache = true
  ) {
    const conf: AxiosRequestConfig = {
      url: this.getUrl(path),
      params: {},
      data: {},
      paramsSerializer: qs.stringify,
      transformRequest: data => qs.stringify(data),
      responseType: "json",
      ...config
    };
    const key = `${conf.url}?${qs.stringify(conf.params)}?${qs.stringify(
      conf.data
    )}`;
    if (!useCache || this.cache[key] == null) {
      const { data } = await Axios(conf);
      this.cache[key] = data;
    }
    return this.cache[key];
  }

  getUrl(path = "") {
    let wuiUrl = this.url || "http://127.0.0.1:8888";
    const auth = [];

    if (!/^https?:\/\//.test(wuiUrl)) {
      wuiUrl = "http://${wuiUrl}";
    }
    if (this.user) {
      auth.push(this.user);
      if (this.password) {
        auth.push(this.password);
      }
      wuiUrl = wuiUrl.replace(/^(https?:\/\/)(.*)$/, `$1${auth.join(":")}@$2`);
    }
    wuiUrl = wuiUrl.replace(/\/$/, "");
    return `${wuiUrl}${path}`;
  }
}
