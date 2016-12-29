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
    .component('programSearch', {
      templateUrl: 'templates/programSearch.html',
      controller: ProgramSearchCtrl
    });

  function ProgramSearchCtrl(
    $scope,
    $element,
    $window,
    $location,
    $timeout,
    ChinachuService,
    CommentService
  ) {
    var $ctrl = this;
    var viewport = $element[0].getElementsByClassName('scrollable')[0];
    var selectItem;
    var timer;

    $ctrl.sortRule = 'startAt:true';
    $ctrl.search = '';
    $ctrl.scrollPos = {
      top: 0,
      bottom: 0
    };

    $ctrl.request = function (item) {
      var program = item;
      var recorded;

      if (angular.isUndefined(program.commentCount)) {
        CommentService
          .requestCount(program.startAt, program.startAt + program.duration, program.channel)
          .then(function (value) {
            program.commentCount = value;
          });
      }
      if (angular.isUndefined(program.preview)) {
        recorded = ChinachuService.data.recorded.filter(function (a) {
          return (
            a.channel.type === program.channel.type &&
            a.channel.sid === program.channel.sid &&
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

    $ctrl.play = function (item) {
      if (item) {
        $location.url([
          '/channel/player',
          item.channel.type,
          item.channel.sid,
          item.startAt + '-' + (item.startAt + item.duration)
        ].join('/'));
      }
    };

    $ctrl.selectItem = function (item) {
      if (angular.isDefined(item)) {
        selectItem = item;
      }
      return selectItem;
    };

    $ctrl.calcViewStyle = function (height, count) {
      return {
        height: (height * count) + 'px',
        paddingTop: (Math.floor(viewport.scrollTop / height) * height) + 'px'
      };
    };

    $scope.$watchGroup([
      function () {
        return ChinachuService.data.archive;
      },
      function () {
        return ChinachuService.data.recorded;
      }
    ], function (values) {
      var archive = values[0];
      var channels = ChinachuService.recordedChannels();
      var start = ChinachuService.firstRecordTime();
      var end = ChinachuService.lastRecordTime();
      var programs = [];
      var channel;
      var service;
      var item;
      var ci;
      var pi;

      for (ci = 0; ci < channels.length; ci += 1) {
        channel = channels[ci];
        service = ChinachuService.serviceFromLegacy(channel);
        if (archive.programs) {
          for (pi = 0; pi < archive.programs.length; pi += 1) {
            item = archive.programs[pi];
            if (
              item.networkId === service.networkId &&
              item.serviceId === service.serviceId &&
              item.startAt < end &&
              item.startAt + item.duration > start
            ) {
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
      }
      $ctrl.programs = programs;
      updateView();
    });

    $scope.$watch(function () {
      return $ctrl.sortRule;
    }, function (value) {
      var order;
      var rule;

      order = value || 'startAt:true';
      rule = order.split(':');
      $ctrl.sortKey = rule[0] || 'startAt';
      $ctrl.sortReverse = (
        angular.isString(rule[1]) &&
        rule[1].toLowerCase() === 'true'
      );
    });

    $scope.$watch(function () {
      return $location.search().search;
    }, function (value) {
      $ctrl.search = value;
    });

    angular.element(viewport).on('scroll', function () {
      $timeout.cancel(timer);
      timer = $timeout(updateView);
    });
    angular.element($window).on('resize', function () {
      $timeout.cancel(timer);
      timer = $timeout(updateView);
    });

    function updateView() {
      var top = viewport.scrollTop;
      var bottom = viewport.scrollTop + viewport.clientHeight;
      $ctrl.scrollPos.top = top;
      $ctrl.scrollPos.bottom = bottom;
    }
  }
}());
