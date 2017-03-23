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
    var previewEnabled = true;

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
      $ctrl.filterPattern = generateFilterPattern(value);
      $ctrl.scrollTo(0);
      $timeout.cancel(timer);
      timer = $timeout(updateView, 200);
    });
    $scope.$watch(function () {
      return $location.search().src;
    }, function (value) {
      $ctrl.source = value || 'archive';
    });
    $scope.$watchGroup([function () {
      return CommonService.loadLocalStorage('countMode');
    }, function () {
      return CommonService.loadLocalStorage('previewEnabled');
    }], function (newValues, oldValues) {
      var countChanged = newValues[0] !== oldValues[0];
      countMode = newValues[0];
      previewEnabled = typeof newValues[1] === 'boolean' ? newValues[1] : true;

      $ctrl.programs.forEach(function (a) {
        var program = a;
        program.enabled = false;
        if (countChanged) {
          delete program.count;
        }
        if (!previewEnabled) {
          delete program.preview;
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
    $scope.$watch(function () {
      return viewport.scrollHeight;
    }, function () {
      var search = $location.search();
      if (search.y) {
        viewport.scrollTop = search.y;
      }
    });

    angular.element(viewport).on('scroll', function (e) {
      $location.search('y', e.target.scrollTop);
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
      start = Math.min.apply(
        null,
        ChinachuService.data.recorded.filter(miyoutvFilter).map(function (a) {
          return a.start;
        })
      );
      end = Math.max.apply(
        null,
        ChinachuService.data.recorded.filter(miyoutvFilter).map(function (a) {
          return a.end;
        })
      );
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
            delete item.count;
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
        delete program.count;
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
      var commentQuery;

      if (program.isArchive) {
        if (!program.isRecorded || (previewEnabled && angular.isUndefined(program.preview))) {
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
      if (previewEnabled && angular.isUndefined(program.preview) && recorded) {
        if (recorded.seconds < previewPos) {
          previewPos = 10;
        }
        ChinachuService
          .requestPreview(recorded.id, 'png', {
            pos: previewPos,
            size: '160x90'
          }).then(function (value) {
            if (previewEnabled) {
              program.preview = value;
            }
          });
      }

      if (countMode !== 'none' && angular.isUndefined(item.count)) {
        commentQuery = resolveQuery(item.channel);
        CommentService.request('comments', {
          params: {
            channel: commentQuery,
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

    function resolveQuery(channel) {
      var queries = CommonService.loadLocalStorage('commentQueries') || {};
      var query = queries[channel.name];
      if (angular.isUndefined(query)) {
        query = CommentService.resolveChannel(channel);
      }
      return query;
    }

    function generateFilterPattern(string) {
      var query = {
        channel: {},
        categoryName: {}
      };
      var options = angular.isString(string) ? string.replace('　', ' ') : '';
      var optionPettern = /([a-z]+): ?("[^"]*"|[^ ]+)?/g;
      var option;
      var key;
      var value;

      option = optionPettern.exec(options);
      while (option !== null) {
        key = option[1];
        value = angular.isString(option[2]) ? option[2].replace(/^"([^"]+)"$/, '$1') : '';
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
      query.$ = angular.isString(string) ? string.replace(optionPettern, '').trim() : '';
      return query;
    }
  }
}());