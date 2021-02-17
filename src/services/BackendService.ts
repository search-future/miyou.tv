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

export type SearchOptions = {
  query?: string;
  view?: number;
  page?: number;
  reverse?: boolean;
  keyword?: string;
  type?: string;
  channel?: string;
  category?: string | number;
  start?: number;
  end?: number;
  useArchive?: boolean;
  [key: string]: any;
};
export type DownloadItem = {
  name: string;
  uri: string;
  filename: string;
  size?: number;
};
export type Program = {
  id: string;
  type: string;
  channel: string;
  channelName: string;
  title: string;
  fullTitle: string;
  detail: string;
  category: {
    code: number;
    codeName?: string;
    name: string;
    color?: string;
  };
  duration: number;
  start: Date;
  end: Date;
  preview: string;
  stream: string;
  authHeaders?: { [key: string]: string };
  recorded?: Program[];
  download?: DownloadItem[];
};
export type Channel = {
  type: string;
  channel: string;
  channelName: string;
};
export type SearchResult = {
  hits: number;
  programs: Program[];
};

abstract class BackendService {
  hasArchive = false;
  protected cache: { [key: string]: any } = {};

  static parseQuery(query: string) {
    const params: SearchOptions = {};
    const options = query.replace("　", " ");
    const optionPettern = /([a-z]+): ?("[^"]*"|[^ ]+)?/g;

    let option;
    while ((option = optionPettern.exec(options)) !== null) {
      const key = option[1];
      const value = option[2].replace(/^"([^"]+)"$/, "$1");
      switch (key) {
        case "ch":
          params.channel = value;
          break;
        case "cat":
        case "genre":
          params.category = value;
          break;
        case "start":
          params.start = new Date(value).getTime();
          break;
        case "end":
          params.end = new Date(value).getTime();
          break;
        default:
          params[key] = value;
      }
    }
    params.keyword = query.replace(optionPettern, "").trim();
    return params;
  }

  abstract init(): Promise<any>;
  abstract search(options?: SearchOptions): Promise<SearchResult>;
  abstract getChannels(options?: SearchOptions): Promise<Channel[]>;
  abstract clearCache(): void;
}
export default BackendService;
