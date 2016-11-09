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
    $location,
    $element,
    ChinachuService,
    CommentService
  ) {
    var $ctrl = this;
    var selectColumn;
    var selectItem;
    $ctrl.baseLength = 60;
    $ctrl.recorded = [];
    $ctrl.programs = [];
    $ctrl.dates = [];
    $ctrl.hours = [];
    $ctrl.scrollPosY = 0;
    $ctrl.hHeaderStyle = {
      position: 'absolute',
      left: 0
    };
    $ctrl.vHeaderStyle = {
      position: 'absolute',
      top: 0
    };

    function calcPos(time) {
      var baseTime = new Date($ctrl.hours[0]);
      var pos = ((time - baseTime) * $ctrl.baseLength) / 3600000;
      if (pos < 0) {
        pos = 0;
      }
      return pos;
    }

    function calcLength(start, end) {
      var baseTime = new Date($ctrl.hours[0]);
      var pos = ((start - baseTime) * $ctrl.baseLength) / 3600000;
      var length = ((end - start) * $ctrl.baseLength) / 3600000;
      var overLength = (pos + length) - ($ctrl.hours.length * $ctrl.baseLength);
      if (pos < 0) {
        length += pos;
      }
      if (overLength > 0) {
        length -= overLength;
      }
      return length;
    }

    $ctrl.calcHourStyle = function () {
      return {
        height: $ctrl.baseLength + 'px',
        lineHeight: $ctrl.baseLength + 'px'
      };
    };

    $ctrl.calcColumnStyle = function () {
      var start = $ctrl.hours[0];
      var end;
      var last = new Date($ctrl.hours[$ctrl.hours.length - 1]);

      last.setHours(last.getHours() + 1);
      end = last.getTime();
      return {
        top: calcPos(start) + 'px',
        height: calcLength(start, end) + 'px'
      };
    };

    $ctrl.calcItemStyle = function (item) {
      if ($ctrl.selectItem() === item) {
        return {
          top: calcPos(item.startAt) + 'px',
          minHeight: calcLength(item.startAt, item.startAt + item.duration) + 'px'
        };
      }
      return {
        top: calcPos(item.startAt) + 'px',
        height: calcLength(item.startAt, item.startAt + item.duration) + 'px'
      };
    };

    $ctrl.request = function (column, item) {
      var program = item;
      var recorded;

      if (angular.isUndefined(program.commentCount)) {
        CommentService
          .requestCount(program.startAt, program.startAt + program.duration, column)
          .then(function (value) {
            if (!isNaN(value.data)) {
              program.commentCount = value.data;
            }
          });
      }
      if (angular.isUndefined(program.preview)) {
        recorded = ChinachuService.data.recorded.filter(function (a) {
          return (
            a.channel.id === column.id &&
            a.end > program.startAt &&
            a.start < program.startAt
          );
        })[0];
        if (recorded) {
          ChinachuService
            .requestPreview(recorded.id, 'png', {
              pos: Math.floor((program.startAt - recorded.start) / 1000) + 70,
              size: '160x90'
            }).then(function (value) {
              program.preview = value;
            });
        }
      }
    };

    $ctrl.selectColumn = function (column) {
      if (angular.isDefined(column)) {
        selectColumn = column;
      }
      return selectColumn;
    };

    $ctrl.selectItem = function (item) {
      if (angular.isDefined(item)) {
        selectItem = item;
      }
      return selectItem;
    };

    $ctrl.select = function (column, item) {
      $ctrl.selectColumn(column);
      $ctrl.selectItem(item);
    };

    $ctrl.scrollToTime = function (time) {
      var scrollableArea = $element[0].getElementsByClassName('scrollable')[0];
      scrollableArea.scrollTop = calcPos(time);
    };

    $ctrl.isCurrentDate = function (time) {
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
      pos = $element[0].getElementsByClassName('scrollable')[0].scrollTop;

      if (pos >= calcPos(start) && pos < calcPos(end)) {
        return true;
      }
      return false;
    };

    $ctrl.getCategory = function (item) {
      if (angular.isArray(item.genres)) {
        return ChinachuService.convertCategory(item.genres[0].lv1);
      }
      return ChinachuService.convertCategory();
    };

    $ctrl.play = function (column, item) {
      if (column && item) {
        $location.url(['/channel/player', column.id, item.startAt].join('/'));
      }
    };

    $ctrl.playColumn = function (column, $event) {
      var baseTime = $ctrl.hours[0];
      var position = $event.target.scrollTop + $event.offsetY;
      var start = ((position * 3600000) / $ctrl.baseLength) + baseTime;

      $location.url(['/channel/player', column.id, start].join('/'));
    };

    $scope.$watchGroup([
      function () {
        return ChinachuService.data.archive;
      },
      function () {
        return ChinachuService.data.recorded;
      }
    ], function () {
      $ctrl.programs = ChinachuService.recordedProgramTable();
      $ctrl.dates = ChinachuService.recordedDates();
      $ctrl.hours = ChinachuService.recordedHours();
    });

    $scope.$watch(function () {
      return $location.search().search;
    }, function (value) {
      if (value) {
        $location.url('/programs/search/?search=' + value);
      }
    });

    angular.element($element[0].getElementsByClassName('scrollable')[0]).on('scroll', function (e) {
      $ctrl.vHeaderStyle.left = e.target.scrollLeft + 'px';
      $ctrl.hHeaderStyle.top = e.target.scrollTop + 'px';
      $scope.$digest();
    });
  }
}());
