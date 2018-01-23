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
import { Inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';
import { DatePipe } from '@angular/common';

@Pipe({
  name: 'dateEx',
})
export class DateExPipe implements PipeTransform {
  private datePipe: DatePipe;
  constructor(
    @Inject(LOCALE_ID) private locale: string,
  ) {
    this.datePipe = new DatePipe(locale);
  }

  transform(
    value: any,
    firstHour: number,
    hourFormat: string,
    format: string,
    ...args: any[],
  ): string {
    const formatArray: string[] = (hourFormat || '').split(':');
    const useMarker: boolean = /12$/.test(hourFormat);
    let start: number = isNaN(firstHour) ? 4 : firstHour;
    let limit: number = 24;
    let hour: number = new Date(value).getHours();
    if (formatArray.length === 2) {
      start = !isNaN(formatArray[0] as any) ? parseInt(formatArray[0], 10) : start;
      limit = !isNaN(formatArray[1] as any) ? parseInt(formatArray[1], 10) : limit;
    }
    hour = (((hour + limit) - start) % limit) + start;

    if (typeof format === 'string') {
      const date: Date = new Date(value);
      if (/H{3,4}/.test(format) && hour >= 24) {
        date.setDate(date.getDate() - 1);
      }
      const convertedFormat: string = format.replace(
        'HHHH', String(100 + hour).slice(1),
      ).replace(
        'HHH', String(hour),
      ).replace(
        'A', useMarker ? 'a' : '',
      );
      return this.datePipe.transform(date, convertedFormat, ...args);
    }
    return this.datePipe.transform(value, format, ...args);
  }
}
