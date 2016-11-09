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
    .component('commentScreen', {
      template: [
        '<div',
        'ng-repeat="comment in $ctrl.comments"',
        'ng-show="comment.visible"',
        'ng-style="comment.style"',
        'ng-bind="comment.text"',
        '></div>'
      ].join(' '),
      controller: CommentScreenCtrl
    });

  function CommentScreenCtrl(
    $scope,
    $element,
    $timeout,
    CommentService,
    PlayerService
  ) {
    var $ctrl = this;
    var offset = 0;
    var duration = 5000;
    var lines = [];
    var commentData = [];
    var dp = 0;
    var cp = 0;

    $ctrl.comments = [];

    $scope.$watch(function () {
      return CommentService.enabled();
    }, function (value) {
      if (!value) {
        $ctrl.comments.forEach(function (a) {
          var comment = a;

          comment.visible = false;
        });
      }
    });
    $scope.$watch(function () {
      return CommentService.offset();
    }, function (value) {
      offset = value || offset;
    });
    $scope.$watch(function () {
      return CommentService.duration();
    }, function (value) {
      duration = value || duration;
    });
    $scope.$watch(function () {
      return CommentService.maxLines();
    }, function (value) {
      var max = value || 10;

      lines = new Array(max);
      adjustLines();
    });
    $scope.$watch(function () {
      return CommentService.maxItems();
    }, function (value) {
      var max = value || 50;
      var i = 0;

      $ctrl.comments = [];
      for (i = 0; i < max; i += 1) {
        $ctrl.comments.push({
          visible: false,
          style: {
            position: 'absolute',
            transitionProperty: 'left',
            transitionTimingFunction: 'linear'
          }
        });
      }
      cp = 0;
      $timeout(function () {
        for (i = 0; i < $ctrl.comments.length; i += 1) {
          $ctrl.comments[i].element = $element.children().eq(i);
          initComment($ctrl.comments[i]);
        }
      });
    });
    $scope.$watchGroup([function () {
      return CommentService.comments();
    }, function () {
      return CommentService.filter();
    }], function () {
      commentData = CommentService.filteredComments();
      dp = 0;
    });
    $scope.$watch(function () {
      return PlayerService.time();
    }, function (newValue, oldValue) {
      var start = 0;
      var end = 0;

      if (!CommentService.enabled()) {
        return;
      }
      start = oldValue + offset;
      end = newValue + offset;
      if (newValue < oldValue) {
        dp = 0;
        $ctrl.comments.forEach(function (a) {
          var comment = a;

          comment.visible = false;
        });
      } else if (newValue - oldValue > duration) {
        start = (newValue - duration) + offset;
        $ctrl.comments.forEach(function (a) {
          var comment = a;

          comment.visible = false;
        });
      }
      while (dp < commentData.length) {
        if (commentData[dp].time >= end) {
          break;
        }
        if (commentData[dp].time >= start) {
          deployComment(commentData[dp], newValue);
        }
        dp += 1;
      }
    });
    $scope.$watch(function () {
      return $element[0].clientHeight;
    }, function () {
      adjustLines();
    });

    function selectLine(comment) {
      var screenWidth = $element[0].clientWidth;
      var commentWidth = comment.element[0].offsetWidth;
      var reachTime = (duration * screenWidth) / (screenWidth + commentWidth);
      var minTime = Infinity;
      var oldComments = [];
      var index = 0;

      var i = 0;
      var reminingTime = 0;
      var lineElement = null;
      var right = 0;

      for (i = 0; i < lines.length; i += 1) {
        if (!lines[i] || !lines[i].visible) {
          return i;
        }
        reminingTime = (lines[i].time + duration) - comment.time;
        lineElement = lines[i].element[0];
        right = lineElement.offsetLeft + lineElement.offsetWidth;
        if (reminingTime <= reachTime && right <= $element[0].clientWidth) {
          return i;
        }
        if (reminingTime <= minTime) {
          if (reminingTime !== minTime) {
            minTime = reminingTime;
            oldComments = [];
          }
          oldComments.push(lines[i]);
        }
      }
      index = Math.floor(Math.random() * oldComments.length);
      return oldComments[index].index;
    }

    function initComment(value) {
      var comment = value;

      comment.element.on('transitionend', function () {
        comment.visible = false;
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
      });
    }

    function adjustLines() {
      var lineHeight = $element[0].clientHeight / lines.length;
      var fontSize = (lineHeight * 2) / 3;

      $element.css('fontSize', fontSize + 'px');
      $ctrl.comments.forEach(function (comment) {
        if (comment.visible) {
          initAnimation(comment);
        }
      });
    }

    function deployComment(data) {
      var comment = $ctrl.comments[cp];

      comment.time = data.time - offset;
      comment.text = data.text;
      comment.style.opacity = 0;
      comment.visible = true;
      $timeout(function () {
        var index = selectLine(comment);

        comment.index = index;
        lines[index] = comment;
        comment.style.top = ((100 * index) / lines.length) + '%';
        comment.style.opacity = 1;
        initAnimation(comment);
      });
      cp += 1;
      if (cp >= $ctrl.comments.length) {
        cp = 0;
      }
    }
  }
}());
