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
    .factory('GaraponService', GaraponService);

  function GaraponService(
    $q,
    $http,
    $httpParamSerializer,
    md5,
    CommonService,
    garaponAuthUrl,
    garaponDevId,
    categoryTable
  ) {
    var service = {
      backend: backend,
      apiVersion: apiVersion,
      user: user,
      password: password,
      requestBackendInfo: requestBackendInfo,
      loadBackend: loadBackend,
      request: request,
      cancelRequests: cancelRequests,
      clearRequestCache: clearRequestCache,
      login: login,
      logout: logout,
      requestPreview: requestPreview,
      previewCacheLifetime: previewCacheLifetime,
      getStreamUrl: getStreamUrl,
      convertDate: convertDate,
      convertDuration: convertDuration,
      convertCategory: convertCategory
    };
    var props = {
      backend: '',
      apiVersion: 3,
      user: '',
      password: '',
      gtvsession: null,
      canceller: $q.defer(),
      requestCache: {},
      previewCache: [],
      previewCacheLifetime: 604800000
    };

    initPreviewCache();
    return service;

    function initPreviewCache() {
      var time = Date.now();
      var previewCache = CommonService.loadLocalStorage('garaponPreviews');
      if (angular.isArray(previewCache) && previewCache.length > 0) {
        props.previewCache = [];
        previewCache.forEach(function (a) {
          if (time - a.time < previewCacheLifetime()) {
            props.previewCache.push(a);
          } else if (angular.isString(a.id)) {
            CommonService.removeFile('previews', a.id);
          }
        });
      }
    }

    function backend(value) {
      if (angular.isString(value)) {
        props.backend = value.trim();
        logout(true);
      }
      return props.backend;
    }

    function apiVersion(value) {
      if (angular.isNumber(value)) {
        props.apiVersion = value;
      }
      return props.apiVersion;
    }

    function user(value) {
      if (angular.isString(value)) {
        props.user = value.trim();
      }
      return props.user;
    }

    function password(value) {
      if (angular.isString(value)) {
        props.password = value.trim();
      }
      return props.password;
    }

    function previewCacheLifetime(value) {
      if (!isNaN(value)) {
        props.previewCacheLifetime = parseInt(value, 10);
      }
      return props.previewCacheLifetime;
    }

    function requestBackendInfo(useCache) {
      var deferred = $q.defer();
      var key;
      var promise;
      var conf = {
        method: 'POST',
        url: [garaponAuthUrl, 'getgtvaddress'].join('/'),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        transformRequest: $httpParamSerializer,
        data: {
          user: user(),
          md5passwd: md5password(),
          dev_id: garaponDevId
        },
        timeout: props.canceller.promise
      };
      if (angular.isUndefined(useCache) || useCache) {
        key = conf.url + angular.toJson(conf.params) + angular.toJson(conf.data);
        if (angular.isUndefined(props.requestCache[key])) {
          promise = $http(conf);
          props.requestCache[key] = promise;
          promise.catch(function (value) {
            delete props.requestCache[key];
            return value;
          });
        }
        promise = props.requestCache[key];
      } else {
        promise = $http(conf);
      }

      promise.then(function (response) {
        var result;
        var params;
        var param;
        var i;

        if (
          angular.isObject(response) &&
          angular.isString(response.data)
        ) {
          result = {};
          params = response.data.split('\n');
          for (i = 0; i < params.length; i += 1) {
            param = params[i].split(';');
            if (param[0] && param[1]) {
              result[param[0]] = param[1];
            }
          }
          deferred.resolve(result);
        } else {
          deferred.reject(response);
        }
      }, deferred.reject, deferred.notify);
      return deferred.promise;
    }

    function loadBackend(useCache) {
      var deferred = $q.defer();
      requestBackendInfo(useCache).then(function (result) {
        var url;
        var version;
        if (
          angular.isObject(result) &&
          result[0] === 'success' &&
          angular.isString(result.ipaddr) &&
          angular.isString(result.gtvver)
        ) {
          url = ['http://', result.ipaddr];
          if (
            result.ipaddr === result.gipaddr &&
            angular.isString(result.port)
          ) {
            url.push(':');
            url.push(result.port);
          }
          backend(url.join(''));
          version = (/^GTV([0-9]+)/.exec(result.gtvver) || [])[1];
          if (version < 3) {
            apiVersion(2);
          } else {
            apiVersion(3);
          }
          deferred.resolve(result);
        } else {
          deferred.reject(result);
        }
      }, deferred.reject, deferred.notify);
      return deferred.promise;
    }

    function request(path, config, useCache) {
      var key;
      var conf = angular.extend({
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        transformRequest: $httpParamSerializer,
        url: [backend(), '/gapi/v', apiVersion(), '/', path].join(''),
        cache: true,
        params: {
          dev_id: garaponDevId,
          gtvsession: props.gtvsession
        },
        timeout: props.canceller.promise
      }, config);
      if (angular.isUndefined(useCache) || useCache) {
        key = conf.url + angular.toJson(conf.params) + angular.toJson(conf.data);
        if (angular.isUndefined(props.requestCache[key])) {
          props.requestCache[key] = $http(conf);
          props.requestCache[key].catch(function (value) {
            delete props.requestCache[key];
            return value;
          });
        }
        return props.requestCache[key];
      }
      return $http(conf);
    }

    function cancelRequests() {
      props.canceller.resolve();
      props.canceller = $q.defer();
    }

    function clearRequestCache() {
      props.requestCache = {};
    }

    function login(force) {
      var deferred = $q.defer();
      if (!angular.isString(props.gtvsession) || force) {
        request('auth', {
          data: {
            type: 'login',
            loginid: user(),
            md5pswd: md5password()
          }
        }, false).then(function (response) {
          if (
            angular.isObject(response) &&
            angular.isObject(response.data) &&
            response.data.status === 1 &&
            response.data.login === 1
          ) {
            props.gtvsession = response.data.gtvsession;
            deferred.resolve(response);
          } else {
            deferred.reject(response);
          }
        }, deferred.reject, deferred.notify);
      } else {
        deferred.resolve({
          status: 200,
          statusText: 'OK'
        });
      }
      return deferred.promise;
    }

    function logout(force) {
      var deferred = $q.defer();
      request('auth', {
        data: {
          type: 'logout'
        }
      }, false).then(function (response) {
        if (
          angular.isObject(response) &&
          angular.isObject(response.data) &&
          response.data.status === 1 &&
          response.data.logout === 1
        ) {
          if (!force) {
            props.gtvsession = null;
          }
          deferred.resolve(response);
        } else {
          deferred.reject(response);
        }
      }, deferred.reject, deferred.notify);
      if (force) {
        props.gtvsession = null;
      }
      return deferred.promise;
    }

    function md5password() {
      return md5.createHash(password());
    }

    function requestPreview(id) {
      var deferred = $q.defer();
      var config = {
        url: [backend(), '/thumbs/', id].join(''),
        cache: true,
        responseType: 'blob',
        timeout: props.canceller.promise
      };
      var cache = loadPreviewCache(id);
      if (cache) {
        deferred.resolve(cache);
      } else {
        $http(config).then(function (response) {
          var reader = new FileReader();

          reader.onload = function () {
            deferred.resolve(reader.result);
            savePreviewCache(id, reader.result);
            reader = null;
          };
          reader.onerror = function () {
            deferred.reject(reader.error);
            reader = null;
          };
          reader.readAsDataURL(response.data);
        }, deferred.reject, deferred.notify);
      }
      return deferred.promise;
    }

    function savePreviewCache(id, dataUrl) {
      props.previewCache.push({
        id: id,
        time: Date.now()
      });
      if (CommonService.saveFile('previews', id, dataUrl)) {
        CommonService.saveLocalStorage('garaponPreviews', props.previewCache);
      }
    }

    function loadPreviewCache(id) {
      var cache = props.previewCache.filter(function (a) {
        return a.id === id;
      })[0];
      if (cache) {
        return CommonService.loadFile('previews', cache.id);
      }
      return null;
    }

    function getStreamUrl(id) {
      if (angular.isString(id)) {
        if (apiVersion() < 3) {
          return [backend(), '/cgi-bin/play/m3u8.cgi?', id, '-', props.gtvsession].join('');
        }
        return [backend(), '/', id, '.m3u8?', $httpParamSerializer({
          gtvsession: props.gtvsession,
          dev_id: garaponDevId
        })].join('');
      }
      return null;
    }

    function convertDate(value) {
      return new Date(value).getTime();
    }

    function convertDuration(value) {
      var duration;
      if (angular.isString(value)) {
        duration = value.split(':');
        return (
          (parseInt(duration.pop() || 0, 10) * 1000) +
          (parseInt(duration.pop() || 0, 10) * 60000) +
          (parseInt(duration.pop() || 0, 10) * 3600000)
        );
      }
      return value;
    }

    function convertCategory(value) {
      var matchedCategory = null;
      var categoryNumber;
      if (angular.isString(value)) {
        categoryNumber = value.split('/');
        matchedCategory = categoryTable[categoryNumber[0]];
      }
      if (!matchedCategory) {
        matchedCategory = categoryTable[categoryTable.length - 1];
      }
      return matchedCategory;
    }
  }
}());
