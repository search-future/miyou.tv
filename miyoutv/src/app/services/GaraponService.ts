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
import * as CommonService from '../services/CommonService';

declare module angular { }

export interface CategoryName {
  name: string;
  localeName: string;
}

interface PreviewCache {
  id: string;
  time: number;
}

export interface GaraponService {
  requestBackendInfo(useCache?: boolean): ng.IPromise<{}>;
  loadBackend(useCache?: boolean): ng.IPromise<{}>;
  request(
    path?: string,
    config?: ng.IRequestShortcutConfig,
    useCache?: boolean,
  ): ng.IHttpPromise<{}>;
  cancelRequests(): void;
  clearRequestCache(): void;
  login(force?: boolean): ng.IPromise<{}>;
  logout(force?: boolean): ng.IPromise<{}>;
  loginV4(): ng.IPromise<{}>;
  requestPreview(id: string): ng.IPromise<string | {}>;
  getStreamUrl(id: string): string;
  getV4Url(path?: string): string;
  convertDate(value: number | Date): number;
  convertDuration(value: number): number;
  convertCategory(value: string): CategoryName;
}

export class GaraponService implements GaraponService {
  static serviceName: string = 'GaraponService';
  static $inject: string[] = [
    '$q',
    '$http',
    '$httpParamSerializer',
    'md5',
    'CommonService',
    'garaponAuthUrl',
    'garaponAuthUrlV4',
    'garaponDevId',
    'categoryTable',
  ];

  private _backend: string = '';
  private _apiVersion: number = 3;
  private _user: string = '';
  private _password: string = '';
  private _previewCacheLifetime: number = 604800000;
  protected gtvsession: string = null;
  protected canceller: ng.IDeferred<{}>;
  protected requestCache: {
    [requestCacheKey: string]: ng.IHttpPromise<{}>;
  } = {};
  protected previewCache: PreviewCache[] = [];

  constructor(
    private $q: ng.IQService,
    private $http: ng.IHttpService,
    private $httpParamSerializer: ng.IHttpParamSerializer,
    private md5: any,
    private CommonService: CommonService.CommonService,
    private garaponAuthUrl: string,
    private garaponAuthUrlV4: string,
    private garaponDevId: string,
    private categoryTable: CategoryName[],
  ) {
    this.canceller = $q.defer();
    this.initPreviewCache();
  }

  set backend(url: string) {
    this._backend = url.trim();
    if (this.apiVersion < 4) {
      this.logout(true);
    }
  }
  get backend() {
    return this._backend;
  }
  set apiVersion(version: number) {
    this._apiVersion = version;
  }
  get apiVersion(): number {
    return this._apiVersion;
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
  set previewCacheLifetime(time: number) {
    this._previewCacheLifetime = time;
  }
  get previewCacheLifetime() {
    return this._previewCacheLifetime;
  }

  public requestBackendInfo(useCache?: boolean): ng.IPromise<{}> {
    const deferred: ng.IDeferred<{}> = this.$q.defer();
    let promise: ng.IPromise<any>;
    const conf: ng.IRequestConfig = {
      method: 'POST',
      url: `${this.garaponAuthUrl}/getgtvaddress`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      transformRequest: this.$httpParamSerializer,
      data: {
        user: this.user,
        md5passwd: this.md5password(),
        dev_id: this.garaponDevId,
      },
      timeout: this.canceller.promise,
    };
    if (angular.isUndefined(useCache) || useCache) {
      const key: string = conf.url + angular.toJson(conf.params) + angular.toJson(conf.data);
      if (angular.isUndefined(this.requestCache[key])) {
        promise = this.$http(conf);
        this.requestCache[key] = promise;
        promise.catch((value?: ng.IHttpPromiseCallbackArg<{}>): {} => {
          delete this.requestCache[key];
          return value;
        });
      }
      promise = this.requestCache[key];
    } else {
      promise = this.$http(conf);
    }

    promise.then(
      (response: ng.IHttpPromiseCallbackArg<{}>): void => {
        if (
          angular.isObject(response) &&
          angular.isString(response.data)
        ) {
          const result: { [key: string]: string } = {};
          const params: string[] = response.data.split('\n');
          for (let i: number = 0; i < params.length; i += 1) {
            const param: string[] = params[i].split(';');
            if (param[0] && param[1]) {
              result[param[0]] = param[1];
            }
          }
          deferred.resolve(result);
        } else {
          deferred.reject(response);
        }
      },
      deferred.reject,
      deferred.notify,
    );
    return deferred.promise;
  }

  public loadBackend(useCache?: boolean): ng.IPromise<{}> {
    const deferred: ng.IDeferred<{}> = this.$q.defer();
    this.requestBackendInfo(useCache).then(
      (result: {
        0: string;
        ipaddr: string;
        gtvver: string;
        gipaddr: string;
        port: string;
      }): void => {
        if (
          angular.isObject(result) &&
          result[0] === 'success' &&
          angular.isString(result.ipaddr) &&
          angular.isString(result.gtvver)
        ) {
          const url: string[] = ['http://', result.ipaddr];
          if (
            result.ipaddr === result.gipaddr &&
            angular.isString(result.port)
          ) {
            url.push(':');
            url.push(result.port);
          }
          this.backend = url.join('');
          const version: string = (/^GTV([0-9]+)/.exec(result.gtvver) || [])[1];
          if (parseInt(version, 10) < 3) {
            this.apiVersion = 2;
          } else {
            this.apiVersion = 3;
          }
          deferred.resolve(result);
        } else {
          deferred.reject(result);
        }
      },
      deferred.reject,
      deferred.notify,
    );
    return deferred.promise;
  }

  public request(
    path?: string,
    config?: ng.IRequestShortcutConfig,
    useCache?: boolean,
  ): ng.IHttpPromise<{}> {
    const conf: ng.IRequestConfig = angular.extend(
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        transformRequest: this.$httpParamSerializer,
        url: `${this.backend}/gapi/v${this.apiVersion}/${path}`,
        params: {},
        data: {},
        timeout: this.canceller.promise,
      },
      config,
    );
    if (this.apiVersion >= 4) {
      if (conf.method === 'POST') {
        conf.data.gtvsession = this.gtvsession;
      } else {
        conf.params.gtvsession = this.gtvsession;
      }
    } else {
      conf.params.dev_id = this.garaponDevId;
      conf.params.gtvsession = this.gtvsession;
    }
    if (angular.isUndefined(useCache) || useCache) {
      const key: string = conf.url + angular.toJson(conf.params) + angular.toJson(conf.data);
      if (angular.isUndefined(this.requestCache[key])) {
        this.requestCache[key] = this.$http(conf);
        this.requestCache[key].catch((value: {}): {} => {
          delete this.requestCache[key];
          return value;
        });
      }
      return this.requestCache[key];
    }
    return this.$http(conf);
  }

  public cancelRequests(): void {
    this.canceller.resolve();
    this.canceller = this.$q.defer();
  }

  public clearRequestCache(): void {
    this.requestCache = {};
  }


  public login(force?: boolean): ng.IPromise<{}> {
    const deferred: ng.IDeferred<{}> = this.$q.defer();
    if (!angular.isString(this.gtvsession) || force) {
      this.request(
        'auth',
        {
          data: {
            type: 'login',
            loginid: this.user,
            md5pswd: this.md5password(),
          },
        },
        false,
      ).then(
        (response: ng.IHttpPromiseCallbackArg<{
          status: number;
          login: number;
          gtvsession: string;
        }>): void => {
          if (
            angular.isObject(response) &&
            angular.isObject(response.data) &&
            response.data.status === 1 &&
            response.data.login === 1
          ) {
            this.gtvsession = response.data.gtvsession;
            deferred.resolve(response);
          } else {
            deferred.reject(response);
          }
        },
        deferred.reject,
        deferred.notify,
      );
    } else {
      deferred.resolve({
        status: 200,
        statusText: 'OK',
      });
    }
    return deferred.promise;
  }

  public logout(force?: boolean): ng.IPromise<{}> {
    const deferred: ng.IDeferred<{}> = this.$q.defer();
    this.request(
      'auth',
      {
        data: {
          type: 'logout',
        },
      },
      false,
    ).then(
      (response: ng.IHttpPromiseCallbackArg<{ status: number, logout: number }>): void => {
        if (
          angular.isObject(response) &&
          angular.isObject(response.data) &&
          response.data.status === 1 &&
          response.data.logout === 1
        ) {
          if (!force) {
            this.gtvsession = null;
          }
          deferred.resolve(response);
        } else {
          deferred.reject(response);
        }
      },
      deferred.reject,
      deferred.notify,
    );
    if (force) {
      this.gtvsession = null;
    }
    return deferred.promise;
  }

  protected md5password(): void {
    return this.md5.createHash(this.password);
  }

  public loginV4(): ng.IPromise<{}> {
    const deferred: ng.IDeferred<{}> = this.$q.defer();
    let promise: ng.IPromise<{}>;
    if (this.gtvsession) {
      promise = this.checkV4Session().then(
        (result: {
          status: string;
        }): {} => {
          if (result.status === 'success') {
            return result;
          }
          return this.getV4Session();
        },
        (): ng.IPromise<{}> => this.getV4Session(),
      );
    } else {
      promise = this.getV4Session();
    }
    promise.then((result: {
      status: string;
      data: {
        [key: string]: string;
      }
    }): void => {
      if (result.status === 'success') {
        if (result.data.gtvsession) {
          this.gtvsession = result.data.gtvsession;
        }
        this.apiVersion = 4;
        deferred.resolve(result);
      } else {
        deferred.reject(result);
      }
    });
    return deferred.promise;
  }

  protected getV4Session(): ng.IPromise<{}> {
    const deferred: ng.IDeferred<{}> = this.$q.defer();
    this.$http({
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      transformRequest: this.$httpParamSerializer,
      url: `${this.garaponAuthUrlV4}/service/Auth/Gtvsession/get`,
      data: {
        dev_id: this.garaponDevId,
        gid: this.user,
        passwd: this.password,
      },
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

  protected checkV4Session(): ng.IPromise<{}> {
    const deferred: ng.IDeferred<{}> = this.$q.defer();
    this.$http({
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      transformRequest: this.$httpParamSerializer,
      url: `${this.garaponAuthUrlV4}/service/Auth/Gtvsession/checkWithGid`,
      data: {
        dev_id: this.garaponDevId,
        gid: this.user,
        gtvsession: this.gtvsession,
      },
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

  protected initPreviewCache(): void {
    const time: number = Date.now();
    const previewCache: PreviewCache = this.CommonService.loadLocalStorage('garaponPreviews');
    if (angular.isArray(previewCache) && previewCache.length > 0) {
      this.previewCache = [];
      previewCache.forEach((a: PreviewCache): void => {
        if (time - a.time < this.previewCacheLifetime) {
          this.previewCache.push(a);
        } else if (angular.isString(a.id)) {
          this.CommonService.removeFile('previews', a.id);
        }
      });
    }
  }
  public requestPreview(id: string): ng.IPromise<string | ng.IHttpPromiseCallbackArg<{}>> {
    const deferred: ng.IDeferred<any> = this.$q.defer();
    const config: ng.IRequestConfig = {
      method: 'GET',
      url: `${this.backend}/thumbs/${id}`,
      cache: true,
      responseType: 'blob',
      timeout: this.canceller.promise,
    };
    const cache: PreviewCache = this.loadPreviewCache(id);
    if (cache) {
      deferred.resolve(cache);
    } else {
      this.$http(config).then(
        (response: ng.IHttpPromiseCallbackArg<Blob>): void => {
          const reader: FileReader = new FileReader();

          reader.onload = (): void => {
            deferred.resolve(reader.result);
            this.savePreviewCache(id, reader.result);
          };
          reader.onerror = (): void => {
            deferred.reject(reader.error);
          };
          reader.readAsDataURL(response.data);
        },
        deferred.reject,
        deferred.notify,
      );
    }
    return deferred.promise;
  }

  protected savePreviewCache(id: string, dataUrl: string): void {
    this.previewCache.push({
      id,
      time: Date.now(),
    });
    if (this.CommonService.saveFile('previews', id, dataUrl)) {
      this.CommonService.saveLocalStorage('garaponPreviews', this.previewCache);
    }
  }

  protected loadPreviewCache(id: string): PreviewCache {
    const cache: PreviewCache = this.previewCache.filter(
      (a: PreviewCache): boolean => a.id === id,
    )[0];
    if (cache) {
      return this.CommonService.loadFile('previews', cache.id);
    }
    return null;
  }

  public getStreamUrl(id: string): string {
    if (angular.isString(id)) {
      if (this.apiVersion < 3) {
        return `${this.backend}/cgi-bin/play/m3u8.cgi?${id}-${this.gtvsession}`;
      }
      return `${this.backend}/${id}.m3u8?${this.$httpParamSerializer({
        gtvsession: this.gtvsession,
        dev_id: this.garaponDevId,
      })}`;
    }
    return null;
  }

  public getV4Url(path?: string): string {
    let sessionParam: string;
    if (/\?/.test(path)) {
      sessionParam = '&';
    } else {
      sessionParam = '?';
    }
    sessionParam += `gtvsession=${this.gtvsession}`;
    return `${this.backend}${path}${sessionParam}`;
  }

  public convertDate(value: number | Date): number {
    return new Date(value).getTime();
  }

  public convertDuration(value: number): number {
    if (angular.isString(value)) {
      const duration: string[] = value.split(':');
      return (
        (parseInt(duration.pop() || '0', 10) * 1000) +
        (parseInt(duration.pop() || '0', 10) * 60000) +
        (parseInt(duration.pop() || '0', 10) * 3600000)
      );
    }
    return value;
  }

  public convertCategory(value: string): CategoryName {
    let matchedCategory: CategoryName = null;
    if (angular.isString(value)) {
      const categoryNumber: string[] = value.split('/');
      matchedCategory = this.categoryTable[parseInt(categoryNumber[0], 10)];
    }
    if (!matchedCategory) {
      matchedCategory = this.categoryTable[this.categoryTable.length - 1];
    }
    return matchedCategory;
  }

}

angular.module('app')
  .service('GaraponService', GaraponService);
