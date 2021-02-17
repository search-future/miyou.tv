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

import BackendService, { SearchOptions, Channel } from "./BackendService";
import { categoryTable } from "../config/constants";
import moment from "../utils/moment-with-locale";

type RecordedProgram = {
  id: string;
  channel: {
    id: string;
    type: string;
    channel: string;
    sid: number;
    name: string;
  };
  fullTitle: string;
  title: string;
  subTitle: string;
  episode?: number;
  detail: string;
  category: string;
  flags: string[];
  start: number;
  end: number;
  seconds: number;
};
type ArchiveChannel = {
  type: string;
  channel: string;
  name: string;
  services: {
    id: number;
    serviceId: number;
    networkId: number;
    name: string;
  }[];
};
type ArchiveProgram = {
  id: number;
  eventId: number;
  serviceId: number;
  networkId: number;
  startAt: number;
  duration: number;
  name: string;
  description: string;
  genres: {
    lv1: number;
    lv2: number;
    un1: number;
    un2: number;
  }[];
};

export default class ChinachuService extends BackendService {
  hasArchive = true;
  url: string;
  user: string;
  password: string;
  previewParams: string;
  previewPos: number;
  streamType: string;
  streamParams: string;

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
    url = "http://127.0.0.1:20772/",
    user = "",
    password = "",
    previewParams = "size=160x90",
    previewPos = 70,
    streamType = "m2ts",
    streamParams = "c:v=copy&c:a=copy"
  } = {}) {
    super();
    this.url = url;
    this.user = user;
    this.password = password;
    this.previewParams = previewParams;
    this.previewPos = previewPos;
    this.streamType = streamType;
    this.streamParams = streamParams;
  }

  async init() {
    try {
      const archive = await this.request("/archive.json");
      if (archive == null) {
        throw archive;
      }
      this.hasArchive = true;
    } catch (e) {
      this.hasArchive = false;
    }
    return this.request("/api/status.json");
  }

  async search({
    query = "",
    useArchive = true,
    ...options
  }: SearchOptions = {}) {
    const opts = {
      ...BackendService.parseQuery(query),
      ...options
    };
    if (this.hasArchive && useArchive) {
      try {
        return this.searchArchive(opts);
      } catch (e) {}
    }
    return this.searchRecorded(opts);
  }

  async getChannels({ useArchive = true }: SearchOptions = {}) {
    if (this.hasArchive && useArchive) {
      try {
        return this.getArchiveChannels();
      } catch (e) {}
    }
    return this.getRecordedChannels();
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

  protected convertRecordedProgram({
    id,
    channel,
    title,
    fullTitle,
    detail = "",
    category,
    seconds,
    start,
    end
  }: RecordedProgram) {
    return {
      id,
      type: channel.type,
      channel: String(channel.sid),
      channelName: channel.name,
      title,
      fullTitle,
      detail,
      category: ChinachuService.parseCategory(category),
      duration: seconds * 1000,
      start: new Date(start),
      end: new Date(end),
      preview: this.getUrl(
        [
          `/api/recorded/${id}/preview.png?pos=${this.previewPos}`,
          this.previewParams
        ]
          .filter(a => a)
          .join("&")
      ),
      stream: this.getAuthUrl(
        [`/api/recorded/${id}/watch.${this.streamType}`, this.streamParams]
          .filter(a => a)
          .join("?")
      ),
      download: [
        {
          name: "無変換",
          uri: this.getAuthUrl(`/api/recorded/${id}/file.m2ts`),
          filename: `${moment(start).format("YYMMDD-HHmm")}-${
            channel.name
          }-${title}.m2ts`
        },
        {
          name: `変換(${this.streamType})`,
          uri: this.getAuthUrl(
            [
              `/api/recorded/${id}/watch.${this.streamType}?mode=download&ext=${this.streamType}`,
              this.streamParams
            ]
              .filter(a => a)
              .join("&")
          ),
          filename: `${moment(start).format("YYMMDD-HHmm")}-${
            channel.name
          }-${title}.${this.streamType}`
        }
      ],
      authHeaders: this.getAuthHeaders()
    };
  }

  async searchArchive({
    view = 100,
    page = 1,
    reverse = false,
    keyword,
    type,
    channel,
    category,
    start,
    end
  }: SearchOptions = {}) {
    const recorded: RecordedProgram[] = await this.request(
      "/api/recorded.json"
    );
    const archive: {
      channels: ArchiveChannel[];
      programs: ArchiveProgram[];
    } = await this.request("/archive.json");
    const minTime = Math.min(...recorded.map(({ start }) => start));
    const maxTime = Math.max(...recorded.map(({ end }) => end));
    const channels: {
      id: number;
      type: string;
      channel: string;
      serviceId: number;
      networkId: number;
      name: string;
    }[] = [];
    for (const channel of archive.channels) {
      for (const service of channel.services) {
        if (
          recorded.some(
            program =>
              program.channel.type === channel.type &&
              program.channel.channel === channel.channel &&
              program.channel.sid === service.serviceId
          )
        ) {
          channels.push({
            type: channel.type,
            channel: String(channel.channel),
            ...service
          });
        }
      }
    }
    const types = ["GR", "BS", "CS", "SKY"];
    channels.sort((a, b) => {
      if (a.type === b.type) {
        return a.serviceId - b.serviceId;
      }
      return types.indexOf(a.type) - types.indexOf(b.type);
    });
    const programs = archive.programs
      .filter(
        ({ name, description, genres, startAt, duration }) =>
          typeof name === "string" &&
          typeof description === "string" &&
          Array.isArray(genres) &&
          startAt < maxTime &&
          startAt + duration > minTime
      )
      .map(program => ({
        ...program,
        channel: channels.find(
          channel =>
            channel.networkId === program.networkId &&
            channel.serviceId === program.serviceId
        )
      }))
      .filter(
        program =>
          program.channel &&
          (keyword == null ||
            program.name.indexOf(keyword) >= 0 ||
            program.description.indexOf(keyword) >= 0) &&
          (type == null || String(program.channel.type) === String(type)) &&
          (channel == null ||
            String(program.channel.serviceId) === String(channel)) &&
          (end == null || isNaN(end) || program.startAt < end) &&
          (start == null ||
            isNaN(start) ||
            program.startAt + program.duration > start) &&
          (category == null ||
            ChinachuService.parseCategory(
              Array.isArray(program.genres) ? program.genres[0].lv1 : 15
            ).code === ChinachuService.parseCategory(category).code)
      );
    if (reverse) {
      programs.sort((a, b) => b.startAt - a.startAt);
    } else {
      programs.sort((a, b) => a.startAt - b.startAt);
    }
    return {
      hits: programs.length,
      programs: programs.slice((page - 1) * view, page * view).map(program => {
        let category = 15;
        if (Array.isArray(program.genres)) {
          category = program.genres[0].lv1;
        }
        const recordedPrograms = recorded.filter(
          ({ channel, start, end }) =>
            program.channel &&
            channel.type === program.channel.type &&
            channel.sid === program.channel.serviceId &&
            start < program.startAt + program.duration &&
            end > program.startAt
        );
        recordedPrograms.sort((a, b) => a.start - b.start);
        const [firstRecorded] = recordedPrograms;
        let preview = "";
        let stream = "";
        if (firstRecorded) {
          let previewPos = this.previewPos;
          previewPos += Math.floor(
            (program.startAt - firstRecorded.start) / 1000
          );
          while (firstRecorded.seconds < previewPos) {
            previewPos -= 30;
          }
          preview = this.getUrl(
            [
              `/api/recorded/${firstRecorded.id}/preview.png?pos=${previewPos}`,
              this.previewParams
            ]
              .filter(a => a)
              .join("&")
          );

          stream = this.getAuthUrl(
            [
              `/api/recorded/${firstRecorded.id}/watch.${this.streamType}`,
              this.streamParams
            ]
              .filter(a => a)
              .join("?")
          );
        }
        const download = [];
        for (let i = 0; i < recordedPrograms.length; i++) {
          const { id, channel, title, start } = recordedPrograms[i];
          download.push({
            name: `無変換${i + 1}`,
            uri: this.getAuthUrl(`/api/recorded/${id}/file.m2ts`),
            filename: `${moment(start).format("YYMMDD-HHmm")}-${
              channel.name
            }-${title}.m2ts`
          });
        }
        for (let i = 0; i < recordedPrograms.length; i++) {
          const { id, channel, title, start } = recordedPrograms[i];
          download.push({
            name: `変換${i + 1}(${this.streamType})`,
            uri: this.getAuthUrl(
              [
                `/api/recorded/${id}/watch.${this.streamType}?mode=download`,
                this.streamParams
              ]
                .filter(a => a)
                .join("&")
            ),
            filename: `${moment(start).format("YYMMDD-HHmm")}-${
              channel.name
            }-${title}.${this.streamType}`
          });
        }
        return {
          id: String(program.id),
          type: String(program.channel && program.channel.type),
          channel: String(program.channel && program.channel.serviceId),
          channelName: String(program.channel && program.channel.name),
          title: program.name,
          fullTitle: program.name,
          detail: program.description,
          category: ChinachuService.parseCategory(category),
          duration: program.duration,
          start: new Date(program.startAt),
          end: new Date(program.startAt + program.duration),
          recorded: recordedPrograms.map(program =>
            this.convertRecordedProgram(program)
          ),
          authHeaders: this.getAuthHeaders(),
          preview,
          stream,
          download
        };
      })
    };
  }

  async searchRecorded({
    view = 100,
    page = 1,
    reverse = false,
    keyword,
    type,
    channel,
    category,
    start,
    end
  }: SearchOptions = {}) {
    const recorded: RecordedProgram[] = await this.request(
      "/api/recorded.json"
    );
    const programs = recorded.filter(
      program =>
        (keyword == null ||
          program.fullTitle.indexOf(keyword) >= 0 ||
          program.detail.indexOf(keyword) >= 0) &&
        (type == null || program.channel.type === type) &&
        (channel == null || String(program.channel.sid) === String(channel)) &&
        (category == null ||
          ChinachuService.parseCategory(program.category).code ===
            ChinachuService.parseCategory(category).code) &&
        (isNaN(start as number) || program.end > (start as number)) &&
        (isNaN(end as number) || program.start < (end as number))
    );
    if (reverse) {
      programs.sort((a, b) => b.start - a.start);
    } else {
      programs.sort((a, b) => a.start - b.start);
    }
    return {
      hits: programs.length,
      programs: programs
        .slice((page - 1) * view, page * view)
        .map(program => this.convertRecordedProgram(program))
    };
  }

  async getArchiveChannels() {
    const recorded: RecordedProgram[] = await this.request(
      "/api/recorded.json"
    );
    const {
      channels: archiveChannels
    }: {
      channels: ArchiveChannel[];
    } = await this.request("/archive.json");
    const channels: Channel[] = [];
    for (const channel of archiveChannels) {
      for (const service of channel.services) {
        if (
          recorded.some(
            program =>
              program.channel.type === channel.type &&
              program.channel.channel === channel.channel &&
              program.channel.sid === service.serviceId
          )
        ) {
          channels.push({
            type: channel.type,
            channel: String(service.serviceId),
            channelName: service.name
          });
        }
      }
    }
    const types = ["GR", "BS", "CS", "SKY"];
    channels.sort((a, b) => {
      if (a.type === b.type) {
        return parseInt(a.channel, 10) - parseInt(b.channel, 10);
      }
      return types.indexOf(a.type) - types.indexOf(b.type);
    });
    return channels;
  }

  async getRecordedChannels() {
    const recorded: RecordedProgram[] = await this.request(
      "/api/recorded.json"
    );
    const channels = [];
    for (const program of recorded) {
      const channel = channels.find(
        ({ type, channel, channelName }) =>
          type === program.channel.type &&
          channel === String(program.channel.sid) &&
          channelName === program.channel.name
      );
      if (channel) {
        channel.channelName = program.channel.name;
      } else {
        channels.push({
          channel: String(program.channel.sid),
          channelName: program.channel.name,
          type: program.channel.type
        });
      }
    }
    const types = ["GR", "BS", "CS", "SKY"];
    channels.sort((a, b) => {
      if (a.type === b.type) {
        return parseInt(a.channel, 10) - parseInt(b.channel, 10);
      }
      return types.indexOf(a.type) - types.indexOf(b.type);
    });
    return channels;
  }

  getUrl(path = "") {
    let wuiUrl = this.url || "http://127.0.0.1:20772";
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
