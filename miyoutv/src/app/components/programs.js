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
    .component('programs', {
      templateUrl: 'templates/programs.html',
      controller: ProgramsCtrl
    });

  function ProgramsCtrl(
    $scope,
    $element,
    $window,
    $location,
    $timeout,
    $q,
    CommonService,
    ChinachuService,
    CommentService
  ) {
    var $ctrl = this;
    var viewport = $element[0].getElementsByClassName('scrollable')[0];
    var selectItem;
    var timer;

    $ctrl.baseWidth = 200;
    $ctrl.baseHeight = 60;
    $ctrl.recorded = [];
    $ctrl.programs = [];
    $ctrl.dates = [];
    $ctrl.hours = [];
    $ctrl.hHeaderStyle = {
      position: 'absolute',
      left: 0
    };
    $ctrl.vHeaderStyle = {
      position: 'absolute',
      top: 0
    };
    $ctrl.datepickerOptions = {
      formatMonth: 'M月',
      formatDayTitle: 'y/M',
      formatMonthTitle: 'y年',
      showWeeks: false
    };
    $ctrl.useArchive = true;

    $ctrl.selectItem = function (item) {
      if (angular.isDefined(item)) {
        selectItem = item;
      }
      return selectItem;
    };

    $ctrl.scrollToTime = function (time) {
      viewport.scrollTop = calcPos(time);
    };

    $ctrl.play = function (item) {
      var recorded;
      if (item) {
        recorded = ChinachuService.data.recorded.filter(function (a) {
          return (
            a.channel.type === item.channel.type &&
            a.channel.sid === item.channel.sid &&
            a.end > item.start &&
            a.start < item.end
          );
        });
        if (recorded.length > 0) {
          $location.url([
            '/channel/player',
            item.channel.type,
            item.channel.sid,
            item.start + '-' + item.end
          ].join('/'));
        } else {
          CommonService.errorModal('', '録画データが見つかりません。');
        }
      }
    };

    $ctrl.playColumn = function (column, $event) {
      var baseTime = $ctrl.hours[0].time;
      var position = $event.target.scrollTop + $event.offsetY;
      var start = ((position * 3600000) / $ctrl.baseHeight) + baseTime;
      var recorded = ChinachuService.data.recorded.filter(function (a) {
        return (
          a.channel.type === column.channel.type &&
          a.channel.sid === column.channel.sid &&
          a.end > start
        );
      });
      if (recorded.length > 0) {
        $location.url(['/channel/player', column.channel.type, column.channel.sid, start].join('/'));
      } else {
        CommonService.errorModal('', '録画データが見つかりません。');
      }
    };

    $ctrl.search = function (value) {
      $location.search('search', value);
    };

    $scope.$watchGroup([
      function () {
        return ChinachuService.data.archive;
      },
      function () {
        return ChinachuService.data.recorded;
      },
      function () {
        return $ctrl.useArchive;
      }
    ], function (values) {
      var archive = values[0];
      var recorded = values[1];
      var programs = [];
      var filter;
      var channels;
      var start;
      var end;
      var channel;
      var column;
      var item;
      var ci;
      var pi;

      $ctrl.validArchive = false;
      $ctrl.dates = [];
      $ctrl.hours = [];

      if (archive.programs) {
        filter = function (a) {
          return a.isMiyoutvReserved;
        };
        $ctrl.validArchive = true;
      }
      channels = ChinachuService.recordedChannels(filter);
      start = ChinachuService.firstRecordTime(filter);
      end = ChinachuService.lastRecordTime(filter);
      $ctrl.datepickerOptions.minDate = start;
      $ctrl.datepickerOptions.maxDate = end;

      ChinachuService.recordedDates(filter).forEach(function (a) {
        $ctrl.dates.push({
          time: a,
          isCurrent: isCurrentDate(a)
        });
      });
      ChinachuService.recordedHours(filter).forEach(function (a) {
        $ctrl.hours.push({
          time: a,
          style: {
            height: $ctrl.baseHeight + 'px',
            lineHeight: $ctrl.baseHeight + 'px'
          }
        });
      });

      for (ci = 0; ci < channels.length; ci += 1) {
        channel = channels[ci];
        column = ChinachuService.serviceFromLegacy(channel);
        column.channel = channel;
        column.style = calcColumnStyle(column);
        column.programs = [];
        if ($ctrl.validArchive && $ctrl.useArchive) {
          for (pi = 0; pi < archive.programs.length; pi += 1) {
            item = archive.programs[pi];
            item.start = item.startAt;
            item.end = item.startAt + item.duration;
            item.seconds = item.duration / 1000;
            item.title = item.name;
            item.detail = item.description;
            item.isArchive = true;
            if (
              item.networkId === column.networkId &&
              item.serviceId === column.serviceId &&
              item.start < end &&
              item.end > start
            ) {
              item.channel = channel;
              if (angular.isArray(item.genres)) {
                item.categoryName = ChinachuService.convertCategory(item.genres[0].lv1);
              } else {
                item.categoryName = ChinachuService.convertCategory();
              }
              item.style = calcItemStyle(item);
              column.programs.push(item);
            }
          }
        } else {
          for (pi = 0; pi < recorded.length; pi += 1) {
            item = recorded[pi];
            if (
              item.channel.type === column.channel.type &&
              item.channel.sid === column.channel.sid &&
              item.start < end &&
              item.end > start
            ) {
              item.categoryName = ChinachuService.convertCategory(item.category);
              item.style = calcItemStyle(item);
              item.isArchive = false;
              column.programs.push(item);
            }
          }
        }
        if (column.programs.length > 0) {
          programs.push(column);
        }
      }
      $ctrl.programs = programs;
      $timeout.cancel(timer);
      timer = $timeout(updateView, 200);
    });
    $scope.$watch(function () {
      return selectItem;
    }, function (newValue, oldValue) {
      var newItem = newValue || {};
      var oldItem = oldValue || {};

      newItem.style = calcItemStyle(newItem);
      oldItem.style = calcItemStyle(oldItem);
    });
    $scope.$watch(function () {
      return $location.search().search;
    }, function (value) {
      if (value) {
        $location.url([
          '/list',
          '?src=', $ctrl.source,
          '&search=' + value
        ].join(''));
      }
    });

    angular.element(viewport).on('scroll', function (e) {
      $ctrl.vHeaderStyle.left = e.target.scrollLeft + 'px';
      $ctrl.hHeaderStyle.top = e.target.scrollTop + 'px';
      $timeout.cancel(timer);
      timer = $timeout(updateView, 200);
      $scope.$digest();
    });
    angular.element($window).on('resize', function () {
      $timeout.cancel(timer);
      timer = $timeout(updateView);
    });

    function calcPos(time) {
      var baseTime = new Date($ctrl.hours[0] ? $ctrl.hours[0].time : 0);
      var pos = ((time - baseTime) * $ctrl.baseHeight) / 3600000;
      if (pos < 0) {
        pos = 0;
      }
      return pos;
    }

    function calcHeight(start, end) {
      var baseTime = new Date($ctrl.hours[0] ? $ctrl.hours[0].time : 0);
      var pos = ((start - baseTime) * $ctrl.baseHeight) / 3600000;
      var height = ((end - start) * $ctrl.baseHeight) / 3600000;
      var overHeight = (pos + height) - ($ctrl.hours.length * $ctrl.baseHeight);
      if (pos < 0) {
        height += pos;
      }
      if (overHeight > 0) {
        height -= overHeight;
      }
      return height;
    }

    function calcColumnStyle() {
      var start = $ctrl.hours[0] ? $ctrl.hours[0].time : 0;
      var last = new Date($ctrl.hours[$ctrl.hours.length - 1].time);
      var end;

      last.setHours(last.getHours() + 1);
      end = last.getTime();
      return {
        top: calcPos(start) + 'px',
        height: calcHeight(start, end) + 'px'
      };
    }

    function calcItemStyle(item) {
      if ($ctrl.selectItem() === item) {
        return {
          top: calcPos(item.start) + 'px',
          minHeight: calcHeight(item.start, item.end) + 'px'
        };
      }
      return {
        top: calcPos(item.start) + 'px',
        height: calcHeight(item.start, item.end) + 'px'
      };
    }

    function isCurrentDate(time) {
      var date;
      var start;
      var end;
      var pos;

      date = new Date(time);
      date.setHours(0);
      date.setMinutes(0);
      date.setSeconds(0);
      date.setMilliseconds(0);
      start = date.getTime();
      date.setDate(date.getDate() + 1);
      end = date.getTime();
      pos = viewport.scrollTop;

      if (pos >= calcPos(start) && pos < calcPos(end)) {
        return true;
      }
      return false;
    }

    function updateView() {
      var top = viewport.scrollTop - $ctrl.baseHeight;
      var bottom = viewport.scrollTop + viewport.clientHeight + $ctrl.baseHeight;
      var left = viewport.scrollLeft - $ctrl.baseWidth;
      var right = viewport.scrollLeft + viewport.clientWidth + $ctrl.baseWidth;
      var column;
      var item;
      var ci;
      var ii;

      $ctrl.dates.forEach(function (a) {
        var date = a;
        date.isCurrent = isCurrentDate(date.time);
        if (date.isCurrent) {
          $ctrl.currentDate = date.time;
        }
      });
      for (ci = 0; ci < $ctrl.programs.length; ci += 1) {
        column = $ctrl.programs[ci];
        column.enabled = (
          ci * $ctrl.baseWidth <= right &&
          (ci + 1) * $ctrl.baseWidth >= left
        );
        if (column.enabled) {
          for (ii = 0; ii < column.programs.length; ii += 1) {
            item = column.programs[ii];
            item.enabled = (
              calcPos(item.start) < bottom &&
              calcPos(item.end) > top
            );
            if (item.enabled) {
              initItem(item);
            }
          }
        }
      }
    }

    function initItem(item) {
      var program = item;
      var basePreviewPos = item.seconds > 70 ? 70 : 10;
      var recorded;
      var previewId;
      var previewPos;

      if (angular.isUndefined(program.preview)) {
        if (program.isArchive) {
          recorded = ChinachuService.data.recorded.filter(function (a) {
            return (
              a.channel.type === program.channel.type &&
              a.channel.sid === program.channel.sid &&
              a.end > program.start &&
              a.start <= program.start
            );
          })[0];
          if (recorded) {
            previewId = recorded.id;
            previewPos = Math.floor((item.start - recorded.start) / 1000) + basePreviewPos;
          }
        } else {
          previewId = program.id;
          previewPos = basePreviewPos;
        }
        if (previewId) {
          ChinachuService
            .requestPreview(previewId, 'png', {
              pos: previewPos,
              size: '160x90'
            }).then(function (value) {
              program.preview = value;
            });
        }
      }
      if (angular.isUndefined(program.commentCount)) {
        CommentService
          .requestCount(program.start, program.end, program.channel)
          .then(function (value) {
            program.commentCount = value;
          });
      }
    }
  }
}());
