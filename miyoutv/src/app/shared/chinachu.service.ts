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
import { Inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subscriber } from 'rxjs';

@Injectable()
export class ChinachuService {
  public url: string = 'http://127.0.0.1:20772';
  public user: string = '';
  public password: string = '';

  constructor(
    @Inject('categoryTable') private categoryTable: { [key: number]: string }[],
    private httpClient: HttpClient,
  ) { }

  public convertCategory(value?: any): any {
    let category: any;
    if (!isNaN(value)) {
      category = this.categoryTable.find((a: any): boolean => a.code === parseInt(value, 10));
    } else if (value) {
      category = this.categoryTable.find((a: any): boolean => (
        a.codeName === value || a.name === value
      ));
    }
    if (category) {
      return category;
    }
    return {
      code: 15,
      codeName: 'etc',
      name: 'その他',
    };
  }

  public getUrl(path?: string): string {
    let wuiUrl: string = this.url || 'http://127.0.0.1:20772';
    const auth: string[] = [];

    if (!/^https?:\/\//.test(wuiUrl)) {
      wuiUrl = 'http://${wuiUrl}';
    }
    if (this.user) {
      auth.push(this.user);
      if (this.password) {
        auth.push(this.password);
      }
      wuiUrl = wuiUrl.replace(
        /^(https?:\/\/)(.*)$/,
        `$1${auth.join(':')}@$2`,
      );
    }
    wuiUrl = wuiUrl.replace(/\/$/, '');
    return `${wuiUrl}${path}`;
  }

  public request(method: string = 'GET', path: string, options: any = {}): Observable<any> {
    return this.httpClient.request(method, this.getUrl(path), options);
  }

  public requestAll(method: string = 'GET', paths: string[], options: any = {}): Observable<any[]> {
    const observables: Observable<any>[] = [];

    for (const path of paths) {
      observables.push(this.request(method, path, options));
    }
    return Observable.zip(...observables);
  }

  public isRecorded(id: string): Observable<boolean> {
    return this.request(
      'GET',
      `/api/recorded/${id}/file.json`,
    ).map((file: any): boolean => (file != null && typeof file === 'object' && file.size > 0));
  }

  public getRecordedDuration(id: string): Observable<number> {
    return Observable.create((subscriber: Subscriber<number>) => {
      const http = require('http');
      const url = require('url');

      const mrl: string = this.getUrl(
        `/api/recorded/${id}/watch.m2ts?c:v=copy&c:a=copy&ss=10&t=10`,
      );
      const request: any = http.request(url.parse(mrl));
      request.on('response', (response: any) => {
        const contentLength = parseInt(response.headers['content-length'], 10);
        request.abort();
        this.request('GET', `/api/recorded/${id}/file.json`).subscribe(
          (response: any) => {
            if (contentLength > 1000000) {
              const duration: number = (response.size * 10000) / contentLength;
              subscriber.next(duration);
              subscriber.complete();
            } else {
              subscriber.error(Object.assign({}, response, { contentLength }));
            }
          },
          subscriber.error,
        );
      }).on('error', (error: any) => {
        subscriber.error(error);
      }).end();
    });
  }
}
