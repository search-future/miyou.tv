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

class moritapoSettingController {
  static componentName: string = 'moritapoSetting';
  static $inject: string[] = [
    'CommonService',
  ];

  public email: string = '';
  public password: string = '';
  public hasToken: boolean = false;
  public hasAuthError: boolean = false;
  public close: () => void;
  public dismiss: () => void;

  constructor(
    private CommonService: CommonService.CommonService,
  ) {
  }

  public $onInit(): void {
    this.email = this.CommonService.loadLocalStorage('moritapoEmail');
    this.password = this.CommonService.loadLocalStorage('moritapoPassword');
  }

  public open(url: string): void {
    this.CommonService.openExternal(url);
  }

  public ok(): void {
    this.CommonService.saveLocalStorage('moritapoEmail', this.email || '');
    this.CommonService.saveLocalStorage('moritapoPassword', this.password || '');
    this.close();
  }

  public cancel(): void {
    this.dismiss();
  }
}

angular.module('app')
  .component('moritapoSetting', {
    templateUrl: 'templates/moritapoSetting.html',
    controller: moritapoSettingController,
    bindings: {
      close: '&',
      dismiss: '&',
    },
  });
