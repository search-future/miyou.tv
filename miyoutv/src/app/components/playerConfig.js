/*!
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
    .component('playerConfig', {
      templateUrl: 'templates/playerConfig.html',
      controller: PlayerConfigCtrl,
      bindings: {
        options: '=',
        audioTrackCount: '<',
        hasSurround: '<'
      }
    });

  function PlayerConfigCtrl(
    $scope
  ) {
    var $ctrl = this;

    $ctrl.deinterlaceList = {
      無効: '',
      ブレンド: 'blend',
      Bob: 'bob',
      破棄: 'discard',
      リニア: 'linear',
      中間: 'mean',
      X: 'x',
      Yadif: 'yadif',
      'Yadif(2x)': 'yadif2x'
    };
    $ctrl.aspectRatioList = {
      '16:9': '16:9',
      '4:3': '4:3',
      '1:1': '1:1',
      '16:10': '16:10',
      '2.21:1': '221:100',
      '2.35:1': '235:100',
      '2.39:1': '239:100',
      '5:4': '5:4',
      フル: ''
    };
    $ctrl.audioTrackList = [];
    $ctrl.audioChannelList = null;

    $scope.$watch(function () {
      return $ctrl.audioTrackCount;
    }, function (value) {
      var tracks = [];
      var i = 0;

      tracks.push('無効');
      for (i = 1; i < value; i += 1) {
        tracks.push('トラック ' + i);
      }
      $ctrl.audioTrackList = tracks;
    });

    $scope.$watch(function () {
      return $ctrl.options.playerRate;
    }, function (value) {
      $ctrl.playerRate = Math.round(value * 100) / 100;
    });
    $scope.$watch(function () {
      return $ctrl.playerRate;
    }, function (value) {
      if (angular.isNumber(value)) {
        $ctrl.options.playerRate = value;
      }
    });

    $scope.$watch(function () {
      return $ctrl.options.playerDeinterlace;
    }, function (value) {
      $ctrl.playerDeinterlace = value;
    });
    $scope.$watch(function () {
      return $ctrl.playerDeinterlace;
    }, function (value) {
      if (angular.isString(value)) {
        $ctrl.options.playerDeinterlace = value;
      }
    });

    $scope.$watch(function () {
      return $ctrl.options.playerAspectRatio;
    }, function (value) {
      $ctrl.playerAspectRatio = value;
    });
    $scope.$watch(function () {
      return $ctrl.playerAspectRatio;
    }, function (value) {
      if (angular.isString(value)) {
        $ctrl.options.playerAspectRatio = value;
      }
    });

    $scope.$watch(function () {
      return $ctrl.options.playerAudioTrack;
    }, function (value) {
      $ctrl.playerAudioTrack = String(value >= 0 ? value : 0);
      if (value > 0) {
        $ctrl.audioChannelList = {
          ステレオ: 1,
          左: 3,
          右: 4,
          ステレオ反転: 2
        };
        if ($ctrl.hasSurround) {
          $ctrl.audioChannelList['ドルビーサラウンド'] = 5;
        }
      } else {
        $ctrl.audioChannelList = null;
      }
    });
    $scope.$watch(function () {
      return $ctrl.playerAudioTrack;
    }, function (value) {
      if (!isNaN(value)) {
        $ctrl.options.playerAudioTrack = parseInt(value, 10);
      }
    });

    $scope.$watch(function () {
      return $ctrl.options.playerAudioChannel;
    }, function (value) {
      $ctrl.playerAudioChannel = value;
    });
    $scope.$watch(function () {
      return $ctrl.playerAudioChannel;
    }, function (value) {
      if (angular.isNumber(value)) {
        $ctrl.options.playerAudioChannel = value;
      }
    });

    $scope.$watch(function () {
      return $ctrl.options.commentDuration;
    }, function (value) {
      $ctrl.commentDuration = value / 1000;
    });
    $scope.$watch(function () {
      return $ctrl.commentDuration;
    }, function (value) {
      if (angular.isNumber(value)) {
        $ctrl.options.commentDuration = value * 1000;
      }
    });

    $scope.$watch(function () {
      return $ctrl.options.commentDelay;
    }, function (value) {
      $ctrl.commentDelay = value / 1000;
    });
    $scope.$watch(function () {
      return $ctrl.commentDelay;
    }, function (value) {
      if (angular.isNumber(value)) {
        $ctrl.options.commentDelay = value * 1000;
      }
    });

    $scope.$watch(function () {
      return $ctrl.options.commentMaxLines;
    }, function (value) {
      $ctrl.commentMaxLines = value;
    });
    $scope.$watch(function () {
      return $ctrl.commentMaxLines;
    }, function (value) {
      if (angular.isNumber(value)) {
        $ctrl.options.commentMaxLines = value;
      }
    });

    $scope.$watch(function () {
      return $ctrl.options.commentMaxItems;
    }, function (value) {
      $ctrl.commentMaxItems = value;
    });
    $scope.$watch(function () {
      return $ctrl.commentMaxItems;
    }, function (value) {
      if (angular.isNumber(value)) {
        $ctrl.options.commentMaxItems = value;
      }
    });
  }
}());
