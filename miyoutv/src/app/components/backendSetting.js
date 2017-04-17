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
    $scope,
    ChinachuService
  ) {
    var $ctrl = this;
    $ctrl.chinachuUrl = '';
    $ctrl.chinachuUser = '';
    $ctrl.chinachuPassword = '';
    $ctrl.chinachuAuth = false;

    $ctrl.ok = function () {
      ChinachuService.url($ctrl.chinachuUrl);
      ChinachuService.user($ctrl.chinachuAuth ? $ctrl.chinachuUser : '');
      ChinachuService.password($ctrl.chinachuAuth ? $ctrl.chinachuPassword : '');
      $ctrl.close();
    };
    $ctrl.cancel = function () {
      $ctrl.dismiss();
    };

    $scope.$watch(function () {
      return ChinachuService.url();
    }, function (value) {
      $ctrl.chinachuUrl = value;
    });
    $scope.$watch(function () {
      return ChinachuService.user();
    }, function (value) {
      if (value) {
        $ctrl.chinachuAuth = true;
      }
      $ctrl.chinachuUser = value;
    });
    $scope.$watch(function () {
      return ChinachuService.password();
    }, function (value) {
      if (value) {
        $ctrl.chinachuAuth = true;
      }
      $ctrl.chinachuPassword = value;
    });
  }
}());
