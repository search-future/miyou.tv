/*!
Copyright 2017 Brazil Ltd.

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
import * as GaraponService from '../services/GaraponService';
import * as GaraponSiteService from '../services/GaraponSiteService';
import * as CommentService from '../services/CommentService';

declare module angular { }

interface Program {
  [key: string]: any;
}

interface CategoryName {
  name: string;
  localeName: string;
  checked: boolean;
}

interface Archive {
  channels: ChinachuService.Channel[];
  programs: Program[];
}

interface GaraponMessages {
  [key: string]: string;
}

class ListController {
  static componentName: string = 'list';
  static $inject: string[] = [
    '$scope',
    '$element',
    '$window',
    '$location',
    '$timeout',
    'toaster',
    'CommonService',
    'ChinachuService',
    'GaraponService',
    'GaraponSiteService',
    'CommentService',
  ];

  protected active: boolean = false;
  protected archive: {
    channels: ChinachuService.Channel[];
    programs: Program[];
  } = {
    channels: [],
    programs: [],
  };
  protected recorded: Program[] = [];
  protected viewport: Element;
  protected _selectItem: Program;
  protected timer: ng.IPromise<void>;
  protected backendType: string = 'chinachu';
  protected countMode: string = 'speed';
  protected previewEnabled: boolean = true;
  protected reloader: ng.IPromise<void>;
  protected reloadInterval: number;
  protected garaponLoginStatusMessages: GaraponMessages = {
    1: null,
    100: 'Parameter error',
    200: 'ガラポン端末のインターネット接続を確認してください。',
  };
  protected garaponLoginMessages: GaraponMessages = {
    1: null,
    0: 'ガラポン端末へのログインに失敗しました。',
    100: 'ログインIDが間違っています。',
    200: 'ログインパスワードが間違っています。',
    400: 'Unknown developer',
  };
  protected garaponSearchMessages: GaraponMessages = {
    1: null,
    0: 'Invalid session',
    100: 'Parameter error',
    200: 'Database error',
    success: null,
    unknown_developer: 'Unknown developer',
    invalid_params: 'Invalid params',
    internal_error: 'Internal error',
    unauthorized: 'Unauthorized',
    no_program: 'No program',
  };

  public archiveEnabled: boolean = true;
  public programs: Program[] = [];
  public source: string = 'archive';
  public sortRule: string = 'start:true';
  public sortKey: string;
  public sortReverse: boolean;
  public preFilterPattern: ng.IFilterFilterPatternObject;
  public filterEnabled: boolean = false;
  public filterPattern: ng.IFilterFilterPatternObject;
  public filteredPrograms: Program[];
  public baseHeight: number = 125;
  public viewStyle: JQLiteCssProperties;

  constructor(
    private $scope: ng.IScope,
    private $element: JQLite,
    private $window: ng.IWindowService,
    private $location: ng.ILocationService,
    private $timeout: ng.ITimeoutService,
    private toaster: toaster.IToasterService,
    private CommonService: CommonService.CommonService,
    private ChinachuService: ChinachuService.ChinachuService,
    private GaraponService: GaraponService.GaraponService,
    private GaraponSiteService: GaraponSiteService.GaraponSiteService,
    private CommentService: CommentService.CommentService,
  ) {
    this.viewport = this.$element[0].getElementsByClassName('scrollable')[0];
    $scope.$watch(
      (): string => $location.search().src,
      (value: string): void => {
        this.source = value || 'archive';
      });
    $scope.$watch(
      (): string => $location.search().search,
      (value: string): void => {
        this.filterEnabled = !!value;
        this.filterPattern = this.generateFilterPattern(value);
        this.scrollTo(0);
        $timeout.cancel(this.timer);
        this.timer = $timeout((): void => this.updateView(), 200);
      });
    $scope.$watchGroup(
      [
        (): string => $location.search().order,
        (): string => $location.search().desc,
      ],
      (values: string[]): void => {
        const [order, desc]: string[] = values;
        if (angular.isString(order) && angular.isString(desc)) {
          this.sortRule = [order, parseInt(desc, 10) > 0].join(':');
        }
      },
    );
    $scope.$watch(
      (): string => this.sortRule,
      (value: string): void => {
        const order: string = value || 'start:true';
        const rule: string[] = order.split(':');
        this.sortKey = rule[0];
        this.sortReverse = rule[1] === 'true';
        $location.search('order', this.sortKey);
        $location.search('desc', this.sortReverse ? 1 : 0);
        $timeout.cancel(this.timer);
        this.timer = $timeout((): void => this.updateView(), 200);
      },
    );
    $scope.$watchGroup(
      [
        (): string => CommonService.loadLocalStorage('backendType'),
        (): string => CommonService.loadLocalStorage('chinachuUrl'),
        (): string => CommonService.loadLocalStorage('chinachuUser'),
        (): string => CommonService.loadLocalStorage('chinachuPassword'),
        (): boolean => CommonService.loadLocalStorage('garaponAuth'),
        (): string => CommonService.loadLocalStorage('garaponUrl'),
        (): string => CommonService.loadLocalStorage('garaponUser'),
        (): string => CommonService.loadLocalStorage('garaponPassword'),
      ],
      (values: [
        string,
        string,
        string,
        string,
        boolean,
        string,
        string,
        string
      ]): void => {
        const [
          backendType,
          chinachuUrl,
          chinachuUser,
          chinachuPassword,
          garaponAuth = true,
          garaponUrl,
          garaponUser,
          garaponPassword,
        ]: [
            string,
            string,
            string,
            string,
            boolean,
            string,
            string,
            string
          ] = values;
        this.backendType = backendType;
        this.preFilterPattern = {};
        $timeout.cancel(this.timer);
        $timeout.cancel(this.reloader);
        ChinachuService.cancelRequests();
        GaraponService.cancelRequests();
        GaraponSiteService.cancelRequests();
        this.archive = { channels: [], programs: [] };
        this.recorded = [];
        this.programs = [];
        switch (this.backendType) {
          case 'garapon':
            this.archiveEnabled = false;
            this.connectGarapon(garaponAuth, garaponUrl, garaponUser, garaponPassword);
            break;
          case 'garaponv4':
            this.archiveEnabled = false;
            this.preFilterPattern.isRecorded = true;
            this.connectGaraponV4(garaponUser, garaponPassword);
            break;
          case 'chinachu':
          default:
            this.archiveEnabled = true;
            this.connectChinachu(chinachuUrl, chinachuUser, chinachuPassword);
        }
      },
    );
    $scope.$watch(
      (): string => this.source,
      (value: string): void => {
        $location.search('src', value);
        this.updateModel();
        $timeout.cancel(this.timer);
        this.timer = $timeout((): void => this.updateView(), 200);
      },
    );
    $scope.$watchCollection(
      (): Program[] => this.recorded,
      (): void => {
        this.updateModel();
        $timeout.cancel(this.timer);
        this.timer = $timeout((): void => this.updateView(), 200);
      },
    );
    $scope.$watchGroup(
      [
        (): string => CommonService.loadLocalStorage('countMode'),
        (): string => CommonService.loadLocalStorage('moritapoEmail'),
        (): string => CommonService.loadLocalStorage('moritapoPassword'),
      ],
      (values: string[]): void => {
        this.countMode = values[0] || 'speed';
        this.programs.forEach((a: Program): void => {
          delete a.count;
          a.enabled = false;
        });
        $timeout.cancel(this.timer);
        this.timer = $timeout((): void => this.updateView(), 200);
      },
    );
    $scope.$watch(
      (): string => CommonService.loadLocalStorage('previewEnabled'),
      (value: string): void => {
        this.previewEnabled = typeof value === 'boolean' ? value : true;
        this.programs.forEach((a: Program): void => {
          if (!this.previewEnabled) {
            delete a.preview;
          }
          a.enabled = false;
        });
        $timeout.cancel(this.timer);
        this.timer = $timeout((): void => this.updateView(), 200);
      },
    );
    $scope.$watchGroup(
      [
        (): number => CommonService.loadLocalStorage('hourFirst'),
        (): string => CommonService.loadLocalStorage('hourFormat'),
      ],
      (): void => {
        this.programs.forEach((a: Program): void => {
          a.displayTime = CommonService.formatDate(a.start, 'M/d EEE A HHHH:mm');
          a.enabled = false;
        });
        $timeout.cancel(this.timer);
        this.timer = $timeout((): void => this.updateView(), 200);
      });
    $scope.$watch(
      (): number => this.viewport.scrollHeight,
      (value: number): void => {
        const search: { y: number } = $location.search();
        if (search.y < value) {
          this.viewport.scrollTop = search.y;
        }
      },
    );
    $scope.$watch(
      (): number => CommonService.loadLocalStorage('reloadInterval'),
      (value: number): void => {
        this.reloadInterval = angular.isNumber(value) ? value : 300000;
        $timeout.cancel(this.reloader);
        if (this.reloadInterval > 0) {
          this.reloader = $timeout((): void => this.reload(), this.reloadInterval);
        }
      });
  }

  public $onInit(): void {
    this.active = true;
    angular.element(this.viewport).on('scroll', this.onScroll);
    angular.element(this.$window).on('resize', this.onResize);
  }

  public $onDestroy(): void {
    this.active = false;
    this.$timeout.cancel(this.timer);
    this.$timeout.cancel(this.reloader);
    this.ChinachuService.cancelRequests();
    this.GaraponService.cancelRequests();
    this.GaraponSiteService.cancelRequests();
    angular.element(this.viewport).off('scroll', this.onScroll);
    angular.element(this.$window).off('resize', this.onResize);
  }

  public search(value: string): void {
    this.$location.search('search', value);
  }

  public selectItem(item: Program): Program {
    if (angular.isDefined(item)) {
      this._selectItem = item;
    }
    return this._selectItem;
  }

  public play(item: Program): void {
    if (item) {
      if (item.isArchive) {
        if (item.isRecorded) {
          this.$location.url([
            '/player',
            '?mode=channel',
            `&type=${item.channel.type}`,
            `&sid=${item.channel.sid}`,
            `&start=${item.start}`,
            `&end=${item.end}`,
          ].join(''));
        } else {
          this.CommonService.errorModal('', '録画データが見つかりません。');
        }
      } else {
        this.$location.url([
          '/player',
          '?mode=recorded',
          `&id=${item.id || item.gtvid}`,
        ].join(''));
      }
    }
  }

  public scrollTo(value: number): void {
    this.viewport.scrollTop = value;
  }

  protected onScroll: JQuery.EventHandler<Element> = (e: JQuery.Event<Element>): void => {
    this.$location.search('y', e.target.scrollTop);
    this.$timeout.cancel(this.timer);
    this.timer = this.$timeout((): void => this.updateView(), 200);
  }

  protected onResize: () => void = (): void => {
    this.$timeout.cancel(this.timer);
    this.timer = this.$timeout((): void => this.updateView(), 200);
  }


  protected requestError(response: ng.IHttpPromiseCallbackArg<{}>): void {
    if (response.status >= 400) {
      this.toaster.pop({
        type: 'error',
        title: 'HTTP error',
        body: `${response.config.url} ${response.statusText}(${response.status})`,
      });
    } else if (this.active && response.status < 0) {
      this.toaster.pop({
        type: 'error',
        title: 'Connection error',
        body: `${response.config.url} Connection failure`,
      });
    }
  }

  protected connectChinachu(url: string, user: string, password: string): void {
    this.ChinachuService.url(url);
    this.ChinachuService.user(user);
    this.ChinachuService.password(password);
    this.ChinachuService.request('/archive.json').then(
      (response: ng.IHttpPromiseCallbackArg<Archive>): void => {
        if (
          angular.isObject(response) &&
          angular.isObject(response.data)
        ) {
          this.archiveEnabled = true;
          this.archive = response.data;
        } else {
          this.archiveEnabled = false;
        }
        this.updateChinachu();
      },
      (): void => {
        this.archiveEnabled = false;
        this.updateChinachu();
      },
    );
  }

  protected updateChinachu(noCache: boolean = false): void {
    const useCache: boolean = !noCache;
    this.ChinachuService.request('/api/recorded.json', {
      cache: useCache,
    }).then(
      (response: ng.IHttpPromiseCallbackArg<{}>): void => {
        if (
          angular.isObject(response) &&
          angular.isArray(response.data)
        ) {
          response.data.sort((a: Program, b: Program): number => b.start - a.start);
          this.recorded = response.data;
        }
      },
      this.requestError,
    );
  }

  protected connectGarapon(auth: boolean, url: string, user: string, password: string): void {
    let promise: ng.IPromise<any>;
    if (user && password) {
      this.GaraponService.user(user);
      this.GaraponService.password(password);
      if (auth || !url) {
        promise = this.GaraponService.loadBackend().then(
          (): ng.IPromise<{}> => this.GaraponService.login(),
          (result: any): void => {
            if (result.status) {
              this.requestError(result);
            } else if (result[1]) {
              this.toaster.pop({
                type: 'error',
                title: 'Garapon Web Authentication error',
                body: result[1],
              });
            }
          },
          this.requestError,
        );
      } else {
        this.GaraponService.backend(url);
        promise = this.GaraponService.login();
      }
      promise.then(
        (response: ng.IHttpPromiseCallbackArg<{}>): void => {
          if (response) {
            this.updateGarapon();
          }
        },
        (response: ng.IHttpPromiseCallbackArg<{ status: number, login: number }>): void => {
          let message: string;
          if (
            angular.isObject(response) &&
            response.status === 200 &&
            angular.isObject(response.data)
          ) {
            if (this.garaponLoginStatusMessages[response.data.status]) {
              message = this.garaponLoginStatusMessages[response.data.status];
            } else if (this.garaponLoginMessages[response.data.login]) {
              message = this.garaponLoginMessages[response.data.login];
            } else {
              message = 'Unknown Error';
            }
            this.toaster.pop({
              type: 'error',
              title: 'Garapon TV login error',
              body: message,
            });
          } else {
            this.requestError(response);
          }
        },
      );
    }
  }

  protected updateGarapon(noCache: boolean = false): void {
    if (noCache) {
      this.GaraponService.clearRequestCache();
    }
    this.loadGarapon(1);
  }

  protected loadGarapon(page: number): void {
    this.GaraponService.request('search', {
      data: {
        n: 100,
        p: page,
      },
    }).then(
      (response: ng.IHttpPromiseCallbackArg<{ hit: number, program: Program[] }>): void => {
        if (
          this.checkGaraponSearch(response) &&
          angular.isArray(response.data.program)
        ) {
          if (response.data.hit > page * 100) {
            this.loadGarapon(page + 1);
          }
          for (let ri: number = 0; ri < response.data.program.length; ri += 1) {
            const program: Program = response.data.program[ri];
            program.channel = {
              type: program.gtvid.slice(0, 2),
              sid: program.ch,
              name: program.bc,
            };
            program.detail = program.description;
            program.start = this.GaraponService.convertDate(program.startdate);
            program.end = program.start + this.GaraponService.convertDuration(program.duration);
            program.seconds = this.GaraponService.convertDuration(program.duration) / 1000;
            program.categoryName = this.GaraponService.convertCategory(program.genre[0]);
            program.displayTime = this.CommonService.formatDate(program.start, 'M/d EEE A HHHH:mm');
            program.isArchive = false;
            program.isRecorded = true;
            delete program.count;
            this.programs.push(program);
          }
          this.$timeout.cancel(this.timer);
          this.timer = this.$timeout((): void => this.updateView(), 200);
        }
      },
      this.requestError,
    );
  }

  protected checkGaraponSearch(response: ng.IHttpPromiseCallbackArg<any>): boolean {
    if (
      angular.isObject(response) &&
      angular.isObject(response.data)
    ) {
      if (this.garaponSearchMessages[response.data.status]) {
        this.toaster.pop({
          type: 'error',
          title: 'Garapon TV Error',
          body: this.garaponSearchMessages[response.data.status],
        });
        return false;
      }
      return true;
    }
    return false;
  }

  protected connectGaraponV4(user: string, password: string): void {
    this.GaraponSiteService.user(user);
    this.GaraponSiteService.password(password);
    this.GaraponService.user(user);
    this.GaraponService.password(password);
    this.GaraponSiteService.login().then(
      (): ng.IPromise<{}> => this.GaraponService.loginV4(),
    ).then(
      (): void => {
        this.updateGaraponV4();
      },
      this.requestError,
    );
  }

  protected updateGaraponV4(noCache: boolean = false): void {
    let start: number;
    let end: number;
    if (noCache) {
      this.GaraponService.clearRequestCache();
    }
    this.GaraponService.request('Tuner/', {
      data: {
        action: 'getrecdate',
      },
    }).then(
      (response: ng.IHttpPromiseCallbackArg<{ data: {}[] }>): ng.IPromise<{}> => {
        if (
          this.checkGaraponSearch(response) &&
          angular.isArray(response.data.data)
        ) {
          const startDate: Date = new Date(response.data.data[0]);
          const endDate: Date = new Date(response.data.data.slice(-1)[0]);
          startDate.setHours(0);
          endDate.setHours(0);
          endDate.setDate(endDate.getDate() + 1);
          start = startDate.getTime();
          end = endDate.getTime();
          return this.GaraponService.request('Tuner/', {
            data: {
              action: 'getrecch',
            },
          });
        }
        return null;
      },
      this.requestError,
    ).then(
      (response: ng.IHttpPromiseCallbackArg<{
        data: { tsid10: string }[];
      }>): void => {
        const tsids: string[] = [];
        if (
          this.checkGaraponSearch(response) &&
          angular.isArray(response.data.data)
        ) {
          for (let i: number = 0; i < response.data.data.length; i += 1) {
            tsids.push(response.data.data[i].tsid10);
          }
          this.loadGaraponV4(tsids.join(','), start, end, 1);
        }
      },
      this.requestError,
    );
  }

  protected loadGaraponV4(tsids: string, start: number, end: number, page: number): void {
    this.GaraponSiteService.request('Program/Search/search', {
      data: {
        tsids,
        page,
        starttime: start / 1000,
        endtime: end / 1000,
        num: 100,
      },
    }).then(
      (response: ng.IHttpPromiseCallbackArg<{
        hit: number;
        programs: Program[];
      }>): void => {
        if (
          this.checkGaraponSearch(response) &&
          angular.isArray(response.data.programs)
        ) {
          if (response.data.hit > page * 100) {
            this.loadGaraponV4(tsids, start, end, page + 1);
          }
          for (let i: number = 0; i < response.data.programs.length; i += 1) {
            const program: Program = response.data.programs[i];
            program.channel = {
              type: program.gtvid.slice(0, 2),
              sid: program.tsid10,
              name: program.bcname,
            };
            program.detail = program.description;
            program.start = program.starttime * 1000;
            program.end = program.endtime * 1000;
            program.seconds = program.durationtime;
            program.categoryName = this.GaraponSiteService.convertCategory(program.genre[0]);
            program.displayTime = this.CommonService.formatDate(program.start, 'M/d EEE A HHHH:mm');
            program.isArchive = false;
            program.isRecorded = true;
            program.v4Unverified = true;
            delete program.count;
            this.programs.push(program);
          }
          this.$timeout.cancel(this.timer);
          this.timer = this.$timeout((): void => this.updateView(), 200);
        }
      },
      this.requestError,
    );
  }

  protected reload(): void {
    this.$timeout.cancel(this.reloader);
    this.ChinachuService.cancelRequests();
    this.GaraponService.cancelRequests();
    this.GaraponSiteService.cancelRequests();
    this.recorded = [];
    this.programs = [];
    switch (this.backendType) {
      case 'garapon':
        this.updateGarapon(true);
        break;
      case 'garaponv4':
        this.updateGaraponV4(true);
        break;
      case 'chinachu':
      default:
        this.updateChinachu(true);
    }
    this.reloader = this.$timeout((): void => this.reload(), this.reloadInterval);
  }

  protected updateModel(): void {
    if (this.backendType === 'garapon' || this.backendType === 'garaponv4') {
      this.source = 'garapon';
    } else if (this.source === 'garapon') {
      this.source = 'archive';
    }
    if (this.backendType === 'chinachu' && this.recorded.length && !this.archiveEnabled) {
      this.source = 'recorded';
    }
    switch (this.source) {
      case 'archive':
        this.loadChinachuArchive();
        break;
      case 'recorded':
        this.loadChinachuRecorded();
        break;
      default:
    }
  }

  protected loadChinachuArchive(): void {
    const programs: Program[] = [];
    const start: number = Math.min.apply(
      null,
      this.recorded.filter(
        (a: Program): boolean => a.isMiyoutvReserved,
      ).map((a: Program): void => a.start),
    );
    const end: number = Math.max.apply(
      null,
      this.recorded.filter(
        (a: Program): boolean => a.isMiyoutvReserved,
      ).map((a: Program): void => a.end),
    );

    for (let ri: number = 0; ri < this.recorded.length; ri += 1) {
      const program: Program = this.recorded[ri];
      const channel: ChinachuService.LegacyChannel = program.channel;
      const service: ChinachuService.ChannelService = this.ChinachuService.serviceFromLegacy(
        channel,
        this.archive.channels,
      );
      let existsChannel: boolean = false;
      for (let pi: number = 0; pi < programs.length; pi += 1) {
        const item: Program = programs[pi];
        if (
          channel.type === item.channel.type &&
          channel.sid === item.channel.sid
        ) {
          existsChannel = true;
          break;
        }
      }
      if (!existsChannel) {
        for (let pi: number = 0; pi < this.archive.programs.length; pi += 1) {
          const item: Program = this.archive.programs[pi];
          item.start = item.startAt;
          item.end = item.startAt + item.duration;
          if (
            item.networkId === service.networkId &&
            item.serviceId === service.serviceId &&
            item.start < end &&
            item.end > start
          ) {
            item.seconds = item.duration / 1000;
            item.title = item.name;
            item.detail = item.description;
            item.displayTime = this.CommonService.formatDate(item.start, 'M/d EEE A HHHH:mm');
            item.isArchive = true;
            item.isRecorded = false;
            item.channel = channel;
            if (angular.isArray(item.genres)) {
              item.categoryName = this.ChinachuService.convertCategory(item.genres[0].lv1);
            } else {
              item.categoryName = this.ChinachuService.convertCategory();
            }
            delete item.count;
            programs.push(item);
          }
        }
      }
    }
    this.programs = programs;
  }

  protected loadChinachuRecorded(): void {
    const programs: Program[] = this.recorded;

    programs.forEach((a: Program): void => {
      a.categoryName = this.ChinachuService.convertCategory(a.category);
      a.displayTime = this.CommonService.formatDate(a.start, 'M/d EEE A HHHH:mm');
      a.isArchive = false;
      a.isRecorded = true;
      delete a.count;
    });
    this.programs = programs;
  }

  protected updateView(): void {
    const top: number = this.viewport.scrollTop;
    const bottom: number = this.viewport.scrollTop + this.viewport.clientHeight;
    const preload: number = 5;
    const garaponV4VerifyItems: Program[] = [];
    const garaponV4VerifyParams: string[] = [];
    this.viewStyle = {
      height: `${this.baseHeight * this.filteredPrograms.length}px`,
      paddingTop: `${(Math.floor(top / this.baseHeight) - preload) * this.baseHeight}px`,
    };
    for (let ii: number = 0; ii < this.filteredPrograms.length; ii += 1) {
      const item: Program = this.filteredPrograms[ii];
      item.enabled = (
        (ii - preload) * this.baseHeight < bottom &&
        (ii + preload + 1) * this.baseHeight > top
      );
      if (item.enabled) {
        if (item.v4Unverified) {
          item.v4Unverified = false;
          garaponV4VerifyItems.push(item);
          garaponV4VerifyParams.push([
            item.starttime,
            item.endtime,
            item.tsid16,
            item.service_type,
          ].join(','));
        }
        this.initItem(item);
      }
    }
    if (garaponV4VerifyParams.length > 0) {
      this.GaraponService.request('Program/', {
        data: {
          action: 'check',
          'programs[]': garaponV4VerifyParams,
        },
      }).then(
        (response: ng.IHttpPromiseCallbackArg<{ data: { result: number }[] }>): void => {
          if (this.checkGaraponSearch(response)) {
            for (let i: number = 0; i < response.data.data.length; i += 1) {
              if (response.data.data[i].result) {
                garaponV4VerifyItems[i].isRecorded = true;
                if (this.previewEnabled) {
                  garaponV4VerifyItems[i].preview = garaponV4VerifyItems[i].thumbnail_url;
                }
              } else {
                garaponV4VerifyItems[i].isRecorded = false;
              }
            }
          }
          this.$timeout.cancel(this.timer);
          this.timer = this.$timeout((): void => this.updateView(), 200);
        },
        this.requestError,
      );
    }
  }

  protected initItem(item: Program): void {
    let recordedProgram: Program;
    let previewPos: number = 70;

    if (item.isArchive) {
      if (!item.isRecorded || (this.previewEnabled && angular.isUndefined(item.preview))) {
        recordedProgram = this.recorded.filter(
          (a: Program): boolean =>
            a.channel.type === item.channel.type &&
            a.channel.sid === item.channel.sid &&
            a.end > item.start &&
            a.start <= item.start,
        )[0];
        if (recordedProgram) {
          previewPos += Math.floor((item.start - recordedProgram.start) / 1000);
          item.isRecorded = true;
          while (recordedProgram.seconds < previewPos) {
            previewPos = -30;
          }
        }
      }
    } else {
      recordedProgram = item;
    }
    if (this.previewEnabled && angular.isUndefined(item.preview)) {
      if (this.backendType === 'chinachu' && recordedProgram) {
        if (recordedProgram.seconds < previewPos) {
          previewPos = 10;
        }
        this.ChinachuService.requestPreview(recordedProgram.id, 'png', {
          pos: previewPos,
          size: '160x90',
        }).then((value: string): void => {
          if (this.previewEnabled) {
            item.preview = value;
          }
        });
      } else if (this.backendType === 'garapon') {
        this.GaraponService.requestPreview(recordedProgram.gtvid).then((value: string): void => {
          if (this.previewEnabled) {
            item.preview = value;
          }
        });
      } else if (this.backendType === 'garaponv4') {
        if (this.previewEnabled) {
          item.preview = item.thumbnail_url;
        }
      }
    }

    if (this.countMode !== 'none' && angular.isUndefined(item.count)) {
      const commentQuery: string = this.resolveQuery(item.channel);
      this.CommentService.request('comments', {
        params: {
          channel: commentQuery,
          start: item.start,
          end: item.end,
          limit: 0,
        },
      }).then(
        (response: ng.IHttpPromiseCallbackArg<{ data: { n_hits: number } }>): void => {
          if (
            angular.isObject(response) &&
            angular.isObject(response.data) &&
            angular.isObject(response.data.data) &&
            angular.isNumber(response.data.data.n_hits)
          ) {
            const commentCount: number = response.data.data.n_hits;
            const commentSpeed: number = (commentCount / (item.seconds / 60));
            switch (this.countMode) {
              case 'speed':
                item.count = commentSpeed.toFixed(1);
                break;
              case 'comment':
              default:
                item.count = commentCount;
            }
            item.countDetail = [
              `コメント数: ${commentCount}`,
              `勢い： ${commentSpeed.toFixed(1)}/分`,
            ].join('\n');
          }
        },
        this.requestError,
      );
    }
  }

  protected resolveQuery(channel: string | ChinachuService.Channel): string {
    const name: string = (
      angular.isObject(channel) ? (channel as ChinachuService.Channel).name : channel
    );
    const queries: {
      [key: string]: string;
    } = this.CommonService.loadLocalStorage('commentQueries') || {};
    let query: string = queries[name];
    if (angular.isUndefined(query)) {
      query = this.CommentService.resolveChannel(name);
    }
    return query;
  }

  protected generateFilterPattern(value: string): ng.IFilterFilterPatternObject {
    const query: ng.IFilterFilterPatternObject = {
      channel: {},
      categoryName: {},
    };
    const options: string = angular.isString(value) ? value.replace('　', ' ') : '';
    const optionPettern: RegExp = /([a-z]+): ?("[^"]*"|[^ ]+)?/g;

    let option: string[] = optionPettern.exec(options);
    while (option !== null) {
      const key: string = option[1];
      const value: string = angular.isString(
        option[2]) ? option[2].replace(/^"([^"]+)"$/, '$1',
        ) : '';
      switch (key) {
        case 'ch':
        case 'channel':
          query.channel.$ = value;
          break;
        case 'chtype':
        case 'channeltype':
          query.channel.type = value;
          break;
        case 'chnum':
        case 'channelnum':
          query.channel.channel = value;
          break;
        case 'sid':
        case 'serviceid':
          query.channel.sid = value;
          break;
        case 'chname':
        case 'channelname':
        case 'service':
        case 'servicename':
          query.channel.name = value;
          break;
        case 'cat':
        case 'category':
        case 'genre':
          query.categoryName.$ = value;
          break;
        case 'start':
          query.start = new Date(value).getTime();
          break;
        case 'end':
          query.end = new Date(value).getTime();
          break;
        default:
          query[key] = value;
      }
      option = optionPettern.exec(options);
    }
    query.$ = angular.isString(value) ? value.replace(optionPettern, '').trim() : '';
    return query;
  }
}

angular
  .module('app')
  .component('list', {
    templateUrl: 'templates/list.html',
    controller: ListController,
  });
