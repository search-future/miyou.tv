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
    .component('videoScreen', {
      template: [
        '<canvas ng-style="$ctrl.canvasStyle"></canvas>',
        '<div ng-style="$ctrl.textStyle" ng-bind="$ctrl.text"></div>'
      ].join(''),
      controller: VideoScreenCtrl
    });

  function VideoScreenCtrl(
    $scope,
    $element,
    PlayerService
  ) {
    var $ctrl = this;

    $ctrl.canvasStyle = {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      margin: 'auto'
    };
    $ctrl.textStyle = {
      position: 'absolute',
      top: 0,
      right: 0,
      pointerEvents: 'none',
      whiteSpace: 'pre',
      transitionProperty: 'opacity',
      transitionTimingFunction: 'linear'
    };

    $scope.$watch(function () {
      return PlayerService.getScreenText();
    }, function (value) {
      if (value) {
        $ctrl.text = value;
        $ctrl.textStyle.opacity = 1;
        $ctrl.textStyle.transitionDelay = 0;
        $ctrl.textStyle.transitionDuration = 0;
      } else {
        $ctrl.textStyle.opacity = 0;
        $ctrl.textStyle.transitionDelay = '2s';
        $ctrl.textStyle.transitionDuration = '1s';
      }
    });
    $scope.$on('Player.FrameReady', adjustSize);
    $scope.$on('$destroy', PlayerService.suspend);

    $element.on('wheel', function (e) {
      if (e.originalEvent.deltaX !== 0) {
        PlayerService.jumpForward(((e.originalEvent.deltaX * 10000) / 120) + 'ms');
      }
      if (e.originalEvent.deltaY !== 0) {
        PlayerService.decreaseVolume(e.originalEvent.deltaY / 60);
      }
    });

    PlayerService.init($element.find('canvas')[0]);

    function adjustSize() {
      var aspectRatioString = PlayerService.aspectRatio();
      var aspectRatio = aspectRatioString.split(':');
      var width = 0;
      var height = 0;

      if (aspectRatio.length === 2) {
        width = $element[0].offsetWidth;
        height = ($element[0].offsetWidth * aspectRatio[1]) / aspectRatio[0];
        if (height > $element[0].offsetHeight) {
          width = ($element[0].offsetHeight * aspectRatio[0]) / aspectRatio[1];
          height = $element[0].offsetHeight;
        }
      } else {
        width = $element[0].offsetWidth;
        height = $element[0].offsetHeight;
      }
      $ctrl.canvasStyle.width = width + 'px';
      $ctrl.canvasStyle.height = height + 'px';
    }
  }
}());
