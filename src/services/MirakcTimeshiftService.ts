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

import Axios, { AxiosRequestConfig } from "axios";
import { Base64 } from "js-base64";
import qs from "qs";

import BackendService, { Program, SearchOptions } from "./BackendService";
import { categoryTable } from "../config/constants";
import moment from "../utils/moment-with-locale";

type MirakcTimeshiftRecorder = {
  duration: number;
  name: string;
  pipeline: {
    commant: string;
    pipe: number;
  }[];
  recording: false;
  service: {
    channel: { type: string; channel: string };
    hasLogoData: false;
    id: number;
    logoId: number;
    name: string;
    networkId: number;
    remoteControlKeyId: number;
    serviceId: number;
    transportStreamId: number;
    type: number;
    startTime: number;
  };
};

type MirakcTimeshiftRecord = {
  id: number;
  program: {
    id: number;
    eventId: number;
    serviceId: number;
    transportStreamId: number;
    networkId: number;
    startAt: number;
    duration: number;
    isFree: boolean;
    name: string;
    description: string;
    video: {
      type: string;
      resolution: string;
      streamContent: number;
      componentType: number;
    };
    audio: { samplingRate: number; componentType: number };
    genres: { lv1: number; lv2: number; un1: number; un2: number }[];
  };
  startTime: number;
  duration: number;
  size: number;
  recording: boolean;
};

export default class MirakcTimeshiftService extends BackendService {
  url: string;
  user: string;
  password: string;

  static parseCategory(value: any) {
    let category;
    if (!isNaN(value)) {
      category = categoryTable.find(({ code }) => code === parseInt(value, 10));
    } else if (value) {
      category = categoryTable.find(
        ({ codeName, name }) => codeName === value || name === value
      );
    }
    if (category) {
      return category;
    }
    return (
      categoryTable.find(({ code }) => code === 15) || { code: 15, name: "etc" }
    );
  }

  constructor({
    url = "http://127.0.0.1:40772/",
    user = "",
    password = ""
  }: {
    url: string;
    user: string;
    password: string;
  }) {
    super();
    this.url = url;
    this.user = user;
    this.password = password;
  }

  async init() {
    return this.request("/api/version");
  }

  async getChannels() {
    const recorders: MirakcTimeshiftRecorder[] = await this.request(
      "/api/timeshift"
    );
    return recorders.map(({ service: { channel, name, serviceId } }) => ({
      type: channel.type,
      channel: String(serviceId),
      channelName: name
    }));
  }

  async search({
    view = 100,
    page = 1,
    reverse = false,
    keyword,
    type,
    channel,
    category,
    start,
    end
  }: SearchOptions) {
    const programs: Program[] = [];
    const recorders: MirakcTimeshiftRecorder[] = await this.request(
      "/api/timeshift"
    );
    for (const { name: recorderName, service } of recorders) {
      if (
        (type == null || service.channel.type === type) &&
        (channel == null || String(service.serviceId) === String(channel))
      ) {
        const records: MirakcTimeshiftRecord[] = await this.request(
          `/api/timeshift/${recorderName}/records`
        );
        for (const { id, program, startTime, duration, recording } of records) {
          if (
            !recording &&
            (keyword == null ||
              program.name.indexOf(keyword) >= 0 ||
              program.description.indexOf(keyword) >= 0) &&
            (end == null || isNaN(end) || program.startAt < end) &&
            (start == null ||
              isNaN(start) ||
              program.startAt + program.duration > start) &&
            (category == null ||
              MirakcTimeshiftService.parseCategory(
                Array.isArray(program.genres) ? program.genres[0].lv1 : 15
              ).code === MirakcTimeshiftService.parseCategory(category).code)
          ) {
            programs.push({
              id: String(program.id),
              type: service.channel.type,
              channel: String(program.serviceId),
              channelName: service.name,
              title: program.name,
              fullTitle: program.name,
              detail: program.description,
              category: MirakcTimeshiftService.parseCategory(
                Array.isArray(program.genres) ? program.genres[0].lv1 : 15
              ),
              duration: duration,
              start: new Date(startTime),
              end: new Date(startTime + duration),
              preview: "",
              stream: this.getAuthUrl(
                `/api/timeshift/${recorderName}/records/${id}/stream`
              ),
              download: [
                {
                  name: "ダウンロード",
                  uri: this.getAuthUrl(
                    `/api/timeshift/${recorderName}/records/${id}/stream`
                  ),
                  filename: `${moment(start).format("YYMMDD-HHmm")}-${
                    service.name
                  }-${program.name}.m2ts`
                }
              ]
            });
          }
        }
      }
    }
    if (reverse) {
      programs.sort((a, b) => b.start.getTime() - a.start.getTime());
    } else {
      programs.sort((a, b) => a.start.getTime() - b.start.getTime());
    }
    const result = {
      hits: programs.length,
      programs: programs.slice((page - 1) * view, page * view)
    };
    return result;
  }

  clearCache() {
    this.cache = {};
  }

  async request(
    path?: string,
    config: AxiosRequestConfig = {},
    useCache = true
  ) {
    const conf: AxiosRequestConfig = {
      url: this.getUrl(path),
      headers: this.getAuthHeaders(),
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
    let wuiUrl = this.url || "http://127.0.0.1:40772";
    if (!/^https?:\/\//.test(wuiUrl)) {
      wuiUrl = "http://${wuiUrl}";
    }
    wuiUrl = wuiUrl.replace(/\/$/, "");
    return `${wuiUrl}${path}`;
  }

  getAuthUrl(path = "") {
    let wuiUrl = this.getUrl(path);
    if (this.user) {
      const auth = [];
      auth.push(encodeURIComponent(this.user));
      if (encodeURIComponent(this.password)) {
        auth.push(this.password);
      }
      wuiUrl = wuiUrl.replace(/^(https?:\/\/)(.*)$/, `$1${auth.join(":")}@$2`);
    }
    return wuiUrl;
  }

  getAuthHeaders() {
    if (this.user) {
      const auth = [];
      auth.push(this.user);
      if (this.password) {
        auth.push(this.password);
      }
      return {
        Authorization: `Basic ${Base64.encode(auth.join(":"))}`
      };
    }
  }
}
