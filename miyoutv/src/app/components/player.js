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
    $ctrl.commentThreads = [];
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
        $ctrl.options.commentDelay -= 500;
      },
      'shift+right': function () {
        $ctrl.options.commentDelay += 500;
      },
      'ctrl+s': function () {
        CommonService.trigger('toggleSidebar');
      }
    };
    $ctrl.toggleFullscreen = CommonService.toggleFullscreen;
    $ctrl.stop = PlayerService.stop;

    $ctrl.$onInit = loadSetting;

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
      var requestTargets;
      var start = (value + $ctrl.commentOptions.offset) - 60000;
      var end = (value + $ctrl.commentOptions.offset) + 30000;
      $ctrl.time = value;
      if (PlayerService.preseekTime() === 0) {
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
            }
          }).then(function (responce) {
            if (
              angular.isObject(responce) &&
              angular.isObject(responce.data) &&
              angular.isObject(responce.data.data) &&
              angular.isArray(responce.data.data.comments)
            ) {
              responce.data.data.comments.forEach(function (a) {
                var comment = a;
                comment.text = comment.text.replace(/>>[0-9-,]+\s*/g, '').trim();
                $ctrl.comments.push(comment);
              });
              $ctrl.comments.sort(function (a, b) {
                return a.time - b.time;
              });
            }
          });
        }
      }
    });
    $scope.$watch(function () {
      return ChinachuPlayerService.program;
    }, function (value) {
      $ctrl.commentIntervals = [];
      $ctrl.comments = [];
      if (value) {
        $ctrl.title = value.fullTitle;
        $ctrl.channel = value.channel.name;
        $ctrl.commentOptions.offset = value.start - $ctrl.options.commentDelay;
        $ctrl.commentInfo = {
          start: value.start,
          end: value.end,
          query: CommentService.resolveChannel(value.channel)
        };
        PlayerService.setScreenText([
          value.id,
          value.fullTitle,
          value.channel.name,
          CommonService.formatDate(value.start, 'yyyy/MM/dd(EEE) A HHHH:mm:ss')
        ].join('\n'));
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
      return $ctrl.commentInfo;
    }, function (value) {
      var margin = Math.abs($ctrl.options.commentDelay) + 10000;
      CommentService.request('intervals', {
        params: {
          start: value.start - margin,
          end: value.end + margin,
          channel: value.query,
          interval: '1m',
          fill: 1
        }
      }).then(function (result) {
        if (
          angular.isObject(result) &&
          angular.isObject(result.data) &&
          angular.isObject(result.data.data) &&
          angular.isArray(result.data.data.intervals)

        ) {
          $ctrl.commentIntervals = result.data.data.intervals;
          $ctrl.commentInfo.count = result.data.data.n_hits;
        }
      });
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
            parseInt(params.start, 10) + $ctrl.options.commentDelay,
            parseInt(params.end, 10)
          );
          $ctrl.mainHotkeys.p = ChinachuPlayerService.channelPrevious;
          $ctrl.mainHotkeys.n = ChinachuPlayerService.channelNext;
          break;
        default:
      }
    });

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
  }
}());
