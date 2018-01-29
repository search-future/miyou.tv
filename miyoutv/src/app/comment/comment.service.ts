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
import { EventEmitter, Inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { StorageService } from '../shared/storage.service';

@Injectable()
export class CommentService {
  public readonly ready: Observable<null> = new EventEmitter();
  protected token: string = '';

  public static normalizeChannel(channel: string): string {
    return channel
      .replace(/[０-９Ａ-Ｚａ-ｚ：-？￥＄％-＊]/g, (
        (s: string): string => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
      ))
      .replace('　', ' ')
      .replace('!', '')
      .replace(/^(NHK[^0-9 ]+[0-9 ]).*$/, '$1')
      .replace(/^([^0-9]+)[0-9]$/, '$1')
      .replace(/(◆.+|・[0-9]+)$/, '')
      .replace(/HD$/, '')
      .replace(/CH$/i, '');
  }

  constructor(
    @Inject('commentUrl') private commentUrl: string,
    @Inject('commentTokenUrl') private commentTokenUrl: string,
    private httpClient: HttpClient,
    private storageService: StorageService,
  ) { }

  public saveQuery(channel: string, query: string) {
    let queries: any = this.storageService.loadLocalStorage('commentQueries') || {};
    if (typeof queries !== 'object') {
      queries = {};
    }
    queries[channel] = query;
    this.storageService.saveLocalStorage('commentQueries', queries);
  }

  public loadQuery(channel: string) {
    const queries: any = this.storageService.loadLocalStorage('commentQueries') || {};
    if (
      typeof queries === 'object' &&
      queries[channel] != null
    ) {
      return queries[channel];
    }
    return CommentService.normalizeChannel(channel);
  }

  public requestToken(
    email: string,
    password: string,
  ): Observable<any> {
    const url: string = this.commentTokenUrl;
    const options: any = {
      headers: new HttpHeaders({
        'Content-Type': 'application/x-www-form-urlencoded',
      }),
      body: new HttpParams()
        .set('email', email)
        .set('password', password)
        .toString(),
    };
    return this.httpClient.request('POST', url, options).map(
      (response: any): any => {
        if (response.token) {
          this.token = response.token;
          (this.ready as EventEmitter<null>).emit();
          return response;
        }
        throw {
          status: response.EC,
          message: response.Edesc,
        };
      },
    );
  }

  public deleteToken() {
    this.token = '';
  }

  public request(method: string = 'GET', path: string, options?: any): Observable<any> {
    if (this.token) {
      const url: string = `${this.commentUrl}/${path}`;
      const opts: any = Object.assign(
        {
          headers: new HttpHeaders({
            'X-MITEYOU-AUTH-TOKEN': this.token,
          }),
        },
        options,
      );
      return this.httpClient.request(method, url, opts).map((response: any): any => {
        if (response && response.status === 'OK') {
          return response.data;
        }
        throw response;
      });
    }
    return Observable.throw({ EC: 403, Edesc: 'token format err' });
  }
}
