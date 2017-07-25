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
    .component('commentScreen', {
      template: [
        '<div ng-show="$ctrl.enabled">',
        '<div',
        'ng-repeat="comment in $ctrl.comments"',
        'ng-style="comment.style"',
        'ng-bind="comment.text"',
        '></div>',
        '</div>'
      ].join(' '),
      controller: CommentScreenCtrl,
      bindings: {
        enabled: '<',
        options: '<',
        data: '<'
      }
    });

  function CommentScreenCtrl(
    $scope,
    $element,
    $window,
    $timeout,
    PlayerService
  ) {
    var $ctrl = this;
    var offset = 0;
    var duration = 5000;
    var lines = [];
    var dp = 0;
    var cp = 0;

    $ctrl.options = {};
    $ctrl.comments = [];

    $ctrl.$onInit = function () {
      angular.element($window).on('resize', adjustLines);
    };

    $ctrl.$onDestroy = function () {
      angular.element($window).off('resize', adjustLines);
    };

    $scope.$watchGroup([function () {
      return $ctrl.enabled;
    }, function () {
      return $element[0].clientWidth;
    }, function () {
      return $element[0].clientHeight;
    }], function (values) {
      var enabled = values[0];
      var width = values[1];
      var height = values[2];
      if (!enabled || width <= 0 || height <= 0) {
        $ctrl.comments.forEach(function (a) {
          var comment = a;

          comment.style.visibility = 'hidden';
        });
      } else {
        adjustLines();
      }
    });
    $scope.$watch(function () {
      return $ctrl.options.offset;
    }, function (value) {
      offset = value || offset;
    });
    $scope.$watch(function () {
      return $ctrl.options.duration;
    }, function (value) {
      duration = value || duration;
    });
    $scope.$watch(function () {
      return $ctrl.options.maxLines;
    }, function (value) {
      var max = value || 10;

      lines = new Array(max);
      adjustLines();
    });
    $scope.$watch(function () {
      return $ctrl.options.maxItems;
    }, function (value) {
      var max = value || 50;
      var i = 0;

      $ctrl.comments = [];
      for (i = 0; i < max; i += 1) {
        $ctrl.comments.push({
          style: {
            position: 'absolute',
            visibility: 'hidden',
            transitionProperty: 'left',
            transitionTimingFunction: 'linear'
          }
        });
      }
      cp = 0;
      $timeout(function () {
        for (i = 0; i < $ctrl.comments.length; i += 1) {
          $ctrl.comments[i].element = $element.children().children().eq(i);
          initComment($ctrl.comments[i]);
        }
      });
    });
    $scope.$watchCollection(function () {
      return $ctrl.data;
    }, function (value) {
      $ctrl.data = value;
      dp = 0;
    });
    $scope.$watch(function () {
      return PlayerService.time();
    }, function (newValue, oldValue) {
      var start = 0;
      var end = 0;

      if (!$ctrl.enabled || $element[0].clientWidth <= 0 || $element[0].clientHeight <= 0) {
        return;
      }
      start = oldValue + offset;
      end = newValue + offset;
      if (newValue < oldValue) {
        dp = 0;
        $ctrl.comments.forEach(function (a) {
          var comment = a;

          comment.style.visibility = 'hidden';
        });
      } else if (newValue - oldValue > duration) {
        start = (newValue - duration) + offset;
        $ctrl.comments.forEach(function (a) {
          var comment = a;

          comment.style.visibility = 'hidden';
        });
      }
      while (dp < $ctrl.data.length) {
        if ($ctrl.data[dp].time >= end) {
          break;
        }
        if ($ctrl.data[dp].enabled !== false && $ctrl.data[dp].time >= start) {
          deployComment($ctrl.data[dp], newValue);
        }
        dp += 1;
      }
    });

    function selectLine(comment) {
      var screenWidth = $element[0].clientWidth;
      var commentWidth = comment.element[0].offsetWidth;
      var reachTime = (duration * screenWidth) / (screenWidth + commentWidth);
      var candidateLife = Infinity;
      var candidateRight = Infinity;
      var candidateIndex = 0;

      var i = 0;
      var remainingTime = 0;
      var lineElement = null;
      var right = 0;

      for (i = 0; i < lines.length; i += 1) {
        if (!lines[i] || lines[i].style.visibility === 'hidden') {
          return i;
        }
        remainingTime = (lines[i].time + duration) - comment.time;
        lineElement = lines[i].element[0];
        right = lineElement.offsetLeft + lineElement.offsetWidth;
        if (remainingTime <= reachTime && right <= $element[0].clientWidth) {
          return i;
        }
        if (remainingTime <= candidateLife && right < candidateRight) {
          candidateLife = remainingTime;
          candidateRight = right;
          candidateIndex = lines[i].index || i;
        }
      }
      if (Math.floor(candidateIndex + 0.25) >= Math.floor(candidateIndex)) {
        candidateIndex -= 1;
      }
      return candidateIndex + 0.25;
    }

    function initComment(value) {
      var comment = value;

      comment.element.on('transitionend', function () {
        comment.style.visibility = 'hidden';
      });
    }

    function initAnimation(value) {
      var comment = value;

      comment.style.transitionDuration = 0;
      comment.style.transitionDelay = 0;
      comment.style.left = '100%';
      $timeout(function () {
        comment.style.transitionDuration = duration + 'ms';
        comment.style.transitionDelay = (comment.time - $ctrl.time) + 'ms';
        comment.style.left = -comment.element[0].offsetWidth + 'px';
        comment = null;
      });
    }

    function adjustLines() {
      var lineHeight = $element[0].clientHeight / lines.length;
      var fontSize = (lineHeight * 2) / 3;

      $element.css('fontSize', fontSize + 'px');
    }

    function deployComment(data) {
      var comment = $ctrl.comments[cp];

      comment.time = data.time - offset;
      comment.text = data.text;
      comment.style.opacity = 0;
      comment.style.visibility = 'visible';
      $timeout(function () {
        var index = selectLine(comment);

        comment.index = index;
        lines[Math.floor(index)] = comment;
        comment.style.top = ((100 * index) / (lines.length + 1)) + '%';
        comment.style.opacity = 1;
        initAnimation(comment);
        comment = null;
      });
      cp += 1;
      if (cp >= $ctrl.comments.length) {
        cp = 0;
      }
    }
  }
}());
