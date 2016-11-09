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
    .directive('keepScroll', keepScroll);

  function keepScroll($location) {
    return {
      link: function (scope, element, attrs) {
        var name = attrs.keepScroll || attrs.keepScrollName;
        var nameX = attrs.keepScrollNameX;
        var nameY = attrs.keepScrollNameY;

        if (!(name || (nameX && nameY))) {
          name = 'pos';
        }

        scope.$watch(function () {
          return element[0].scrollWidth;
        }, load);
        scope.$watch(function () {
          return element[0].scrollHeight;
        }, load);

        element.on('scroll', save);

        function save() {
          var search;

          search = $location.search();
          if (nameX && nameY) {
            search[nameX] = element[0].scrollLeft;
            search[nameY] = element[0].scrollTop;
          } else {
            search[name] = [
              element[0].scrollLeft,
              element[0].scrollTop
            ].join(',');
          }
          $location.search(search).replace();
        }

        function load() {
          var search = $location.search();
          var scrollArea = element[0];
          var pos = [];

          if (nameX && nameY) {
            scrollArea.scrollLeft = search[nameX];
            scrollArea.scrollTop = search[nameY];
          } else if (name in search && angular.isString(search[name])) {
            pos = search[name].split(',');
            scrollArea.scrollLeft = pos[0];
            scrollArea.scrollTop = pos[1];
          } else {
            if ('keepRight' in attrs) {
              scrollArea.scrollLeft = element[0].scrollWidth;
            }
            if ('keepBottom' in attrs) {
              scrollArea.scrollTop = element[0].scrollHeight;
            }
          }
        }
      }
    };
  }
}());
