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

class BackendSettingController {
  static componentName: string = 'backendSetting';
  static $inject: string[] = [
    'CommonService',
    'garaponDevId',
    'garaponEntryUrl',
  ];

  public backendType: string = 'chinachu';
  public garaponEnabled: boolean = false;
  public chinachuUrl: string = '';
  public chinachuUser: string = '';
  public chinachuPassword: string = '';
  public chinachuAuth: boolean = false;
  public garaponAuth: boolean = true;
  public garaponUrl: string = '';
  public garaponUser: string = '';
  public garaponPassword: string = '';
  public close: () => void;
  public dismiss: () => void;

  constructor(
    private CommonService: CommonService.CommonService,
    private garaponDevId: string,
    public garaponEntryUrl: string,
  ) {
  }

  public $onInit(): void {
    this.garaponEnabled = !!this.garaponDevId;
    this.backendType = this.CommonService.loadLocalStorage('backendType') || 'chinachu';
    this.chinachuUrl = this.CommonService.loadLocalStorage('chinachuUrl');
    this.chinachuUser = this.CommonService.loadLocalStorage('chinachuUser');
    this.chinachuPassword = this.CommonService.loadLocalStorage('chinachuPassword');
    if (this.chinachuUser || this.chinachuPassword) {
      this.chinachuAuth = true;
    }

    this.garaponAuth = this.CommonService.loadLocalStorage('garaponAuth');
    this.garaponUrl = this.CommonService.loadLocalStorage('garaponUrl') || '';
    this.garaponUser = this.CommonService.loadLocalStorage('garaponUser') || '';
    this.garaponPassword = this.CommonService.loadLocalStorage('garaponPassword') || '';
    if (typeof this.garaponAuth !== 'boolean') {
      this.garaponAuth = true;
    }
  }

  public open(url: string): void {
    this.CommonService.openExternal(url);
  }

  public ok(): void {
    this.CommonService.saveLocalStorage('backendType', this.backendType);
    if (this.backendType === 'chinachu') {
      this.CommonService.saveLocalStorage('chinachuUrl', this.chinachuUrl);
      this.CommonService.saveLocalStorage(
        'chinachuUser',
        this.chinachuAuth ? this.chinachuUser : '',
      );
      this.CommonService.saveLocalStorage(
        'chinachuPassword',
        this.chinachuAuth ? this.chinachuPassword : '',
      );
    }
    if (this.backendType === 'garapon') {
      this.CommonService.saveLocalStorage('garaponAuth', this.garaponAuth);
      this.CommonService.saveLocalStorage('garaponUrl', this.garaponAuth ? '' : this.garaponUrl);
      this.CommonService.saveLocalStorage('garaponUser', this.garaponUser);
      this.CommonService.saveLocalStorage('garaponPassword', this.garaponPassword);
    }
    if (this.backendType === 'garaponv4') {
      this.CommonService.saveLocalStorage('garaponUser', this.garaponUser);
      this.CommonService.saveLocalStorage('garaponPassword', this.garaponPassword);
    }
    this.close();
  }

  public cancel(): void {
    this.dismiss();
  }

}

angular.module('app')
  .component('backendSetting', {
    templateUrl: 'templates/backendSetting.html',
    controller: BackendSettingController,
    bindings: {
      close: '&',
      dismiss: '&',
    },
  });

