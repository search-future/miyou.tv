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
    $location,
    $element,
    ChinachuService,
    CommentService
  ) {
    var $ctrl = this;
    var selectItem = null;
    $ctrl.sortRule = 'startAt:true';
    $ctrl.search = '';

    $ctrl.request = function (item) {
      var program = item;
      var recorded;

      if (angular.isUndefined(program.commentCount)) {
        CommentService
          .requestCount(program.startAt, program.startAt + program.duration, program.channel)
          .then(function (value) {
            if (!isNaN(value.data)) {
              program.commentCount = value.data;
            }
          });
      }
      if (angular.isUndefined(program.preview)) {
        recorded = ChinachuService.data.recorded.filter(function (a) {
          return (
            a.channel.id === program.channel.id &&
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
        $location.url(['/channel/player', item.channel.id, item.startAt].join('/'));
      }
    };

    $ctrl.selectItem = function (item) {
      if (angular.isDefined(item)) {
        selectItem = item;
      }
      return selectItem;
    };

    $scope.$watchGroup([
      function () {
        return ChinachuService.data.archive;
      },
      function () {
        return ChinachuService.data.recorded;
      }
    ], function () {
      var programs = [];
      var programTable = ChinachuService.recordedProgramTable();
      var channel = {};
      var program = {};
      var ti = 0;
      var pi = 0;
      for (ti = 0; ti < programTable.length; ti += 1) {
        channel = programTable[ti];
        for (pi = 0; pi < channel.programs.length; pi += 1) {
          program = channel.programs[pi];
          program.channel = {
            id: channel.id,
            type: channel.type,
            name: channel.name
          };
          programs.push(program);
        }
      }
      $ctrl.programs = programs;
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
  }
}());
