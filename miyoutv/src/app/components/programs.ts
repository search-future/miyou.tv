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
import * as GaraponService from '../services/GaraponService';
import * as GaraponSiteService from '../services/GaraponSiteService';
import * as CommentService from '../services/CommentService';

declare module angular { }

interface Program {
  [key: string]: any;
}

interface Archive {
  channels: ChinachuService.Channel[];
  programs: Program[];
}

interface CategoryName {
  name: string;
  localeName: string;
  checked: boolean;
}

interface ProgramColumn {
  enabled: boolean;
  type: string;
  sid: string;
  name?: string;
  programs?: Program[];
  style: JQLiteCssProperties;
  commentQuery?: string;
  [key: string]: any;
}

interface DateHeaderItem {
  time: Date;
  isCurrent: boolean;
}

interface HourHeaderItem {
  time: Date;
  hour: number;
}

class ProgramsController {
  static componentName: string = 'programs';
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
    'categoryTable',
  ];

  private _selectItem: Program;
  protected active: boolean = false;
  protected archive: Archive = {
    channels: [],
    programs: [],
  };
  protected recorded: Program[] = [];
  protected viewport: Element;
  protected timer: ng.IPromise<void>;
  protected backendType: string = 'chinachu';
  protected startHour: number = 0;
  protected endHour: number = 0;
  protected hourFirst: number = 4;
  protected countMode: string = 'speed';
  protected previewEnabled: boolean = true;
  protected reloader: ng.IPromise<void>;
  protected reloadInterval: number;
  protected garaponLoginStatusMessages: {
    [key: string]: string;
  } = {
    1: null,
    100: 'Parameter error',
    200: 'ガラポン端末のインターネット接続を確認してください。',
  };
  protected garaponLoginMessages: {
    [key: string]: string;
  } = {
    1: null,
    0: 'ガラポン端末へのログインに失敗しました。',
    100: 'ログインIDが間違っています。',
    200: 'ログインパスワードが間違っています。',
    400: 'Unknown developer',
  };
  protected garaponSearchMessages: {
    [key: string]: string;
  } = {
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

  public baseWidth: number = 200;
  public baseHeight: number = 60;
  public archiveEnabled: boolean = true;
  public programs: ProgramColumn[] = [];
  public dates: DateHeaderItem[] = [];
  public hours: HourHeaderItem[] = [];
  public hHeaderStyle: JQLiteCssProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
  };
  public vHeaderStyle: JQLiteCssProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
  };
  public datepickerOptions: ng.ui.bootstrap.IDatepickerConfig = {
    formatMonth: 'M月',
    formatDayTitle: 'y/M',
    formatMonthTitle: 'y年',
    showWeeks: false,
  };
  public categories: CategoryName[];
  public currentDate: Date;
  public source: string;

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
    private GaraponSiteService: GaraponService.GaraponService,
    private CommentService: CommentService.CommentService,
    private categoryTable: CategoryName[],
  ) {
    this.viewport = $element[0].getElementsByClassName('scrollable')[0];
    this.categories = categoryTable.filter((a: CategoryName): boolean => a.name !== 'etc');
    this.categories.push(categoryTable.filter((a: CategoryName): boolean => a.name === 'etc')[0]);

    $scope.$watch(
      (): string => $location.search().src,
      (value: string): void => {
        this.source = value || 'archive';
      },
    );
    $scope.$watch(
      (): string => $location.search().search,
      (value: string): void => {
        if (value) {
          $location.url(`/list?src=${this.source}&search=${value}`);
        }
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
      (values: [string, string, string, string, boolean, string, string, string]): void => {
        const [
          backendType,
          chinachuUrl,
          chinachuUser,
          chinachuPassword,
          garaponAuth = true,
          garaponUrl,
          garaponUser,
          garaponPassword,
        ] = values;
        this.backendType = backendType;
        $timeout.cancel(this.timer);
        $timeout.cancel(this.reloader);
        ChinachuService.cancelRequests();
        GaraponService.cancelRequests();
        GaraponSiteService.cancelRequests();
        this.archive = {
          channels: [],
          programs: [],
        };
        this.recorded = [];
        this.programs = [];
        $location.search('x', null);
        $location.replace();
        $location.search('y', null);
        $location.replace();
        switch (backendType) {
          case 'garapon':
            this.archiveEnabled = false;
            this.connectGarapon(garaponAuth, garaponUrl, garaponUser, garaponPassword);
            break;
          case 'garaponv4':
            this.archiveEnabled = false;
            this.connectGaraponV4(garaponUser, garaponPassword);
            break;
          case 'chinachu':
          default:
            this.archiveEnabled = true;
            this.connectChinachu(chinachuUrl, chinachuUser, chinachuPassword);
        }
        this.reloader = $timeout((): void => this.reload(), this.reloadInterval);
      },
    );
    $scope.$watch(
      (): string => this.source,
      (): void => {
        $location.search('src', this.source);
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
    $scope.$watch(
      (): Program => this.selectItem(),
      (newValue: Program, oldValue: Program): void => {
        const newItem: Program = newValue || {};
        const oldItem: Program = oldValue || {};

        newItem.style = this.calcItemStyle(newItem);
        oldItem.style = this.calcItemStyle(oldItem);
      },
    );
    $scope.$watchGroup(
      [
        (): string => CommonService.loadLocalStorage('countMode'),
        (): string => CommonService.loadLocalStorage('moritapoEmail'),
        (): string => CommonService.loadLocalStorage('moritapoPassword'),
      ],
      (values: [string, string, string]): void => {
        this.countMode = values[0] || 'speed';
        for (let ci: number = 0; ci < this.programs.length; ci += 1) {
          const column: ProgramColumn = this.programs[ci];
          for (let ii: number = 0; ii < column.programs.length; ii += 1) {
            const item: Program = column.programs[ii];
            delete item.count;
            item.enabled = false;
          }
        }
        $timeout.cancel(this.timer);
        this.timer = $timeout((): void => this.updateView(), 200);
      });
    $scope.$watch(
      (): boolean => CommonService.loadLocalStorage('previewEnabled'),
      (value: boolean): void => {
        this.previewEnabled = typeof value === 'boolean' ? value : true;
        for (let ci: number = 0; ci < this.programs.length; ci += 1) {
          const column: ProgramColumn = this.programs[ci];
          for (let ii: number = 0; ii < column.programs.length; ii += 1) {
            const item: Program = column.programs[ii];
            if (!this.previewEnabled) {
              delete item.preview;
            }
            item.enabled = false;
          }
        }
        $timeout.cancel(this.timer);
        this.timer = $timeout((): void => this.updateView(), 200);
      },
    );
    $scope.$watchGroup(
      [
        (): number => CommonService.loadLocalStorage('hourFirst'),
        (): string => CommonService.loadLocalStorage('hourFormat'),
      ],
      (values: [number, string]): void => {
        this.hourFirst = angular.isNumber(values[0]) ? values[0] : 4;
        for (let ci: number = 0; ci < this.programs.length; ci += 1) {
          const column: ProgramColumn = this.programs[ci];
          for (let ii: number = 0; ii < column.programs.length; ii += 1) {
            const item: Program = column.programs[ii];
            item.displayTime = CommonService.formatDate(item.start, 'A HHHH:mm');
          }
        }
        this.hours.forEach((a: HourHeaderItem): void => {
          a.hour = CommonService.convertHour(a.time);
        });
        $timeout.cancel(this.timer);
        this.timer = $timeout((): void => this.updateView(), 200);
      },
    );

    $scope.$watchGroup(
      [
        (): number => this.viewport.scrollWidth,
        (): number => this.viewport.scrollHeight,
      ],
      (values: number[]): void => {
        const [width, height]: number[] = values;
        const search: { x: number, y: number } = $location.search();
        if (search.x < width) {
          this.viewport.scrollLeft = search.x;
        }
        if (search.y < height) {
          this.viewport.scrollTop = search.y;
        } else if (angular.isUndefined(search.y)) {
          this.viewport.scrollTop = height;
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
      },
    );
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

  public selectItem(item?: Program): Program {
    if (angular.isDefined(item)) {
      this._selectItem = item;
    }
    return this._selectItem;
  }

  public scrollToDate(time: number): void {
    const date: Date = new Date(time);
    date.setHours(this.hourFirst);
    this.viewport.scrollTop = this.calcPos(date.getTime());
  }

  public play(item: Program): void {
    if (item) {
      if (item.isRecorded) {
        this.$location.url([
          '/player',
          '?mode=channel',
          `&type=${item.channel.type}`,
          `&sid=${item.channel.sid}`,
          `&stype=${item.channel.service_type || ''}`,
          `&start=${item.start}`,
          `&end=${item.end}`,
        ].join(''));
      } else {
        this.CommonService.errorModal('', '録画データが見つかりません。');
      }
    }
  }

  public playColumn(column: ProgramColumn, $event: MouseEvent): void {
    const position: number = this.viewport.scrollTop + $event.offsetY;
    const start: number = this.calcTime(position);
    const isRecorded: boolean = this.recorded.some((a: Program): boolean => (
      a.channel.type === column.channel.type &&
      a.channel.sid === column.channel.sid &&
      a.end > start &&
      a.start <= start
    ));
    if (isRecorded || this.recorded.length <= 0) {
      this.$location.url([
        '/player',
        '?mode=channel',
        `&type=${column.channel.type}`,
        `&sid=${column.channel.sid}`,
        `&start=${start}`,
      ].join(''));
    } else {
      this.CommonService.errorModal('', '録画データが見つかりません。');
    }
  }

  public search(value: string): void {
    this.$location.search('search', value);
  }

  public update(): void {
    this.$timeout.cancel(this.timer);
    this.timer = this.$timeout((): void => this.updateView(), 200);
  }

  protected onScroll: JQuery.EventHandler<Element> = (e: JQuery.Event<Element>): void => {
    this.vHeaderStyle.left = `${e.target.scrollLeft}px`;
    this.vHeaderStyle.paddingTop = `${
      Math.floor(e.target.scrollTop / this.baseHeight / 24) * this.baseHeight * 24
      }px`;
    this.hHeaderStyle.top = `${e.target.scrollTop}px`;
    this.$location.search('x', e.target.scrollLeft);
    this.$location.search('y', e.target.scrollTop);
    this.$timeout.cancel(this.timer);
    this.timer = this.$timeout((): void => this.updateView(), 200);
    this.$scope.$digest();
  }

  protected onResize: JQuery.EventHandler<Element> = (): void => {
    this.$timeout.cancel(this.timer);
    this.timer = this.$timeout((): void => this.updateView(), 200);
  }

  protected calcPos(time: number): number {
    let pos: number = ((time - this.startHour) * this.baseHeight) / 3600000;
    if (pos < 0) {
      pos = 0;
    }
    return pos;
  }

  protected calcHeight(start: number, end: number): number {
    const pos: number = ((start - this.startHour) * this.baseHeight) / 3600000;
    let height: number = ((end - start) * this.baseHeight) / 3600000;
    const overHeight: number = (pos + height) - this.calcPos(this.endHour);
    if (pos < 0) {
      height += pos;
    }
    if (overHeight > 0) {
      height -= overHeight;
    }
    return height;
  }

  protected calcTime(pos: number): number {
    return ((pos * 3600000) / this.baseHeight) + this.startHour;
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
    this.ChinachuService.url = url;
    this.ChinachuService.user = user;
    this.ChinachuService.password = password;
    this.ChinachuService.request('/archive.json').then(
      (response: ng.IHttpPromiseCallbackArg<Archive>): void => {
        if (
          angular.isObject(response) &&
          angular.isObject(response.data)
        ) {
          this.archive = response.data;
          this.archiveEnabled = true;
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
      (response: ng.IHttpPromiseCallbackArg<Program[]>): void => {
        if (
          angular.isObject(response) &&
          angular.isArray(response.data)
        ) {
          response.data.sort((a, b): number => a.start - b.start);
          this.recorded = response.data;
        }
      },
      this.requestError,
    );
  }

  protected connectGarapon(auth: boolean, url: string, user: string, password: string): void {
    let promise: ng.IPromise<any>;
    if (user && password) {
      this.GaraponService.user = user;
      this.GaraponService.password = password;
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
        );
      } else {
        this.GaraponService.backend = url;
        promise = this.GaraponService.login();
      }
      promise.then(
        (response: {}): void => {
          if (response) {
            this.updateGarapon();
          }
        },
        (response: ng.IHttpPromiseCallbackArg<{ status: number, login: number }>): void => {
          if (
            angular.isObject(response) &&
            response.status === 200 &&
            angular.isObject(response.data)
          ) {
            let message: string;
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
    let start: number;
    let end: number;
    if (noCache) {
      this.GaraponService.clearRequestCache();
    }
    this.GaraponService.request('search', {
      data: {
        n: 1,
      },
    }).then(
      (response: ng.IHttpPromiseCallbackArg<{
        program: Program[];
        hit: number;
      }>): ng.IHttpPromise<{}> => {
        if (
          this.checkGaraponSearch(response) &&
          angular.isArray(response.data.program) &&
          angular.isObject(response.data.program[0])
        ) {
          end = (
            this.GaraponService.convertDate(response.data.program[0].startdate) +
            this.GaraponService.convertDuration(response.data.program[0].duration)
          );
          return this.GaraponService.request('search', {
            data: {
              n: 1,
              p: response.data.hit,
            },
          });
        }
        return null;
      },
      this.requestError,
    ).then(
      (response: ng.IHttpPromiseCallbackArg<{ program: Program[] }>): void => {
        if (
          this.checkGaraponSearch(response) &&
          angular.isArray(response.data.program) &&
          angular.isObject(response.data.program[0])
        ) {
          start = this.GaraponService.convertDate(response.data.program[0].startdate);
          this.initView(start, end);
          this.loadGarapon(start, end, 1);
        }
      },
      this.requestError,
    );
  }

  protected loadGarapon(start: number, end: number, page: number): void {
    this.GaraponService.request('search', {
      data: {
        n: 100,
        p: page,
      },
    }).then(
      (response: ng.IHttpPromiseCallbackArg<{ program: Program[], hit: number }>): void => {
        if (
          this.checkGaraponSearch(response) &&
          angular.isArray(response.data.program)
        ) {
          if (response.data.hit > page * 100) {
            this.loadGarapon(start, end, page + 1);
          }
          for (let ri: number = 0; ri < response.data.program.length; ri += 1) {
            const program: Program = response.data.program[ri];
            let column: ProgramColumn;
            for (let pi: number = 0; pi < this.programs.length; pi += 1) {
              column = this.programs[pi];
              if (
                column.sid === program.ch
              ) {
                break;
              }
              column = null;
            }
            if (!column) {
              column = {
                enabled: false,
                type: program.gtvid.slice(0, 2),
                sid: program.ch,
                style: {
                  height: `${this.calcHeight(this.startHour, this.endHour)}px`,
                },
                programs: [],
              };
              column.name = program.bc;
              column.commentQuery = this.resolveQuery(column.name);

              this.programs.push(column);
            }
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
            program.style = this.calcItemStyle(program);
            program.displayTime = this.CommonService.formatDate(program.start, 'A HHHH:mm');
            program.isArchive = false;
            program.isRecorded = true;
            delete program.count;
            column.programs.push(program);
          }
          this.programs.sort((a, b): number => {
            const types: string[] = ['1S', 'GR', 'BS', 'CS', 'US', 'YU'];
            if (a.type !== b.type) {
              return types.indexOf(a.type) - types.indexOf(b.type);
            }
            return parseInt(a.sid, 10) - parseInt(b.sid, 10);
          });
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
    this.GaraponSiteService.user = user;
    this.GaraponSiteService.password = password;
    this.GaraponService.user = user;
    this.GaraponService.password = password;
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
      (response: ng.IHttpPromiseCallbackArg<{ data: string }>): ng.IHttpPromise<{}> => {
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
        data: {
          tsid10: string;
        }[];
      }>): void => {
        if (
          this.checkGaraponSearch(response) &&
          angular.isArray(response.data.data)
        ) {
          const tsids: string[] = [];
          for (let i: number = 0; i < response.data.data.length; i += 1) {
            tsids.push(response.data.data[i].tsid10);
          }
          this.initView(start, end);
          this.loadGaraponV4(tsids.join(','), start, end, 1);
        }
        return null;
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
      (response: ng.IHttpPromiseCallbackArg<{ programs: Program[], hit: number }>): void => {
        if (
          this.checkGaraponSearch(response) &&
          angular.isArray(response.data.programs)
        ) {
          if (response.data.hit > page * 100) {
            this.loadGaraponV4(tsids, start, end, page + 1);
          }
          const bottomTime: number = this.endHour / 1000;
          for (let ri: number = 0; ri < response.data.programs.length; ri += 1) {
            const program: Program = response.data.programs[ri];
            if (program.endtime <= bottomTime) {
              let column: ProgramColumn;
              for (let pi: number = 0; pi < this.programs.length; pi += 1) {
                column = this.programs[pi];
                if (
                  column.sid === program.tsid10 &&
                  column.service_type === program.service_type
                ) {
                  break;
                }
                column = null;
              }
              if (!column) {
                column = {
                  enabled: false,
                  type: program.gtvid.slice(0, 2),
                  sid: program.tsid10,
                  name: program.bcname,
                  service_type: program.service_type,
                  commentQuery: this.resolveQuery(program.bcname),
                  style: {
                    height: `${this.calcHeight(this.startHour, this.endHour)}px`,
                  },
                  programs: [],
                };
                this.programs.push(column);
              }
              program.channel = {
                type: program.gtvid.slice(0, 2),
                sid: program.tsid10,
                service_type: program.service_type,
                name: program.bcname,
              };
              program.detail = program.description;
              program.start = program.starttime * 1000;
              program.end = program.endtime * 1000;
              program.seconds = program.durationtime;
              program.categoryName = this.GaraponSiteService.convertCategory(program.genre[0]);
              program.style = this.calcItemStyle(program);
              program.displayTime = this.CommonService.formatDate(program.start, 'A HHHH:mm');
              program.isArchive = false;
              program.isRecorded = true;
              program.v4Unverified = true;
              delete program.count;
              column.programs.push(program);
            }
          }
          this.programs.sort((a, b): number => {
            const types: string[] = ['1S', 'GR', 'BS', 'CS', 'US', 'YU'];
            if (a.type !== b.type) {
              return types.indexOf(a.type) - types.indexOf(b.type);
            }
            return parseInt(a.sid, 10) - parseInt(b.sid, 10);
          });
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
    if (this.backendType === 'chinachu' && this.recorded.length > 0 && !this.archiveEnabled) {
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
    const programs: ProgramColumn[] = [];
    const start: number = Math.min.apply(
      null,
      this.recorded.filter(
        (a: Program): boolean => a.isMiyoutvReserved,
      ).map(
        (a: Program): number => a.start,
      ),
    );
    const end: number = Math.max.apply(
      null,
      this.recorded.filter(
        (a: Program): boolean => a.isMiyoutvReserved,
      ).map(
        (a: Program): number => a.end,
      ),
    );
    this.initView(start, end);

    for (let ri: number = 0; ri < this.recorded.length; ri += 1) {
      const program: Program = this.recorded[ri];
      let column: ProgramColumn;
      for (let pi: number = 0; pi < programs.length; pi += 1) {
        column = programs[pi];
        if (
          column.type === program.channel.type &&
          column.sid === program.channel.sid
        ) {
          break;
        }
        column = null;
      }
      if (!column) {
        column = {
          enabled: false,
          type: program.channel.type,
          sid: program.channel.sid,
          style: {
            height: `${this.calcHeight(this.startHour, this.endHour)}px`,
          },
          programs: [],
        };
        programs.push(column);
        const service: ChinachuService.ChannelService = this.ChinachuService.serviceFromLegacy(
          program.channel,
          this.archive.channels,
        );
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
            item.channel = program.channel;
            item.displayTime = this.CommonService.formatDate(item.start, 'M/d A HHHH:mm');
            item.isArchive = true;
            item.isRecorded = false;
            if (angular.isArray(item.genres)) {
              item.categoryName = this.ChinachuService.convertCategory(item.genres[0].lv1);
            } else {
              item.categoryName = this.ChinachuService.convertCategory();
            }
            item.style = this.calcItemStyle(item);
            delete item.count;
            column.programs.push(item);
          }
        }
      }
      column.name = program.channel.name;
      column.commentQuery = this.resolveQuery(program.channel);
    }
    programs.sort((a: ProgramColumn, b: ProgramColumn): number => {
      const types: string[] = ['GR', 'BS', 'CS', 'EX'];
      if (a.type !== b.type) {
        return types.indexOf(a.type) - types.indexOf(b.type);
      }
      return parseInt(a.sid, 10) - parseInt(b.sid, 10);
    });
    this.programs = programs;
  }

  protected loadChinachuRecorded(): void {
    let start;
    let end;
    const programs: ProgramColumn[] = [];

    start = Math.min.apply(
      null,
      this.recorded.map((a: Program): number => a.start),
    );
    end = Math.max.apply(
      null,
      this.recorded.map((a: Program): number => a.end),
    );
    this.initView(start, end);

    for (let ri: number = 0; ri < this.recorded.length; ri += 1) {
      const program: Program = this.recorded[ri];
      let column: ProgramColumn;
      for (let pi: number = 0; pi < programs.length; pi += 1) {
        column = programs[pi];
        if (
          column.type === program.channel.type &&
          column.sid === program.channel.sid
        ) {
          break;
        }
        column = null;
      }
      if (!column) {
        column = {
          enabled: false,
          type: program.channel.type,
          sid: program.channel.sid,
          style: {
            height: `${this.calcHeight(this.startHour, this.endHour)}px`,
          },
          programs: [],
        };
        programs.push(column);
      }
      column.name = program.channel.name;
      column.commentQuery = this.resolveQuery(program.channel);
      program.detail = program.description;
      program.categoryName = this.ChinachuService.convertCategory(program.category);
      program.style = this.calcItemStyle(program);
      program.displayTime = this.CommonService.formatDate(program.start, 'A HHHH:mm');
      program.isArchive = false;
      program.isRecorded = true;
      delete program.count;
      column.programs.push(program);
    }
    programs.sort((a: ProgramColumn, b: ProgramColumn): number => {
      const types: string[] = ['GR', 'BS', 'CS', 'EX'];
      if (a.type !== b.type) {
        return types.indexOf(a.type) - types.indexOf(b.type);
      }
      return parseInt(a.sid, 10) - parseInt(b.sid, 10);
    });
    this.programs = programs;
  }

  protected calcItemStyle(item: Program): JQLiteCssProperties {
    if (this.selectItem() === item) {
      return {
        top: `${this.calcPos(item.start)}px`,
        minHeight: `${this.calcHeight(item.start, item.end)}px`,
        maxHeight: `${this.calcHeight(item.start, this.endHour)}px`,
      };
    }
    return {
      top: `${this.calcPos(item.start)}px`,
      height: `${this.calcHeight(item.start, item.end)}px`,
    };
  }

  protected resolveQuery(channel: CommentService.Channel | string): string {
    const name: string = (
      angular.isObject(channel) ? (channel as CommentService.Channel).name : channel
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

  protected initView(start: number, end: number): void {
    if (isFinite(start) && isFinite(end)) {
      if (end > Date.now()) {
        this.initView(start, Date.now());
      } else {
        this.initBaseTime(start, end);
        this.initHourHeader(this.startHour, this.endHour);
        this.initDateHeader(start, end);
        this.initDatepicker(start, end);
      }
    }
  }

  protected initBaseTime(start: number, end: number): void {
    const startDate: Date = new Date(start);
    const endDate: Date = new Date(end);
    this.startHour = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
      startDate.getHours(),
    ).getTime();
    this.endHour = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate(),
      endDate.getHours() + 1,
    ).getTime();
  }

  protected initDateHeader(start: number, end: number): void {
    const dates: { time: Date, isCurrent: boolean }[] = [];
    const startDate: Date = new Date(start);
    const endDate: Date = new Date(end);
    startDate.setHours(startDate.getHours() - this.hourFirst);
    endDate.setHours(endDate.getHours() - this.hourFirst);
    const date: Date = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

    while (date.getTime() < endDate.getTime()) {
      dates.push({
        time: new Date(date),
        isCurrent: false,
      });
      date.setDate(date.getDate() + 1);
    }
    this.dates = dates;
  }

  protected initHourHeader(start: number, end: number): void {
    const hours: HourHeaderItem[] = [];
    const hour: Date = new Date(start);
    for (let i: number = 0; i < 48; i += 1) {
      hours.push({
        time: new Date(hour),
        hour: this.CommonService.convertHour(hour.getTime()),
      });
      hour.setHours(hour.getHours() + 1);
    }
    this.hours = hours;
    this.vHeaderStyle.height = `${this.calcHeight(start, end)}px`;
  }

  protected initDatepicker(start: number, end: number): void {
    const startDate: Date = new Date(start);
    const endDate: Date = new Date(end);
    startDate.setHours(startDate.getHours() - this.hourFirst);
    endDate.setHours(endDate.getHours() - this.hourFirst);
    this.datepickerOptions.minDate = startDate;
    this.datepickerOptions.maxDate = endDate;
  }

  protected updateView(): void {
    const top: number = this.viewport.scrollTop - this.baseHeight;
    const bottom: number = this.viewport.scrollTop + this.viewport.clientHeight + this.baseHeight;
    const left: number = this.viewport.scrollLeft - this.baseWidth;
    const right: number = this.viewport.scrollLeft + this.viewport.clientWidth + this.baseWidth;
    const start: number = this.calcTime(top);
    const end: number = this.calcTime(bottom);
    const checkedCategories: string[] = [];
    let categoryFilterEnabled: boolean = false;
    const garaponV4VerifyItems: Program[] = [];
    const garaponV4VerifyParams: string[] = [];

    this.categories.forEach((a: CategoryName): void => {
      if (a.checked) {
        checkedCategories.push(a.name);
      }
    });
    categoryFilterEnabled = (
      checkedCategories.length > 0 &&
      checkedCategories.length < this.categories.length
    );
    this.dates.forEach((a: { time: Date, isCurrent: boolean }): void => {
      a.isCurrent = this.isCurrentDate(a.time);
      if (a.isCurrent) {
        this.currentDate = a.time;
      }
    });
    for (let ci: number = 0; ci < this.programs.length; ci += 1) {
      const column: ProgramColumn = this.programs[ci];
      column.enabled = (
        ci * this.baseWidth <= right &&
        (ci + 1) * this.baseWidth >= left
      );
      if (column.enabled) {
        let countStart: number = 0;
        let countEnd: number = 0;
        for (let ii: number = 0; ii < column.programs.length; ii += 1) {
          const item: Program = column.programs[ii];
          item.enabled = (
            item.start < end &&
            item.end > start &&
            (!categoryFilterEnabled || checkedCategories.indexOf(item.categoryName.name) >= 0) &&
            (this.backendType !== 'garaponv4' || item.isRecorded)
          );
          if (item.enabled) {
            if (this.countMode !== 'none' && angular.isUndefined(item.count)) {
              if (!countStart || countStart > item.start) {
                countStart = item.start;
              }
              if (!countEnd || countEnd < item.end) {
                countEnd = item.end;
              }
            }
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
        if (this.countMode !== 'none' && countStart && countEnd) {
          this.CommentService.request('intervals', {
            params: {
              start: countStart,
              end: countEnd,
              channel: column.commentQuery,
              interval: '1m',
            },
          }).then(this.getCounter(ci), this.requestError);
        }
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
                garaponV4VerifyItems[i].enabled = false;
              }
            }
          }
        },
        this.requestError,
      );
    }
  }

  protected isCurrentDate(time: number | Date): boolean {
    const date: Date = new Date(time);
    date.setHours(this.hourFirst);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    const start: number = date.getTime();
    date.setDate(date.getDate() + 1);
    const end: number = date.getTime();
    const currentTime: number = this.calcTime(this.viewport.scrollTop);

    return currentTime >= start && currentTime < end;
  }

  protected initItem(item: Program): void {
    let recordedProgram;
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
      } else if (this.backendType === 'garaponv4' && item.isRecorded) {
        if (this.previewEnabled) {
          item.preview = item.thumbnail_url;
        }
      }
    }
  }

  protected getCounter(columnIndex: number): (response: ng.IHttpPromiseCallbackArg<{}>) => void {
    return (response: ng.IHttpPromiseCallbackArg<{
      data: { intervals: CommentService.CommentInterval[] };
    }>): void => {
      if (
        angular.isObject(response) &&
        angular.isObject(response.data) &&
        angular.isObject(response.data.data) &&
        angular.isArray(response.data.data.intervals)
      ) {
        this.programs[columnIndex].programs.filter(
          (a: Program): boolean => a.enabled && angular.isUndefined(a.count),
        ).forEach((item: Program): void => {
          let commentCount: number = 0;

          response.data.data.intervals.filter(
            (interval: { start: number }): boolean =>
              interval.start >= item.start && interval.start < item.end,
          ).forEach((interval: { n_hits: number }): void => {
            commentCount += interval.n_hits;
          });
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
        });
      }
    };
  }
}

angular.module('app')
  .component('programs', {
    templateUrl: 'templates/programs.html',
    controller: ProgramsController,
  });
