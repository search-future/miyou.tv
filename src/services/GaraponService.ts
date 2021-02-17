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
import md5 from "md5";

import BackendService, { SearchOptions } from "./BackendService";
import { categoryTable } from "../config/constants";

type GaraponWebAuthResult = {
  0?: string;
  1?: string;
  ipaddr: string;
  pipaddr: string;
  gipaddr: string;
  port: string;
  port2: string;
  gtvver: string;
};
type GaraponAuthResult = {
  status: 1 | 100 | 200;
  logout?: 1 | 0;
  login?: 1 | 0 | 100 | 200 | 400;
  gtvsession?: string;
  version: string;
};
type GaraponSearchParams = {
  n?: string;
  p?: string;
  s?: "e" | "c";
  key?: string;
  gtvid?: string;
  gtvidlist?: string;
  genre0?: string;
  genre1?: string;
  ch?: string;
  dt?: "e" | "s";
  sdate?: string;
  edate?: string;
  rank?: string;
  sort?: "std" | "sta";
  video?: string;
};
type GaraponProgram = {
  gtvid: string;
  startdate: string;
  duration: string;
  ch: string;
  title: string;
  description: string;
  genre: string[];
  favorite: string;
  bc: string;
  bc_tags: string;
  ts: number;
  caption_hit: string;
  caption: {
    caption_text: string;
    caption_time: string;
  };
};
type GaraponSearchResult = {
  status: 1 | 0 | 100 | 200;
  hit: string;
  version: string;
  program: GaraponProgram[];
};
type GaraponChannelResult = {
  status: 1 | 0 | 200;
  version: string;
  ch_list: {
    ch_name: string;
    hash_tag: string;
  }[];
};

export default class GaraponService extends BackendService {
  static authUrl = "http://garagw.garapon.info/getgtvaddress";
  static devId = "";
  auth: boolean;
  url: string;
  version: number;
  user: string;
  password: string;
  gtvsession: string;

  static timeToTimestamp(time: number | Date) {
    const date = new Date(time);
    const Y = String(date.getFullYear());
    const M = String(date.getMonth() + 1 + 100).slice(-2);
    const D = String(date.getDate() + 100).slice(-2);
    const h = String(date.getHours() + 100).slice(-2);
    const m = String(date.getMinutes() + 100).slice(-2);
    const s = String(date.getSeconds() + 100).slice(-2);
    return `${Y}-${M}-${D} ${h}:${m}:${s}`;
  }

  static parseDuration(value: string) {
    const duration = value.split(":");
    return (
      parseInt(duration.pop() || "0", 10) * 1000 +
      parseInt(duration.pop() || "0", 10) * 60000 +
      parseInt(duration.pop() || "0", 10) * 3600000
    );
  }

  static parseCategory(value = "15") {
    const [categoryNumber] = value.split("/");
    const code = parseInt(categoryNumber, 10);
    const category = categoryTable.find(a => a.code === code);
    if (category) {
      return category;
    }
    return (
      categoryTable.find(({ code }) => code === 15) || { code: 15, name: "etc" }
    );
  }

  constructor({
    auth = false,
    url = "",
    version = 3,
    user = "",
    password = "",
    gtvsession = ""
  } = {}) {
    super();
    this.auth = auth;
    this.url = url;
    this.version = version;
    this.user = user;
    this.password = password;
    this.gtvsession = gtvsession;
  }

  async init() {
    if (this.auth || !this.url) {
      await this.loadBackend();
      return await this.login();
    }
    return this.login();
  }

  async search({ query = "", ...options }: SearchOptions = {}) {
    const {
      view = 100,
      page = 1,
      reverse = false,
      keyword,
      channel,
      category,
      start,
      end
    } = {
      ...BackendService.parseQuery(query),
      ...options
    };
    const data: GaraponSearchParams = {
      n: view.toString(),
      p: page.toString(),
      s: "e",
      sort: reverse ? "std" : "sta"
    };
    if (keyword) {
      data.key = keyword;
    }
    if (channel) {
      data.ch = channel;
    }
    if (!isNaN(category as number)) {
      data.genre0 = String(category);
    } else if (category) {
      const { code = 15 } =
        categoryTable.find(
          ({ codeName, name }) => codeName === category || name === category
        ) || {};
      data.genre0 = String(code);
    }
    if (start) {
      data.sdate = GaraponService.timeToTimestamp(start);
    }
    if (end) {
      data.edate = GaraponService.timeToTimestamp(end);
    }
    const result: GaraponSearchResult = await this.request("search", { data });
    if (result.status === 1) {
      return {
        hits: parseInt(result.hit, 10),
        programs: result.program.map(program => {
          const {
            gtvid,
            startdate,
            ch,
            title,
            description,
            genre,
            bc
          } = program;
          const duration = GaraponService.parseDuration(program.duration);
          const start = new Date(startdate.replace(" ", "T") + "+09:00");
          const end = new Date(start.getTime() + duration);
          return {
            id: gtvid,
            type: gtvid.slice(0, 2),
            channel: ch,
            channelName: bc,
            title: title,
            fullTitle: title,
            detail: description,
            duration,
            start,
            end,
            category: GaraponService.parseCategory(genre[0]),
            preview: this.getPreviewUrl(gtvid),
            stream: this.getStreamUrl(gtvid)
          };
        })
      };
    }
    throw new Error(`Status: ${result.status}`);
  }

  async getChannels({} = {}) {
    const response: GaraponChannelResult = await this.request("channel");
    if (response.status === 1) {
      const channels = [];
      for (const key in response.ch_list) {
        channels.push({
          channel: String(key),
          channelName: response.ch_list[key].ch_name,
          type: "1S"
        });
      }
      return channels;
    }
    throw new Error(`Status code: ${response.status}`);
  }

  clearCache() {
    this.cache = {};
  }

  async requestBackendInfo(useCache = true) {
    const conf: AxiosRequestConfig = {
      method: "POST",
      url: GaraponService.authUrl,
      data: {
        user: this.user,
        md5passwd: md5(this.password),
        dev_id: GaraponService.devId
      },
      paramsSerializer: qs.stringify,
      transformRequest: data => qs.stringify(data)
    };

    const key = `${conf.url}?${qs.stringify(conf.data)}`;
    if (!useCache || this.cache[key] == null) {
      const { data }: AxiosResponse<string> = await Axios(conf);
      const result: { [name: string]: string } = {};
      for (const param of data.split("\n")) {
        const [name, value]: string[] = param.split(";");
        if (name && value) {
          result[name] = value;
        }
      }
      if (result[0] === "success") {
        this.cache[key] = result;
      } else {
        throw new Error(result[1]);
      }
    }
    return this.cache[key];
  }

  async loadBackend() {
    const result: GaraponWebAuthResult = await this.requestBackendInfo(false);
    const url = ["http://", result.ipaddr];
    if (result.ipaddr === result.gipaddr && result.port) {
      url.push(":");
      url.push(result.port);
    }
    this.url = url.join("");
    const version = (/^GTV([0-9]+)/.exec(result.gtvver) || [])[1];
    if (parseInt(version, 10) < 3) {
      this.version = 2;
    } else {
      this.version = 3;
    }
    return result;
  }

  async request(path = "", config: AxiosRequestConfig = {}, useCache = true) {
    const conf: AxiosRequestConfig = {
      method: "POST",
      url: `${this.url}/gapi/v${this.version}/${path}`,
      params: {},
      data: {},
      paramsSerializer: qs.stringify,
      transformRequest: data => qs.stringify(data),
      ...config
    };
    const key = `${conf.url}?${qs.stringify(conf.params)}?${qs.stringify(
      conf.data
    )}`;
    conf.params.dev_id = GaraponService.devId;
    conf.params.gtvsession = this.gtvsession;
    if (!useCache || this.cache[key] == null) {
      let { data } = await Axios(conf);
      if (data.status === 0) {
        await this.login();
        data = await this.request(path, config, false);
      }
      this.cache[key] = data;
    }
    return this.cache[key];
  }

  async login() {
    const conf: AxiosRequestConfig = {
      data: {
        type: "login",
        loginid: this.user,
        md5pswd: md5(this.password)
      },
      paramsSerializer: qs.stringify,
      transformRequest: data => qs.stringify(data)
    };
    const result: GaraponAuthResult = await this.request("auth", conf, false);
    if (result.status === 1) {
      if (result.login === 1) {
        const version = (/^GTV([0-9]+)/.exec(result.version) || [])[1];
        if (parseInt(version, 10) < 3) {
          this.version = 2;
        } else {
          this.version = 3;
        }
        this.gtvsession = result.gtvsession || "";
        return result;
      }
      throw new Error(`Login: ${result.login}`);
    }
    throw new Error(`Status: ${result.status}`);
  }

  async logout(force?: boolean) {
    if (force) {
      this.gtvsession = "";
    }
    const conf: AxiosRequestConfig = {
      data: { type: "logout" },
      paramsSerializer: qs.stringify,
      transformRequest: data => qs.stringify(data)
    };
    const result: GaraponAuthResult = await this.request("auth", conf, false);
    if (result.status === 1) {
      if (result.logout === 1) {
        if (!force) {
          this.gtvsession = "";
        }
        return result;
      }
      throw new Error(`Logout: ${result.login}`);
    }
    throw new Error(`Status: ${result.status}`);
  }

  getStreamUrl(id: string): string {
    if (this.version < 3) {
      return `${this.url}/cgi-bin/play/m3u8.cgi?${id}-${this.gtvsession}`;
    }
    const params = {
      gtvsession: this.gtvsession,
      dev_id: GaraponService.devId
    };

    return `${this.url}/${id}.m3u8?${qs.stringify(params)}`;
  }

  getPreviewUrl(id: string): string {
    return `${this.url}/thumbs/${id}`;
  }
}
