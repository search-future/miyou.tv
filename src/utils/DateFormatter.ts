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

import moment from "../utils/moment-with-locale";

export default class DateFormatter {
  hourFirst: number;
  hourFormat: string;

  constructor(hourFirst = 0, hourFormat = "") {
    this.hourFirst = hourFirst;
    this.hourFormat = hourFormat;
  }

  format(value: Date, format: string) {
    const useMarker = /12$/.test(this.hourFormat);
    const date = new Date(value);
    const hour = this.getHour(date);
    if (/H{3,4}/.test(format) && hour >= 24) {
      date.setDate(date.getDate() - 1);
    }
    const convertedFormat = format
      .replace("HHHH", String(100 + hour).slice(1))
      .replace("HHH", String(hour))
      .replace("A", useMarker ? "a" : "");
    return moment(date).format(convertedFormat);
  }

  getHour(value: Date) {
    const formatArray = this.hourFormat.split(":");
    let start = this.hourFirst;
    let limit = 24;
    let hour = new Date(value).getHours();
    if (formatArray.length === 2) {
      const formatStart = parseInt(formatArray[0], 10);
      const formatLimit = parseInt(formatArray[1], 10);
      if (!isNaN(formatStart)) {
        start = formatStart;
      }
      if (!isNaN(formatLimit)) {
        limit = formatLimit;
      }
    }
    return ((hour + limit - start) % limit) + start;
  }
}
