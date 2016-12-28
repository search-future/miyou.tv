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
    .component('app', {
      templateUrl: 'templates/app.html',
      controller: AppCtrl
    });

  function AppCtrl(
    $scope,
    $location,
    $interval,
    CommonService,
    ChinachuService
  ) {
    var $ctrl = this;
    var timer = null;

    $ctrl.classes = {};
    $ctrl.hotkeys = {
      // f5: CommonService.reload,
      f11: CommonService.toggleFullscreen,
      'ctrl+w': CommonService.quitModal,
      esc: function () {
        if (CommonService.isFullscreen()) {
          CommonService.leaveFullscreen();
        } else {
          CommonService.quitModal();
        }
      }
    };

    $scope.$watch(function () {
      return CommonService.isFullscreen();
    }, function (value) {
      $ctrl.classes.fullscreen = value;
    });

    $scope.$watch(function () {
      return ChinachuService.getUrl();
    }, function () {
      var progressModal = CommonService.progressModal('Chinachuに接続中', 'Chinachuからデータを取得しています。');
      ChinachuService.load(true).then(function () {
        progressModal.close();
      }, function (responce) {
        progressModal.close();
        if (responce.status === 404 && /archive\.json$/.test(responce.config.url)) {
          CommonService.errorModal(
            'MiyouTV Agent error',
            '番組表を取得できませんでした。番組表は使用できません。'
          );
        } else {
          chinachuErrorHandler();
        }
      });
    });

    $scope.$watch(function () {
      return ChinachuService.reloadInterval();
    }, function (value) {
      if (timer) {
        $interval.cancel(timer);
      }
      if (value > 0) {
        timer = $interval(function () {
          ChinachuService.load().catch(chinachuErrorHandler);
        }, value);
      }
    });

    function chinachuErrorHandler() {
      if (Object.keys(ChinachuService.status).length === 0) {
        CommonService.errorModal(
          'Chinachu request error',
          'Chinachuに接続できませんでした。設定を確認してください。',
          function () {
            CommonService.openChinachuSetting();
          }
        );
      }
    }
  }
}());
