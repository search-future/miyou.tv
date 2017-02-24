/*
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
(function () {
  'use strict';

  angular
    .module('app')
    .component('list', {
      templateUrl: 'templates/list.html',
      controller: ListCtrl
    });

  function ListCtrl(
    $scope,
    $element,
    $window,
    $location,
    $timeout,
    CommonService,
    ChinachuService,
    CommentService
  ) {
    var $ctrl = this;
    var viewport = $element[0].getElementsByClassName('scrollable')[0];
    var selectItem;
    var timer;
    var countMode = 'speed';

    $ctrl.programs = [];
    $ctrl.source = 'archive';
    $ctrl.sortRule = 'start:true';
    $ctrl.archiveEnabled = false;
    $ctrl.filterEnabled = false;
    $ctrl.baseHeight = 125;

    $ctrl.search = function (value) {
      $location.search('search', value);
    };
    $ctrl.selectItem = function (item) {
      if (angular.isDefined(item)) {
        selectItem = item;
      }
      return selectItem;
    };
    $ctrl.play = function (item) {
      if (item) {
        if (item.isArchive) {
          if (item.isRecorded) {
            $location.url([
              '/player',
              '?mode=channel',
              '&type=', item.channel.type,
              '&sid=', item.channel.sid,
              '&start=', item.start,
              '&end=', item.end
            ].join(''));
          } else {
            CommonService.errorModal('', '録画データが見つかりません。');
          }
        } else {
          $location.url([
            '/player',
            '?mode=recorded',
            '&id=', item.id
          ].join(''));
        }
      }
    };
    $ctrl.scrollTo = function (value) {
      viewport.scrollTop = value;
    };

    $scope.$watch(function () {
      return $ctrl.sortRule;
    }, function (value) {
      var order = value || 'start:true';
      var rule = order.split(':');
      $location.search('order', rule[0]);
      $location.search('desc', rule[1] === 'true' ? 1 : 0);
      $timeout.cancel(timer);
      timer = $timeout(updateView, 200);
    });
    $scope.$watch(function () {
      return $location.search().search;
    }, function (value) {
      $ctrl.filterEnabled = !!value;
      $ctrl.filterPattern = ChinachuService.generateFilterPattern(value);
      $ctrl.scrollTo(0);
      $timeout.cancel(timer);
      timer = $timeout(updateView, 200);
    });
    $scope.$watch(function () {
      return $location.search().src;
    }, function (value) {
      $ctrl.source = value || 'archive';
    });
    $scope.$watch(function () {
      return CommonService.loadLocalStorage('countMode');
    }, function (newValue, oldValue) {
      var countChanged = newValue !== oldValue;
      countMode = newValue;

      $ctrl.programs.forEach(function (a) {
        var program = a;
        program.enabled = false;
        if (countChanged) {
          delete program.count;
        }
      });

      $timeout.cancel(timer);
      timer = $timeout(updateView, 200);
    });
    $scope.$watchGroup([function () {
      return $location.search().order;
    }, function () {
      return $location.search().desc;
    }], function (values) {
      $ctrl.sortKey = values[0] || 'start';
      $ctrl.sortReverse = values[1];
      $ctrl.sortRule = [values[0], values[1] ? 'true' : 'false'].join(':');
    });
    $scope.$watchGroup([function () {
      return ChinachuService.data.archive;
    }, function () {
      return ChinachuService.data.recorded;
    }, function () {
      return $ctrl.source;
    }], function (values) {
      var archive = values[0];
      var recorded = values[1];
      var source = values[2];

      $location.search('src', source);
      if (archive.programs) {
        $ctrl.archiveEnabled = true;
      } else {
        $ctrl.archiveEnabled = false;
        if (source === 'archive') {
          source = 'recorded';
        }
      }

      switch (source) {
        case 'archive':
          $ctrl.programs = programsFromArchive(archive);
          break;
        case 'recorded':
        default:
          $ctrl.programs = programsFromRecorded(recorded);
      }

      $timeout.cancel(timer);
      timer = $timeout(updateView, 200);
    });

    angular.element(viewport).on('scroll', function () {
      $timeout.cancel(timer);
      timer = $timeout(updateView, 200);
    });
    angular.element($window).on('resize', function () {
      $timeout.cancel(timer);
      timer = $timeout(updateView, 200);
    });

    function miyoutvFilter(a) {
      return a.isMiyoutvReserved;
    }

    function programsFromArchive(archive) {
      var programs = [];
      var channels;
      var start;
      var end;
      var channel;
      var service;
      var item;
      var ci;
      var pi;

      channels = ChinachuService.recordedChannels(miyoutvFilter);
      start = ChinachuService.firstRecordTime(miyoutvFilter);
      end = ChinachuService.lastRecordTime(miyoutvFilter);

      for (ci = 0; ci < channels.length; ci += 1) {
        channel = channels[ci];
        service = ChinachuService.serviceFromLegacy(channel);
        for (pi = 0; pi < archive.programs.length; pi += 1) {
          item = archive.programs[pi];
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
            item.displayTime = CommonService.formatDate(item.start, 'M/d EEE A HHHH:mm');
            item.isArchive = true;
            item.isRecorded = false;
            item.channel = channel;
            if (angular.isArray(item.genres)) {
              item.categoryName = ChinachuService.convertCategory(item.genres[0].lv1);
            } else {
              item.categoryName = ChinachuService.convertCategory();
            }
            programs.push(item);
          }
        }
      }
      return programs;
    }

    function programsFromRecorded(recorded) {
      var programs = recorded;

      recorded.forEach(function (a) {
        var program = a;

        program.categoryName = ChinachuService.convertCategory(program.category);
        program.displayTime = CommonService.formatDate(program.start, 'M/d EEE A HHHH:mm');
        program.isArchive = false;
        program.isRecorded = true;
      });
      return programs;
    }

    function updateView() {
      var top = viewport.scrollTop;
      var bottom = viewport.scrollTop + viewport.clientHeight;
      var i;
      var item;
      var preload = 5;

      $ctrl.viewStyle = {
        height: ($ctrl.baseHeight * $ctrl.filteredPrograms.length) + 'px',
        paddingTop: ((Math.floor(top / $ctrl.baseHeight) - preload) * $ctrl.baseHeight) + 'px'
      };
      for (i = 0; i < $ctrl.filteredPrograms.length; i += 1) {
        item = $ctrl.filteredPrograms[i];
        item.enabled = (
          (i - preload) * $ctrl.baseHeight < bottom &&
          (i + preload + 1) * $ctrl.baseHeight > top
        );
        if (item.enabled) {
          initItem(item);
        }
      }
    }

    function initItem(item) {
      var program = item;
      var recorded;
      var previewPos = 70;
      var channel;

      if (program.isArchive) {
        if (!program.isRecorded) {
          recorded = ChinachuService.data.recorded.filter(function (a) {
            return (
              a.channel.type === program.channel.type &&
              a.channel.sid === program.channel.sid &&
              a.end > program.start &&
              a.start <= program.start
            );
          })[0];
          if (recorded) {
            previewPos += Math.floor((item.start - recorded.start) / 1000);
            program.isRecorded = true;
            while (recorded.seconds < previewPos) {
              previewPos = -30;
            }
          }
        }
      } else {
        recorded = program;
      }
      if (angular.isUndefined(program.preview) && recorded) {
        if (recorded.seconds < previewPos) {
          previewPos = 10;
        }
        ChinachuService
          .requestPreview(recorded.id, 'png', {
            pos: previewPos,
            size: '160x90'
          }).then(function (value) {
            program.preview = value;
          });
      }

      if (countMode !== 'none' && angular.isUndefined(item.count)) {
        channel = CommentService.resolveChannel(item.channel);
        CommentService.request('comments', {
          params: {
            channel: channel,
            start: item.start,
            end: item.end,
            limit: 0
          }
        }).then(function (responce) {
          var commentCount;
          var commentSpeed;
          if (
            angular.isObject(responce) &&
            angular.isObject(responce.data) &&
            angular.isObject(responce.data.data) &&
            angular.isNumber(responce.data.data.n_hits)
          ) {
            commentCount = responce.data.data.n_hits;
            commentSpeed = (commentCount / (program.seconds / 60));
            switch (countMode) {
              case 'speed':
                program.count = commentSpeed.toFixed(1);
                break;
              case 'comment':
              default:
                program.count = commentCount;
            }
            program.countDetail = [
              'コメント数: ' + commentCount,
              '勢い： ' + commentSpeed.toFixed(1) + '/分'
            ].join('\n');
          }
        });
      }
    }
  }
}());
