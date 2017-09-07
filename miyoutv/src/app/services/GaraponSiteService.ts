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

export interface CategoryName {
  name: string;
  localeName: string;
}

export interface GaraponSiteService {
  login(): ng.IPromise<{}>;
  request(
    path: string,
    config?: ng.IRequestShortcutConfig,
    useCache?: boolean,
  ): ng.IHttpPromise<{}>;
  cancelRequests(): void;
  clearRequestCache(): void;
  convertCategory(value: {}): CategoryName;
}

export class GaraponSiteService implements GaraponSiteService {
  static serviceName: string = 'GaraponSiteService';
  static $inject: string[] = [
    '$q',
    '$http',
    '$httpParamSerializer',
    'garaponSiteUrl',
    'garaponDevId',
    'categoryTable',
  ];

  private _user: string = '';
  private _password: string = '';
  protected authkey: string;
  protected canceller: ng.IDeferred<{}>;
  protected requestCache: {
    [key: string]: ng.IHttpPromise<{}>;
  } = {};

  constructor(
    private $q: ng.IQService,
    private $http: ng.IHttpService,
    private $httpParamSerializer: ng.IHttpParamSerializer,
    private garaponSiteUrl: string,
    private garaponDevId: string,
    private categoryTable: CategoryName[],
  ) {
    this.canceller = $q.defer();
  }

  set user(user: string) {
    this._user = user.trim();
  }
  get user(): string {
    return this._user;
  }
  set password(password: string) {
    this._password = password.trim();
  }
  get password(): string {
    return this._password;
  }

  public login(): ng.IPromise<{}> {
    const deferred: ng.IDeferred<{}> = this.$q.defer();
    let promise: ng.IPromise<{}>;
    if (this.authkey) {
      promise = this.checkAuthkey().then(
        (result: { status: string }): {} => {
          if (result.status === 'success') {
            return result;
          }
          return this.issueAuthkey();
        },
        this.issueAuthkey,
      );
    } else {
      promise = this.issueAuthkey();
    }
    promise.then(
      (result: { status: string, authkey: string }): void => {
        if (
          angular.isObject(result) &&
          result.status === 'success'
        ) {
          this.authkey = result.authkey;
          deferred.resolve(result);
        }
      },
      deferred.reject,
    );
    return deferred.promise;
  }

  protected issueAuthkey(): ng.IPromise<{}> {
    const deferred: ng.IDeferred<{}> = this.$q.defer();
    this.$http({
      method: 'POST',
      url: `${this.garaponSiteUrl}/service/Site/Login/issueAuthkey`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      transformRequest: this.$httpParamSerializer,
      data: {
        dev_id: this.garaponDevId,
        gid: this.user,
        passwd: this.password,
        response_type: 'json',
      },
      timeout: this.canceller.promise,
    }).then(
      (response: ng.IHttpPromiseCallbackArg<{}>): void => {
        if (angular.isObject(response.data)) {
          deferred.resolve(response.data);
        } else {
          deferred.reject(response);
        }
      },
      deferred.reject,
    );
    return deferred.promise;
  }

  protected checkAuthkey(): ng.IPromise<{}> {
    const deferred: ng.IDeferred<{}> = this.$q.defer();
    this.$http({
      method: 'POST',
      url: `${this.garaponSiteUrl}/service/Site/Login/checkAuthkey`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      transformRequest: this.$httpParamSerializer,
      data: {
        dev_id: this.garaponDevId,
        authkey: this.authkey,
        response_type: 'json',
      },
      timeout: this.canceller.promise,
    }).then(
      (response: ng.IHttpPromiseCallbackArg<{}>): void => {
        if (angular.isObject(response.data)) {
          deferred.resolve(response.data);
        } else {
          deferred.reject(response);
        }
      },
      deferred.reject,
    );
    return deferred.promise;
  }

  public request(
    path: string,
    config?: ng.IRequestShortcutConfig,
    useCache?: boolean,
  ): ng.IHttpPromise<{}> {
    let promise: ng.IHttpPromise<{}>;
    const conf: ng.IRequestConfig = angular.extend(
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        transformRequest: this.$httpParamSerializer,
        url: `${this.garaponSiteUrl}/service/${path}`,
        cache: true,
        params: {},
        data: {},
        timeout: this.canceller.promise,
      },
      config,
    );
    conf.data.dev_id = this.garaponDevId;
    conf.data.authkey = this.authkey;
    conf.data.response_type = 'json';
    if (useCache || angular.isUndefined(useCache)) {
      const key: string = conf.url + angular.toJson(conf.params) + angular.toJson(conf.data);
      if (angular.isUndefined(this.requestCache[key])) {
        promise = this.$http(conf);
        this.requestCache[key] = promise;
        promise.catch(function (value) {
          delete this.requestCache[key];
          return value;
        });
      }
      promise = this.requestCache[key];
    } else {
      promise = this.$http(conf);
    }
    return promise;
  }

  public cancelRequests(): void {
    this.canceller.resolve();
    this.canceller = this.$q.defer();
  }

  public clearRequestCache(): void {
    this.requestCache = {};
  }

  public convertCategory(value: { genre1: string }): CategoryName {
    let matchedCategory: CategoryName = null;
    if (
      angular.isObject(value) &&
      angular.isString(value.genre1)
    ) {
      matchedCategory = this.categoryTable[parseInt(value.genre1, 10)];
    }
    if (!matchedCategory) {
      matchedCategory = this.categoryTable[this.categoryTable.length - 1];
    }
    return matchedCategory;
  }

}

angular.module('app')
  .service('GaraponSiteService', GaraponSiteService);
