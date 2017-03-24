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
    .component('moritapoSetting', {
      templateUrl: 'templates/moritapoSetting.html',
      controller: moritapoSettingCtrl,
      bindings: {
        close: '&',
        reject: '&'
      }
    });

  function moritapoSettingCtrl(
    $scope,
    CommentService
  ) {
    var $ctrl = this;
    $ctrl.hasToken = false;
    $ctrl.email = '';
    $ctrl.password = '';
    $ctrl.hasAuthError = false;

    $ctrl.requestToken = function () {
      CommentService.requestToken($ctrl.email, $ctrl.password).then(function () {
        $ctrl.hasAuthError = false;
      }, function (response) {
        switch (response.data.EC) {
          case 401:
            $ctrl.hasAuthError = true;
            break;
          default:
        }
      });
    };
    $ctrl.deleteToken = function () {
      CommentService.deleteToken();
    };
    $ctrl.ok = function () {
      $ctrl.close();
    };
    $ctrl.cancel = function () {
      $ctrl.reject();
    };

    $scope.$watch(function () {
      return CommentService.token();
    }, function (value) {
      $ctrl.hasToken = Boolean(value);
    });
  }
}());
