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
  encoded?: {
    encodedId: number;
    name: string;
    filename: string;
    filesize?: number;
  }[];
  encoding?: { name: string; inEncoding: boolean }[];
};
type EPGStationRecordedPrograms = {
  total: number;
  recorded: EPGStationRecordedProgram[];
};
type EPGStationV2SearchParams = {
  isHalfWidth: boolean;
  offset?: number;
  limit?: number;
  isReverse?: boolean;
  ruleId?: number;
  channelId?: number;
  genre?: number;
  keyword?: string;
  hasOriginalFile?: boolean;
};
type EPGStationV2ChannnelItem = {
  id: number;
  serviceId: number;
  networkId: number;
  name: string;
  halfWidthName: string;
  hasLogoData: boolean;
  channelType: "GR" | "BS" | "CS" | "SKY";
  channel: string;
};
type EPGStationV2RecordedItem = {
  id: number;
  ruleId?: number;
  programId?: number;
  channelId?: number;
  startAt: number;
  endAt: number;
  name: string;
  description?: string;
  extended?: string;
  genre1?: number;
  subGenre1?: number;
  genre2?: number;
  subGenre2?: number;
  genre3?: number;
  subGenre3?: number;
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
  isRecording: boolean;
  thumbnails: number[];
  videoFiles: {
    id: number;
    name: string;
    type: "ts" | "encoded";
    size: number;
  }[];
  dropLog: {
    id: number;
    errorCnt: number;
    dropCnt: number;
    scramblingCnt: number;
  };
  tags?: { id: number; name: string; color: string }[];
  isEncoding: boolean;
  isProtected: boolean;
};
type EPGStationV2Records = {
  total: number;
  records: EPGStationV2RecordedItem[];
};

export default class EPGStationService extends BackendService {
  url: string;
  user: string;
  password: string;
  streamType: string;
  streamParams: string;
  version: string = "";

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

  async init() {
    try {
      const { version } = await this.request("/api/version");
      this.version = version;
    } catch (e) {
      this.version = "1.0.0";
    }
    return this.request("/api/config");
  }

  async search(options: SearchOptions = {}) {
    if (parseInt(this.version) >= 2) {
      return this.searchV2(options);
    }
    return this.searchV1(options);
  }

  async searchV1({ query = "", ...options }: SearchOptions = {}) {
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
        endAt,
        filesize,
        filename,
        original,
        encoded
      } = recorded[i];
      const {
        type: videoType = "ts",
        name: videoName = "",
        ...params
      } = qs.parse(this.streamParams);
      let streamPath = `/api/recorded/${id}/file`;
      if (this.streamType === "raw") {
        if (videoType === "encoded" && encoded) {
          const encodedId =
            encoded.find(({ name }) => name === videoName)?.encodedId ||
            encoded.find(({ name }) => name !== videoName)?.encodedId;
          if (encodedId != null) {
            streamPath += `?encodedId=${encodedId}`;
          }
        }
      } else {
        const streamParams = qs.stringify(params);
        streamPath = `/api/streams/recorded/${id}/${this.streamType}?${streamParams}`;
      }
      const download = [];
      if (original && filename) {
        download.push({
          name: "TS",
          filename,
          size: filesize,
          uri: this.getAuthUrl(`/api/recorded/${id}/file?mode=download`)
        });
      }
      for (const { encodedId, name, filename, filesize } of encoded || []) {
        download.push({
          name,
          filename,
          size: filesize,
          uri: this.getAuthUrl(
            `/api/recorded/${id}/file?encodedId=${encodedId}&mode=download`
          )
        });
      }
      programs.push({
        id: String(id),
        type: channelType,
        channel: String(channelId),
        channelName: channels.find(({ id }) => id === channelId)?.name || "",
        title: name,
        fullTitle: name,
        detail: description,
        category: categoryTable.find(({ code }) => code === genre1) || {
          code: 15,
          name: "etc"
        },
        duration: endAt - startAt,
        start: new Date(startAt),
        end: new Date(endAt),
        preview: this.getUrl(`/api/recorded/${id}/thumbnail`),
        stream: this.getAuthUrl(streamPath),
        download,
        authHeaders: this.getAuthHeaders()
      });
    }
    return { hits, programs };
  }

  async searchV2({ query = "", ...options }: SearchOptions = {}) {
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
    const channels: EPGStationV2ChannnelItem[] = await this.request(
      "/api/channels"
    );

    const params: EPGStationV2SearchParams = {
      isHalfWidth: true,
      limit: 2 ** 31 - 1,
      isReverse: !reverse
    };
    if (keyword) {
      params.keyword = keyword;
    }
    if (channel) {
      if (!isNaN(channel as any)) {
        params.channelId = parseInt(channel, 10);
      } else {
        const { id } =
          channels.find(
            ({ serviceId, name }) =>
              String(serviceId) === channel || name === channel
          ) || {};
        params.channelId = id;
      }
    }
    if (!isNaN(category as number)) {
      params.genre = category as number;
    } else if (category) {
      const { code = 15 } =
        categoryTable.find(
          ({ codeName, name }) => codeName === category || name === category
        ) || {};
      params.genre = code;
    }

    const result: EPGStationV2Records = await this.request("/api/recorded", {
      params
    });

    const records = result.records.filter(
      program =>
        (type == null ||
          channels.find(({ id }) => id === program.channelId)?.channelType ===
            type) &&
        (end == null || isNaN(end) || program.startAt < end) &&
        (start == null || isNaN(start) || program.endAt > start)
    );

    const hits = records.length;
    const programs = [];
    const begin = (page - 1) * view;
    let length = page * view;
    if (length > records.length) {
      length = records.length;
    }
    for (let i = begin; i < length; i++) {
      const {
        id,
        channelId,
        name,
        description = "",
        genre1 = 15,
        startAt,
        endAt,
        videoFiles,
        thumbnails
      } = records[i];
      const {
        type: videoType = "ts",
        name: videoName = "",
        ...params
      } = qs.parse(this.streamParams);
      const videoFileId =
        videoFiles.find(
          ({ type, name }) => type === videoType && name === videoName
        )?.id ||
        videoFiles.find(({ type }) => type === videoType)?.id ||
        videoFiles.find(({ type }) => type !== videoType)?.id;
      const streamParams = qs.stringify(params);
      programs.push({
        id: String(id),
        type: channels.find(({ id }) => id === channelId)?.channelType || "GR",
        channel: String(channelId),
        channelName: channels.find(({ id }) => id === channelId)?.name || "",
        title: name,
        fullTitle: name,
        detail: description,
        category: categoryTable.find(({ code }) => code === genre1) || {
          code: 15,
          name: "etc"
        },
        duration: endAt - startAt,
        start: new Date(startAt),
        end: new Date(endAt),
        preview:
          thumbnails.length > 0
            ? this.getUrl(`/api/thumbnails/${thumbnails[0]}`)
            : "",
        stream:
          this.streamType === "raw"
            ? this.getAuthUrl(`/api/videos/${videoFileId}`)
            : this.getAuthUrl(
                `/api/streams/recorded/${videoFileId}/${this.streamType}?ss=0&${streamParams}`
              ),
        download: videoFiles.map(({ id, name, size, type }) => ({
          name,
          filename: name,
          size,
          uri: this.getAuthUrl(`/api/videos/${id}?isDownload=true`)
        })),
        authHeaders: this.getAuthHeaders()
      });
    }
    return { hits, programs };
  }

  async getChannels({} = {}) {
    const channels: Channel[] = [];
    if (parseInt(this.version, 10) >= 2) {
      const result: EPGStationV2ChannnelItem[] = await this.request(
        "/api/channels",
        { params: { isHalfWidth: true } }
      );
      for (const { id, channelType, name } of result) {
        const { total }: EPGStationV2Records = await this.request(
          "/api/recorded",
          {
            params: {
              isHalfWidth: true,
              channelId: id,
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
    } else {
      const result: EPGStationServiceItem[] = await this.request(
        "/api/channels"
      );
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
    let wuiUrl = this.url || "http://127.0.0.1:8888";
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
      if (this.password) {
        auth.push(encodeURIComponent(this.password));
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
