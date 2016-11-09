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
      var service;

      $ctrl.program = {};
      if (value) {
        $ctrl.program.id = value.id;
        $ctrl.program.channel = value.channel.name;
        $ctrl.program.start = value.start;
        $ctrl.program.end = value.end;
        $ctrl.program.category = ChinachuService.convertCategory(value.category).localeName;
        $ctrl.program.title = value.fullTitle;
        $ctrl.program.episode = value.episode;
        $ctrl.program.detail = value.detail;
        service = ChinachuService.serviceFromLegacy(value.channel);
        $ctrl.programList = ChinachuService.data.archive.programs
          .filter(function (a) {
            return (
              a.networkId === service.networkId &&
              a.serviceId === service.serviceId &&
              a.startAt < value.end &&
              a.startAt + a.duration > value.start
            );
          });
      }
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
    });
    $scope.$watch(function () {
      return CommentService.data();
    }, function (value) {
      $ctrl.comment.count = value.data ? value.data.length : 0;
    });
  }
}());
