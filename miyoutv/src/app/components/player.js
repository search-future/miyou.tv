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
(function (url, http) {
  'use strict';

  angular.module('app')
    .component('player', {
      templateUrl: 'templates/player.html',
      controller: PlayerCtrl
    });

  function PlayerCtrl(
    $scope,
    $location,
    $timeout,
    toaster,
    CommonService,
    PlayerService,
    ChinachuService,
    GaraponService,
    GaraponSiteService,
    CommentService
  ) {
    var $ctrl = this;
    var active = false;
    var backendType;
    var recorded = [];
    var channelOrder = ['gr', 'bs', 'cs'];
    var updater;
    var garaponLoginStatusMessages = {
      1: null,
      100: 'Parameter error',
      200: 'ガラポン端末のインターネット接続を確認してください。'
    };
    var garaponLoginMessages = {
      1: null,
      0: 'ガラポン端末へのログインに失敗しました。',
      100: 'ログインIDが間違っています。',
      200: 'ログインパスワードが間違っています。',
      400: 'Unknown developer'
    };
    var garaponSearchMessages = {
      1: null,
      0: 'Invalid session',
      100: 'Parameter error',
      200: 'Database error',
      success: null,
      unknown_developer: 'Unknown developer',
      invalid_params: 'Invalid params',
      internal_error: 'Internal error',
      unauthorized: 'Unauthorized',
      no_program: 'No program'
    };

    $ctrl.mode = 'recorded';
    $ctrl.title = '';
    $ctrl.time = 0;
    $ctrl.commentEnabled = true;
    $ctrl.commentInfo = {};
    $ctrl.options = {
      commentDelay: 0,
      commentDuration: 5000,
      commentMaxLines: 10,
      commentMaxItems: 50
    };
    $ctrl.commentOptions = {};
    $ctrl.commentInfo = {};
    $ctrl.commentIntervals = [];
    $ctrl.comments = [];
    $ctrl.commentChannels = [];
    $ctrl.commentThreads = [];
    $ctrl.sidebarCollapsed = Boolean(CommonService.loadLocalStorage('sidebarCollapsed'));

    $ctrl.mainMenu = [
      [function () {
        if (PlayerService.playing()) {
          return '<span class="fa fa-fw fa-pause"></span> 一時停止';
        }
        return '<span class="fa fa-fw fa-play"></span> 再生';
      }, function () {
        PlayerService.togglePause();
      }],
      null,
      ['<span class="fa fa-fw fa-step-backward"></span> 10秒戻す', function () {
        PlayerService.jumpBackward('11s');
      }],
      ['<span class="fa fa-fw fa-step-forward"></span> 30秒進める', function () {
        PlayerService.jumpForward('29s');
      }],
      null,
      ['再生速度', [
        ['<span class="fa fa-fw fa-forward"></span> 速くする', function () {
          PlayerService.speedUp();
        }],
        ['<span class="fa fa-fw fa-play"></span> 通常再生', function () {
          PlayerService.normalSpeed();
        }],
        ['<span class="fa fa-fw fa-backward"></span> 遅くする', function () {
          PlayerService.speedDown();
        }]
      ]],
      ['オーディオ', [
        ['<span class="fa fa-fw fa-rotate-right"></span> 音声切替', function () {
          PlayerService.toggleAudioTrack();
        }],
        null,
        ['<span class="fa fa-fw fa-volume-up"></span> 音量を上げる', function () {
          PlayerService.increaseVolume(5);
        }],
        ['<span class="fa fa-fw fa-volume-down"></span> 音量を下げる', function () {
          PlayerService.decreaseVolume(5);
        }],
        [function () {
          if (PlayerService.mute()) {
            return '<span class="fa fa-fw fa-check text-primary"></span> ミュート';
          }
          return '<span class="fa fa-fw"></span> ミュート';
        }, function () {
          PlayerService.toggleMute();
        }]
      ]],
      ['ビデオ', [
        [function () {
          if (CommonService.isFullscreen()) {
            return '<span class="fa fa-fw fa-check text-primary"></span> 全画面表示';
          }
          return '<span class="fa fa-fw"></span> 全画面表示';
        }, function () {
          CommonService.setFullscreen(!CommonService.isFullscreen());
        }],
        [function () {
          if (CommonService.isAlwaysOnTop()) {
            return '<span class="fa fa-fw fa-check text-primary"></span> 常に前面に表示';
          }
          return '<span class="fa fa-fw"></span> 常に前面に表示';
        }, function () {
          CommonService.setAlwaysOnTop(!CommonService.isAlwaysOnTop());
        }]
      ]],
      ['コメント', [
        [function () {
          if ($ctrl.commentEnabled) {
            return '<span class="fa fa-fw fa-check text-primary"></span> コメントを表示';
          }
          return '<span class="fa fa-fw"></span> コメントを表示';
        }, function () {
          $ctrl.commentEnabled = !$ctrl.commentEnabled;
        }],
        null,
        ['<span class="fa fa-fw fa-chevron-left"></span> 早める', function () {
          $ctrl.options.commentDelay -= 500;
        }],
        ['<span class="fa fa-fw fa-chevron-right"></span> 遅らせる', function () {
          $ctrl.options.commentDelay += 500;
        }]
      ]],
      null,
      ['<span class="fa fa-fw fa-fast-backward"></span> 前の番組へ', function () {
        previous();
      }],
      ['<span class="fa fa-fw fa-fast-forward"></span> 次の番組へ', function () {
        next();
      }],
      null,
      [function () {
        if ($ctrl.sidebarCollapsed) {
          return '<span class="fa fa-fw"></span> サイドバーを表示';
        }
        return '<span class="fa fa-fw fa-check text-primary"></span> サイドバーを表示';
      }, function () {
        $ctrl.sidebarCollapsed = !$ctrl.sidebarCollapsed;
      }],
      ['<span class="fa fa-fw fa-stop"></span> 再生を終了', function () {
        CommonService.back();
      }]
    ];

    $ctrl.mainHotkeys = {
      s: CommonService.back,
      space: PlayerService.togglePause,
      '=': PlayerService.normalSpeed,
      '-': PlayerService.speedDown,
      '+': PlayerService.speedUp,
      b: PlayerService.toggleAudioTrack,
      v: PlayerService.toggleSubtitlesTrack,
      m: PlayerService.toggleMute,
      p: previous,
      n: next,
      f: function () {
        $ctrl.toggleFullscreen();
      },
      'mod+up': function () {
        PlayerService.increaseVolume(5);
      },
      'mod+down': function () {
        PlayerService.decreaseVolume(5);
      },
      'mod+left': function () {
        PlayerService.jumpBackward('11s');
      },
      'mod+right': function () {
        PlayerService.jumpForward('29s');
      },
      'shift+left': function () {
        $ctrl.options.commentDelay -= 500;
      },
      'shift+right': function () {
        $ctrl.options.commentDelay += 500;
      },
      'mod+s': function () {
        $ctrl.sidebarCollapsed = !$ctrl.sidebarCollapsed;
      }
    };
    $ctrl.stop = PlayerService.stop;
    $ctrl.next = next;
    $ctrl.previous = previous;

    $ctrl.toggleFullscreen = function () {
      CommonService.setFullscreen(!CommonService.isFullscreen());
    };

    $ctrl.$onInit = function () {
      active = true;
      backendType = CommonService.loadLocalStorage('backendType');
      loadSetting();
      switch (backendType) {
        case 'garapon':
          initGarapon();
          break;
        case 'garaponv4':
          initGaraponV4();
          break;
        case 'chinachu':
        default:
          initChinachu();
      }
    };
    $ctrl.$onDestroy = function () {
      active = false;
      $timeout.cancel(updater);
      ChinachuService.cancelRequests();
      GaraponService.cancelRequests();
      GaraponSiteService.cancelRequests();
    };

    $scope.$watch(function () {
      return $ctrl.sidebarCollapsed;
    }, function (value) {
      CommonService.saveLocalStorage('sidebarCollapsed', Boolean(value));
    });
    $scope.$watch(function () {
      return PlayerService.time();
    }, function (value) {
      var requestTargets;
      var start;
      var end;
      $ctrl.time = value;
      if (value > 0 && PlayerService.preseekTime() === 0) {
        start = (value + $ctrl.commentOptions.offset) - 60000;
        end = (value + $ctrl.commentOptions.offset) + 30000;
        requestTargets = $ctrl.commentIntervals.filter(function (a) {
          return (
            a.isLoaded !== true &&
            a.n_hits > 0 &&
            a.start > start &&
            a.start < end
          );
        });
        if (requestTargets.length > 0) {
          requestTargets.forEach(function (a) {
            var interval = a;
            interval.isLoaded = true;
          });
          CommentService.request('comments', {
            params: {
              start: requestTargets[0].start,
              end: requestTargets[requestTargets.length - 1].start + 60000,
              channel: $ctrl.commentInfo.query
            },
            ignoreLoadingBar: true
          }).then(function (response) {
            if (
              angular.isObject(response) &&
              angular.isObject(response.data) &&
              angular.isObject(response.data.data) &&
              angular.isArray(response.data.data.comments)
            ) {
              response.data.data.comments.forEach(function (a) {
                var comment = a;
                comment.text = comment.text.replace(/>>[0-9-,]+\s*/g, '').trim();
                $ctrl.comments.push(comment);
              });
              $ctrl.comments.sort(function (a, b) {
                return a.time - b.time;
              });
            }
          }, requestError);
        }
      }
    });
    $scope.$watch(function () {
      return PlayerService.audioTrackCount();
    }, function (value) {
      $ctrl.audioTrackCount = value;
    });
    $scope.$watch(function () {
      return PlayerService.rate();
    }, function (value) {
      $ctrl.options.playerRate = value;
    });
    $scope.$watch(function () {
      return $ctrl.options.playerRate;
    }, function (value) {
      PlayerService.rate(value);
    });
    $scope.$watch(function () {
      return PlayerService.deinterlace();
    }, function (value) {
      $ctrl.options.playerDeinterlace = value;
    });
    $scope.$watch(function () {
      return $ctrl.options.playerDeinterlace;
    }, function (value) {
      PlayerService.deinterlace(value);
    });
    $scope.$watch(function () {
      return PlayerService.aspectRatio();
    }, function (value) {
      $ctrl.options.playerAspectRatio = value;
    });
    $scope.$watch(function () {
      return $ctrl.options.playerAspectRatio;
    }, function (value) {
      PlayerService.aspectRatio(value);
    });
    $scope.$watch(function () {
      return PlayerService.audioTrack();
    }, function (value) {
      $ctrl.options.playerAudioTrack = value;
      $ctrl.hasSurround = PlayerService.audioChannel(5) === 5;
    });
    $scope.$watch(function () {
      return $ctrl.options.playerAudioTrack;
    }, function (value) {
      PlayerService.audioTrack(value);
    });
    $scope.$watch(function () {
      return PlayerService.audioChannel();
    }, function (value) {
      $ctrl.options.playerAudioChannel = value;
    });
    $scope.$watch(function () {
      return $ctrl.options.playerAudioChannel;
    }, function (value) {
      PlayerService.audioChannel(value);
    });

    $scope.$watch(function () {
      return $ctrl.commentEnabled;
    }, function (value) {
      if (value) {
        PlayerService.setScreenText('コメント表示');
      } else {
        PlayerService.setScreenText('コメント非表示');
      }
    });
    $scope.$watch(function () {
      return $ctrl.options.commentDuration;
    }, function (value) {
      $ctrl.commentOptions.duration = value;
      saveSetting();
    });
    $scope.$watch(function () {
      return $ctrl.options.commentDelay;
    }, function (newValue, oldValue) {
      $ctrl.commentOptions.offset -= newValue - oldValue;
      saveSetting();
      if (newValue >= 0) {
        PlayerService.setScreenText('コメント後退 ' + Math.abs(newValue / 1000) + '秒');
      } else {
        PlayerService.setScreenText('コメント前進 ' + Math.abs(newValue / 1000) + '秒');
      }
    });
    $scope.$watch(function () {
      return $ctrl.options.commentMaxLines;
    }, function (value) {
      $ctrl.commentOptions.maxLines = value;
      saveSetting();
    });
    $scope.$watch(function () {
      return $ctrl.options.commentMaxItems;
    }, function (value) {
      $ctrl.commentOptions.maxItems = value;
      saveSetting();
    });

    $scope.$watchGroup([function () {
      return $ctrl.program;
    }, function () {
      return $ctrl.commentChannels;
    }], function (values) {
      var program = values[0];
      var commentChannels = values[1];
      var channels;
      $ctrl.commentIntervals = [];
      if (program && commentChannels.length > 0) {
        $ctrl.commentInfo.start = program.start;
        $ctrl.commentInfo.end = program.end;
        $ctrl.commentInfo.query = resolveQuery(program.channel);
        channels = $ctrl.commentInfo.query.split('||');
        $ctrl.commentChannels.forEach(function (a) {
          var channel = a;
          if (channels.indexOf(channel.id) >= 0) {
            channel.enabled = true;
          }
        });
        channels = null;
      }
    });
    $scope.$watch(function () {
      return $ctrl.commentChannels;
    }, function (value) {
      var enabledChannels = [];
      value.forEach(function (a) {
        if (a.enabled) {
          enabledChannels.push(a.id);
        }
      });
      $ctrl.commentInfo.query = enabledChannels.join('||');
      enabledChannels = null;
    }, true);
    $scope.$watchGroup([function () {
      return $ctrl.commentInfo.start;
    }, function () {
      return $ctrl.commentInfo.end;
    }, function () {
      return $ctrl.commentInfo.query;
    }], function (value) {
      var start = value[0];
      var end = value[1];
      var query = value[2];
      var margin = Math.abs($ctrl.options.commentDelay) + 10000;
      $ctrl.commentInfo.count = 0;
      $ctrl.comments = [];
      if (start && end && query) {
        saveQuery();
        CommentService.request('intervals', {
          params: {
            start: start - margin,
            end: end + margin,
            channel: query,
            interval: '1m',
            fill: 1
          }
        }).then(function (response) {
          if (
            angular.isObject(response) &&
            angular.isObject(response.data) &&
            angular.isObject(response.data.data) &&
            angular.isArray(response.data.data.intervals)

          ) {
            $ctrl.commentIntervals = response.data.data.intervals;
            $ctrl.commentInfo.count = response.data.data.n_hits;
          }
        }, requestError);
      }
    });
    $scope.$watchCollection(function () {
      return $ctrl.comments;
    }, function (value) {
      var titles = [];
      var threads = [];
      $ctrl.commentThreads.forEach(function (a) {
        if (titles.indexOf(a.title) < 0) {
          titles.push(a.title);
          threads.push(a);
        }
      });
      if (angular.isArray(value)) {
        value.forEach(function (a) {
          if (titles.indexOf(a.title) < 0) {
            titles.push(a.title);
            threads.push({
              title: a.title,
              enabled: true
            });
          }
        });
      }
      $ctrl.commentThreads = threads;
      titles = null;
      threads = null;
    });
    $scope.$watch(function () {
      return $ctrl.commentThreads;
    }, function (value) {
      var threads = value;
      var enabledThreads = [];
      if (angular.isArray(value)) {
        threads.forEach(function (a) {
          if (a.enabled) {
            enabledThreads.push(a.title);
          }
        });
        if (enabledThreads.length > 0) {
          $ctrl.comments.forEach(function (a) {
            var comment = a;
            comment.enabled = enabledThreads.indexOf(comment.title) >= 0;
          });
        } else {
          $ctrl.comments.forEach(function (a) {
            var comment = a;
            comment.enabled = false;
          });
        }
      }
      enabledThreads = null;
    }, true);

    $scope.$on('Player.EndReached', next);
    $scope.$on('Player.EncounteredError', function () {
      PlayerService.stop();
    });
    $scope.$on('Player.Stopped', function () {
      CommonService.back();
    });

    function requestError(response) {
      if (response.status >= 400) {
        toaster.pop({
          type: 'error',
          title: 'HTTP error',
          body: [response.config.url, ' ', response.statusText, '(', response.status, ')'].join('')
        });
      } else if (active && response.status < 0) {
        toaster.pop({
          type: 'error',
          title: 'Connection error',
          body: [response.config.url, ' ', 'Connection failure'].join('')
        });
      }
    }

    function initChinachu() {
      var backend = CommonService.loadLocalStorage('chinachuUrl');
      var user = CommonService.loadLocalStorage('chinachuUser');
      var password = CommonService.loadLocalStorage('chinachuPassword');
      ChinachuService.url(backend);
      ChinachuService.user(user);
      ChinachuService.password(password);
      ChinachuService.request('/api/recorded.json').then(function (response) {
        if (
          angular.isObject(response) &&
          angular.isArray(response.data)
        ) {
          response.data.sort(function (a, b) {
            return a.end - b.end;
          });
          recorded = response.data;
        } else {
          CommonService.errorModal('Chinachu Error', '録画データが取得できませんでした。');
        }
      }).then(init, function (response) {
        CommonService.errorModal('Chinachu Error', 'Chinachuとの通信に失敗しました。');
        requestError(response);
      }, requestError);
      updater = $timeout(updateChinachu, 300000);
    }

    function updateChinachu() {
      ChinachuService.request('/api/recorded.json', {
        cache: false
      }).then(function (response) {
        if (
          angular.isObject(response) &&
          angular.isArray(response.data)
        ) {
          response.data.sort(function (a, b) {
            return a.end - b.end;
          });
          recorded = response.data;
        } else {
          CommonService.errorModal('Chinachu Error', '録画データが取得できませんでした。');
        }
      });
      $timeout.cancel(updater);
      updater = $timeout(updateChinachu, 300000);
    }

    function initGarapon() {
      var auth = CommonService.loadLocalStorage('garaponAuth');
      var backend = CommonService.loadLocalStorage('garaponUrl');
      var user = CommonService.loadLocalStorage('garaponUser');
      var password = CommonService.loadLocalStorage('garaponPassword');
      var promise;
      if (user && password) {
        GaraponService.user(user);
        GaraponService.password(password);
        if (auth || !backend) {
          promise = GaraponService.loadBackend().then(function () {
            return GaraponService.login();
          }, function (result) {
            if (result.status) {
              requestError(result);
            } else if (result[1]) {
              toaster.pop({
                type: 'error',
                title: 'Garapon Web Authentication error',
                body: result[1]
              });
            }
          });
        } else {
          GaraponService.backend(backend);
          promise = GaraponService.login();
        }
        promise.then(init, function (response) {
          var message;
          if (
            angular.isObject(response) &&
            response.status === 200 &&
            angular.isObject(response.data)
          ) {
            if (garaponLoginStatusMessages[response.data.status]) {
              message = garaponLoginStatusMessages[response.data.status];
            } else if (garaponLoginMessages[response.data.login]) {
              message = garaponLoginMessages[response.data.login];
            } else {
              message = 'Unknown Error';
            }
            toaster.pop({
              type: 'error',
              title: 'Garapon TV login error',
              body: message
            });
          } else {
            requestError(response);
          }
        });
      }
    }

    function initGaraponV4() {
      var user = CommonService.loadLocalStorage('garaponUser');
      var password = CommonService.loadLocalStorage('garaponPassword');
      GaraponSiteService.user(user);
      GaraponSiteService.password(password);
      GaraponService.user(user);
      GaraponService.password(password);
      GaraponSiteService.login().then(function () {
        return GaraponService.loginV4();
      }).then(init, requestError);
    }

    function init() {
      var params = $location.search();
      $ctrl.mode = params.mode;
      switch (params.mode) {
        case 'recorded':
          playRecorded(params.id);
          break;
        case 'channel':
          playChannel(
            params.type,
            parseInt(params.sid, 10),
            parseInt(params.stype || 0, 10),
            parseInt(params.start, 10) + $ctrl.options.commentDelay,
            parseInt(params.end, 10)
          );
          break;
        default:
      }
      CommentService.request('channels').then(function (response) {
        if (
          angular.isObject(response) &&
          angular.isObject(response.data) &&
          angular.isObject(response.data.data) &&
          angular.isArray(response.data.data.channels)
        ) {
          response.data.data.channels.sort(function (a, b) {
            var aType = channelOrder.indexOf(a.type.slice(0, 2));
            var aNum = parseInt(a.type.slice(2), 10);
            var bType = channelOrder.indexOf(b.type.slice(0, 2));
            var bNum = parseInt(b.type.slice(2), 10);
            return ((aType - bType) * 100) + (aNum - bNum);
          });
          $ctrl.commentChannels = response.data.data.channels;
        }
      }, requestError);
    }

    function playRecorded(id) {
      switch (backendType) {
        case 'garapon':
          playGarapon(id);
          break;
        case 'garaponv4':
          playGaraponV4(id);
          break;
        case 'chinachu':
        default:
          playChinachu(id);
      }
    }

    function playChinachu(id) {
      var mrl = ChinachuService.getUrl(['/api/recorded', id, 'watch.m2ts?c:v=copy&c:a=copy'].join('/'));
      $ctrl.program = null;
      ChinachuService.request(['/api/recorded/', id, '.json'].join('')).then(function (recordedResponse) {
        if (
          angular.isObject(recordedResponse) &&
          angular.isObject(recordedResponse.data)
        ) {
          $ctrl.program = recordedResponse.data;
          $ctrl.program.categoryName = ChinachuService.convertCategory($ctrl.program.category);
          $ctrl.title = $ctrl.program.fullTitle;
          $ctrl.channel = $ctrl.program.channel.name;
          $ctrl.commentOptions.offset = $ctrl.program.start - $ctrl.options.commentDelay;
          PlayerService.overwriteLength($ctrl.program.seconds * 1000);

          ChinachuService.request('/archive.json').then(function (archiveResponse) {
            var programService;
            if (
              angular.isObject(archiveResponse) &&
              angular.isObject(archiveResponse.data) &&
              angular.isArray(archiveResponse.data.programs)
            ) {
              programService = ChinachuService.serviceFromLegacy(
                $ctrl.program.channel,
                archiveResponse.data.channels
              );
              $ctrl.programList = archiveResponse.data.programs.filter(function (a) {
                return (
                  a.networkId === programService.networkId &&
                  a.serviceId === programService.serviceId &&
                  a.startAt < $ctrl.program.end &&
                  a.startAt + a.duration > $ctrl.program.start
                );
              });
            }
          });
          ChinachuService.request(['/api/recorded', id, 'file.json'].join('/')).then(function (fileResponse) {
            var fileSize;
            var chinachuUrl;
            var request;
            if (
              angular.isObject(fileResponse) &&
              angular.isObject(fileResponse.data)
            ) {
              fileSize = fileResponse.data.size;
              chinachuUrl = url.parse(ChinachuService.getUrl());
              request = http.request({
                method: 'GET',
                protocol: chinachuUrl.protocol,
                hostname: chinachuUrl.hostname,
                port: chinachuUrl.port,
                path: ['/api/recorded', id, 'watch.m2ts?c:v=copy&c:a=copy&ss=10&t=10'].join('/'),
                auth: chinachuUrl.auth,
                timeout: 10000
              }, function (watchResponse) {
                var streamSize = watchResponse.headers['content-length'];
                var ms = (fileSize * 10000) / streamSize;
                PlayerService.overwriteLength(ms);
                playWithInfo(mrl);
              });
              request.on('error', function () {
                playWithInfo(mrl);
              });
              request.end();
            }
          }, function () {
            playWithInfo(mrl);
          });
        }
      }, requestError);
    }

    function checkGaraponSearch(response) {
      if (
        angular.isObject(response) &&
        angular.isObject(response.data)
      ) {
        if (garaponSearchMessages[response.data.status]) {
          toaster.pop({
            type: 'error',
            title: 'GArapon TV Error',
            body: garaponSearchMessages[response.data.status]
          });
          return false;
        }
        return true;
      }
      return false;
    }

    function playGarapon(id) {
      GaraponService.request('search', {
        data: {
          gtvid: id
        }
      }, false).then(function (response) {
        var mrl = GaraponService.getStreamUrl(id);
        var program;
        if (
          checkGaraponSearch(response) &&
          angular.isArray(response.data.program) &&
          angular.isObject(response.data.program[0])
        ) {
          program = response.data.program[0];
          $ctrl.program = program;
          $ctrl.program.channel = {
            type: program.gtvid.slice(0, 2),
            sid: program.ch,
            name: program.bc
          };
          $ctrl.program.start = GaraponService.convertDate(program.startdate);
          $ctrl.program.end = program.start + GaraponService.convertDuration(program.duration);
          $ctrl.program.seconds = GaraponService.convertDuration(program.duration) / 1000;
          $ctrl.program.categoryName = GaraponService.convertCategory(program.genre[0]);
          $ctrl.title = program.title;
          $ctrl.channel = program.bc;
          $ctrl.commentOptions.offset = $ctrl.program.start - $ctrl.options.commentDelay;
          PlayerService.overwriteLength(GaraponService.convertDuration(program.duration));
          playWithInfo(mrl);
        }
        PlayerService.play(mrl);
      }, requestError);
    }

    function playGaraponV4(id) {
      var program;
      GaraponSiteService.request('Program/Search/programInfo', {
        data: {
          gtvid: id
        }
      }, false).then(function (response) {
        if (
          checkGaraponSearch(response) &&
          angular.isObject(response.data.program)
        ) {
          program = response.data.program;
          return GaraponService.request('Program/', {
            data: {
              action: 'check',
              starttime: program.starttime,
              endtime: program.endtime,
              tsid10: program.tsid10,
              service_type: program.service_type
            }
          });
        }
        return null;
      }, requestError).then(function (response) {
        if (
          checkGaraponSearch(response)
        ) {
          if (response.data.data[0].result) {
            $ctrl.program = program;
            $ctrl.program.channel = {
              type: program.gtvid.slice(0, 2),
              sid: program.tsid10,
              name: program.bcname
            };
            $ctrl.program.start = program.starttime * 1000;
            $ctrl.program.end = program.endtime * 1000;
            $ctrl.program.seconds = program.duration;
            $ctrl.program.categoryName = GaraponSiteService.convertCategory(program.genre[0]);
            $ctrl.title = program.title;
            $ctrl.channel = program.bcname;
            $ctrl.commentOptions.offset = $ctrl.program.start - $ctrl.options.commentDelay;
            PlayerService.overwriteLength(program.durationtime * 1000);
            playWithInfo(GaraponService.getV4Url(program.m3u8_url));
          } else {
            CommonService.errorModal('Player Error', '録画データが見つかりません。');
          }
        }
      }, requestError);
    }

    function playWithInfo(mrl) {
      PlayerService.play(mrl);
      PlayerService.setScreenText([
        $ctrl.program.id,
        $ctrl.title,
        $ctrl.channel,
        CommonService.formatDate($ctrl.program.start, 'yyyy/MM/dd(EEE) A HHHH:mm:ss')
      ].join('\n'), true);
    }

    function playChannel(type, sid, stype, start, end) {
      var program;
      switch (backendType) {
        case 'garapon':
          GaraponService.request('search', {
            data: {
              n: 1,
              ch: sid,
              dt: 's',
              sdate: CommonService.formatDate(start, 'yyyy-MM-dd HH:mm:ss'),
              sort: 'sta'
            }
          }).then(function (response) {
            if (
              checkGaraponSearch(response) &&
              angular.isArray(response.data.program) &&
              angular.isObject(response.data.program[0])
            ) {
              playRecorded(response.data.program[0].gtvid);
            }
          }, requestError);
          break;
        case 'garaponv4':
          GaraponSiteService.request('Program/Search/search', {
            data: {
              starttime: start / 1000,
              endtime: end / 1000,
              tsids: sid
            }
          }).then(function (response) {
            var programs;
            if (
              checkGaraponSearch(response) &&
              angular.isArray(response.data.programs)
            ) {
              programs = response.data.programs.filter(function (a) {
                return String(a.service_type) === String(stype);
              });
              if (programs.length > 0) {
                playRecorded(programs[0].gtvid);
              }
            }
          }, requestError);
          break;
        case 'chinachu':
        default:
          program = recorded.filter(function (a) {
            return (
              a.channel.type === type &&
              a.channel.sid === sid &&
              a.end > start &&
              (!end || a.start < end)
            );
          })[0];
          if (program) {
            PlayerService.preseekTime(start - program.start);
            playRecorded(program.id);
          } else {
            CommonService.errorModal('Player Error', '録画データが見つかりません。');
          }
      }
    }

    function next() {
      var program;
      switch (backendType) {
        case 'garapon':
          GaraponService.request('search', {
            data: {
              n: 1,
              ch: $ctrl.program.ch,
              dt: 's',
              sdate: CommonService.formatDate($ctrl.program.end, 'yyyy-MM-dd HH:mm:ss'),
              sort: 'sta'
            }
          }, false).then(function (response) {
            if (
              checkGaraponSearch(response) &&
              angular.isArray(response.data.program) &&
              angular.isObject(response.data.program[0])
            ) {
              playRecorded(response.data.program[0].gtvid);
            }
          }, requestError);
          break;
        case 'garaponv4':
          GaraponSiteService.request('Program/Search/search', {
            data: {
              tsids: $ctrl.program.tsid10,
              starttime: Math.floor(($ctrl.program.end) / 1000) - 1,
              sort: 'sta'
            }
          }, false).then(function (response) {
            var programs;
            if (
              checkGaraponSearch(response) &&
              angular.isArray(response.data.programs)
            ) {
              programs = response.data.programs.filter(function (a) {
                return a.service_type === $ctrl.program.service_type;
              });
              if (programs.length > 0) {
                playRecorded(programs[0].gtvid);
              }
            }
          }, requestError);
          break;
        case 'chinachu':
        default:
          program = recorded.filter(function (a) {
            return (
              a.channel.type === $ctrl.program.channel.type &&
              a.channel.sid === $ctrl.program.channel.sid &&
              a.start >= $ctrl.program.end
            );
          })[0];
          if (program) {
            playRecorded(program.id);
          }
      }
    }

    function previous() {
      var program;
      switch (backendType) {
        case 'garapon':
          GaraponService.request('search', {
            data: {
              n: 1,
              ch: $ctrl.program.ch,
              dt: 'e',
              edate: CommonService.formatDate($ctrl.program.start, 'yyyy-MM-dd HH:mm:ss'),
              sort: 'std'
            }
          }, false).then(function (response) {
            if (
              checkGaraponSearch(response) &&
              angular.isArray(response.data.program) &&
              angular.isObject(response.data.program[0])
            ) {
              playRecorded(response.data.program[0].gtvid);
            }
          }, requestError);
          break;
        case 'garaponv4':
          GaraponSiteService.request('Program/Search/search', {
            data: {
              tsids: $ctrl.program.tsid10,
              starttime: Math.floor(($ctrl.program.start) / 1000) - 604800,
              endtime: Math.floor(($ctrl.program.start) / 1000) - 10,
              sort: 'std'
            }
          }, false).then(function (response) {
            var programs;
            if (
              checkGaraponSearch(response) &&
              angular.isArray(response.data.programs)
            ) {
              programs = response.data.programs.filter(function (a) {
                return a.service_type === $ctrl.program.service_type;
              });
              if (programs.length > 0) {
                playRecorded(programs[0].gtvid);
              }
            }
          }, requestError);
          break;
        case 'chinachu':
        default:
          program = recorded.filter(function (a) {
            return (
              a.channel.type === $ctrl.program.channel.type &&
              a.channel.sid === $ctrl.program.channel.sid &&
              a.end <= $ctrl.program.start
            );
          }).slice(-1)[0];
          if (program) {
            playRecorded(program.id);
          }
      }
    }

    function saveSetting() {
      var setting = {
        delay: $ctrl.options.commentDelay,
        duration: $ctrl.options.commentDuration,
        maxLines: $ctrl.options.commentMaxLines,
        maxItems: $ctrl.options.commentMaxItems
      };
      CommonService.saveLocalStorage('comment', setting);
    }

    function loadSetting() {
      var setting = CommonService.loadLocalStorage('comment') || {};
      if (angular.isNumber(setting.delay)) {
        $ctrl.options.commentDelay = setting.delay;
      }
      if (angular.isNumber(setting.duration)) {
        $ctrl.options.commentDuration = setting.duration;
      }
      if (angular.isNumber(setting.maxLines)) {
        $ctrl.options.commentMaxLines = setting.maxLines;
      }
      if (angular.isNumber(setting.maxItems)) {
        $ctrl.options.commentMaxItems = setting.maxItems;
      }
    }

    function saveQuery() {
      var queries;
      if ($ctrl.channel && $ctrl.commentInfo.query) {
        queries = CommonService.loadLocalStorage('commentQueries') || {};
        queries[$ctrl.channel] = $ctrl.commentInfo.query;
        CommonService.saveLocalStorage('commentQueries', queries);
      }
    }

    function resolveQuery(channel) {
      var name = angular.isObject(channel) ? channel.name : channel;
      var queries = CommonService.loadLocalStorage('commentQueries') || {};
      var query = queries[name];
      if (angular.isUndefined(query)) {
        query = CommentService.resolveChannel(name);
      }
      return query;
    }
  }
}(require('url'), require('http')));
