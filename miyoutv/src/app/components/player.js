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
    .component('player', {
      templateUrl: 'templates/player.html',
      controller: PlayerCtrl
    });

  function PlayerCtrl(
    $scope,
    $element,
    $location,
    toaster,
    CommonService,
    PlayerService,
    ChinachuPlayerService,
    CommentService
  ) {
    var $ctrl = this;

    $ctrl.mode = 'recorded';
    $ctrl.title = '';
    $ctrl.time = 0;
    $ctrl.commentEnabled = true;
    $ctrl.commentOptions = {};
    $ctrl.sidebarCollapsed = Boolean(CommonService.loadLocalStorage('sidebarCollapsed'));
    $ctrl.mainHotkeys = {
      s: CommonService.back,
      space: PlayerService.togglePause,
      '=': PlayerService.normalSpeed,
      '-': PlayerService.speedDown,
      '+': PlayerService.speedUp,
      f: CommonService.toggleFullscreen,
      b: PlayerService.toggleAudioTrack,
      v: PlayerService.toggleSubtitlesTrack,
      m: PlayerService.toggleMute,
      'ctrl+up': function () {
        PlayerService.increaseVolume(5);
      },
      'ctrl+down': function () {
        PlayerService.decreaseVolume(5);
      },
      'ctrl+left': function () {
        PlayerService.jumpBackward('11s');
      },
      'ctrl+right': function () {
        PlayerService.jumpForward('29s');
      },
      'shift+left': function () {
        CommentService.decreaseDelay(500);
      },
      'shift+right': function () {
        CommentService.increaseDelay(500);
      },
      'ctrl+s': function () {
        CommonService.trigger('toggleSidebar');
      }
    };
    $ctrl.toggleFullscreen = CommonService.toggleFullscreen;
    $ctrl.stop = PlayerService.stop;

    $scope.$watch(function () {
      return CommonService.triggered('toggleSidebar');
    }, function (value) {
      if (value) {
        $ctrl.sidebarCollapsed = !$ctrl.sidebarCollapsed;
      }
    });
    $scope.$watch(function () {
      return $ctrl.sidebarCollapsed;
    }, function (value) {
      CommonService.saveLocalStorage('sidebarCollapsed', Boolean(value));
    });
    $scope.$watch(function () {
      return PlayerService.time();
    }, function (value) {
      $ctrl.time = value;
    });
    $scope.$watch(function () {
      return ChinachuPlayerService.program;
    }, function (value) {
      $ctrl.comments = [];
      if (value) {
        $ctrl.title = value.fullTitle;
        $ctrl.channel = value.channel.name;
        PlayerService.setScreenText([
          value.id,
          value.fullTitle,
          value.channel.name,
          new Date(value.start).toLocaleString()
        ].join('\n'));
        CommentService.load(value.start, value.end, value.channel).catch(function (responce) {
          if (responce.noToken) {
            toaster.pop({
              type: 'warning',
              body: 'コメントを表示するにはモリタポアカウントを認証してください。'
            });
          } else if (responce.data) {
            switch (responce.data.EC) {
              case 403:
                toaster.pop({
                  type: 'warning',
                  body: 'コメントサーバーの認証に失敗しました。モリタポアカウントの認証をやり直してください。'
                });
                break;
              default:
                toaster.pop({
                  type: 'error',
                  body: 'コメントの取得に失敗しました。'
                });
            }
          } else {
            toaster.pop({
              type: 'error',
              body: 'コメントサーバーへの接続に失敗しました。'
            });
          }
        });
      }
    });
    $scope.$watch(function () {
      return CommentService.data();
    }, function (value) {
      var info;

      if (value.status === 'OK') {
        info = CommentService.info();
        PlayerService.setScreenText([
          ChinachuPlayerService.program.id,
          ChinachuPlayerService.program.fullTitle,
          ChinachuPlayerService.program.channel.name,
          new Date(ChinachuPlayerService.program.start).toLocaleString(),
          'コメント取得完了',
          '検索チャンネル: ' + info.query,
          '取得開始: ' + new Date(info.start).toLocaleString(),
          '取得終了: ' + new Date(info.end).toLocaleString(),
          'コメント数: ' + (value.data ? value.data.length : 0)
        ].join('\n'));
      }
    });
    $scope.$watch(function () {
      return CommentService.enabled();
    }, function (value) {
      $ctrl.commentEnabled = value;
      if (value) {
        PlayerService.setScreenText('コメント表示');
      } else {
        PlayerService.setScreenText('コメント非表示');
      }
    });
    $scope.$watch(function () {
      return CommentService.delay();
    }, function (value) {
      if (value >= 0) {
        PlayerService.setScreenText('コメント後退 ' + Math.abs(value / 1000) + '秒');
      } else {
        PlayerService.setScreenText('コメント前進 ' + Math.abs(value / 1000) + '秒');
      }
    });

    $scope.$on('Player.EncounteredError', function () {
      PlayerService.stop();
    });
    $scope.$on('Player.Stopped', function () {
      CommonService.back();
    });
    $scope.$on('Player.Ready', function () {
      var params = $location.search();
      $ctrl.mode = params.mode;
      switch (params.mode) {
        case 'recorded':
          ChinachuPlayerService.playRecorded(params.id);
          break;
        case 'channel':
          ChinachuPlayerService.channelStart(
            params.type,
            parseInt(params.sid, 10),
            parseInt(params.start, 10),
            parseInt(params.end, 10)
          );
          $ctrl.mainHotkeys.p = ChinachuPlayerService.channelPrevious;
          $ctrl.mainHotkeys.n = ChinachuPlayerService.channelNext;
          break;
        default:
      }
    });
  }
}());
