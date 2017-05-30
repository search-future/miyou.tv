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
    .factory('GaraponSiteService', GaraponSiteService);

  function GaraponSiteService(
    $q,
    $http,
    $httpParamSerializer,
    garaponSiteUrl,
    garaponDevId,
    categoryTable
  ) {
    var service = {
      user: user,
      password: password,
      login: login,
      request: request,
      cancelRequests: cancelRequests,
      clearRequestCache: clearRequestCache,
      convertCategory: convertCategory
    };
    var props = {
      backend: '',
      user: '',
      password: '',
      canceller: $q.defer(),
      requestCache: {}
    };

    return service;

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

    function login() {
      var deferred = $q.defer();
      var promise;
      if (props.authkey) {
        promise = checkAuthkey().then(function (result) {
          if (result.status === 'success') {
            return result;
          }
          return issueAuthkey();
        }, issueAuthkey);
      } else {
        promise = issueAuthkey();
      }
      promise.then(function (result) {
        if (
          angular.isObject(result) &&
          result.status === 'success'
        ) {
          props.authkey = result.authkey;
          deferred.resolve(result);
        }
      }, deferred.reject);
      return deferred.promise;
    }

    function issueAuthkey() {
      var deferred = $q.defer();
      $http({
        method: 'POST',
        url: [garaponSiteUrl, 'service', 'Site/Login/issueAuthkey'].join('/'),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        transformRequest: $httpParamSerializer,
        data: {
          dev_id: garaponDevId,
          gid: user(),
          passwd: password(),
          response_type: 'json'
        },
        timeout: props.canceller.promise
      }).then(function (response) {
        if (angular.isObject(response.data)) {
          deferred.resolve(response.data);
        } else {
          deferred.reject(response);
        }
      }, deferred.reject);
      return deferred.promise;
    }

    function checkAuthkey() {
      var deferred = $q.defer();
      $http({
        method: 'POST',
        url: [garaponSiteUrl, 'service', 'Site/Login/checkAuthkey'].join('/'),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        transformRequest: $httpParamSerializer,
        data: {
          dev_id: garaponDevId,
          authkey: props.authkey,
          response_type: 'json'
        },
        timeout: props.canceller.promise
      }).then(function (response) {
        if (angular.isObject(response.data)) {
          deferred.resolve(response.data);
        } else {
          deferred.reject(response);
        }
      }, deferred.reject);
      return deferred.promise;
    }

    function request(path, config, useCache) {
      var key;
      var promise;
      var conf = angular.extend({
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        transformRequest: $httpParamSerializer,
        url: [garaponSiteUrl, 'service', path].join('/'),
        cache: true,
        params: {},
        data: {},
        timeout: props.canceller.promise
      }, config);
      conf.data.dev_id = garaponDevId;
      conf.data.authkey = props.authkey;
      conf.data.response_type = 'json';
      if (useCache || angular.isUndefined(useCache)) {
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
      return promise;
    }

    function cancelRequests() {
      props.canceller.resolve();
      props.canceller = $q.defer();
    }

    function clearRequestCache() {
      props.requestCache = {};
    }

    function convertCategory(value) {
      var matchedCategory = null;
      if (
        angular.isObject(value) &&
        angular.isString(value.genre1)
      ) {
        matchedCategory = categoryTable[value.genre1];
      }
      if (!matchedCategory) {
        matchedCategory = categoryTable[categoryTable.length - 1];
      }
      return matchedCategory;
    }
  }
}());
