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
    .component('controlbar', {
      templateUrl: 'templates/controlbar.html',
      controller: ControlbarCtrl,
      bindings: {
        commentEnabled: '='
      }
    });

  function ControlbarCtrl(
    $scope,
    CommonService,
    PlayerService
  ) {
    var $ctrl = this;

    $ctrl.isFullscreen = false;
    $ctrl.playing = false;
    $ctrl.mute = false;
    $ctrl.volume = 100;
    $ctrl.stop = CommonService.back;
    $ctrl.togglePause = PlayerService.togglePause;
    $ctrl.speedUp = PlayerService.speedUp;
    $ctrl.speedDown = PlayerService.speedDown;
    $ctrl.jumpForward = PlayerService.jumpForward;
    $ctrl.jumpBackward = PlayerService.jumpBackward;
    $ctrl.toggleMute = PlayerService.toggleMute;
    $ctrl.setVolume = PlayerService.volume;
    $ctrl.toggleFullscreen = CommonService.toggleFullscreen;

    $ctrl.toggleComment = function () {
      $ctrl.commentEnabled = !$ctrl.commentEnabled;
    };

    $ctrl.toggleSidebar = function () {
      CommonService.trigger('toggleSidebar');
    };

    $scope.$watch(function () {
      return CommonService.isFullscreen();
    }, function (value) {
      $ctrl.isFullscreen = value;
    });
    $scope.$watch(function () {
      return PlayerService.playing();
    }, function (value) {
      $ctrl.playing = value;
    });
    $scope.$watch(function () {
      return PlayerService.mute();
    }, function (value) {
      $ctrl.mute = value;
    });
    $scope.$watch(function () {
      return PlayerService.volume();
    }, function (value) {
      $ctrl.volume = value;
    });
  }
}());
