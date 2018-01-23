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
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { request } from 'http';

@Injectable()
export class GaraponSiteService implements GaraponSiteService {
  public user: string = '';
  public password: string = '';
  protected authkey: string;
  protected requests: {
    [key: string]: Observable<any>;
  } = {};

  constructor(
    @Inject('garaponSiteUrl') private garaponSiteUrl: string,
    @Inject('garaponDevId') private garaponDevId: string,
    @Inject('categoryTable') private categoryTable: any[],
    private httpClient: HttpClient,
  ) { }

  public convertCategory(value: any): any {
    if (value != null && typeof value === 'object') {
      return Object.assign({}, this.categoryTable[value.genre1], {
        code: value.genre1,
        name: value.genre1_name,
        subcode: value.genre2,
        subname: value.genre2_name,
      });
    }
    return {
      code: 15,
      codeName: 'etc',
      name: 'その他',
    };
  }

  public login(): Observable<any> {
    let observable: Observable<any>;
    if (this.authkey) {
      observable = this.checkAuthkey().mergeMap((result: any): Observable<any> => {
        if (result.status === 'success') {
          return Observable.of(result);
        }
        return this.issueAuthkey();
      });
    } else {
      observable = this.issueAuthkey();
    }
    return observable.map((result: any): any => {
      if (
        result.status === 'success'
      ) {
        this.authkey = result.authkey;
        return result;
      }
      throw result;
    });
  }

  protected issueAuthkey(): Observable<any> {
    const params: HttpParams = new HttpParams()
      .set('dev_id', this.garaponDevId)
      .set('gid', this.user)
      .set('passwd', this.password)
      .set('response_type', 'json');
    return this.httpClient.request(
      'POST',
      `${this.garaponSiteUrl}/service/Site/Login/issueAuthkey`,
      {
        headers: new HttpHeaders({
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
        body: params.toString(),
      },
    );
  }

  protected checkAuthkey(): Observable<any> {
    const params: HttpParams = new HttpParams()
      .set('dev_id', this.garaponDevId)
      .set('authkey', this.authkey)
      .set('response_type', 'json');
    return this.httpClient.request(
      'POST',
      `${this.garaponSiteUrl}/service/Site/Login/checkAuthkey`,
      {
        headers: new HttpHeaders({
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
        body: params.toString(),
      });
  }

  public request(
    method: string = 'POST',
    path: string,
    options?: any,
    useCache?: boolean,
  ): Observable<any> {
    const url: string = `${this.garaponSiteUrl}/service/${path}`;
    const opts: any = Object.assign(
      {
        method: 'POST',
        headers: new HttpHeaders({
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
        params: new HttpParams(),
      },
      options,
    );
    const params: HttpParams = new HttpParams()
      .set('dev_id', this.garaponDevId)
      .set('authkey', this.authkey)
      .set('response_type', 'json');
    if (opts.body) {
      opts.body += '&';
    } else {
      opts.body = '';
    }
    opts.body += params.toString();
    if (useCache == null || useCache) {
      const key: string = (
        `${url}${JSON.stringify(opts.params.toString())}${JSON.stringify(opts.body)}`
      );
      if (this.requests[key] == null) {
        this.requests[key] = this.httpClient.request(method, url, opts).catch(
          (error: any, caught: Observable<any>): Observable<any> => {
            delete this.requests[key];
            return Observable.throw(error);
          },
        ).publishLast().refCount();
      }
      return this.requests[key];
    }
    return this.httpClient.request(method, url, opts);
  }

  public clearRequests() {
    for (const key in this.requests) {
      delete this.requests[key];
    }
    this.requests = {};
  }
}
