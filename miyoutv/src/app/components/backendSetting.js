/*
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
(function () {
  'use strict';

  angular.module('app')
    .component('backendSetting', {
      templateUrl: 'templates/backendSetting.html',
      controller: BackendSettingCtrl,
      bindings: {
        close: '&',
        dismiss: '&'
      }
    });

  function BackendSettingCtrl(
    CommonService,
    garaponDevId
  ) {
    var $ctrl = this;
    $ctrl.backendType = 'chinachu';
    $ctrl.garaponEnabled = false;
    $ctrl.chinachuUrl = '';
    $ctrl.chinachuUser = '';
    $ctrl.chinachuPassword = '';
    $ctrl.chinachuAuth = false;
    $ctrl.garaponAuth = true;
    $ctrl.garaponUrl = '';
    $ctrl.garaponUser = '';
    $ctrl.garaponPassword = '';

    $ctrl.$onInit = function () {
      $ctrl.garaponEnabled = !!garaponDevId;
      $ctrl.backendType = CommonService.loadLocalStorage('backendType') || 'chinachu';
      $ctrl.chinachuUrl = CommonService.loadLocalStorage('chinachuUrl');
      $ctrl.chinachuUser = CommonService.loadLocalStorage('chinachuUser');
      $ctrl.chinachuPassword = CommonService.loadLocalStorage('chinachuPassword');
      if ($ctrl.chinachuUser || $ctrl.chinachuPassword) {
        $ctrl.chinachuAuth = true;
      }

      $ctrl.garaponAuth = CommonService.loadLocalStorage('garaponAuth');
      $ctrl.garaponUrl = CommonService.loadLocalStorage('garaponUrl') || '';
      $ctrl.garaponUser = CommonService.loadLocalStorage('garaponUser') || '';
      $ctrl.garaponPassword = CommonService.loadLocalStorage('garaponPassword') || '';
      if (typeof $ctrl.garaponAuth !== 'boolean') {
        $ctrl.garaponAuth = true;
      }
    };
    $ctrl.ok = function () {
      CommonService.saveLocalStorage('backendType', $ctrl.backendType);
      if ($ctrl.backendType === 'chinachu') {
        CommonService.saveLocalStorage('chinachuUrl', $ctrl.chinachuUrl);
        CommonService.saveLocalStorage('chinachuUser', $ctrl.chinachuAuth ? $ctrl.chinachuUser : '');
        CommonService.saveLocalStorage('chinachuPassword', $ctrl.chinachuAuth ? $ctrl.chinachuPassword : '');
      }
      if ($ctrl.backendType === 'garapon') {
        CommonService.saveLocalStorage('garaponAuth', $ctrl.garaponAuth);
        CommonService.saveLocalStorage('garaponUrl', $ctrl.garaponAuth ? '' : $ctrl.garaponUrl);
        CommonService.saveLocalStorage('garaponUser', $ctrl.garaponUser);
        CommonService.saveLocalStorage('garaponPassword', $ctrl.garaponPassword);
      }
      $ctrl.close();
    };
    $ctrl.cancel = function () {
      $ctrl.dismiss();
    };
  }
}());
