(function () {
  'use strict';

  angular
    .module('app')
    .component('viewSetting', {
      templateUrl: 'templates/viewSetting.html',
      controller: ViewSettingCtrl,
      bindings: {
        close: '&',
        dismiss: '&'
      }

    });

  function ViewSettingCtrl(
    $scope,
    CommonService
  ) {
    var $ctrl = this;

    $ctrl.countMode = 'speed';
    $ctrl.hourFirst = '4';
    $ctrl.hourFormat = '';

    $ctrl.ok = function () {
      var countMode = $ctrl.countMode;
      var hourFirst = parseInt($ctrl.hourFirst, 10);
      var hourFormat = $ctrl.hourFormat;

      CommonService.saveLocalStorage('countMode', countMode);
      CommonService.saveLocalStorage('hourFirst', hourFirst);
      CommonService.saveLocalStorage('hourFormat', hourFormat);
      $ctrl.close();
    };
    $ctrl.cancel = function () {
      $ctrl.dismiss();
    };

    $scope.$watch(function () {
      return $ctrl.hourFirst;
    }, function (value) {
      var hour = parseInt(value, 10);

      $ctrl.autoFormatName = [hour, '-', (hour + 24) - 1].join('');
    });
    $scope.$watch(function () {
      return CommonService.loadLocalStorage('countMode');
    }, function (value) {
      $ctrl.countMode = value || 'speed';
    });
    $scope.$watch(function () {
      return CommonService.loadLocalStorage('hourFirst');
    }, function (value) {
      $ctrl.hourFirst = angular.isNumber(value) ? String(value) : '4';
    });
    $scope.$watch(function () {
      return CommonService.loadLocalStorage('hourFormat');
    }, function (value) {
      $ctrl.hourFormat = value || '';
    });
  }
}());
