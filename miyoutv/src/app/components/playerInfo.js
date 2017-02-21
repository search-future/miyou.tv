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
    .component('playerInfo', {
      templateUrl: 'templates/playerInfo.html',
      controller: PlayerInfoCtrl
    });

  function PlayerInfoCtrl(
    $scope,
    CommonService,
    ChinachuService,
    ChinachuPlayerService,
    CommentService
  ) {
    var $ctrl = this;

    $ctrl.program = {};
    $ctrl.comment = {};

    $scope.$watch(function () {
      return ChinachuPlayerService.program;
    }, function (value) {
      $ctrl.program = {};
      $ctrl.programList = [];
      if (value) {
        $ctrl.program.id = value.id;
        $ctrl.program.channel = value.channel.name;
        $ctrl.program.start = value.start;
        $ctrl.program.end = value.end;
        $ctrl.program.category = ChinachuService.convertCategory(value.category).localeName;
        $ctrl.program.title = value.fullTitle;
        $ctrl.program.episode = value.episode;
        $ctrl.program.detail = value.detail;
        $ctrl.program.displayStartTime = CommonService.formatDate(value.start, 'yyyy/MM/dd(EEE) A HHHH:mm');
        $ctrl.program.displayEndTime = CommonService.formatDate(value.end, 'yyyy/MM/dd(EEE) A HHHH:mm');
      }
    });
    $scope.$watch(function () {
      return ChinachuPlayerService.programList;
    }, function (value) {
      var programList = value;

      if (angular.isArray(programList)) {
        programList.forEach(function (a) {
          var program = a;

          program.displayStartTime = CommonService.formatDate(program.startAt, 'MM/dd A HHHH:mm');
          program.displayEndTime = CommonService.formatDate(program.startAt + program.duration, 'MM/dd A HHHH:mm');
        });
      }
      $ctrl.programList = programList;
    });
    $scope.$watch(function () {
      return CommentService.info();
    }, function (value) {
      $ctrl.comment = {};
      if (value.channel) {
        $ctrl.comment.channel = value.channel.name;
        $ctrl.comment.type = value.channel.type === 'GR' ? '地上波' : '衛星波';
      }
      $ctrl.comment.start = value.start;
      $ctrl.comment.end = value.end;
      $ctrl.comment.query = value.query;
      $ctrl.comment.displayStartTime = CommonService.formatDate(value.start, 'yyyy/MM/dd(EEE) A HHHH:mm:ss');
      $ctrl.comment.displayEndTime = CommonService.formatDate(value.end, 'yyyy/MM/dd(EEE) A HHHH:mm:ss');
    });
    $scope.$watch(function () {
      return CommentService.data();
    }, function (value) {
      $ctrl.comment.count = value.data ? value.data.length : 0;
    });
  }
}());
