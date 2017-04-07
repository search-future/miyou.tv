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
    .factory('CommentService', CommentService);

  function CommentService(
    $q,
    $http,
    $httpParamSerializer,
    CommonService,
    commentUrl,
    commentTokenUrl
  ) {
    var service = {
      token: token,
      resolveChannel: resolveChannel,
      requestToken: requestToken,
      deleteToken: deleteToken,
      request: request
    };
    var props = {
      token: '',
      data: {},
      comments: [],
      enabled: true,
      canceller: null,
      filter: null
    };

    props.token = CommonService.loadLocalStorage('comment_token') || '';

    return service;

    function token() {
      return props.token;
    }

    function resolveChannel(channel) {
      var name = angular.isObject(channel) ? channel.name : String(channel);
      return name
        .replace(/[０-９Ａ-Ｚａ-ｚ：-？￥＄％-＊]/g, function (s) {
          return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
        })
        .replace('　', ' ')
        .replace('!', '')
        .replace(/^(NHK[^0-9 ]+[0-9 ]).*$/, '$1')
        .replace(/^([^0-9]+)[0-9]$/, '$1')
        .replace(/(◆.+|・[0-9]+)$/, '')
        .replace(/HD$/, '')
        .replace(/CH$/i, '');
    }

    function requestToken(email, password) {
      var deferred = $q.defer();
      var conf = {
        method: 'POST',
        url: commentTokenUrl,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: $httpParamSerializer({
          email: email,
          password: password
        })
      };

      $http(conf).then(function (response) {
        if (response.data.token) {
          props.token = response.data.token;
          CommonService.saveLocalStorage('comment_token', props.token);
          deferred.resolve(response);
        } else {
          deferred.reject(response);
        }
      }, deferred.reject, deferred.notify);
      return deferred.promise;
    }

    function deleteToken() {
      props.token = '';
      CommonService.saveLocalStorage('comment_token', props.token);
    }

    function request(path, config) {
      var conf;
      conf = {
        method: 'GET',
        url: [commentUrl, path].join('/'),
        headers: {
          'X-MITEYOU-AUTH-TOKEN': token()
        }
      };
      conf = angular.extend(conf, config);
      return $http(conf);
    }
  }
}());
