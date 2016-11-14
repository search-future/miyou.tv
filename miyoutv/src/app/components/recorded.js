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
    .component('recorded', {
      templateUrl: 'templates/recorded.html',
      controller: RecordedCtrl
    });

  function RecordedCtrl(
    $scope,
    $location,
    CommonService,
    ChinachuService,
    CommentService
  ) {
    var $ctrl = this;
    var selectItem;

    $ctrl.wuiUrl = ChinachuService.getUrl();
    $ctrl.recorded = [];
    $ctrl.recordedGroups = [];
    $ctrl.sortRule = 'start:true';
    $ctrl.search = '';

    $ctrl.getCategory = function (item) {
      return ChinachuService.convertCategory(item.category);
    };

    $ctrl.request = function (item) {
      var program = item;

      CommentService
        .requestCount(program.start, program.end, program.channel)
        .then(function (value) {
          program.commentCount = value;
        });
      ChinachuService.requestPreview(program.id, 'png', {
        pos: 70,
        size: '160x90'
      }).then(function (value) {
        program.preview = value;
      });
    };

    $ctrl.play = function (program) {
      if (program) {
        $location.url(['/recorded/player/', program.id].join(''));
      }
    };

    $ctrl.selectItem = function (item) {
      if (angular.isDefined(item)) {
        selectItem = item;
      }
      return selectItem;
    };

    $scope.$watch(function () {
      return ChinachuService.data.recorded;
    }, function (value) {
      value.forEach(function (a) {
        var program = a;
        program.categoryName = ChinachuService.convertCategory(program.category);
      });
      $ctrl.recorded = value;
    });

    $scope.$watch(function () {
      return $ctrl.sortRule;
    }, function (value) {
      var order;
      var rule;

      order = value || 'start:true';
      rule = order.split(':');
      $ctrl.sortKey = rule[0] || 'start';
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
