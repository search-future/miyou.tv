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

export default function formatTime(time = 0) {
  const sign = time >= 0 ? "" : "-";
  const h = String(Math.floor(Math.abs(time) / 3600000));
  const m = String(Math.floor((Math.abs(time) % 3600000) / 60000) + 100).slice(
    -2
  );
  const s = String(Math.floor((Math.abs(time) % 60000) / 1000) + 100).slice(-2);
  return `${sign}${(parseInt(h, 10) > 0 ? [h, m, s] : [m, s]).join(":")}`;
}
