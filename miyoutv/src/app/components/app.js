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
    toaster,
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
    $ctrl.toasterOptions = {
      'time-out': {
        'toast-info': 5000,
        'toast-wait': 0,
        'toast-success': 5000,
        'toast-error': 0,
        'toast-warning': 10000
      },
      'close-button': true,
      limit: 5,
      'position-class': 'toast-top-right'
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
          toaster.pop(
            'info',
            'MiyouTV Agent',
            'データを取得できませんでした。録画情報を使用します。'
          );
        } else {
          chinachuErrorHandler();
        }
      });
    });

    $scope.$watch(function () {
      return ChinachuService.getUrl();
    }, function () {
      ChinachuService.request('/api/status.json').then(function (response) {
        var status;
        if (
          angular.isObject(response) &&
          angular.isObject(response.data) &&
          angular.isObject(response.data.feature)
        ) {
          status = response.data;
          if (angular.isObject(status) && angular.isObject(status.feature)) {
            if (!status.feature.previewer) {
              toaster.pop({
                type: 'warning',
                title: 'Chinachu config error',
                body: 'Chinachuのプレビューが無効です。プレビューを表示できません。'
              });
            }
            if (!status.feature.streamer) {
              toaster.pop({
                type: 'error',
                title: 'Chinachu config error',
                body: 'Chinachuのストリーム再生が無効です。録画を再生できません。'
              });
            }
          }
        } else {
          CommonService.errorModal(
            'Chinachu request error',
            'Chinachuのステータスを確認できませんでした。設定を確認してください。',
            function () {
              CommonService.openChinachuSetting();
            }
          );
        }
      }, function () {
        CommonService.errorModal(
          'Chinachu request error',
          'Chinachuに接続できませんでした。設定を確認してください。',
          function () {
            CommonService.openChinachuSetting();
          }
        );
      });
    });

    $scope.$watch(function () {
      return CommonService.loadLocalStorage('backendReloadInterval');
    }, function (value) {
      var time = angular.isNumber(value) ? value : 300000;
      if (time > 0) {
        if (timer) {
          $interval.cancel(timer);
        }
        timer = $interval(function () {
          ChinachuService.load().catch(chinachuErrorHandler);
        }, time);
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
