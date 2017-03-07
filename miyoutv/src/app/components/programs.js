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
    CommonService,
    ChinachuService,
    CommentService,
    categoryTable
  ) {
    var $ctrl = this;
    var viewport = $element[0].getElementsByClassName('scrollable')[0];
    var selectItem;
    var timer;
    var countMode = 'speed';
    var previewEnabled = true;

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
    $ctrl.categories = categoryTable.filter(function (a) {
      return a.name !== 'etc';
    });
    $ctrl.categories.push(categoryTable.filter(function (a) {
      return a.name === 'etc';
    })[0]);

    $ctrl.selectItem = function (item) {
      if (angular.isDefined(item)) {
        selectItem = item;
      }
      return selectItem;
    };
    $ctrl.scrollToTime = function (time) {
      viewport.scrollTop = calcPos(new Date(time).getTime());
    };
    $ctrl.play = function (item) {
      if (item) {
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
      }
    };
    $ctrl.playColumn = function (column, $event) {
      var position = $event.target.scrollTop + $event.offsetY;
      var start = calcTime(position);
      var isRecorded = ChinachuService.data.recorded.some(function (a) {
        return (
          a.channel.type === column.channel.type &&
          a.channel.sid === column.channel.sid &&
          a.end > start &&
          a.start <= start
        );
      });
      if (isRecorded) {
        $location.url([
          '/player',
          '?mode=channel',
          '&type=', column.channel.type,
          '&sid=', column.channel.sid,
          '&start=', start
        ].join(''));
      } else {
        CommonService.errorModal('', '録画データが見つかりません。');
      }
    };
    $ctrl.search = function (value) {
      $location.search('search', value);
    };
    $ctrl.updateView = function () {
      $timeout.cancel(timer);
      timer = $timeout(updateView, 200);
    };

    $scope.$watch(function () {
      return $location.search().src;
    }, function (value) {
      $ctrl.source = value || 'archive';
    });
    $scope.$watchGroup([
      function () {
        return ChinachuService.data.archive;
      },
      function () {
        return ChinachuService.data.recorded;
      },
      function () {
        return $ctrl.source;
      },
      function () {
        return CommonService.loadLocalStorage('hourFirst');
      },
      function () {
        return CommonService.loadLocalStorage('hourFormat');
      }
    ], function (values) {
      var archive = values[0];
      var recorded = values[1];
      var source = values[2];

      $location.search('src', source);
      $ctrl.dates = [];
      $ctrl.hours = [];

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
          initDatepicker(true);
          initTimeHeader(true);
          $ctrl.programs = programsFromArchive(archive);
          break;
        case 'recorded':
        default:
          initDatepicker(false);
          initTimeHeader(false);
          $ctrl.programs = programsFromRecorded(recorded);
      }

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
    $scope.$watchGroup([function () {
      return CommonService.loadLocalStorage('countMode');
    }, function () {
      return CommonService.loadLocalStorage('previewEnabled');
    }], function (newValues, oldValues) {
      var countChanged = newValues[0] !== oldValues[0];
      var ci;
      var column;
      var ii;
      var item;
      countMode = newValues[0];
      previewEnabled = typeof newValues[1] === 'boolean' ? newValues[1] : true;

      for (ci = 0; ci < $ctrl.programs.length; ci += 1) {
        column = $ctrl.programs[ci];
        for (ii = 0; ii < column.programs.length; ii += 1) {
          item = column.programs[ii];
          item.enabled = false;
          if (countChanged) {
            delete item.count;
          }
          if (!previewEnabled) {
            delete item.preview;
          }
        }
      }

      $timeout.cancel(timer);
      timer = $timeout(updateView, 200);
    });
    $scope.$watchGroup([function () {
      return viewport.scrollWidth;
    }, function () {
      return viewport.scrollHeight;
    }], function (values) {
      var height = values[1];
      var search = $location.search();
      if (search.x && search.y) {
        viewport.scrollLeft = search.x;
        viewport.scrollTop = search.y;
      } else {
        viewport.scrollTop = height;
      }
    });

    angular.element(viewport).on('scroll', function (e) {
      $ctrl.vHeaderStyle.left = e.target.scrollLeft + 'px';
      $ctrl.hHeaderStyle.top = e.target.scrollTop + 'px';
      $location.search('x', e.target.scrollLeft);
      $location.search('y', e.target.scrollTop);
      $timeout.cancel(timer);
      timer = $timeout(updateView, 200);
      $scope.$digest();
    });
    angular.element($window).on('resize', function () {
      $timeout.cancel(timer);
      timer = $timeout(updateView, 200);
    });

    function miyoutvFilter(a) {
      return a.isMiyoutvReserved;
    }

    function calcTime(pos) {
      var baseTime = new Date($ctrl.hours[0] ? $ctrl.hours[0].time : 0).getTime();
      return ((pos * 3600000) / $ctrl.baseHeight) + baseTime;
    }

    function calcPos(time) {
      var baseTime = new Date($ctrl.hours[0] ? $ctrl.hours[0].time : 0).getTime();
      var pos = ((time - baseTime) * $ctrl.baseHeight) / 3600000;
      if (pos < 0) {
        pos = 0;
      }
      return pos;
    }

    function calcHeight(start, end) {
      var baseTime = new Date($ctrl.hours[0] ? $ctrl.hours[0].time : 0).getTime();
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

    function isCurrentDate(time) {
      var date;
      var start;
      var end;
      var currentTime;

      date = new Date(time);
      date.setHours(CommonService.loadLocalStorage('hourFirst'));
      date.setMinutes(0);
      date.setSeconds(0);
      date.setMilliseconds(0);
      start = date.getTime();
      date.setDate(date.getDate() + 1);
      end = date.getTime();
      currentTime = calcTime(viewport.scrollTop);

      return currentTime >= start && currentTime < end;
    }

    function initTimeHeader(useFilter) {
      var dates = ChinachuService.recordedDates(useFilter ? miyoutvFilter : null);
      var hours = ChinachuService.recordedHours(useFilter ? miyoutvFilter : null);
      var i;
      var date;

      for (i = 0; i < dates.length; i += 1) {
        date = new Date(dates[i]);
        date.setHours(CommonService.loadLocalStorage('hourFirst'));
        $ctrl.dates.push({
          time: date,
          isCurrent: false
        });
      }
      for (i = 0; i < hours.length; i += 1) {
        $ctrl.hours.push({
          time: hours[i],
          hour: CommonService.convertHour(hours[i])
        });
      }
    }

    function initDatepicker(useFilter) {
      $ctrl.datepickerOptions.minDate = ChinachuService.firstRecordTime(
        useFilter ? miyoutvFilter : null
      );
      $ctrl.datepickerOptions.maxDate = ChinachuService.lastRecordTime(
        useFilter ? miyoutvFilter : null
      );
    }

    function programsFromArchive(archive) {
      var programs = [];
      var channels = ChinachuService.recordedChannels(miyoutvFilter);
      var start = ChinachuService.firstRecordTime(miyoutvFilter);
      var end = ChinachuService.lastRecordTime(miyoutvFilter);
      var ci;
      var pi;
      var channel;
      var column;
      var item;

      for (ci = 0; ci < channels.length; ci += 1) {
        channel = channels[ci];
        column = ChinachuService.serviceFromLegacy(channel);
        column.channel = channel;
        column.style = calcColumnStyle(column);
        column.programs = [];
        for (pi = 0; pi < archive.programs.length; pi += 1) {
          item = archive.programs[pi];
          item.start = item.startAt;
          item.end = item.startAt + item.duration;
          if (
            item.networkId === column.networkId &&
            item.serviceId === column.serviceId &&
            item.start < end &&
            item.end > start
          ) {
            item.seconds = item.duration / 1000;
            item.title = item.name;
            item.detail = item.description;
            item.channel = channel;
            item.displayTime = CommonService.formatDate(item.start, 'A HHHH:mm');
            item.isArchive = true;
            item.isRecorded = false;
            if (angular.isArray(item.genres)) {
              item.categoryName = ChinachuService.convertCategory(item.genres[0].lv1);
            } else {
              item.categoryName = ChinachuService.convertCategory();
            }
            item.style = calcItemStyle(item);
            column.programs.push(item);
          }
        }
        if (column.programs.length > 0) {
          programs.push(column);
        }
      }
      return programs;
    }

    function programsFromRecorded(recorded) {
      var programs = [];
      var channels = ChinachuService.recordedChannels();
      var start = ChinachuService.firstRecordTime();
      var end = ChinachuService.lastRecordTime();
      var ci;
      var pi;
      var channel;
      var column;
      var item;

      for (ci = 0; ci < channels.length; ci += 1) {
        channel = channels[ci];
        column = ChinachuService.serviceFromLegacy(channel);
        column.channel = channel;
        column.style = calcColumnStyle(column);
        column.programs = [];
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
            item.displayTime = CommonService.formatDate(item.start, 'A HHHH:mm');
            item.isArchive = false;
            item.isRecorded = true;
            column.programs.push(item);
          }
        }
        if (column.programs.length > 0) {
          programs.push(column);
        }
      }
      return programs;
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

    function updateView() {
      var top = viewport.scrollTop - $ctrl.baseHeight;
      var bottom = viewport.scrollTop + viewport.clientHeight + $ctrl.baseHeight;
      var left = viewport.scrollLeft - $ctrl.baseWidth;
      var right = viewport.scrollLeft + viewport.clientWidth + $ctrl.baseWidth;
      var start = calcTime(top);
      var end = calcTime(bottom);
      var checkedCategories = [];
      var categoryFilterEnabled = false;
      var column;
      var item;
      var ci;
      var ii;
      var countStart;
      var countEnd;

      $ctrl.categories.forEach(function (a) {
        if (a.checked) {
          checkedCategories.push(a.name);
        }
      });
      categoryFilterEnabled = (
        checkedCategories.length > 0 &&
        checkedCategories.length < $ctrl.categories.length
      );
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
          countStart = 0;
          countEnd = 0;
          for (ii = 0; ii < column.programs.length; ii += 1) {
            item = column.programs[ii];
            item.enabled = (
              item.start < end &&
              item.end > start &&
              (!categoryFilterEnabled || checkedCategories.indexOf(item.categoryName.name) >= 0)
            );
            if (item.enabled) {
              if (countMode !== 'none' && angular.isUndefined(item.count)) {
                if (!countStart || countStart > item.start) {
                  countStart = item.start;
                }
                if (!countEnd || countEnd < item.end) {
                  countEnd = item.end;
                }
              }
              initItem(item);
            }
          }
          if (countMode !== 'none' && countStart && countEnd) {
            CommentService.request('intervals', {
              params: {
                start: countStart,
                end: countEnd,
                channel: CommentService.resolveChannel(column.channel),
                interval: '1m'
              }
            }).then(getCounter(ci));
          }
        }
      }
    }

    function initItem(item) {
      var program = item;
      var recorded;
      var previewPos = 70;

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
    }

    function getCounter(columnIndex) {
      return function (result) {
        if (
          angular.isObject(result) &&
          angular.isObject(result.data) &&
          angular.isObject(result.data.data) &&
          angular.isArray(result.data.data.intervals)
        ) {
          $ctrl.programs[columnIndex].programs.filter(function (a) {
            return a.enabled && angular.isUndefined(a.count);
          }).forEach(function (item) {
            var program = item;
            var commentCount = 0;
            var commentSpeed = 0;

            result.data.data.intervals.filter(function (interval) {
              return interval.start >= program.start && interval.start < program.end;
            }).forEach(function (b) {
              commentCount += b.n_hits;
            });
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
          });
        }
      };
    }
  }
}());
