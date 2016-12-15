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
    .component('seekbar', {
      bindings: {
        mode: '='
      },
      templateUrl: 'templates/seekbar.html',
      controller: SeekbarCtrl
    });

  function SeekbarCtrl(
    $scope,
    PlayerService,
    ChinachuPlayerService,
    CommentService
  ) {
    var $ctrl = this;

    $ctrl.isClock = true;
    $ctrl.time = 0;
    $ctrl.length = 0;
    $ctrl.clockTime = 0;
    $ctrl.end = 0;
    $ctrl.isSeeking = false;

    $ctrl.previous = ChinachuPlayerService.channelPrevious;
    $ctrl.next = ChinachuPlayerService.channelNext;

    $ctrl.seek = function (position) {
      if ($ctrl.isSeeking) {
        PlayerService.position(position);
      }
    };

    $scope.$watch(function () {
      return PlayerService.position();
    }, function (value) {
      if (!$ctrl.isSeeking) {
        $ctrl.position = value;
      }
      $ctrl.time = PlayerService.formattedTime();
      $ctrl.length = PlayerService.formattedLength();
      $ctrl.clockTime = PlayerService.time() + CommentService.offset();
      $ctrl.end = PlayerService.length() + CommentService.offset();
    });
  }
}());
