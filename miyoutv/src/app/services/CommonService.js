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
(function (path, fs) {
  'use strict';

  angular.module('app')
    .factory('CommonService', CommonService);

  function CommonService(
    $rootScope,
    $window,
    $location,
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
      trigger: trigger,
      triggered: triggered,
      quitModal: quitModal,
      close: close,
      reload: reload,
      back: back,
      formatTime: formatTime,
      errorModal: errorModal,
      progressModal: progressModal,
      openChinachuSetting: openChinachuSetting,
      openMoritapoSetting: openMoritapoSetting
    };
    var props = {
      win: null,
      triggers: {},
      isFullscreen: false,
      quitModal: null
    };

    /* eslint-disable */
    if (process.versions.nw) {
      var version = process.versions.nw.split('.');
      if (parseInt(version[0], 10) > 0 || parseInt(version[1], 10) > 12) {
        props.app = nw.App;
        props.win = nw.Window.get();
      } else {
        props.app = require('nw.gui').App;
        props.win = require('nw.gui').Window.get();
      }
      props.dataPath = props.app.dataPath;
      service.isFullscreen = isFullscreen;
      service.enterFullscreen = enterFullscreenNW;
      service.leaveFullscreen = leaveFullscreenNW;
      service.toggleFullscreen = toggleFullscreenNW;
      service.quit = quitNW;
    } else if (process.versions.electron) {
      var version = process.versions.electron.split('.');
      if (parseInt(version[0], 10) > 0) {
        props.app = require('electron').remote.app;
        props.win = require('electron').remote.getCurrentWindow();
      } else {
        props.app = require('remote').app;
        props.win = require('remote').getCurrentWindow();
      }
      props.dataPath = props.app.getPath('userData');
      service.isFullscreen = isFullscreen;
      service.enterFullscreen = enterFullscreenElectron;
      service.leaveFullscreen = leaveFullscreenElectron;
      service.toggleFullscreen = toggleFullscreenElectron;
      service.quit = quitElectron;
    }
    /* eslint-enable */

    props.isFullscreen = props.win.isFullscreen;
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
        fs.unlinkFileSync(filepath);
      } catch (e) {
        return;
      }
    }

    function trigger(name, value) {
      props.triggers[name] = angular.isDefined(value) ? value : true;
    }

    function triggered(name) {
      var value = props.triggers[name];

      delete props.triggers[name];
      return value;
    }

    function isFullscreen() {
      return props.isFullscreen;
    }

    function enterFullscreenNW() {
      props.isFullscreen = true;
      props.win.enterFullscreen();
    }

    function enterFullscreenElectron() {
      props.isFullscreen = true;
      props.win.setFullScreen(props.isFullscreen);
    }

    function leaveFullscreenNW() {
      props.isFullscreen = false;
      props.win.leaveFullscreen();
    }

    function leaveFullscreenElectron() {
      props.isFullscreen = false;
      props.win.setFullScreen(props.isFullscreen);
    }

    function toggleFullscreenNW() {
      props.isFullscreen = !props.win.isFullscreen;
      props.win.toggleFullscreen();
    }

    function toggleFullscreenElectron() {
      props.isFullscreen = !props.win.isFullScreen();
      props.win.setFullScreen(props.isFullscreen);
    }

    function quitModal() {
      if (!props.quitModal) {
        props.quitModal = $uibModal.open({
          component: 'quitModal',
          size: 'sm'
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

    function quitNW() {
      props.app.closeAllWindows();
    }

    function quitElectron() {
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

    function errorModal(title, message, callback) {
      var modal = $uibModal.open({
        component: 'errorModal',
        size: 'sm',
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

    function openChinachuSetting() {
      return $uibModal.open({
        component: 'chinachuSetting'
      });
    }

    function openMoritapoSetting() {
      return $uibModal.open({
        component: 'moritapoSetting'
      });
    }
  }
}(
  require('path'),
  require('fs')
));
