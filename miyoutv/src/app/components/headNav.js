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
    .component('headNav', {
      templateUrl: 'templates/headNav.html',
      controller: HeadNavCtrl
    });

  function HeadNavCtrl(
    $scope,
    $location,
    $route,
    CommonService
  ) {
    var $ctrl = this;
    $ctrl.close = CommonService.close;
    $ctrl.openChinachuSetting = CommonService.openChinachuSetting;
    $ctrl.openMoritapoSetting = CommonService.openMoritapoSetting;
    $ctrl.isCollapsed = true;
    $ctrl.searchText = $location.search().search;

    $ctrl.search = function () {
      $location.search('search', $ctrl.searchText);
    };

    $scope.$watch(function () {
      return $route.current;
    }, function (value) {
      $ctrl.current = value.locals.name;
    });
  }
}());
