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
import * as CommonService from 'CommonService';

declare module angular { }

export interface CategoryName {
  name: string;
  localeName: string;
}

export interface ChannelService {
  id?: string;
  name?: string;
  networkId?: number;
  serviceId?: number;
}

export interface Channel {
  type?: string;
  channel?: string;
  name?: string;
  services?: ChannelService[];
}

export interface LegacyChannel {
  id: string;
  name: string;
  type: string;
  channel: string;
  sid: string;
}

interface PreviewCache {
  id: string;
  format: string;
  key: string;
  params: string;
  time: number;
}

interface PreviewOption {
  id: string;
  format: string;
  params: Object;
  deferred: ng.IDeferred<string>;
}

export interface ChinachuService {
  getUrl(path?: string): string;
  request(path: string, config?: ng.IRequestShortcutConfig): ng.IHttpPromise<{}>;
  requestAll(paths: string[], config?: ng.IRequestShortcutConfig): ng.IPromise<{}>;
  requestPreview(id: string, format: string, params?: Object)
    : ng.IPromise<string | ng.IHttpPromiseCallbackArg<{}>>;
  requestPreviewNow(id: string, format: string, params?: Object)
    : ng.IPromise<string | ng.IHttpPromiseCallbackArg<{}>>;
  cancelRequests(): void;
  convertCategory(category?: number | string): CategoryName;
  channelFromLegacy(legacy: LegacyChannel, channels: Channel[]): Channel;
  serviceFromLegacy(legacy: LegacyChannel, channels: Channel[]): ChannelService;
}

export class ChinachuService implements ChinachuService {
  static serviceName: string = 'ChinachuService';
  static $inject: string[] = [
    '$q',
    '$http',
    'CommonService',
    'categoryTable',
  ];

  private _url: string = 'http://127.0.0.1:20772';
  private _user: string = '';
  private _password: string = '';
  private _previewCacheLifetime: number = 604800000;
  private _status: Object;
  private _data: Object;
  protected canceller: ng.IDeferred<{}>;
  protected previewStack: PreviewOption[] = [];
  protected previewProcessing: boolean = false;
  protected previewCache: PreviewCache[] = [];

  constructor(
    private $q: ng.IQService,
    private $http: ng.IHttpService,
    private CommonService: CommonService.CommonService,
    private categoryTable: CategoryName[],
  ) {
    this.canceller = $q.defer();
    this.initPreviewCache();
  }

  set url(url: string) {
    this._url = url;
  }
  get url(): string {
    return this._url;
  }
  set user(user: string) {
    this._user = user;
  }
  get user(): string {
    return this._user;
  }
  set password(password: string) {
    this._password = password;
  }
  get password(): string {
    return this._password;
  }
  set previewCacheLifetime(time: number) {
    this._previewCacheLifetime = time;
  }
  get previewCacheLifetime(): number {
    return this._previewCacheLifetime;
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

  public request(path: string, config?: ng.IRequestShortcutConfig): ng.IHttpPromise<{}> {
    const conf: ng.IRequestConfig = angular.extend(
      {
        url: this.getUrl(path),
        cache: true,
        timeout: this.canceller.promise,
      },
      config,
    );
    return this.$http(conf);
  }

  public requestAll(paths: string[], config?: ng.IRequestShortcutConfig): ng.IPromise<{}> {
    const promises: ng.IHttpPromise<{}>[] = [];

    paths.forEach((path: string): void => {
      promises.push(this.request(path, config));
    });
    return this.$q.all(promises);
  }

  public requestPreviewNow(id: string, format: string, params?: Object)
    : ng.IPromise<any> {
    const deferred: ng.IDeferred<{}> = this.$q.defer();
    const ext: string = /jpe?g$/.test(format) ? '.jpg' : '.png';
    const config: ng.IRequestShortcutConfig = {
      params,
      responseType: 'blob',
      timeout: 10000,
    };
    const cache: string = this.loadPreviewCache(id, format, params);
    if (cache) {
      deferred.resolve(cache);
    } else {
      this.request(`/api/recorded/${id}/preview${ext}`, config).then(
        (response: ng.IHttpPromiseCallbackArg<Blob>): void => {
          const reader: FileReader = new FileReader();
          if (
            angular.isObject(response) &&
            angular.isObject(response.data) &&
            response.data.size > 0
          ) {
            reader.onload = (): void => {
              deferred.resolve(reader.result);
              this.savePreviewCache(id, format, params, reader.result);
            };
            reader.onerror = (): void => {
              deferred.reject(reader.error);
            };
            reader.readAsDataURL(response.data);
          } else {
            deferred.reject(response);
          }
        },
        deferred.reject,
        deferred.notify,
      );
    }
    return deferred.promise;
  }

  public requestPreview(id: string, format: string, params?: Object)
    : ng.IPromise<string | ng.IHttpPromiseCallbackArg<{}>> {
    const deferred: ng.IDeferred<string> = this.$q.defer();
    const cache: string = this.loadPreviewCache(id, format, params);
    if (cache) {
      deferred.resolve(cache);
    } else {
      this.pushPreviewStack(id, format, params, deferred);
    }
    return deferred.promise;
  }

  protected processPreviewStack(): void {
    if (!this.previewProcessing && this.previewStack.length > 0) {
      this.previewProcessing = true;
      const options: PreviewOption = this.previewStack.pop();
      this.requestPreviewNow(options.id, options.format, options.params).then(
        (data: string): void => {
          this.previewProcessing = false;
          options.deferred.resolve(data);
          this.processPreviewStack();
        },
        (response: ng.IHttpPromiseCallbackArg<{}>): void => {
          this.previewProcessing = false;
          options.deferred.reject(response);
          this.processPreviewStack();
        },
      );
    }
  }

  protected pushPreviewStack(
    id: string,
    format: string,
    params: Object,
    deferred: ng.IDeferred<string>,
  ): void {
    this.previewStack.push({
      id,
      format,
      params,
      deferred,
    });
    this.processPreviewStack();
  }

  protected clearPreviewStack(): void {
    this.previewStack = [];
  }

  public cancelRequests(): void {
    this.clearPreviewStack();
    this.canceller.reject();
    this.canceller = this.$q.defer();
  }

  protected initPreviewCache(): void {
    const time: number = Date.now();
    const previewCache: PreviewCache[] = this.CommonService.loadLocalStorage('chinachuPreviews');
    if (angular.isArray(previewCache) && previewCache.length > 0) {
      this.previewCache = [];
      previewCache.forEach((a: PreviewCache): void => {
        if (time - a.time < this.previewCacheLifetime) {
          this.previewCache.push(a);
        } else if (angular.isString(a.key)) {
          this.CommonService.removeFile('previews', a.key);
        }
      });
    }
  }

  protected savePreviewCache(
    id: string,
    format: string,
    params: Object,
    dataUrl: string,
  ): void {
    const jsonParams: string = angular.toJson(params);
    const key: string = Date.now().toString(36);
    this.previewCache.push({
      id,
      format,
      key,
      params: jsonParams,
      time: Date.now(),
    });
    if (this.CommonService.saveFile('previews', key, dataUrl)) {
      this.CommonService.saveLocalStorage('chinachuPreviews', this.previewCache);
    }
  }

  protected loadPreviewCache(id: string, format: string, params: Object): string {
    const jsonParams: string = angular.toJson(params);
    const cache: PreviewCache = this.previewCache.filter(
      (a: PreviewCache): boolean => a.id === id && a.format === format && a.params === jsonParams,
    )[0];
    if (cache) {
      return this.CommonService.loadFile('previews', cache.key);
    }
    return null;
  }

  public convertCategory(category?: number | string): CategoryName {
    let matchedCategory: CategoryName = null;
    if (angular.isNumber(category)) {
      matchedCategory = this.categoryTable[category];
    } else {
      matchedCategory = this.categoryTable.filter(
        a => a.name === category || a.localeName === category,
      )[0];
    }
    if (!matchedCategory) {
      matchedCategory = this.categoryTable[this.categoryTable.length - 1];
    }
    return matchedCategory;
  }

  public channelFromLegacy(legacy: LegacyChannel, channels: Channel[]): Channel {
    let channel: Channel;

    if (!angular.isObject(legacy)) {
      return {};
    }
    if (angular.isArray(channels)) {
      channel = channels.filter(
        (a: Channel): boolean => a.type === legacy.type && a.channel === legacy.channel,
      )[0];
    }
    return channel || {
      type: legacy.type,
      channel: legacy.channel,
      name: legacy.name,
      services: [{
        id: legacy.id,
        name: legacy.name,
        serviceId: parseInt(legacy.sid, 10),
      }],
    };
  }

  public serviceFromLegacy(legacy: LegacyChannel, channels: Channel[]): ChannelService {
    if (!angular.isObject(legacy)) {
      return {};
    }
    return this.channelFromLegacy(legacy, channels).services.filter(
      (a: ChannelService): boolean => a.serviceId === parseInt(legacy.sid, 10),
    )[0];
  }
}

angular.module('app')
  .service('ChinachuService', ChinachuService);
