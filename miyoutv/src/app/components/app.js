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
(function () {
  'use strict';

  angular.module('app')
    .component('app', {
      templateUrl: 'templates/app.html',
      controller: AppCtrl
    });

  function AppCtrl(
    $scope,
    toaster,
    CommonService,
    ChinachuService,
    CommentService,
    garaponDevId
  ) {
    var $ctrl = this;

    $ctrl.classes = {};
    $ctrl.hotkeys = {
      // f5: CommonService.reload,
      f11: CommonService.toggleFullscreen,
      'mod+w': CommonService.quitModal,
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
      return garaponDevId;
    }, function (value) {
      if (!value) {
        CommonService.saveLocalStorage('backendType', 'chinachu');
      }
    });

    $scope.$watch(function () {
      return CommonService.isFullscreen();
    }, function (value) {
      $ctrl.classes.fullscreen = value;
    });

    $scope.$watchGroup([function () {
      return CommonService.loadLocalStorage('moritapoEmail');
    }, function () {
      return CommonService.loadLocalStorage('moritapoPassword');
    }], function (values) {
      var email = values[0] || '';
      var password = values[1] || '';
      if (email && password) {
        CommentService.requestToken(email, password).catch(function (response) {
          if (response.status === 200) {
            switch (response.data.EC) {
              case 401:
                CommonService.errorModal(
                  'Moritapo Auth error',
                  'モリタポアカウントの認証に失敗しました。設定を確認してください。',
                  function () {
                    CommonService.openMoritapoSetting();
                  }
                );
                break;
              default:
            }
          } else if (response.status >= 400) {
            toaster.pop({
              type: 'error',
              title: 'HTTP error',
              body: [response.config.url, ' ', response.statusText, '(', response.status, ')'].join('')
            });
          } else if (response.status < 0) {
            toaster.pop({
              type: 'error',
              title: 'Connection error',
              body: [response.config.url, ' ', 'Connection failure'].join('')
            });
          }
        });
      } else {
        toaster.pop({
          type: 'warning',
          title: 'Comment error',
          body: 'コメントを表示するにはモリタポアカウントが必要です。モリタポアカウントを設定してください。'
        });
      }
    });
    $scope.$watchGroup([function () {
      return CommonService.loadLocalStorage('backendType');
    }, function () {
      return CommonService.loadLocalStorage('chinachuUrl');
    }, function () {
      return CommonService.loadLocalStorage('chinachuUser');
    }, function () {
      return CommonService.loadLocalStorage('chinachuPassword');
    }], function (values) {
      var backendType = values[0];
      var url = values[1];
      var user = values[2];
      var password = values[3];
      if (backendType === 'chinachu') {
        ChinachuService.url(url);
        ChinachuService.user(user);
        ChinachuService.password(password);
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
                CommonService.openBackendSetting();
              }
            );
          }
        }, function () {
          CommonService.errorModal(
            'Chinachu request error',
            'バックエンドに接続できませんでした。設定を確認してください。',
            function () {
              CommonService.openBackendSetting();
            }
          );
        });
      }
    });
  }
}());
