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
import * as ChinachuService from '../services/ChinachuService';
import * as CommentService from '../services/CommentService';

declare module angular { }

class AppController {
  static componentName: string = 'app';
  static $inject: string[] = [
    '$scope',
    'hotkeys',
    'toaster',
    'CommonService',
    'ChinachuService',
    'CommentService',
    'garaponDevId',
  ];

  public classes: { [key: string]: boolean } = {};
  public toasterOptions: toaster.IToasterConfig;

  constructor(
    private $scope: ng.IScope,
    private hotkeys: ng.hotkeys.HotkeysProvider,
    private toaster: toaster.IToasterService,
    private CommonService: CommonService.CommonService,
    private ChinachuService: ChinachuService.ChinachuService,
    private CommentService: CommentService.CommentService,
    private garaponDevId: string,
  ) {
    hotkeys.bindTo($scope).add({
      combo: 'mod+w',
      description: 'MiyouTVを終了',
      callback: (e: Event): void => {
        this.CommonService.quitModal();
        e.preventDefault();
      },
    }).add({
      combo: 'esc',
      description: '全画面表示解除/MiyouTVを終了',
      callback: (e: Event): void => {
        if (this.CommonService.fullscreen) {
          this.CommonService.fullscreen = false;
        } else {
          this.CommonService.quitModal();
        }
        e.preventDefault();
      },
    });
    hotkeys.get('?').description = 'このヘルプの表示/非表示';

    this.toasterOptions = {
      'time-out': {
        'toast-info': 5000,
        'toast-wait': 0,
        'toast-success': 5000,
        'toast-error': 0,
        'toast-warning': 10000,
      } as any,
      'close-button': true,
      limit: 5,
      'position-class': 'toast-top-right',
    };

    $scope.$watch(
      (): string => this.garaponDevId,
      (value: string): void => {
        if (!value) {
          this.CommonService.saveLocalStorage('backendType', 'chinachu');
        }
      },
    );
    $scope.$watch(
      (): boolean => CommonService.fullscreen,
      (value: boolean): void => {
        this.classes.fullscreen = value;
      },
    );
    $scope.$watch(
      (): boolean => CommonService.alwaysOnTop,
      (value: boolean): void => {
        CommonService.saveLocalStorage('alwaysOnTop', value);
      },
    );
    $scope.$watchGroup(
      [
        (): string => CommonService.loadLocalStorage('moritapoEmail'),
        (): string => CommonService.loadLocalStorage('moritapoPassword'),
      ],
      (values: string[]): void => {
        const [email = '', password = '']: string[] = values;
        if (email && password) {
          CommentService.requestToken(email, password).catch(
            (response: ng.IHttpPromiseCallbackArg<{ EC: number }>): void => {
              if (response.status === 200) {
                switch (response.data.EC) {
                  case 401:
                    CommonService.errorModal(
                      'Moritapo Auth error',
                      'モリタポアカウントの認証に失敗しました。設定を確認してください。',
                      (): void => {
                        CommonService.openMoritapoSetting();
                      },
                    );
                    break;
                  default:
                }
              } else if (response.status >= 400) {
                toaster.pop({
                  type: 'error',
                  title: 'HTTP error',
                  body: `${response.config.url} ${response.statusText}(${response.status})`,
                });
              } else if (response.status < 0) {
                toaster.pop({
                  type: 'error',
                  title: 'Connection error',
                  body: `${response.config.url} Connection failure`,
                });
              }
            },
          );
        } else {
          toaster.pop({
            type: 'warning',
            title: 'Comment error',
            body: 'コメントを表示するにはモリタポアカウントが必要です。モリタポアカウントを設定してください。',
          });
        }
      });
    $scope.$watchGroup(
      [
        (): string => CommonService.loadLocalStorage('backendType'),
        (): string => CommonService.loadLocalStorage('chinachuUrl'),
        (): string => CommonService.loadLocalStorage('chinachuUser'),
        (): string => CommonService.loadLocalStorage('chinachuPassword'),
      ],
      (values: string[]): void => {
        const [backendType, url, user, password]: string[] = values;
        if (backendType === 'chinachu') {
          ChinachuService.url = url;
          ChinachuService.user = user;
          ChinachuService.password = password;
          ChinachuService.request('/api/status.json').then(
            (response: ng.IHttpPromiseCallbackArg<{
              feature: { [key: string]: boolean };
            }>): void => {
              if (
                angular.isObject(response) &&
                angular.isObject(response.data) &&
                angular.isObject(response.data.feature)
              ) {
                const status: { feature: { [key: string]: boolean } } = response.data;
                if (angular.isObject(status) && angular.isObject(status.feature)) {
                  if (!status.feature.previewer) {
                    toaster.pop({
                      type: 'warning',
                      title: 'Chinachu config error',
                      body: 'Chinachuのプレビューが無効です。プレビューを表示できません。',
                    });
                  }
                  if (!status.feature.streamer) {
                    toaster.pop({
                      type: 'error',
                      title: 'Chinachu config error',
                      body: 'Chinachuのストリーム再生が無効です。録画を再生できません。',
                    });
                  }
                }
              } else {
                CommonService.errorModal(
                  'Chinachu request error',
                  'Chinachuのステータスを確認できませんでした。設定を確認してください。',
                  (): void => {
                    CommonService.openBackendSetting();
                  },
                );
              }
            },
            (): void => {
              CommonService.errorModal(
                'Chinachu request error',
                'バックエンドに接続できませんでした。設定を確認してください。',
                (): void => {
                  CommonService.openBackendSetting();
                },
              );
            });
        }
      },
    );
  }
}

angular.module('app')
  .component('app', {
    templateUrl: 'templates/app.html',
    controller: AppController,
  });
