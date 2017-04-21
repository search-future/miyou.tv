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

  var garaponAuthUrl = 'http://garagw.garapon.info';
  var garaponDevId = '';
  var commentUrl = 'https://miteru.digitiminimi.com/a2sc.php/miyou';
  var commentTokenUrl = 'https://miteru.digitiminimi.com/a2sc.php/auth/moritapo';

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

  function config($routeProvider, $httpProvider) {
    $httpProvider.useApplyAsync(true);
    $routeProvider
      .when('/programs', {
        template: '<programs></programs>',
        reloadOnSearch: false,
        resolve: {
          name: injector('programs')
        }
      })
      .when('/list', {
        template: '<list></list>',
        reloadOnSearch: false,
        resolve: {
          name: injector('list')
        }
      })
      .when('/setting', {
        template: '<setting></setting>',
        reloadOnSearch: false,
        resolve: {
          name: injector('setting')
        }
      })
      .when('/player', {
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
    var chinachuSetting = CommonService.loadLocalStorage('chinachu');
    if (angular.isObject(chinachuSetting)) {
      CommonService.saveLocalStorage('chinachuUrl', chinachuSetting.url);
      CommonService.saveLocalStorage('chinachuUser', chinachuSetting.user);
      CommonService.saveLocalStorage('chinachuPassword', chinachuSetting.password);
      CommonService.removeLocalStorage('chinachu');
    }
    CommonService.removeLocalStorage('commentCache');
    CommonService.removeLocalStorage('commentCountCache');
    CommonService.removeFile('comments', 'commentCache.json');

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
  angular.module('app', ['ngAnimate', 'ngRoute', 'ui.bootstrap', 'agGrid', 'cfp.hotkeys', 'toaster', 'angular-loading-bar', 'angular-md5'])
    .constant('garaponAuthUrl', garaponAuthUrl)
    .constant('garaponDevId', garaponDevId)
    .constant('commentUrl', commentUrl)
    .constant('commentTokenUrl', commentTokenUrl)
    .constant('categoryTable', categoryTable)
    .constant('playerRateLimit', playerRateLimit)
    .config(config)
    .run(run);
}());
