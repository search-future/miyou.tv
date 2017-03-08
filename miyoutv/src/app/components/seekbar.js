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
        mode: '=',
        chartData: '<'
      },
      templateUrl: 'templates/seekbar.html',
      controller: SeekbarCtrl
    });

  function SeekbarCtrl(
    $scope,
    CommonService,
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
      $ctrl.clockTime = CommonService.formatDate(PlayerService.time() + CommentService.offset(), 'A HHHH:mm:ss');
      $ctrl.endTime = CommonService.formatDate(PlayerService.length() + CommentService.offset(), 'A HHHH:mm:ss');
    });

    $scope.$watchGroup([function () {
      return ChinachuPlayerService.programList;
    }, function () {
      return CommentService.offset();
    }, function () {
      return PlayerService.length();
    }], function (values) {
      var list = values[0];
      var offset = values[1];
      var length = values[2];

      $ctrl.separators = [];
      if (
        angular.isArray(list) &&
        length
      ) {
        list.forEach(function (a) {
          var position = (a.startAt - offset) / length;
          $ctrl.separators.push(Math.floor(position * 100000) / 100000);
        });
      }
    });
    $scope.$watchGroup([function () {
      return $ctrl.chartData;
    }, function () {
      return CommentService.offset();
    }, function () {
      return PlayerService.length();
    }], function (values) {
      var data = values[0];
      var offset = values[1] - 60000;
      var length = values[2];
      var width = 100;
      var height = 100;
      var max;
      var xscale;
      var yscale;
      var i;
      var x;
      var y;
      var points = [];

      if (length && angular.isArray(data)) {
        max = Math.max.apply(null, data.map(function (a) {
          return a.n_hits;
        }));
        xscale = width / length;
        yscale = height / max;

        points.push([0, height].join(','));
        for (i = 0; i < data.length; i += 1) {
          if (data[i].start >= offset) {
            x = (data[i].start - offset) * xscale;
            y = height - (data[i].n_hits * yscale);
            points.push([x, y].join(','));
          }
        }
        $ctrl.chartPoints = points.join(' ');
      } else {
        $ctrl.chartPoints = '';
      }
    });
  }
}());
