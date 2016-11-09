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
    .component('playerConfig', {
      templateUrl: 'templates/playerConfig.html',
      controller: PlayerConfigCtrl
    });

  function PlayerConfigCtrl(
    $scope,
    PlayerService,
    CommentService
  ) {
    var $ctrl = this;

    $ctrl.svc = {
      player: PlayerService,
      comment: CommentService
    };
    $ctrl.player = {};
    $ctrl.comment = {};
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
      return PlayerService.rate();
    }, function (value) {
      $ctrl.player.rate = Math.round(value * 100) / 100;
    });
    $scope.$watch(function () {
      return PlayerService.deinterlace();
    }, function (value) {
      $ctrl.player.deinterlace = value;
    });
    $scope.$watch(function () {
      return PlayerService.aspectRatio();
    }, function (value) {
      $ctrl.player.aspectRatio = value;
    });
    $scope.$watch(function () {
      return PlayerService.audioTrackCount();
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
      return PlayerService.audioTrack();
    }, function (value) {
      $ctrl.player.audioTrack = String(value >= 0 ? value : 0);
      if (value > 0) {
        $ctrl.audioChannelList = {
          ステレオ: 1,
          左: 3,
          右: 4,
          ステレオ反転: 2
        };
        if (PlayerService.audioChannel(5) === 5) {
          $ctrl.audioChannelList['ドルビーサラウンド'] = 5;
        }
      } else {
        $ctrl.audioChannelList = null;
      }
    });
    $scope.$watch(function () {
      return PlayerService.audioChannel();
    }, function (value) {
      $ctrl.player.audioChannel = value;
    });
    $scope.$watch(function () {
      return CommentService.delay();
    }, function (value) {
      $ctrl.comment.delay = value / 1000;
    });
    $scope.$watch(function () {
      return CommentService.duration();
    }, function (value) {
      $ctrl.comment.duration = value / 1000;
    });
    $scope.$watch(function () {
      return CommentService.maxLines();
    }, function (value) {
      $ctrl.comment.maxLines = value;
    });
    $scope.$watch(function () {
      return CommentService.maxItems();
    }, function (value) {
      $ctrl.comment.maxItems = value;
    });
  }
}());
