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
import qs from "qs";

export default class CommentService {
  static authUrl = "https://miteru.digitiminimi.com/a2sc.php/auth/moritapo";
  static apiUrl = "https://miteru.digitiminimi.com/a2sc.php/miyou";
  email: string;
  password: string;
  token: string;
  protected cache: { [key: string]: any } = {};

  static normalizeChannel(channel: string) {
    return channel
      .replace(/[！-～]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
      .replace("　", " ")
      .replace("!", "")
      .replace(/^(NHK[^0-9 ]+[0-9 ]).*$/, "$1")
      .replace(/^([^0-9]+)[0-9]$/, "$1")
      .replace(/(◆.+|・[0-9]+)$/, "")
      .replace(/HD$/, "")
      .replace(/CH$/i, "");
  }

  static channelToQueries(
    channel: string,
    table: { [channel: string]: string[] } = {}
  ) {
    const queries = table[channel];
    if (queries && queries.length > 0) {
      return queries;
    }
    return [this.normalizeChannel(channel)];
  }

  constructor({ email = "", password = "", token = "" }) {
    this.email = email;
    this.password = password;
    this.token = token;
  }

  async init() {
    const conf: AxiosRequestConfig = {
      method: "POST",
      url: CommentService.authUrl,
      data: {
        email: this.email,
        password: this.password
      },
      paramsSerializer: qs.stringify,
      transformRequest: data => qs.stringify(data)
    };

    const { data } = await Axios(conf);
    if (data.token && !data.EC) {
      this.token = data.token;
      return data;
    } else {
      throw data;
    }
  }

  clearCache() {
    this.cache = {};
  }

  async request(
    path: string,
    config: AxiosRequestConfig = {},
    useCache = true
  ) {
    if (this.token) {
      const conf: AxiosRequestConfig = {
        url: `${CommentService.apiUrl}/${path}`,
        params: {},
        data: {},
        paramsSerializer: qs.stringify,
        transformRequest: data => qs.stringify(data),
        headers: {
          "X-MITEYOU-AUTH-TOKEN": this.token
        },
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
    throw { EC: 403, Edesc: "token format err" };
  }
}
