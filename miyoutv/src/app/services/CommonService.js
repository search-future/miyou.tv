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
(function (path, fs) {
  'use strict';

  angular.module('app')
    .factory('CommonService', CommonService);

  function CommonService(
    $rootScope,
    $window,
    $location,
    $filter,
    $route,
    $uibModal
  ) {
    var service = {
      window: window,
      saveLocalStorage: saveLocalStorage,
      loadLocalStorage: loadLocalStorage,
      removeLocalStorage: removeLocalStorage,
      saveSessionStorage: saveSessionStorage,
      loadSessionStorage: loadSessionStorage,
      removeSessionStorage: removeSessionStorage,
      saveFile: saveFile,
      loadFile: loadFile,
      removeFile: removeFile,
      isFullscreen: isFullscreen,
      setFullscreen: setFullscreen,
      isAlwaysOnTop: isAlwaysOnTop,
      setAlwaysOnTop: setAlwaysOnTop,
      isMaximized: isMaximized,
      maximize: maximize,
      isMinimized: isMinimized,
      minimize: minimize,
      restore: restore,
      quitModal: quitModal,
      close: close,
      reload: reload,
      back: back,
      quit: quit,
      formatTime: formatTime,
      convertHour: convertHour,
      formatDate: formatDate,
      errorModal: errorModal,
      progressModal: progressModal,
      openViewSetting: openViewSetting,
      openBackendSetting: openBackendSetting,
      openMoritapoSetting: openMoritapoSetting
    };
    var props = {
      win: null,
      quitModal: null
    };

    /* eslint-disable */
    if (process.versions.electron) {
      props.app = require('electron').remote.app;
      props.win = require('electron').remote.getCurrentWindow();
      props.dataPath = props.app.getPath('userData');
    }
    /* eslint-enable */

    return service;

    function window() {
      return props.win;
    }

    function saveLocalStorage(key, value) {
      if (angular.isObject(value)) {
        $window.localStorage.setItem(key, angular.toJson(value));
      } else {
        $window.localStorage.setItem(key, value);
      }
    }

    function loadLocalStorage(key) {
      var value;

      try {
        value = angular.fromJson($window.localStorage.getItem(key));
      } catch (e) {
        value = $window.localStorage.getItem(key);
      }
      return value;
    }

    function removeLocalStorage(key) {
      $window.localStorage.removeItem(key);
    }

    function saveSessionStorage(key, value) {
      if (angular.isObject(value)) {
        $window.sessionStorage.setItem(key, angular.toJson(value));
      } else {
        $window.sessionStorage.setItem(key, value);
      }
    }

    function loadSessionStorage(key) {
      var value;

      try {
        value = angular.fromJson($window.sessionStorage.getItem(key));
      } catch (e) {
        value = $window.sessionStorage.getItem(key);
      }
      return value;
    }

    function removeSessionStorage(key) {
      $window.sessionStorage.removeItem(key);
    }

    function saveFile(dirname, filename, value) {
      var dirpath = path.resolve(props.dataPath, dirname);
      var filepath = path.join(props.dataPath, dirname, filename);
      var data;
      if (angular.isObject(value)) {
        data = angular.toJson(value);
      } else {
        data = value;
      }
      try {
        fs.mkdirSync(dirpath);
      } catch (e) {
        if (e.code !== 'EEXIST') {
          return false;
        }
      }
      try {
        fs.writeFileSync(filepath, data);
      } catch (e) {
        return false;
      }
      return true;
    }

    function loadFile(dirname, filename) {
      var filepath = path.join(props.dataPath, dirname, filename);
      var data;
      var value;

      try {
        data = fs.readFileSync(filepath, 'utf8');
      } catch (e) {
        return null;
      }
      try {
        value = angular.fromJson(data);
      } catch (e) {
        value = data;
      }
      return value;
    }

    function removeFile(dirname, filename) {
      var filepath = path.join(props.dataPath, dirname, filename);
      try {
        fs.unlinkSync(filepath);
        return true;
      } catch (e) {
        return false;
      }
    }

    function isFullscreen() {
      return props.win.isFullScreen();
    }

    function setFullscreen(flag) {
      props.win.setFullScreen(Boolean(flag));
    }

    function isAlwaysOnTop() {
      return props.win.isAlwaysOnTop();
    }

    function setAlwaysOnTop(flag) {
      props.win.setAlwaysOnTop(Boolean(flag));
    }

    function isMaximized() {
      return props.win.isMaximized();
    }

    function maximize() {
      props.win.maximize();
    }

    function isMinimized() {
      return props.win.isMinimized();
    }

    function minimize() {
      props.win.minimize();
    }

    function restore() {
      props.win.restore();
    }

    function quitModal() {
      if (!props.quitModal) {
        props.quitModal = $uibModal.open({
          component: 'quitModal',
          size: 'sm',
          windowClass: 'modal-container'
        });
        props.quitModal.closed.then(function () {
          props.quitModal = null;
        });
      }
    }

    function close() {
      props.win.close();
    }

    function reload() {
      props.win.reload();
    }

    function back() {
      $window.history.back();
    }

    function quit() {
      props.app.quit();
    }

    function formatTime(time) {
      var sign = time >= 0 ? '' : '-';
      var h = String(Math.floor(Math.abs(time) / 3600000));
      var m = String(Math.floor((Math.abs(time) % 3600000) / 60000) + 100)
        .slice(-2);
      var s = String(Math.floor((Math.abs(time) % 60000) / 1000) + 100)
        .slice(-2);

      return sign + ((h > 0) ? [h, m, s] : [m, s]).join(':');
    }

    function convertHour(time, format) {
      var hour = new Date(time).getHours();
      var savedFormat = loadLocalStorage('hourFormat') || '';
      var hourFormat = angular.isDefined(format) ? format : savedFormat;
      var formatArray = hourFormat.split(':');
      var start = angular.isNumber(loadLocalStorage('hourFirst')) ? loadLocalStorage('hourFirst') : 4;
      var limit = 24;

      if (formatArray.length === 2) {
        start = !isNaN(formatArray[0]) ? parseInt(formatArray[0], 10) : start;
        limit = !isNaN(formatArray[1]) ? parseInt(formatArray[1], 10) : limit;
      }
      return (((hour + limit) - start) % limit) + start;
    }

    function formatDate(time, format, hourFormat) {
      var hour = convertHour(time, hourFormat);
      var savedHourFormat = loadLocalStorage('hourFormat') || '';
      var useMarker = /12$/.test(angular.isString(hourFormat) ? hourFormat : savedHourFormat);
      var convertedFormat = format.replace(
        'HHHH', String(100 + hour).slice(1)
      ).replace(
        'HHH', String(hour)
      ).replace(
        'A', useMarker ? 'a' : ''
      );

      return $filter('date')(time, convertedFormat);
    }

    function errorModal(title, message, callback) {
      var modal = $uibModal.open({
        component: 'errorModal',
        size: 'sm',
        windowClass: 'modal-container',
        resolve: {
          title: function () {
            return title;
          },
          message: function () {
            return message;
          }
        }
      });
      modal.closed.then(callback);
    }

    function progressModal(title, message) {
      return $uibModal.open({
        backdrop: 'static',
        component: 'progressModal',
        windowClass: 'modal-container',
        resolve: {
          title: function () {
            return title;
          },
          message: function () {
            return message;
          }
        }
      });
    }

    function openViewSetting() {
      return $uibModal.open({
        component: 'ViewSetting',
        windowClass: 'modal-container'
      });
    }

    function openBackendSetting() {
      return $uibModal.open({
        component: 'backendSetting',
        windowClass: 'modal-container'
      });
    }

    function openMoritapoSetting() {
      return $uibModal.open({
        component: 'moritapoSetting',
        windowClass: 'modal-container'
      });
    }
  }
}(
  require('path'),
  require('fs')
));
