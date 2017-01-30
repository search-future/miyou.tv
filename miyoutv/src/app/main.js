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
var path = require('path');
var execDir = path.dirname(process.execPath);
var modulePath = path.join(execDir, 'node_modules');
global.module.paths.push(modulePath);

(function () {
  'use strict';

  var commentUrl = 'https://miteru.digitiminimi.com/a2sc.php/miyou';
  var commentTokenUrl = 'https://miteru.digitiminimi.com/a2sc.php/auth/moritapo';
  var channelTable = {
    GR_1024: 'NHK総合',
    GR_1032: 'NHKEテレ',
    GR_1040: '日テレ',
    GR_1048: 'TBS',
    GR_1056: 'フジテレビ',
    GR_1064: 'テレビ朝日',
    GR_1072: 'テレビ東京',
    GR_23608: 'TOKYO MX1',
    GR_23610: 'TOKYO MX2',
    GR_24632: 'tvk',
    GR_24656: '群馬テレビ',
    GR_27704: 'チバテレ',
    GR_28728: 'とちぎテレビ',
    GR_29752: 'テレ玉',
    BS_101: 'NHKBS1',
    BS_103: 'NHKBSプレミアム',
    BS_141: 'BS日テレ',
    BS_151: 'BS朝日',
    BS_161: 'BS-TBS',
    BS_171: 'BSジャパン',
    BS_181: 'BSフジ',
    BS_191: 'WOWOWプライム',
    BS_192: 'WOWOWライブ',
    BS_193: 'WOWOWシネマ',
    BS_200: 'スターチャンネル',
    BS_201: 'スターチャンネル',
    BS_202: 'スターチャンネル',
    BS_211: 'BS11イレブン',
    BS_222: 'BS12トゥエルビ',
    BS_231: '放送大学',
    BS_232: '放送大学',
    BS_233: '放送大学',
    BS_236: 'BSアニマックス',
    BS_238: 'FOXスポーツエンタ',
    BS_241: 'BSスカパー',
    BS_252: 'イマジカBS',
    BS_255: 'BS日本映画専門',
    BS_256: 'ディズニーチャンネル',
    BS_258: 'ディーライフ'
  };
  var categoryTable = [{
    name: 'news',
    localeName: 'ニュース/報道'
  }, {
    name: 'sports',
    localeName: 'スポーツ'
  }, {
    name: 'information',
    localeName: '情報/ワイドショー'
  }, {
    name: 'drama',
    localeName: 'ドラマ'
  }, {
    name: 'music',
    localeName: '音楽'
  }, {
    name: 'variety',
    localeName: 'バラエティ'
  }, {
    name: 'cinema',
    localeName: '映画'
  }, {
    name: 'anime',
    localeName: 'アニメ/特撮'
  }, {
    name: 'documentary',
    localeName: 'ドキュメンタリー/教養'
  }, {
    name: 'theater',
    localeName: '劇場/公演'
  }, {
    name: 'hobby',
    localeName: '趣味/教育'
  }, {
    name: 'welfare',
    localeName: '福祉'
  }, {
    name: 'etc',
    localeName: 'その他'
  }, {
    name: 'etc',
    localeName: 'その他'
  }, {
    name: 'etc',
    localeName: 'その他'
  }, {
    name: 'etc',
    localeName: 'その他'
  }];

  var playerRateLimit = 4;

  agGrid.initialiseAgGridWithAngular1(angular);

  function injector(object) {
    return function () {
      return object;
    };
  }

  function config($routeProvider) {
    $routeProvider
      .when('/programs', {
        template: '<programs></programs>',
        reloadOnSearch: false,
        resolve: {
          name: injector('programs')
        }
      })
      .when('/programs/search', {
        template: '<program-search></program-search>',
        reloadOnSearch: false,
        resolve: {
          name: injector('programs')
        }
      })
      .when('/recorded', {
        template: '<recorded></recorded>',
        reloadOnSearch: false,
        resolve: {
          name: injector('recorded')
        }
      })
      .when('/setting', {
        template: '<setting></setting>',
        reloadOnSearch: false,
        resolve: {
          name: injector('setting')
        }
      })
      .when('/:mode/player/:id', {
        template: '<player></player>',
        reloadOnSearch: false,
        resolve: {
          name: injector('player')
        }
      })
      .when('/:mode/player/:type/:sid/:start*-:end?', {
        template: '<player></player>',
        reloadOnSearch: false,
        resolve: {
          name: injector('player')
        }
      })
      .otherwise({
        redirectTo: '/programs'
      });
  }

  function run($window, $timeout, CommonService) {
    var win = CommonService.window();

    angular.element($window).on('move', saveWindowState);
    angular.element($window).on('resize', saveWindowState);

    if (process.versions.nw || process.versions['node-webkit']) {
      win.on('close', function () {
        win.restore();
        $timeout(function () {
          saveWindowState();
          win.close(true);
        });
      });
    }

    win.show();
    loadWindowState();

    function saveWindowState() {
      var windowState = {
        x: $window.screenX,
        y: $window.screenY,
        width: $window.outerWidth,
        height: $window.outerHeight
      };
      if (process.versions.nw || process.versions['node-webkit'] || !(win.isMinimized() || win.isMaximized() || win.isFullScreen())) {
        CommonService.saveLocalStorage('windowState', windowState);
      }
    }

    function loadWindowState() {
      var windowState = CommonService.loadLocalStorage('windowState') || {};
      $window.moveTo(windowState.x, windowState.y);
      $window.resizeTo(windowState.width, windowState.height);
    }
  }
  angular.module('app', ['ngAnimate', 'ngRoute', 'ui.bootstrap', 'agGrid', 'cfp.hotkeys'])
    .constant('commentUrl', commentUrl)
    .constant('commentTokenUrl', commentTokenUrl)
    .constant('channelTable', channelTable)
    .constant('categoryTable', categoryTable)
    .constant('playerRateLimit', playerRateLimit)
    .config(config)
    .run(run);
}());
