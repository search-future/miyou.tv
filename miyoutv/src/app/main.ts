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
import { remote } from 'electron';
import * as path from 'path';
import * as CommonService from './services/CommonService';

declare module angular { }

declare module NodeJS {
  interface Global {
    module: {
      paths: string[];
    };
  }
}
declare const global: NodeJS.Global;

interface CategoryName {
  name: string;
  localeName: string;
}

interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
}

global.module.paths.push(path.join(remote.app.getPath('exe'), '../node_modules'));

const garaponAuthUrl: string = 'http://garagw.garapon.info';
const garaponAuthUrlV4: string = process.env.GARAPON_AUTHV4;
const garaponSiteUrl: string = process.env.GARAPON_SITE;
const garaponDevId: string = process.env.GARAPON_DEVID;
const commentUrl: string = 'https://miteru.digitiminimi.com/a2sc.php/miyou';
const commentTokenUrl: string = 'https://miteru.digitiminimi.com/a2sc.php/auth/moritapo';

const categoryTable: CategoryName[] = [{
  name: 'news',
  localeName: 'ニュース/報道',
}, {
  name: 'sports',
  localeName: 'スポーツ',
}, {
  name: 'information',
  localeName: '情報/ワイドショー',
}, {
  name: 'drama',
  localeName: 'ドラマ',
}, {
  name: 'music',
  localeName: '音楽',
}, {
  name: 'variety',
  localeName: 'バラエティ',
}, {
  name: 'cinema',
  localeName: '映画',
}, {
  name: 'anime',
  localeName: 'アニメ/特撮',
}, {
  name: 'documentary',
  localeName: 'ドキュメンタリー/教養',
}, {
  name: 'theater',
  localeName: '劇場/公演',
}, {
  name: 'hobby',
  localeName: '趣味/教育',
}, {
  name: 'welfare',
  localeName: '福祉',
}, {
  name: 'etc',
  localeName: 'その他',
}, {
  name: 'etc',
  localeName: 'その他',
}, {
  name: 'etc',
  localeName: 'その他',
}, {
  name: 'etc',
  localeName: 'その他',
}];

const playerRateLimit: number = 4;

function injector(object: any): any {
  return (): any => object;
}

config.$inject = ['$routeProvider', '$httpProvider'];
function config(
  $routeProvider: ng.route.IRouteProvider,
  $httpProvider: ng.IHttpProvider,
): void {
  $httpProvider.useApplyAsync(true);
  $routeProvider
    .when('/programs', {
      template: '<programs></programs>',
      reloadOnSearch: false,
      resolve: {
        name: injector('programs'),
      },
    })
    .when('/list', {
      template: '<list></list>',
      reloadOnSearch: false,
      resolve: {
        name: injector('list'),
      },
    })
    .when('/setting', {
      template: '<setting></setting>',
      reloadOnSearch: false,
      resolve: {
        name: injector('setting'),
      },
    })
    .when('/player', {
      template: '<player></player>',
      reloadOnSearch: false,
      resolve: {
        name: injector('player'),
      },
    })
    .otherwise({
      redirectTo: '/programs',
    });
}

run.$inject = ['$window', '$timeout', 'CommonService'];
function run(
  $window: ng.IWindowService,
  $timeout: ng.ITimeoutService,
  CommonService: CommonService.CommonService,
): void {
  const chinachuSetting: {
    url: string;
    user: string;
    password: string;
  } = CommonService.loadLocalStorage('chinachu');
  if (angular.isObject(chinachuSetting)) {
    CommonService.saveLocalStorage('chinachuUrl', chinachuSetting.url);
    CommonService.saveLocalStorage('chinachuUser', chinachuSetting.user);
    CommonService.saveLocalStorage('chinachuPassword', chinachuSetting.password);
    CommonService.removeLocalStorage('chinachu');
  }
  CommonService.removeLocalStorage('commentCache');
  CommonService.removeLocalStorage('commentCountCache');
  CommonService.removeLocalStorage('comment_token');
  CommonService.removeFile('comments', 'commentCache.json');

  angular.element($window).on('move', saveWindowState);
  angular.element($window).on('resize', saveWindowState);

  if (/^0/.test(process.versions.electron)) {
    angular.element($window).on('contextmenu', (e: JQuery.Event<HTMLElement>): void => {
      e.preventDefault();
      remote.getGlobal('contextMenu').popup();
    });
  }

  if (!CommonService.loadSessionStorage('isLoaded')) {
    loadWindowState();
  }
  CommonService.saveSessionStorage('isLoaded', true);

  function saveWindowState(): void {
    const windowState: WindowState = {
      x: $window.screenX,
      y: $window.screenY,
      width: $window.outerWidth,
      height: $window.outerHeight,
    };
    if (!(
      CommonService.isMinimized ||
      CommonService.isMaximized ||
      CommonService.fullscreen
    )) {
      CommonService.saveLocalStorage('windowState', windowState);
    }
  }

  function loadWindowState(): void {
    const windowState: WindowState = CommonService.loadLocalStorage('windowState') || {};
    $window.moveTo(windowState.x, windowState.y);
    $window.resizeTo(windowState.width, windowState.height);
    CommonService.alwaysOnTop = CommonService.loadLocalStorage('alwaysOnTop');
  }
}
angular.module('app', [
  'ngAnimate',
  'ngRoute',
  'ui.bootstrap',
  'ui.bootstrap.contextMenu',
  'agGrid',
  'cfp.hotkeys',
  'toaster',
  'angular-loading-bar',
  'angular-md5',
]).constant('garaponAuthUrl', garaponAuthUrl)
  .constant('garaponSiteUrl', garaponSiteUrl)
  .constant('garaponAuthUrlV4', garaponAuthUrlV4)
  .constant('garaponDevId', garaponDevId)
  .constant('commentUrl', commentUrl)
  .constant('commentTokenUrl', commentTokenUrl)
  .constant('categoryTable', categoryTable)
  .constant('playerRateLimit', playerRateLimit)
  .config(config)
  .run(run);
