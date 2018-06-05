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
import { HttpHeaders, HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subscriber } from 'rxjs';
import { Md5 } from 'ts-md5/dist/md5';

import { StorageService } from '../shared/storage.service';

@Injectable()
export class GaraponService implements GaraponService {
  public url: string = '';
  public apiVersion: number = 3;
  public user: string = '';
  public password: string = '';
  public previewCacheLifetime: number = 604800000;
  protected gtvsession: string = null;
  protected requestCache: {
    [requestCacheKey: string]: Observable<any>;
  } = {};

  public static timeToTimestamp(time: number): string {
    const date: Date = new Date(time);
    const Y: string = date.getFullYear().toString();
    const M: string = String(date.getMonth() + 1 + 100).slice(-2);
    const D: string = String(date.getDate() + 100).slice(-2);
    const h: string = String(date.getHours() + 100).slice(-2);
    const m: string = String(date.getMinutes() + 100).slice(-2);
    const s: string = String(date.getSeconds() + 100).slice(-2);
    return `${Y}-${M}-${D} ${h}:${m}:${s}`;
  }

  public static convertDuration(value: string): number {
    const duration: string[] = value.split(':');
    return (
      (parseInt(duration.pop() || '0', 10) * 1000) +
      (parseInt(duration.pop() || '0', 10) * 60000) +
      (parseInt(duration.pop() || '0', 10) * 3600000)
    );
  }

  constructor(
    @Inject('garaponAuthUrl') private garaponAuthUrl: string,
    @Inject('garaponAuthUrlV4') private garaponAuthUrlV4: string,
    @Inject('garaponDevId') private garaponDevId: string,
    @Inject('categoryTable') private categoryTable: any[],
    private httpClient: HttpClient,
    private storageService: StorageService,
  ) { }

  get md5password(): string {
    return Md5.hashStr(this.password) as string;
  }

  public convertCategory(value: string = '15'): any {
    const categoryNumber: string[] = value.split('/');
    const code: number = parseInt(categoryNumber[0], 10);
    const category: any = this.categoryTable.find((a: any): boolean => a.code === code);
    if (category) {
      return category;
    }
    return {
      code: 15,
      codeName: 'etc',
      name: 'その他',
    };
  }

  public requestBackendInfo(useCache?: boolean): Observable<any> {
    const url: string = `${this.garaponAuthUrl}/getgtvaddress`;
    const options: any = {
      method: 'POST',
      headers: new HttpHeaders({
        'Content-Type': 'application/x-www-form-urlencoded',
      }),
      responseType: 'text',
    };
    const params: HttpParams = new HttpParams()
      .set('user', this.user)
      .set('md5passwd', this.md5password)
      .set('dev_id', this.garaponDevId);
    options.body = params.toString();
    let request: Observable<any>;
    if (useCache == null || useCache) {
      const key: string = (
        `${url}${JSON.stringify(options.params || '')}${JSON.stringify(options.body)}`
      );
      if (this.requestCache[key] == null) {
        this.requestCache[key] = this.httpClient.request('POST', url, options).catch(
          (error: any, caught: Observable<any>): Observable<any> => {
            delete this.requestCache[key];
            return caught;
          },
        ).publishLast().refCount();
      }
      request = this.requestCache[key];
    } else {
      request = this.httpClient.request('POST', url, options);
    }
    return request.map((response: string): any => {
      const result: { [key: string]: string } = {};
      for (const param of response.split('\n')) {
        const [key, value]: string[] = param.split(';');
        if (key && value) {
          result[key] = value;
        }
      }
      if (result[0] === 'success') {
        return result;
      }
      throw result;
    });
  }

  public loadBackend(useCache?: boolean): Observable<any> {
    return this.requestBackendInfo(useCache).map(
      (result: {
        0: string;
        ipaddr: string;
        gtvver: string;
        gipaddr: string;
        port: string;
      }): any => {
        if (
          result != null &&
          typeof result === 'object' &&
          result[0] === 'success' &&
          typeof result.ipaddr === 'string' &&
          typeof result.gtvver === 'string'
        ) {
          const url: string[] = ['http://', result.ipaddr];
          if (
            result.ipaddr === result.gipaddr &&
            result.port
          ) {
            url.push(':');
            url.push(result.port);
          }
          this.url = url.join('');
          const version: string = (/^GTV([0-9]+)/.exec(result.gtvver) || [])[1];
          if (parseInt(version, 10) < 3) {
            this.apiVersion = 2;
          } else {
            this.apiVersion = 3;
          }
          return result;
        }
        throw result;
      },
    );
  }

  public request(
    method: string = 'POST',
    path?: string,
    options?: any,
    useCache?: boolean,
  ): Observable<any> {
    const url: string = `${this.url}/gapi/v${this.apiVersion}/${path}`;
    const opts: any = Object.assign(
      {
        headers: new HttpHeaders({
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
        params: new HttpParams(),
      },
      options,
    );
    const params: { [key: string]: any } = opts.params as { [key: string]: any };
    if (this.apiVersion >= 4) {
      if (method === 'POST') {
        if (opts.body) {
          opts.body += '&';
        } else {
          opts.body = '';
        }
        opts.body += `gtvsession=${this.gtvsession}`;
      } else {
        opts.params = opts.params.set('gtvsession', this.gtvsession);
      }
    } else {
      opts.params = opts.params
        .set('dev_id', this.garaponDevId)
        .set('gtvsession', this.gtvsession);
    }
    if (useCache == null || useCache) {
      const key: string = `${url}${JSON.stringify(opts.params)}${JSON.stringify(opts.body)}`;
      if (this.requestCache[key] == null) {
        this.requestCache[key] = this.httpClient.request(method, url, opts).catch(
          (error: any, caught: Observable<any>): Observable<any> => {
            delete this.requestCache[key];
            return caught;
          },
        ).publishLast().refCount();
      }
      return this.requestCache[key];
    }
    return this.httpClient.request(method, url, opts);
  }

  public clearRequests() {
    this.requestCache = {};
  }

  public login(force?: boolean): Observable<any> {
    const params: HttpParams = new HttpParams()
      .set('type', 'login')
      .set('loginid', this.user)
      .set('md5pswd', this.md5password);
    return this.request(
      'POST',
      'auth',
      {
        body: params.toString(),
      },
      false,
    ).map(
      (response: any): any => {
        if (
          response.status === 1 &&
          response.login === 1
        ) {
          const version: string = (/^GTV([0-9]+)/.exec(response.version) || [])[1];
          if (parseInt(version, 10) < 3) {
            this.apiVersion = 2;
          } else {
            this.apiVersion = 3;
          }
          this.gtvsession = response.gtvsession;
          return response.gtvsession;
        }
        throw response;
      },
    );
  }

  public logout(force?: boolean): Observable<any> {
    if (force) {
      this.gtvsession = null;
    }
    const data: HttpParams = new HttpParams().set('type', 'logout');
    return this.request(
      'POST',
      'auth',
      {
        body: data.toString(),
      },
      false,
    ).map((response: any): any => {
      if (
        response.status === 1 &&
        response.logout === 1
      ) {
        if (!force) {
          this.gtvsession = null;
        }
        return response;
      }
      throw response;
    });
  }

  public loginV4(): Observable<any> {
    let observable: Observable<any>;
    if (this.gtvsession) {
      observable = this.checkV4Session().mergeMap((result: any): any => {
        if (result.status === 'success') {
          return Observable.of(result);
        }
        return this.getV4Session();
      });
    } else {
      observable = this.getV4Session();
    }
    return observable.map(
      (result: any): any => {
        if (result.status === 'success') {
          if (result.data.gtvsession) {
            this.gtvsession = result.data.gtvsession;
          }
          this.apiVersion = 4;
          return result;
        }
        throw result;
      },
    );
  }

  protected getV4Session(): Observable<any> {
    const params: HttpParams = new HttpParams()
      .set('dev_id', this.garaponDevId)
      .set('gid', this.user)
      .set('passwd', this.password);
    return this.httpClient.request(
      'POST',
      `${this.garaponAuthUrlV4}/service/Auth/Gtvsession/get`,
      {
        headers: new HttpHeaders({
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
        body: params.toString(),
      },
    );
  }

  protected checkV4Session(): Observable<any> {
    const params: HttpParams = new HttpParams()
      .set('dev_id', this.garaponDevId)
      .set('gid', this.user)
      .set('gtvsession', this.gtvsession);
    return this.httpClient.request(
      'POST',
      `${this.garaponAuthUrlV4}/service/Auth/Gtvsession/checkWithGid`,
      {
        headers: new HttpHeaders({
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
        body: params.toString(),
      },
    );
  }

  public getStreamUrl(id: string): string {
    if (this.apiVersion < 3) {
      return `${this.url}/cgi-bin/play/m3u8.cgi?${id}-${this.gtvsession}`;
    }
    const params: HttpParams = new HttpParams()
      .set('gtvsession', this.gtvsession)
      .set('dev_id', this.garaponDevId);
    return `${this.url}/${id}.m3u8?${params.toString()}`;
  }

  public getPreviewUrl(id: string): string {
    return `${this.url}/thumbs/${id}`;
  }

  public getV4Url(path?: string): string {
    let sessionParam: string;
    if (/\?/.test(path)) {
      sessionParam = '&';
    } else {
      sessionParam = '?';
    }
    sessionParam += `gtvsession=${this.gtvsession}`;
    return `${this.url}${path}${sessionParam}`;
  }
}
