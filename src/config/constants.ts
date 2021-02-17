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

import { ToastOptions } from "react-native-root-toast";

export const appName = "MiyouTV";

export const persistSecretKey = process.env["PERSIST_KEY"] || appName;

export const garaponDevId = process.env["GARAPON_DEVID"];
export const garaponEntryUrl =
  process.env["GARAPON_ENTRY_URL"] || "http://miyou.tv/apply-garapon/";

export const categoryTable: {
  code: number;
  codeName?: string;
  name: string;
  color?: string;
}[] = [
  {
    code: 0,
    codeName: "news",
    name: "ニュース/報道",
    color: "#c06"
  },
  {
    code: 1,
    codeName: "sports",
    name: "スポーツ",
    color: "#6c0"
  },
  {
    code: 2,
    codeName: "information",
    name: "情報/ワイドショー",
    color: "#00c"
  },
  {
    code: 3,
    codeName: "drama",
    name: "ドラマ",
    color: "#c00"
  },
  {
    code: 4,
    codeName: "music",
    name: "音楽",
    color: "#c60"
  },
  {
    code: 5,
    codeName: "variety",
    name: "バラエティ",
    color: "#c0c"
  },
  {
    code: 6,
    codeName: "cinema",
    name: "映画",
    color: "#0cc"
  },
  {
    code: 7,
    codeName: "anime",
    name: "アニメ/特撮",
    color: "#cc0"
  },
  {
    code: 8,
    codeName: "documentary",
    name: "ドキュメンタリー/教養",
    color: "#0c0"
  },
  {
    code: 9,
    codeName: "theater",
    name: "劇場/公演",
    color: "#0c6"
  },
  {
    code: 10,
    codeName: "hobby",
    name: "趣味/教育",
    color: "#6c0"
  },
  {
    code: 11,
    codeName: "welfare",
    name: "福祉",
    color: "#666"
  },
  {
    code: 14,
    name: "拡張",
    color: "#555"
  },
  {
    code: 15,
    codeName: "etc",
    name: "その他",
    color: "#555"
  }
];

export const toastOptions: ToastOptions = {
  opacity: 0.8,
  textStyle: {
    textAlign: "left"
  }
};
