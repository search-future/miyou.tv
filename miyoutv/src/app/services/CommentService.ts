/*!
Copyright 2016 Brazil Ltd.

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
declare module angular { }

export interface Channel {
  name: string;
}

export interface Comment {
  channels: string[];
  email: string;
  id: string;
  name: string;
  text: string;
  time: number;
  title: string;
}

export interface CommentChannel {
  id: string;
  type: string;
}


export interface CommentInterval {
  start: number;
  n_hits: number;
}

export interface CommentService {
  resolveChannel(channel: string | Channel): string;
  requestToken(email: string, password: string): ng.IHttpPromise<{ token: string }>;
  deleteToken(): void;
  request(path: string, config?: ng.IRequestShortcutConfig): ng.IHttpPromise<Object>;
}

export class CommentService implements CommentService {
  static serviceName: string = 'CommentService';
  static $inject: string[] = [
    '$q',
    '$http',
    '$httpParamSerializer',
    'commentUrl',
    'commentTokenUrl',
  ];

  private _token: string = '';

  constructor(
    private $q: ng.IQService,
    private $http: ng.IHttpService,
    private $httpParamSerializer: ng.IHttpParamSerializer,
    private commentUrl: string,
    private commentTokenUrl: string,
  ) { }

  get token(): string {
    return this._token;
  }

  public resolveChannel(channel: string | Channel): string {
    const name: string = angular.isObject(channel) ? (channel as Channel).name : String(channel);
    return name
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

  public requestToken(
    email: string,
    password: string,
  ): ng.IHttpPromise<{ token: string }> {
    const deferred: ng.IDeferred<ng.IHttpPromiseCallbackArg<{ token: string }>> = this.$q.defer();
    const conf: ng.IRequestConfig = {
      method: 'POST',
      url: this.commentTokenUrl,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      transformRequest: this.$httpParamSerializer,
      data: {
        email,
        password,
      },
    };

    this.$http(conf).then(
      (response: ng.IHttpPromiseCallbackArg<{ token: string }>) => {
        if (response.data.token) {
          this._token = response.data.token;
          deferred.resolve(response);
        } else {
          deferred.reject(response);
        }
      },
      deferred.reject,
      deferred.notify,
    );
    return deferred.promise;
  }

  public deleteToken(): void {
    this._token = '';
  }

  public request(path: string, config?: ng.IRequestShortcutConfig): ng.IHttpPromise<Object> {
    const conf: ng.IRequestConfig = angular.extend(
      {
        method: 'GET',
        url: `${this.commentUrl}/${path}`,
        headers: {
          'X-MITEYOU-AUTH-TOKEN': this.token,
        },
      },
      config,
    );
    return this.$http(conf);
  }
}

angular.module('app')
  .service('CommentService', CommentService);
