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

import Axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import qs from "qs";

import { categoryTable } from "../config/constants";
import BackendService, {
  SearchOptions,
  Channel,
  Program
} from "./BackendService";
import moment from "../utils/moment-with-locale";

type GaraponSiteLoginResult = {
  status: GaraponStatusCode;
  authkey: string;
  gtvinfo: {
    tsids10: string[];
    tsids16: string[];
    access_ip: string;
    global_ip: string;
    private_ip: string;
    is_global_access: 1 | 0;
    firmver: string;
    regkey: string;
    global_accessable: 1 | 0;
    userplan: string;
  };
};
type GaraponSiteSearchParams = {
  dev_id?: string;
  authkey?: string;
  response_type?: "json";
  tsids?: string;
  keyword?: string;
  genre1_no?: string;
  genre2_no?: string;
  starttime?: string;
  endtime?: string;
  startperiod?: string;
  endperiod?: string;
  sort?: "sta" | "std" | "like" | "rate";
  page?: string;
  num?: string;
  search_type?: "epg" | "favorite" | "subtitle";
  service_type?: string;
};
type GaraponStatusCode =
  | "success"
  | "unkown_developer"
  | "invalid_params"
  | "internal_error"
  | "unauthorizedno_program";

type GaraponProgramGenre = {
  genre1: string;
  genre1_name: string;
  genre2: string;
  genre2_name: string;
};
type GaraponProgramSubtitle = {
  time: number;
  time_str: string;
  text: string;
};
type GaraponProgram = {
  gtvid: string;
  title: string;
  description: string;
  startdate: string;
  starttime: number;
  enddate: string;
  endtime: number;
  duration: string;
  durationtime: number;
  bcname: string;
  tsid16: string;
  tsid10: string;
  service_type: string;
  genre: GaraponProgramGenre[];
  likes: string;
  avg_rates: string;
  favorite: number;
  thumbnail_url: string;
  thumbnail_ref: string;
  m3u8_url: string;
  user_desc: string;
  user_series_desc: string;
  series_title: string;
  series_likes: string;
  program_url: string;
  official_url: string;
  wiki_url: string;
  edit_url: string;
  subtitles: GaraponProgramSubtitle[];
};
type GaraponSiteSearchResult = {
  status: GaraponStatusCode;
  hit: string;
  programs: GaraponProgram[];
};
type GaraponLoginResult = {
  status: GaraponStatusCode | "invalid_gtvsession";
  data: {
    gtvsession: string;
  };
};
type GaraponRecordedChannelResult = {
  status: GaraponStatusCode;
  data: {
    tsid10: number;
    tsid16: string;
  }[];
};
type GaraponRecordedDateResult = {
  status: GaraponStatusCode;
  data: string[];
};

export default class GaraponV4Service extends BackendService {
  static authUrl = "https://gtvm.garapon.tv";
  static siteUrl = "https://siteapi.garapon.tv";
  static devId = "";
  url: string;
  user: string;
  password: string;
  authkey: string;
  gtvsession: string;

  static parseCategory(value: any) {
    if (value != null && typeof value === "object") {
      return {
        ...categoryTable[value.genre1],
        code: value.genre1,
        name: value.genre1_name,
        subcode: value.genre2,
        subname: value.genre2_name
      };
    }
    return (
      categoryTable.find(({ code }) => code === 15) || { code: 15, name: "etc" }
    );
  }

  constructor({
    url = "",
    user = "",
    password = "",
    authkey = "",
    gtvsession = ""
  } = {}) {
    super();
    this.url = url;
    this.user = user;
    this.password = password;
    this.authkey = authkey;
    this.gtvsession = gtvsession;
  }

  async init() {
    await this.loginSite();
    return await this.login();
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
    const { data: channels }: GaraponRecordedChannelResult = await this.request(
      "Tuner/",
      {
        data: { action: "getrecch" }
      }
    );
    const tsids = channels.map(({ tsid10 }) => tsid10);
    const { data: dates }: GaraponRecordedDateResult = await this.request(
      "Tuner/",
      {
        data: { action: "getrecdate" }
      }
    );

    const minTime = new Date(`${dates[0]}T00:00+09:00`).getTime();
    const maxTime = new Date(
      `${dates[dates.length - 1]}T24:00+09:00`
    ).getTime();
    let data: GaraponSiteSearchParams = {};
    data.sort = reverse ? "std" : "sta";
    data.num = view.toString();
    data.page = page.toString();
    if (keyword) {
      data.keyword = keyword;
    }
    if (channel) {
      data.tsids = channel;
    } else {
      data.tsids = tsids.join(",");
    }
    if (type) {
      [, data.service_type = ""] = type.match("^([0-9]+).*") || [];
    }
    if (!isNaN(category as number)) {
      data.genre1_no = String(category);
    } else if (category) {
      const { code = 15 } =
        categoryTable.find(
          ({ codeName, name }) => codeName === category || name === category
        ) || {};
      data.genre1_no = String(code);
    }
    if (typeof start === "number") {
      data.starttime = (start / 1000).toString();
    } else if (minTime) {
      data.starttime = (minTime / 1000).toString();
    }
    if (typeof end === "number") {
      data.endtime = (end / 1000).toString();
    } else if (maxTime) {
      data.endtime = (maxTime / 1000).toString();
    }
    const result: GaraponSiteSearchResult = await this.requestSite(
      "Program/Search/search",
      {
        data
      }
    );
    if (result.status === "success") {
      return {
        hits: parseInt(result.hit, 10),
        programs: result.programs.map(
          ({
            gtvid,
            title,
            description,
            starttime,
            endtime,
            durationtime,
            bcname,
            tsid10,
            service_type,
            genre,
            thumbnail_url,
            m3u8_url,
            series_title
          }) => ({
            id: gtvid,
            type: gtvid.slice(0, 2),
            channel: tsid10,
            channelName: bcname,
            title: series_title || title,
            fullTitle: title,
            detail: description,
            category: GaraponV4Service.parseCategory(genre[0]),
            duration: durationtime * 1000,
            start: new Date(starttime * 1000),
            end: new Date(endtime * 1000),
            preview: thumbnail_url,
            stream: `${this.url}${m3u8_url}&gtvsession=${this.gtvsession}`
          })
        )
      };
    }
    throw result;
  }

  async getChannels({} = {}) {
    const {
      data: recordedChannels
    }: GaraponRecordedChannelResult = await this.request("Tuner/", {
      data: {
        action: "getrecch"
      }
    });
    const results: {
      hits: number;
      programs: Program[];
    }[] = [];
    for (const channel of recordedChannels) {
      results.push(
        await this.search({
          view: 100,
          page: 1,
          channel: String(channel.tsid10),
          reverse: true
        })
      );
    }
    const channels: Channel[] = [];
    for (const result of results) {
      if (
        result.hits > 0 &&
        Array.isArray(result.programs) &&
        result.programs.length > 0
      ) {
        for (const program of result.programs) {
          if (
            !channels.some(
              ({ type, channel }) =>
                type === program.type && channel === program.channel
            )
          ) {
            channels.push({
              channel: program.channel,
              channelName: program.channelName,
              type: program.type
            });
          }
        }
      }
    }
    channels.sort((a, b) => {
      const diff = parseInt(a.channel, 10) - parseInt(b.channel, 10) || 0;
      if (a.type < b.type) {
        return diff * 10 - 1;
      }
      if (a.type > b.type) {
        return diff * 10 + 1;
      }
      return diff;
    });
    return channels;
  }

  clearCache() {
    this.cache = {};
  }

  async loginSite() {
    let auth;
    if (this.authkey) {
      auth = await this.checkAuthkey();
      if (auth.status !== "success") {
        auth = await this.issueAuthkey();
      }
    } else {
      auth = await this.issueAuthkey();
    }
    if (auth.status === "success") {
      this.authkey = auth.authkey;
      this.url = `https://${auth.gtvinfo.access_ip}`;
      return auth;
    }
    throw auth;
  }

  async issueAuthkey() {
    const conf: AxiosRequestConfig = {
      method: "POST",
      url: `${GaraponV4Service.siteUrl}/service/Site/Login/issueAuthkey`,
      data: {
        dev_id: GaraponV4Service.devId,
        gid: this.user,
        passwd: this.password,
        response_type: "json"
      },
      paramsSerializer: qs.stringify,
      transformRequest: data => qs.stringify(data)
    };

    const { data }: AxiosResponse<GaraponSiteLoginResult> = await Axios(conf);
    return data;
  }

  async checkAuthkey() {
    const conf: AxiosRequestConfig = {
      url: `${GaraponV4Service.siteUrl}/service/Site/Login/checkAuthkey`,
      method: "POST",
      data: {
        dev_id: GaraponV4Service.devId,
        authkey: this.authkey,
        response_type: "json"
      },
      paramsSerializer: qs.stringify,
      transformRequest: data => qs.stringify(data)
    };

    const { data }: AxiosResponse<GaraponSiteLoginResult> = await Axios(conf);
    return data;
  }

  async requestSite(
    path: string,
    config: AxiosRequestConfig = {},
    useCache = true
  ) {
    const conf: AxiosRequestConfig = {
      url: `${GaraponV4Service.siteUrl}/service/${path}`,
      method: "POST",
      params: {},
      data: {},
      paramsSerializer: qs.stringify,
      transformRequest: data => qs.stringify(data),
      ...config
    };
    const key = `${conf.url}?${qs.stringify(conf.params)}?${qs.stringify(
      conf.data
    )}`;
    conf.data.dev_id = GaraponV4Service.devId;
    conf.data.authkey = this.authkey;
    conf.data.response_type = conf.data.response_type || "json";
    if (!useCache || this.cache[key] == null) {
      const { data } = await Axios(conf);
      this.cache[key] = data;
    }
    return this.cache[key];
  }

  async login() {
    let auth: GaraponLoginResult;
    if (this.gtvsession) {
      auth = await this.checkSession();
      if (auth.status !== "success") {
        auth = await this.getSession();
      }
    } else {
      auth = await this.getSession();
    }
    if (auth.status === "success") {
      if (auth.data.gtvsession) {
        this.gtvsession = auth.data.gtvsession;
      }
      return auth;
    }
    throw auth;
  }

  async getSession() {
    const conf: AxiosRequestConfig = {
      url: `${GaraponV4Service.authUrl}/service/Auth/Gtvsession/get`,
      method: "POST",
      data: {
        dev_id: GaraponV4Service.devId,
        gid: this.user,
        passwd: this.password
      },
      paramsSerializer: qs.stringify,
      transformRequest: data => qs.stringify(data)
    };
    const { data }: AxiosResponse<GaraponLoginResult> = await Axios(conf);
    return data;
  }

  async checkSession() {
    const conf: AxiosRequestConfig = {
      url: `${GaraponV4Service.authUrl}/service/Auth/Gtvsession/checkWithGid`,
      method: "POST",
      data: {
        dev_id: GaraponV4Service.devId,
        gid: this.user,
        gtvsession: this.gtvsession
      },
      paramsSerializer: qs.stringify,
      transformRequest: data => qs.stringify(data)
    };
    const { data }: AxiosResponse<GaraponLoginResult> = await Axios(conf);
    return data;
  }

  async request(
    path: string,
    config: AxiosRequestConfig = {},
    useCache = true
  ) {
    const conf: AxiosRequestConfig = {
      url: `${this.url}/gapi/v4/${path}`,
      method: "POST",
      params: {},
      data: {},
      paramsSerializer: qs.stringify,
      transformRequest: data => qs.stringify(data),
      ...config
    };
    const key = `${conf.url}?${qs.stringify(conf.params)}?${qs.stringify(
      conf.data
    )}`;
    conf.data.gtvsession = this.gtvsession;
    if (!useCache || this.cache[key] == null) {
      const { data } = await Axios(conf);
      this.cache[key] = data;
    }
    return this.cache[key];
  }
}
