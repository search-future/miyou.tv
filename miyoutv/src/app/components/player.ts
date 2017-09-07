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
import * as url from 'url';
import * as http from 'http';
import * as CommonService from '../services/CommonService';
import * as ChinachuService from '../services/ChinachuService';
import * as GaraponService from '../services/GaraponService';
import * as GaraponSiteService from '../services/GaraponSiteService';
import * as PlayerService from '../services/PlayerService';
import * as CommentService from '../services/CommentService';

declare module angular { }

interface Comment extends CommentService.Comment {
  enabled: boolean;
}

interface CommentChannel extends CommentService.CommentChannel {
  enabled: boolean;
}


interface CommentInterval extends CommentService.CommentInterval {
  isLoaded?: boolean;
}

interface CommentThread {
  title: string;
  enabled: boolean;
}

interface Channel {
  name: string;
}

interface Program {
  [key: string]: any;
}

interface Archive {
  channels: ChinachuService.Channel[];
  programs: Program[];
}

interface GaraponMessages {
  [key: string]: string;
}

class PlayerController {
  static componentName: string = 'player';
  static $inject: string[] = [
    '$scope',
    '$location',
    '$timeout',
    'toaster',
    'CommonService',
    'PlayerService',
    'ChinachuService',
    'GaraponService',
    'GaraponSiteService',
    'CommentService',
  ];

  protected active: boolean = false;
  protected backendType: string;
  protected recorded: Program[] = [];
  protected channelOrder: string[] = ['gr', 'bs', 'cs'];
  protected updater: ng.IPromise<void>;
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

  public mode: string = 'recorded';
  public title: string = '';
  public channel: string;
  public programList: Program[] = [];
  public time: number = 0;
  public program: Program;
  public hasSurround: boolean;
  public audioTrackCount: number;
  public commentEnabled: boolean = true;
  public options: {
    playerRate?: number;
    playerDeinterlace?: string;
    playerAspectRatio?: string;
    playerAudioTrack?: number;
    playerAudioChannel?: number;
    commentDelay?: number;
    commentDuration?: number;
    commentMaxLines?: number;
    commentMaxItems?: number;
  } = {
    commentDelay: 0,
    commentDuration: 5000,
    commentMaxLines: 10,
    commentMaxItems: 50,
  };
  public commentOptions: {
    offset?: number;
    duration?: number;
    maxLines?: number;
    maxItems?: number;
  } = {};
  public commentInfo: {
    query?: string;
    start?: number;
    end?: number;
    count?: number;
  } = {

  };
  public commentIntervals: CommentInterval[] = [];
  public comments: Comment[] = [];
  public commentChannels: CommentChannel[] = [];
  public commentThreads: CommentThread[] = [];
  public sidebarCollapsed: boolean = false;
  public mainMenu: any = [
    [(): string => {
      if (this.PlayerService.playing) {
        return '<span class="fa fa-fw fa-pause"></span> 一時停止';
      }
      return '<span class="fa fa-fw fa-play"></span> 再生';
    }, (): void => {
      this.PlayerService.togglePause();
    }],
    null,
    ['<span class="fa fa-fw fa-step-backward"></span> 10秒戻す', (): void => {
      this.PlayerService.jumpBackward('11s');
    }],
    ['<span class="fa fa-fw fa-step-forward"></span> 30秒進める', (): void => {
      this.PlayerService.jumpForward('29s');
    }],
    null,
    ['再生速度', [
      ['<span class="fa fa-fw fa-forward"></span> 速くする', (): void => {
        this.PlayerService.speedUp();
      }],
      ['<span class="fa fa-fw fa-play"></span> 通常再生', (): void => {
        this.PlayerService.normalSpeed();
      }],
      ['<span class="fa fa-fw fa-backward"></span> 遅くする', (): void => {
        this.PlayerService.speedDown();
      }],
    ]],
    ['オーディオ', [
      ['<span class="fa fa-fw fa-rotate-right"></span> 音声切替', (): void => {
        this.PlayerService.toggleAudioTrack();
      }],
      null,
      ['<span class="fa fa-fw fa-volume-up"></span> 音量を上げる', (): void => {
        this.PlayerService.increaseVolume(5);
      }],
      ['<span class="fa fa-fw fa-volume-down"></span> 音量を下げる', (): void => {
        this.PlayerService.decreaseVolume(5);
      }],
      [(): string => {
        if (this.PlayerService.mute) {
          return '<span class="fa fa-fw fa-check text-primary"></span> ミュート';
        }
        return '<span class="fa fa-fw"></span> ミュート';
      }, (): void => {
        this.PlayerService.toggleMute();
      }],
    ]],
    ['ビデオ', [
      [(): string => {
        if (this.CommonService.fullscreen) {
          return '<span class="fa fa-fw fa-check text-primary"></span> 全画面表示';
        }
        return '<span class="fa fa-fw"></span> 全画面表示';
      }, (): void => {
        this.CommonService.fullscreen = !this.CommonService.fullscreen;
      }],
      [(): string => {
        if (this.CommonService.alwaysOnTop) {
          return '<span class="fa fa-fw fa-check text-primary"></span> 常に前面に表示';
        }
        return '<span class="fa fa-fw"></span> 常に前面に表示';
      }, (): void => {
        this.CommonService.alwaysOnTop = !this.CommonService.alwaysOnTop;
      }],
    ]],
    ['コメント', [
      [(): string => {
        if (this.commentEnabled) {
          return '<span class="fa fa-fw fa-check text-primary"></span> コメントを表示';
        }
        return '<span class="fa fa-fw"></span> コメントを表示';
      }, (): void => {
        this.commentEnabled = !this.commentEnabled;
      }],
      null,
      ['<span class="fa fa-fw fa-chevron-left"></span> 早める', (): void => {
        this.options.commentDelay -= 500;
      }],
      ['<span class="fa fa-fw fa-chevron-right"></span> 遅らせる', (): void => {
        this.options.commentDelay += 500;
      }],
    ]],
    null,
    ['<span class="fa fa-fw fa-fast-backward"></span> 前の番組へ', (): void => {
      this.previous();
    }],
    ['<span class="fa fa-fw fa-fast-forward"></span> 次の番組へ', (): void => {
      this.next();
    }],
    null,
    [(): string => {
      if (this.sidebarCollapsed) {
        return '<span class="fa fa-fw"></span> サイドバーを表示';
      }
      return '<span class="fa fa-fw fa-check text-primary"></span> サイドバーを表示';
    }, (): void => {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    }],
    ['<span class="fa fa-fw fa-stop"></span> 再生を終了', (): void => {
      this.CommonService.back();
    }],
  ];
  public mainHotkeys: { [key: string]: () => void } = {
    s: (): void => this.CommonService.back(),
    space: (): void => this.PlayerService.togglePause(),
    '=': (): void => this.PlayerService.normalSpeed(),
    '-': (): void => this.PlayerService.speedDown(),
    '+': (): void => this.PlayerService.speedUp(),
    b: (): void => this.PlayerService.toggleAudioTrack(),
    v: (): void => this.PlayerService.toggleSubtitlesTrack(),
    m: (): void => this.PlayerService.toggleMute(),
    p: (): void => this.previous(),
    n: (): void => this.next(),
    f: (): void => this.toggleFullscreen(),
    'mod+up': (): void => this.PlayerService.increaseVolume(5),
    'mod+down': (): void => this.PlayerService.decreaseVolume(5),
    'mod+left': (): void => this.PlayerService.jumpBackward('11s'),
    'mod+right': (): void => this.PlayerService.jumpForward('29s'),
    'shift+left': (): void => {
      this.options.commentDelay -= 500;
    },
    'shift+right': (): void => {
      this.options.commentDelay += 500;
    },
    'mod+s': (): void => {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    },
  };

  constructor(
    private $scope: ng.IScope,
    private $location: ng.ILocationService,
    private $timeout: ng.ITimeoutService,
    private toaster: toaster.IToasterService,
    private CommonService: CommonService.CommonService,
    private PlayerService: PlayerService.PlayerService,
    private ChinachuService: ChinachuService.ChinachuService,
    private GaraponService: GaraponService.GaraponService,
    private GaraponSiteService: GaraponSiteService.GaraponSiteService,
    private CommentService: CommentService.CommentService,
  ) {
    this.sidebarCollapsed = Boolean(this.CommonService.loadLocalStorage('sidebarCollapsed'));

    $scope.$watch(
      (): boolean => this.sidebarCollapsed,
      (value: boolean): void => {
        this.CommonService.saveLocalStorage('sidebarCollapsed', Boolean(value));
      },
    );
    $scope.$watch(
      (): number => PlayerService.time,
      (value: number): void => {
        this.time = value;
        if (value > 0 && PlayerService.preseekTime === 0) {
          const start: number = (value + this.commentOptions.offset) - 60000;
          const end: number = (value + this.commentOptions.offset) + 30000;
          const requestTargets: CommentInterval[] = this.commentIntervals.filter(a => (
            a.isLoaded !== true &&
            a.n_hits > 0 &&
            a.start > start &&
            a.start < end
          ));
          if (requestTargets.length > 0) {
            requestTargets.forEach((a: CommentInterval): void => {
              a.isLoaded = true;
            });
            CommentService.request('comments', {
              params: {
                start: requestTargets[0].start,
                end: requestTargets[requestTargets.length - 1].start + 60000,
                channel: this.commentInfo.query,
              },
              ignoreLoadingBar: true,
            }).then(
              (response: ng.IHttpPromiseCallbackArg<{ data: { comments: Comment[] } }>): void => {
                if (
                  angular.isObject(response) &&
                  angular.isObject(response.data) &&
                  angular.isObject(response.data.data) &&
                  angular.isArray(response.data.data.comments)
                ) {
                  response.data.data.comments.forEach((a: Comment): void => {
                    a.text = a.text.replace(/>>[0-9-,]+\s*/g, '').trim();
                    this.comments.push(a);
                  });
                  this.comments.sort((a: Comment, b: Comment): number => a.time - b.time);
                }
              },
              this.requestError,
            );
          }
        }
      },
    );
    $scope.$watch(
      (): number => PlayerService.audioTrackCount,
      (value: number): void => {
        this.audioTrackCount = value;
      });
    $scope.$watch(
      (): number => PlayerService.rate,
      (value: number): void => {
        this.options.playerRate = value;
      });
    $scope.$watch(
      (): number => this.options.playerRate,
      (value: number): void => {
        PlayerService.rate = value;
      });
    $scope.$watch(
      (): string => PlayerService.deinterlace,
      (value: string): void => {
        this.options.playerDeinterlace = value;
      });
    $scope.$watch(
      (): string => this.options.playerDeinterlace,
      (value: string): void => {
        PlayerService.deinterlace = value;
      });
    $scope.$watch(
      (): string => PlayerService.aspectRatio,
      (value: string): void => {
        this.options.playerAspectRatio = value;
      });
    $scope.$watch(
      (): string => this.options.playerAspectRatio,
      (value: string): void => {
        PlayerService.aspectRatio = value;
      });
    $scope.$watch(
      (): number => PlayerService.audioTrack,
      (value: number): void => {
        this.options.playerAudioTrack = value;
        PlayerService.audioChannel = 5;
        this.hasSurround = PlayerService.audioChannel === 5;
      });
    $scope.$watch(
      (): number => this.options.playerAudioTrack,
      (value: number): void => {
        PlayerService.audioTrack = value;
      });
    $scope.$watch(
      (): number => PlayerService.audioChannel,
      (value: number): void => {
        this.options.playerAudioChannel = value;
      });
    $scope.$watch(
      (): number => this.options.playerAudioChannel,
      (value: number): void => {
        PlayerService.audioChannel = value;
      });

    $scope.$watch(
      (): boolean => this.commentEnabled,
      (value: boolean): void => {
        if (value) {
          PlayerService.setScreenText('コメント表示');
        } else {
          PlayerService.setScreenText('コメント非表示');
        }
      });
    $scope.$watch(
      (): number => this.options.commentDuration,
      (value: number): void => {
        this.commentOptions.duration = value;
        this.saveSetting();
      });
    $scope.$watch(
      (): number => this.options.commentDelay,
      (newValue: number, oldValue: number): void => {
        this.commentOptions.offset -= newValue - oldValue;
        this.saveSetting();
        if (newValue >= 0) {
          PlayerService.setScreenText(`コメント後退 ${Math.abs(newValue / 1000)}秒`);
        } else {
          PlayerService.setScreenText(`コメント前進 ${Math.abs(newValue / 1000)}秒`);
        }
      });
    $scope.$watch(
      (): number => this.options.commentMaxLines,
      (value: number): void => {
        this.commentOptions.maxLines = value;
        this.saveSetting();
      });
    $scope.$watch(
      (): number => this.options.commentMaxItems,
      (value: number): void => {
        this.commentOptions.maxItems = value;
        this.saveSetting();
      });

    $scope.$watchGroup(
      [
        (): Program => this.program,
        (): CommentChannel[] => this.commentChannels,
      ],
      (values: [Program, CommentChannel[]]): void => {
        const [program, commentChannels]: [Program, CommentChannel[]] = values;
        this.commentIntervals = [];
        if (program && commentChannels.length > 0) {
          this.commentInfo.start = program.start;
          this.commentInfo.end = program.end;
          this.commentInfo.query = this.resolveQuery(program.channel);
          let channels: string[] = this.commentInfo.query.split('||');
          this.commentChannels.forEach((a: CommentChannel): void => {
            if (channels.indexOf(a.id) >= 0) {
              a.enabled = true;
            }
          });
          channels = null;
        }
      },
    );
    $scope.$watch(
      (): CommentChannel[] => this.commentChannels,
      (value: CommentChannel[]): void => {
        const enabledChannels: string[] = [];
        value.forEach((a: CommentChannel): void => {
          if (a.enabled) {
            enabledChannels.push(a.id);
          }
        });
        this.commentInfo.query = enabledChannels.join('||');
      },
      true,
    );
    $scope.$watchGroup(
      [
        (): number => this.commentInfo.start,
        (): number => this.commentInfo.end,
        (): string => this.commentInfo.query,
      ],
      (values: [number, number, string]): void => {
        const [start, end, query]: [number, number, string] = values;
        const margin: number = Math.abs(this.options.commentDelay) + 10000;
        this.commentInfo.count = 0;
        this.comments = [];
        if (start && end && query) {
          this.saveQuery();
          CommentService.request('intervals', {
            params: {
              start: start - margin,
              end: end + margin,
              channel: query,
              interval: '1m',
              fill: 1,
            },
          }).then(
            (response: ng.IHttpPromiseCallbackArg<{
              data: { n_hits: number, intervals: CommentInterval[] };
            }>): void => {
              if (
                angular.isObject(response) &&
                angular.isObject(response.data) &&
                angular.isObject(response.data.data) &&
                angular.isArray(response.data.data.intervals)

              ) {
                this.commentIntervals = response.data.data.intervals;
                this.commentInfo.count = response.data.data.n_hits;
              }
            },
            this.requestError,
          );
        }
      },
    );
    $scope.$watchCollection(
      (): Comment[] => this.comments,
      (value: Comment[]): void => {
        const titles: string[] = [];
        const threads: CommentThread[] = [];
        this.commentThreads.forEach((a: CommentThread): void => {
          if (titles.indexOf(a.title) < 0) {
            titles.push(a.title);
            threads.push(a);
          }
        });
        if (angular.isArray(value)) {
          value.forEach((a: Comment): void => {
            if (titles.indexOf(a.title) < 0) {
              titles.push(a.title);
              threads.push({
                title: a.title,
                enabled: true,
              });
            }
          });
        }
        this.commentThreads = threads;
      },
    );
    $scope.$watch(
      (): CommentThread[] => this.commentThreads,
      (value: CommentThread[]): void => {
        const threads: CommentThread[] = value;
        const enabledThreads: string[] = [];
        if (angular.isArray(value)) {
          threads.forEach((a: CommentThread): void => {
            if (a.enabled) {
              enabledThreads.push(a.title);
            }
          });
          if (enabledThreads.length > 0) {
            this.comments.forEach((a: Comment): void => {
              a.enabled = enabledThreads.indexOf(a.title) >= 0;
            });
          } else {
            this.comments.forEach((a: Comment): void => {
              a.enabled = false;
            });
          }
        }
      },
      true,
    );

    $scope.$on('Player.EndReached', (): void => {
      this.next();
    });
    $scope.$on('Player.EncounteredError', (): void => {
      PlayerService.stop();
    });
    $scope.$on('Player.Stopped', (): void => {
      CommonService.back();
    });
  }

  public stop(): void {
    this.PlayerService.stop();
  }
  public toggleFullscreen(): void {
    this.CommonService.fullscreen = !this.CommonService.fullscreen;
  }

  public $onInit(): void {
    this.active = true;
    this.backendType = this.CommonService.loadLocalStorage('backendType');
    this.loadSetting();
    switch (this.backendType) {
      case 'garapon':
        this.initGarapon();
        break;
      case 'garaponv4':
        this.initGaraponV4();
        break;
      case 'chinachu':
      default:
        this.initChinachu();
    }
    this.CommonService.powerSave = false;
  }

  public $onDestroy(): void {
    this.active = false;
    this.$timeout.cancel(this.updater);
    this.ChinachuService.cancelRequests();
    this.GaraponService.cancelRequests();
    this.GaraponSiteService.cancelRequests();
    this.CommonService.powerSave = true;
  }

  protected requestError(response: ng.IHttpPromiseCallbackArg<any>): void {
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

  protected initChinachu(): void {
    const backend: string = this.CommonService.loadLocalStorage('chinachuUrl');
    const user: string = this.CommonService.loadLocalStorage('chinachuUser');
    const password: string = this.CommonService.loadLocalStorage('chinachuPassword');
    this.ChinachuService.url = backend;
    this.ChinachuService.user = user;
    this.ChinachuService.password = password;
    this.ChinachuService.request('/api/recorded.json').then(
      (response: ng.IHttpPromiseCallbackArg<{}>): void => {
        if (
          angular.isObject(response) &&
          angular.isArray(response.data)
        ) {
          response.data.sort((a, b): number => a.end - b.end);
          this.recorded = response.data;
        } else {
          this.CommonService.errorModal('Chinachu Error', '録画データが取得できませんでした。');
        }
      },
    ).then(
      (): void => this.init(),
      (response: ng.IHttpPromiseCallbackArg<{}>): void => {
        this.CommonService.errorModal('Chinachu Error', 'Chinachuとの通信に失敗しました。');
        this.requestError(response);
      },
    );
    this.updater = this.$timeout((): void => this.updateChinachu(), 300000);
  }

  protected updateChinachu(): void {
    this.ChinachuService.request('/api/recorded.json', {
      cache: false,
    }).then((response: ng.IHttpPromiseCallbackArg<Program[]>): void => {
      if (
        angular.isObject(response) &&
        angular.isArray(response.data)
      ) {
        response.data.sort((a: Program, b: Program): number => a.end - b.end);
        this.recorded = response.data;
      } else {
        this.CommonService.errorModal('Chinachu Error', '録画データが取得できませんでした。');
      }
    });
    this.$timeout.cancel(this.updater);
    this.updater = this.$timeout((): void => this.updateChinachu(), 300000);
  }

  protected initGarapon(): void {
    const auth: boolean = this.CommonService.loadLocalStorage('garaponAuth');
    const backend: string = this.CommonService.loadLocalStorage('garaponUrl');
    const user: string = this.CommonService.loadLocalStorage('garaponUser');
    const password: string = this.CommonService.loadLocalStorage('garaponPassword');
    let promise: ng.IPromise<any>;
    if (user && password) {
      this.GaraponService.user = user;
      this.GaraponService.password = password;
      if (auth || !backend) {
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
        this.GaraponService.backend = backend;
        promise = this.GaraponService.login();
      }
      promise.then(
        (): void => this.init(),
        (response: ng.IHttpPromiseCallbackArg<{ status: number, login: number }>): void => {
          if (
            angular.isObject(response) &&
            response.status === 200 &&
            angular.isObject(response.data)
          ) {
            let message;
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
        });
    }
  }

  protected initGaraponV4(): void {
    const user: string = this.CommonService.loadLocalStorage('garaponUser');
    const password: string = this.CommonService.loadLocalStorage('garaponPassword');
    this.GaraponSiteService.user = user;
    this.GaraponSiteService.password = password;
    this.GaraponService.user = user;
    this.GaraponService.password = password;
    this.GaraponSiteService
      .login()
      .then((): ng.IPromise<{}> => this.GaraponService.loginV4())
      .then((): void => this.init(), this.requestError);
  }

  protected init(): void {
    const params: { [key: string]: string } = this.$location.search();
    this.mode = params.mode;
    switch (params.mode) {
      case 'recorded':
        this.playRecorded(params.id);
        break;
      case 'channel':
        this.playChannel(
          params.type,
          parseInt(params.sid, 10),
          parseInt(params.stype || '0', 10),
          parseInt(params.start, 10) + this.options.commentDelay,
          parseInt(params.end, 10),
        );
        break;
      default:
    }
    this.CommentService.request('channels').then(
      (response: ng.IHttpPromiseCallbackArg<{ data: { channels: CommentChannel[] } }>): void => {
        if (
          angular.isObject(response) &&
          angular.isObject(response.data) &&
          angular.isObject(response.data.data) &&
          angular.isArray(response.data.data.channels)
        ) {
          response.data.data.channels.sort((a: CommentChannel, b: CommentChannel): number => {
            const aType: number = this.channelOrder.indexOf(a.type.slice(0, 2));
            const aNum: number = parseInt(a.type.slice(2), 10);
            const bType: number = this.channelOrder.indexOf(b.type.slice(0, 2));
            const bNum: number = parseInt(b.type.slice(2), 10);
            return ((aType - bType) * 100) + (aNum - bNum);
          });
          this.commentChannels = response.data.data.channels;
        }
      },
      this.requestError,
    );
  }

  protected playRecorded(id: string): void {
    switch (this.backendType) {
      case 'garapon':
        this.playGarapon(id);
        break;
      case 'garaponv4':
        this.playGaraponV4(id);
        break;
      case 'chinachu':
      default:
        this.playChinachu(id);
    }
  }

  protected playChinachu(id: string): void {
    const mrl: string = this.ChinachuService.getUrl(
      `/api/recorded/${id}/watch.m2ts?c:v=copy&c:a=copy`,
    );
    this.program = null;
    this.ChinachuService.request(
      `/api/recorded/${id}.json`,
    ).then(
      (recordedResponse: ng.IHttpPromiseCallbackArg<Program>): void => {
        if (
          angular.isObject(recordedResponse) &&
          angular.isObject(recordedResponse.data)
        ) {
          this.program = recordedResponse.data;
          this.program.categoryName = this.ChinachuService.convertCategory(this.program.category);
          this.title = this.program.fullTitle;
          this.channel = this.program.channel.name;
          this.commentOptions.offset = this.program.start - this.options.commentDelay;
          this.PlayerService.overwriteLength = this.program.seconds * 1000;

          this.ChinachuService.request('/archive.json').then(
            (archiveResponse: ng.IHttpPromiseCallbackArg<Archive>): void => {
              if (
                angular.isObject(archiveResponse) &&
                angular.isObject(archiveResponse.data) &&
                angular.isArray(archiveResponse.data.programs)
              ) {
                const programService: ChinachuService.ChannelService
                  = this.ChinachuService.serviceFromLegacy(
                    this.program.channel,
                    archiveResponse.data.channels,
                  );
                this.programList = archiveResponse.data.programs.filter((a: Program): boolean => (
                  a.networkId === programService.networkId &&
                  a.serviceId === programService.serviceId &&
                  a.startAt < this.program.end &&
                  a.startAt + a.duration > this.program.start
                ));
              }
            });
          this.ChinachuService.request(
            `/api/recorded/${id}/file.json`,
          ).then(
            (fileResponse: ng.IHttpPromiseCallbackArg<{ size: number }>): void => {
              if (
                angular.isObject(fileResponse) &&
                angular.isObject(fileResponse.data)
              ) {
                const fileSize: number = fileResponse.data.size;
                const chinachuUrl: url.Url = url.parse(this.ChinachuService.getUrl());
                const request: http.ClientRequest = http.request(
                  {
                    method: 'GET',
                    protocol: chinachuUrl.protocol,
                    hostname: chinachuUrl.hostname,
                    port: parseInt(chinachuUrl.port, 10),
                    path: `/api/recorded/${id}/watch.m2ts?c:v=copy&c:a=copy&ss=10&t=10`,
                    auth: chinachuUrl.auth,
                    timeout: 10000,
                  },
                  (watchResponse: http.IncomingMessage): void => {
                    const streamSize: number = parseInt(
                      watchResponse.headers['content-length'] as string, 10,
                    );
                    const ms: number = (fileSize * 10000) / streamSize;
                    if (streamSize > 1000000) {
                      this.PlayerService.overwriteLength = ms;
                    }
                    this.playWithInfo(mrl);
                  });
                request.on('error', (): void => {
                  this.playWithInfo(mrl);
                });
                request.end();
              }
            },
            (): void => {
              this.playWithInfo(mrl);
            },
          );
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

  protected playGarapon(id: string): void {
    this.GaraponService.request(
      'search',
      {
        data: {
          gtvid: id,
        },
      },
      false,
    ).then(
      (response: ng.IHttpPromiseCallbackArg<{ program: Program[] }>): void => {
        const mrl: string = this.GaraponService.getStreamUrl(id);
        if (
          this.checkGaraponSearch(response) &&
          angular.isArray(response.data.program) &&
          angular.isObject(response.data.program[0])
        ) {
          const program: Program = response.data.program[0];
          this.program = program;
          this.program.channel = {
            type: program.gtvid.slice(0, 2),
            sid: program.ch,
            name: program.bc,
          };
          this.program.start = this.GaraponService.convertDate(program.startdate);
          this.program.end = program.start + this.GaraponService.convertDuration(program.duration);
          this.program.seconds = this.GaraponService.convertDuration(program.duration) / 1000;
          this.program.categoryName = this.GaraponService.convertCategory(program.genre[0]);
          this.title = program.title;
          this.channel = program.bc;
          this.commentOptions.offset = this.program.start - this.options.commentDelay;
          this.PlayerService.overwriteLength = (
            this.GaraponService.convertDuration(program.duration)
          );
          this.playWithInfo(mrl);
        }
        this.PlayerService.play(mrl);
      },
      this.requestError,
    );
  }

  protected playGaraponV4(id: string): void {
    let program: Program;
    this.GaraponSiteService.request(
      'Program/Search/programInfo',
      {
        data: {
          gtvid: id,
        },
      },
      false,
    ).then(
      (response: ng.IHttpPromiseCallbackArg<{ program: Program[] }>): ng.IHttpPromise<{}> => {
        if (
          this.checkGaraponSearch(response) &&
          angular.isObject(response.data.program)
        ) {
          program = response.data.program;
          return this.GaraponService.request('Program/', {
            data: {
              action: 'check',
              starttime: program.starttime,
              endtime: program.endtime,
              tsid10: program.tsid10,
              service_type: program.service_type,
            },
          });
        }
        return null;
      },
      this.requestError,
    ).then(
      (response: ng.IHttpPromiseCallbackArg<{
        data: {
          result: number;
        }[];
      }>): void => {
        if (
          this.checkGaraponSearch(response)
        ) {
          if (response.data.data[0].result) {
            this.program = program;
            this.program.channel = {
              type: program.gtvid.slice(0, 2),
              sid: program.tsid10,
              name: program.bcname,
            };
            this.program.start = program.starttime * 1000;
            this.program.end = program.endtime * 1000;
            this.program.seconds = program.duration;
            this.program.categoryName = this.GaraponSiteService.convertCategory(program.genre[0]);
            this.title = program.title;
            this.channel = program.bcname;
            this.commentOptions.offset = this.program.start - this.options.commentDelay;
            this.PlayerService.overwriteLength = program.durationtime * 1000;
            this.playWithInfo(this.GaraponService.getV4Url(program.m3u8_url));
          } else {
            this.CommonService.errorModal('Player Error', '録画データが見つかりません。');
          }
        }
      },
      this.requestError,
    );
  }

  protected playWithInfo(mrl: string): void {
    this.PlayerService.play(mrl);
    this.PlayerService.setScreenText(
      [
        this.program.id,
        this.title,
        this.channel,
        this.CommonService.formatDate(
          this.program.start,
          'yyyy/MM/dd(EEE) A HHHH:mm:ss',
        ),
      ].join('\n'),
      true,
    );
  }

  protected playChannel(
    type: string,
    sid: number,
    stype: number,
    start: number,
    end: number,
  ): void {
    let program: Program = null;
    switch (this.backendType) {
      case 'garapon':
        this.GaraponService.request(
          'search', {
            data: {
              n: 1,
              ch: sid,
              dt: 's',
              sdate: this.CommonService.formatDate(start, 'yyyy-MM-dd HH:mm:ss'),
              sort: 'sta',
            },
          },
        ).then(
          (response: ng.IHttpPromiseCallbackArg<{ program: Program[] }>): void => {
            if (
              this.checkGaraponSearch(response) &&
              angular.isArray(response.data.program) &&
              angular.isObject(response.data.program[0])
            ) {
              this.playRecorded(response.data.program[0].gtvid);
            }
          },
          this.requestError,
        );
        break;
      case 'garaponv4':
        this.GaraponSiteService.request(
          'Program/Search/search',
          {
            data: {
              starttime: start / 1000,
              endtime: end / 1000,
              tsids: sid,
            },
          },
        ).then(
          (response: ng.IHttpPromiseCallbackArg<{ programs: Program[] }>): void => {
            if (
              this.checkGaraponSearch(response) &&
              angular.isArray(response.data.programs)
            ) {
              const programs: Program[] = response.data.programs.filter(
                (a: Program): boolean => String(a.service_type) === String(stype),
              );
              if (programs.length > 0) {
                this.playRecorded(programs[0].gtvid);
              }
            }
          },
          this.requestError,
        );
        break;
      case 'chinachu':
      default:
        program = this.recorded.filter((a: Program): boolean => (
          a.channel.type === type &&
          a.channel.sid === sid &&
          a.end > start &&
          (!end || a.start < end)
        ))[0];
        if (program) {
          this.PlayerService.preseekTime = start - program.start;
          this.playRecorded(program.id);
        } else {
          this.CommonService.errorModal('Player Error', '録画データが見つかりません。');
        }
    }
  }

  public next(): void {
    let program;
    switch (this.backendType) {
      case 'garapon':
        this.GaraponService.request(
          'search',
          {
            data: {
              n: 1,
              ch: this.program.ch,
              dt: 's',
              sdate: this.CommonService.formatDate(this.program.end, 'yyyy-MM-dd HH:mm:ss'),
              sort: 'sta',
            },
          },
          false,
        ).then(
          (response: ng.IHttpPromiseCallbackArg<{ program: Program[] }>): void => {
            if (
              this.checkGaraponSearch(response) &&
              angular.isArray(response.data.program) &&
              angular.isObject(response.data.program[0])
            ) {
              this.playRecorded(response.data.program[0].gtvid);
            }
          },
          this.requestError,
        );
        break;
      case 'garaponv4':
        this.GaraponSiteService.request(
          'Program/Search/search',
          {
            data: {
              tsids: this.program.tsid10,
              starttime: Math.floor((this.program.end) / 1000) - 1,
              sort: 'sta',
            },
          },
          false,
        ).then(
          (response: ng.IHttpPromiseCallbackArg<{ programs: Program[] }>): void => {
            if (
              this.checkGaraponSearch(response) &&
              angular.isArray(response.data.programs)
            ) {
              const programs: Program[] = response.data.programs.filter((a: Program): boolean => (
                a.service_type === this.program.service_type
              ));
              if (programs.length > 0) {
                this.playRecorded(programs[0].gtvid);
              }
            }
          },
          this.requestError,
        );
        break;
      case 'chinachu':
      default:
        program = this.recorded.filter((a: Program): boolean => (
          a.channel.type === this.program.channel.type &&
          a.channel.sid === this.program.channel.sid &&
          a.start >= this.program.end
        ))[0];
        if (program) {
          this.playRecorded(program.id);
        }
    }
  }

  public previous(): void {
    let program: Program;
    switch (this.backendType) {
      case 'garapon':
        this.GaraponService.request(
          'search',
          {
            data: {
              n: 1,
              ch: this.program.ch,
              dt: 'e',
              edate: this.CommonService.formatDate(this.program.start, 'yyyy-MM-dd HH:mm:ss'),
              sort: 'std',
            },
          },
          false,
        ).then(
          (response: ng.IHttpPromiseCallbackArg<{ program: Program[] }>): void => {
            if (
              this.checkGaraponSearch(response) &&
              angular.isArray(response.data.program) &&
              angular.isObject(response.data.program[0])
            ) {
              this.playRecorded(response.data.program[0].gtvid);
            }
          },
          this.requestError,
        );
        break;
      case 'garaponv4':
        this.GaraponSiteService.request(
          'Program/Search/search',
          {
            data: {
              tsids: this.program.tsid10,
              starttime: Math.floor((this.program.start) / 1000) - 604800,
              endtime: Math.floor((this.program.start) / 1000) - 10,
              sort: 'std',
            },
          },
          false,
        ).then(
          (response: ng.IHttpPromiseCallbackArg<{ programs: Program[] }>): void => {
            if (
              this.checkGaraponSearch(response) &&
              angular.isArray(response.data.programs)
            ) {
              const programs: Program[] = response.data.programs.filter((a: Program): boolean => (
                a.service_type === this.program.service_type
              ));
              if (programs.length > 0) {
                this.playRecorded(programs[0].gtvid);
              }
            }
          },
          this.requestError,
        );
        break;
      case 'chinachu':
      default:
        program = this.recorded.filter((a: Program): boolean => (
          a.channel.type === this.program.channel.type &&
          a.channel.sid === this.program.channel.sid &&
          a.end <= this.program.start
        )).slice(-1)[0];
        if (program) {
          this.playRecorded(program.id);
        }
    }
  }

  protected saveSetting(): void {
    const setting: { [key: string]: any } = {
      delay: this.options.commentDelay,
      duration: this.options.commentDuration,
      maxLines: this.options.commentMaxLines,
      maxItems: this.options.commentMaxItems,
    };
    this.CommonService.saveLocalStorage('comment', setting);
  }

  protected loadSetting(): void {
    const setting: { [key: string]: any } = this.CommonService.loadLocalStorage('comment') || {};
    if (angular.isNumber(setting.delay)) {
      this.options.commentDelay = setting.delay;
    }
    if (angular.isNumber(setting.duration)) {
      this.options.commentDuration = setting.duration;
    }
    if (angular.isNumber(setting.maxLines)) {
      this.options.commentMaxLines = setting.maxLines;
    }
    if (angular.isNumber(setting.maxItems)) {
      this.options.commentMaxItems = setting.maxItems;
    }
  }

  protected saveQuery(): void {
    if (this.channel && this.commentInfo.query) {
      const queries: {
        [key: string]: string;
      } = this.CommonService.loadLocalStorage('commentQueries') || {};
      queries[this.channel] = this.commentInfo.query;
      this.CommonService.saveLocalStorage('commentQueries', queries);
    }
  }

  protected resolveQuery(channel: CommentService.Channel): string {
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
}


angular.module('app')
  .component('player', {
    templateUrl: 'templates/player.html',
    controller: PlayerController,
  });
