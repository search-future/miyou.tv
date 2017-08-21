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
import * as path from 'path';
import * as fs from 'fs';
import { remote } from 'electron';

declare module angular { }

export interface CommonService {
  window(): Electron.BrowserWindow;
  saveLocalStorage(key: string, value: any): void;
  loadLocalStorage(key: string): any;
  removeLocalStorage(key: string): void;
  saveSessionStorage(key: string, value: any): void;
  loadSessionStorage(key: string): any;
  removeSessionStorage(key: string): void;
  saveFile(dirname: string, filename: string, value: any): boolean;
  loadFile(dirname: string, filename: string): any;
  removeFile(dirname: string, filename: string): boolean;
  isFullscreen(): boolean;
  setFullscreen(flag: boolean): void;
  isAlwaysOnTop(): boolean;
  setAlwaysOnTop(flag: boolean): void;
  isMaximized(): boolean;
  maximize(): void;
  isMinimized(): boolean;
  minimize(): void;
  restore(): void;
  isPowerSave(): boolean;
  setPowerSave(flag: boolean): void;
  quitModal(): void;
  close(): void;
  reload(): void;
  back(): void;
  quit(): void;
  formatTime(time: number): string;
  convertHour(time: number | Date, format?: string): number;
  formatDate(time: number, format: string, hourFormat?: string): void;
  errorModal(
    title: string,
    message: string,
    callback?: (value: any) => void,
  ): void;
  progressModal(title: string, message: string): ng.ui.bootstrap.IModalInstanceService;
  openViewSetting(): ng.ui.bootstrap.IModalInstanceService;
  openBackendSetting(): ng.ui.bootstrap.IModalInstanceService;
  openMoritapoSetting(): ng.ui.bootstrap.IModalInstanceService;
}

export class CommonService implements CommonService {
  static serviceName: string = 'CommonService';
  static $inject: string[] = [
    '$rootScope',
    '$window',
    '$location',
    '$filter',
    '$route',
    '$uibModal',
  ];

  private app: Electron.App;
  private win: Electron.BrowserWindow;
  private powerSaveBlocker: Electron.PowerSaveBlocker;
  private dataPath: string;
  private quitModalInstance: ng.ui.bootstrap.IModalInstanceService = null;
  private powerSaveBlockerId: number;

  constructor(
    private $rootScope: ng.IRootScopeService,
    private $window: ng.IWindowService,
    private $location: ng.ILocationService,
    private $filter: ng.IFilterService,
    private $route: ng.route.IRouteService,
    private $uibModal: ng.ui.bootstrap.IModalService,
  ) {
    if (process.versions.electron) {
      this.app = remote.app;
      this.win = remote.getCurrentWindow();
      this.powerSaveBlocker = remote.powerSaveBlocker;
      this.dataPath = this.app.getPath('userData');
    }
  }

  public window(): Electron.BrowserWindow {
    return this.win;
  }

  public saveLocalStorage(key: string, value: any): void {
    if (angular.isObject(value)) {
      this.$window.localStorage.setItem(key, angular.toJson(value));
    } else {
      this.$window.localStorage.setItem(key, value);
    }
  }

  public loadLocalStorage(key: string): any {
    let value: any;
    try {
      value = angular.fromJson(this.$window.localStorage.getItem(key));
    } catch (e) {
      value = this.$window.localStorage.getItem(key);
    }
    return value;
  }

  public removeLocalStorage(key: string): void {
    this.$window.localStorage.removeItem(key);
  }

  public saveSessionStorage(key: string, value: any): void {
    if (angular.isObject(value)) {
      this.$window.sessionStorage.setItem(key, angular.toJson(value));
    } else {
      this.$window.sessionStorage.setItem(key, value);
    }
  }

  public loadSessionStorage(key: string): any {
    let value: any;

    try {
      value = angular.fromJson(this.$window.sessionStorage.getItem(key));
    } catch (e) {
      value = this.$window.sessionStorage.getItem(key);
    }
    return value;
  }

  public removeSessionStorage(key: string): void {
    this.$window.sessionStorage.removeItem(key);
  }

  public saveFile(dirname: string, filename: string, value: any): boolean {
    const dirpath: string = path.resolve(this.dataPath, dirname);
    const filepath: string = path.join(this.dataPath, dirname, filename);
    let data: string;
    if (angular.isObject(value)) {
      data = angular.toJson(value);
    } else {
      data = value;
    }
    try {
      fs.mkdirSync(dirpath);
    } catch (e) {
      if (e.code !== 'EEXIST') {
        return false;
      }
    }
    try {
      fs.writeFileSync(filepath, data);
    } catch (e) {
      return false;
    }
    return true;
  }

  public loadFile(dirname: string, filename: string): any {
    const filepath: string = path.join(this.dataPath, dirname, filename);
    let data: string;
    let value: any;

    try {
      data = fs.readFileSync(filepath, 'utf8');
    } catch (e) {
      return null;
    }
    try {
      value = angular.fromJson(data);
    } catch (e) {
      value = data;
    }
    return value;
  }

  public removeFile(dirname: string, filename: string): boolean {
    const filepath: string = path.join(this.dataPath, dirname, filename);
    try {
      fs.unlinkSync(filepath);
      return true;
    } catch (e) {
      return false;
    }
  }

  public isFullscreen(): boolean {
    return this.win.isFullScreen();

  }

  public setFullscreen(flag: boolean): void {
    this.win.setFullScreen(Boolean(flag));
  }

  public isAlwaysOnTop(): boolean {
    return this.win.isAlwaysOnTop();
  }

  public setAlwaysOnTop(flag: boolean): void {
    this.win.setAlwaysOnTop(Boolean(flag));
  }

  public isMaximized(): boolean {
    return this.win.isMaximized();

  }
  public maximize(): void {
    this.win.maximize();

  }

  public isMinimized(): boolean {
    return this.win.isMinimized();
  }

  public minimize(): void {
    this.win.minimize();

  }

  public restore(): void {
    this.win.restore();
  }

  public isPowerSave(): boolean {
    return !(
      angular.isDefined(this.powerSaveBlockerId) &&
      this.powerSaveBlocker.isStarted(this.powerSaveBlockerId)
    );
  }

  public setPowerSave(flag: boolean): void {
    if (
      angular.isDefined(flag) &&
      flag !== this.isPowerSave()
    ) {
      if (flag) {
        this.powerSaveBlocker.stop(this.powerSaveBlockerId);
      } else {
        this.powerSaveBlockerId = this.powerSaveBlocker.start('prevent-display-sleep');
      }
    }
  }

  public quitModal(): void {
    if (!this.quitModalInstance) {
      this.quitModalInstance = this.$uibModal.open({
        component: 'quitModal',
        size: 'sm',
        windowClass: 'modal-container',
      });
      this.quitModalInstance.closed.then((): void => {
        this.quitModalInstance = null;
      });
    }
  }
  public close(): void {
    this.win.close();
  }

  public reload(): void {
    this.win.reload();
  }

  public back(): void {
    this.$window.history.back();
  }

  public quit(): void {
    this.app.quit();
  }

  public formatTime(time: number): string {
    const sign: string = time >= 0 ? '' : '-';
    const h: string = String(Math.floor(Math.abs(time) / 3600000));
    const m: string = String(Math.floor((Math.abs(time) % 3600000) / 60000) + 100)
      .slice(-2);
    const s: string = String(Math.floor((Math.abs(time) % 60000) / 1000) + 100)
      .slice(-2);

    return `${sign}${((parseInt(h, 10) > 0) ? [h, m, s] : [m, s]).join(':')}`;
  }

  public convertHour(time: number | Date, format?: string): number {
    const hour: number = new Date(time).getHours();
    const savedFormat: string = this.loadLocalStorage('hourFormat') || '';
    const hourFormat: string = angular.isDefined(format) ? format : savedFormat;
    const formatArray: string[] = hourFormat.split(':');
    let start: number = (
      angular.isNumber(this.loadLocalStorage('hourFirst')) ?
        parseInt(this.loadLocalStorage('hourFirst'), 10) : 4
    );
    let limit: number = 24;

    if (formatArray.length === 2) {
      start = !isNaN(formatArray[0] as any) ? parseInt(formatArray[0], 10) : start;
      limit = !isNaN(formatArray[1] as any) ? parseInt(formatArray[1], 10) : limit;
    }
    return (((hour + limit) - start) % limit) + start;
  }

  public formatDate(time: number, format: string, hourFormat?: string): string {
    const hour: number = this.convertHour(time, hourFormat);
    const savedHourFormat: string = this.loadLocalStorage('hourFormat') || '';
    const useMarker: boolean = /12$/.test(
      angular.isString(hourFormat) ? hourFormat : savedHourFormat,
    );
    const convertedFormat: string = format.replace(
      'HHHH', String(100 + hour).slice(1),
    ).replace(
      'HHH', String(hour),
    ).replace(
      'A', useMarker ? 'a' : '',
    );

    return this.$filter('date')(time, convertedFormat);
  }

  public errorModal(
    title: string,
    message: string,
    callback?: (value: any) => any,
  ): void {
    const modal: ng.ui.bootstrap.IModalInstanceService = this.$uibModal.open({
      component: 'errorModal',
      size: 'sm',
      windowClass: 'modal-container',
      resolve: {
        title: (): string => title,
        message: (): string => message,
      },
    });
    modal.closed.then(callback);
  }

  public progressModal(title: string, message: string): ng.ui.bootstrap.IModalServiceInstance {
    return this.$uibModal.open({
      backdrop: 'static',
      component: 'progressModal',
      windowClass: 'modal-container',
      resolve: {
        title: (): string => title,
        message: (): string => message,
      },
    });
  }

  public openViewSetting(): ng.ui.bootstrap.IModalServiceInstance {
    return this.$uibModal.open({
      component: 'ViewSetting',
      windowClass: 'modal-container',
    });

  }

  public openBackendSetting(): ng.ui.bootstrap.IModalServiceInstance {
    return this.$uibModal.open({
      component: 'backendSetting',
      windowClass: 'modal-container',
    });

  }

  public openMoritapoSetting(): ng.ui.bootstrap.IModalServiceInstance {
    return this.$uibModal.open({
      component: 'moritapoSetting',
      windowClass: 'modal-container',
    });
  }
}

angular.module('app')
  .service('CommonService', CommonService);
