(function () {
  'use strict';


  angular
    .module('app')
    .component('titlebar', {
      templateUrl: 'templates/titlebar.html',
      controller: TitlebarCtrl,
      controllerAs: '$ctrl'
    });

  function TitlebarCtrl(
    $scope,
    CommonService
  ) {
    var $ctrl = this;
    $ctrl.isFullscreen = false;
    $ctrl.isMaximized = false;
    $ctrl.isAlwaysOnTop = false;

    $ctrl.toggleAlwaysOnTop = function () {
      CommonService.setAlwaysOnTop(!CommonService.isAlwaysOnTop());
    };
    $ctrl.minimize = function () {
      CommonService.minimize();
    };
    $ctrl.maximize = function () {
      CommonService.maximize();
    };
    $ctrl.restore = function () {
      CommonService.restore();
    };
    $ctrl.fullscreen = function () {
      CommonService.setFullscreen(true);
    };
    $ctrl.close = function () {
      CommonService.close();
    };

    $scope.$watch(function () {
      return CommonService.isFullscreen();
    }, function (value) {
      $ctrl.isFullscreen = value;
    });
    $scope.$watch(function () {
      return CommonService.isMaximized();
    }, function (value) {
      $ctrl.isMaximized = value;
    });
    $scope.$watch(function () {
      return CommonService.isAlwaysOnTop();
    }, function (value) {
      $ctrl.isAlwaysOnTop = value;
    });
  }
}());
