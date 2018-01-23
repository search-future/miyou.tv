/*!
Copyright 2016-2018 Brazil Ltd.

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
export const commentTokenUrl: string = 'https://miteru.digitiminimi.com/a2sc.php/auth/moritapo';
export const commentUrl: string = 'https://miteru.digitiminimi.com/a2sc.php/miyou';
export const garaponAuthUrl: string = 'http://garagw.garapon.info';
export const garaponAuthUrlV4: string = 'https://gtvm.garapon.tv';
export const garaponDevId: string = process.env.GARAPON_DEVID;
export const garaponSiteUrl: string = 'https://siteapi.garapon.tv';

export const categoryTable: {
  code: number;
  codeName?: string;
  name: string;
}[] = [{
  code: 0,
  codeName: 'news',
  name: 'ニュース/報道',
}, {
  code: 1,
  codeName: 'sports',
  name: 'スポーツ',
}, {
  code: 2,
  codeName: 'information',
  name: '情報/ワイドショー',
}, {
  code: 3,
  codeName: 'drama',
  name: 'ドラマ',
}, {
  code: 4,
  codeName: 'music',
  name: '音楽',
}, {
  code: 5,
  codeName: 'variety',
  name: 'バラエティ',
}, {
  code: 6,
  codeName: 'cinema',
  name: '映画',
}, {
  code: 7,
  codeName: 'anime',
  name: 'アニメ/特撮',
}, {
  code: 8,
  codeName: 'documentary',
  name: 'ドキュメンタリー/教養',
}, {
  code: 9,
  codeName: 'theater',
  name: '劇場/公演',
}, {
  code: 10,
  codeName: 'hobby',
  name: '趣味/教育',
}, {
  code: 11,
  codeName: 'welfare',
  name: '福祉',
}, {
  code: 14,
  name: '拡張',
}, {
  code: 15,
  codeName: 'etc',
  name: 'その他',
}];
