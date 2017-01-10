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
    commentTokenUrl,
    channelTable
  ) {
    var service = {
      token: token,
      info: info,
      data: data,
      maxCommentCache: maxCommentCache,
      countCacheLifetime: countCacheLifetime,
      comments: comments,
      enabled: enabled,
      delay: delay,
      duration: duration,
      maxLines: maxLines,
      maxItems: maxItems,
      offset: offset,
      filter: filter,
      decreaseDelay: decreaseDelay,
      increaseDelay: increaseDelay,
      resolveChannel: resolveChannel,
      requestToken: requestToken,
      deleteToken: deleteToken,
      request: request,
      requestCount: requestCount,
      load: load,
      filteredComments: filteredComments
    };
    var props = {
      setting: {
        maxCommentCache: 5,
        countCacheLifetime: 604800000,
        delay: 0,
        duration: 5000,
        maxLines: 10,
        maxItems: 50
      },
      token: '',
      info: {},
      data: {},
      commentCache: [],
      countCache: [],
      comments: [],
      enabled: true,
      canceller: null,
      filter: null
    };

    props.token = CommonService.loadLocalStorage('comment_token') || '';
    props.canceller = $q.defer();
    loadSetting();
    loadCache();

    return service;

    function saveSetting() {
      CommonService.saveLocalStorage('comment', props.setting);
    }

    function loadSetting() {
      angular.extend(props.setting, CommonService.loadLocalStorage('comment'));
    }

    function saveCache() {
      CommonService.saveLocalStorage('commentCache', props.commentCache);
      CommonService.saveLocalStorage('commentCountCache', props.countCache);
    }

    function loadCache() {
      var time = Date.now();
      props.commentCache = (CommonService.loadLocalStorage('commentCache') || []);
      props.countCache = (CommonService.loadLocalStorage('commentCountCache') || []).filter(function (a) {
        return time - a.time < countCacheLifetime();
      });
    }

    function processData() {
      var result = angular.copy(props.data.data || props.data.comments) || [];

      result.forEach(function (a) {
        var comment = a;
        comment.playTime = a.time - offset();
        comment.text = a.text.replace(/>>[0-9-,]+\s*/g, '').trim();
      });
      props.comments = result;
    }

    function token() {
      return props.token;
    }

    function info() {
      return props.info;
    }

    function data() {
      return props.data;
    }

    function maxCommentCache(value) {
      if (!isNaN(value)) {
        props.setting.maxCommentCache = parseInt(value, 10);
        saveSetting();
      }
      return props.setting.maxCommentCache;
    }

    function countCacheLifetime(value) {
      if (!isNaN(value)) {
        props.setting.countCacheLifetime = parseInt(value, 10);
        saveSetting();
      }
      return props.setting.countCacheLifetime;
    }

    function comments() {
      return props.comments;
    }

    function enabled(value) {
      if (angular.isDefined(value)) {
        props.enabled = Boolean(value);
      }
      return props.enabled;
    }

    function delay(value) {
      if (!isNaN(value)) {
        props.setting.delay = parseInt(value, 10);
        saveSetting();
        processData();
      }
      return props.setting.delay;
    }

    function duration(value) {
      if (!isNaN(value)) {
        props.setting.duration = parseInt(value, 10);
        saveSetting();
      }
      return props.setting.duration;
    }

    function maxLines(value) {
      if (!isNaN(value)) {
        props.setting.maxLines = parseInt(value, 10);
        saveSetting();
      }
      return props.setting.maxLines;
    }

    function maxItems(value) {
      if (!isNaN(value)) {
        props.setting.maxItems = parseInt(value, 10);
        saveSetting();
      }
      return props.setting.maxItems;
    }

    function offset() {
      var startTime = props.info.start || 0;
      var delayTime = delay() || 0;

      return startTime - delayTime;
    }

    function filter(value) {
      if (angular.isDefined(value)) {
        props.filter = value;
      }
      return props.filter;
    }

    function decreaseDelay(time) {
      delay(delay() - time);
    }

    function increaseDelay(time) {
      delay(delay() + time);
    }

    function resolveChannel(channel) {
      var name = channel.name
        .replace(/[０-９Ａ-Ｚａ-ｚ：-？￥＄％-＊]/g, function (s) {
          return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
        })
        .replace('　', ' ')
        .replace('!', '')
        .replace(/^(NHK[^0-9]+[0-9]).*$/, '$1');

      if (channelTable[name]) {
        return channelTable[name];
      }
      name = name
        .replace(/^([^0-9]+)[0-9]$/, '$1')
        .replace(/(◆.+|・[0-9]+)$/, '')
        .replace(/HD$/, '')
        .replace(/CH$/i, '');
      if (channelTable[name]) {
        return channelTable[name];
      }
      if (channelTable[channel.id]) {
        return channelTable[channel.id];
      }
      return name;
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

    function request(start, end, channel) {
      var conf = {};
      var deferred = $q.defer();
      var cache = getCommentCache(start, end, channel);

      if (cache) {
        deferred.resolve(cache.data);
      } else if (token() === '') {
        deferred.reject({
          noToken: true
        });
      } else {
        conf = {
          method: 'GET',
          url: commentUrl,
          headers: {
            'X-MITEYOU-AUTH-TOKEN': token()
          },
          params: {
            start: Math.floor(start / 1000),
            end: Math.floor(end / 1000),
            type: channel.type === 'GR' ? 'gro' : 'sat',
            channel: resolveChannel(channel)
          }
        };

        props.canceller.resolve();
        props.canceller = $q.defer();
        conf.timeout = props.canceller.promise;
        $http(conf).then(function (response) {
          if (response.data.EC) {
            deferred.reject(response);
          } else {
            deferred.resolve(response.data);
            setCommentCache(start, end, channel, response.data);
          }
        }, deferred.reject, deferred.notify);
      }
      return deferred.promise;
    }

    function requestCount(start, end, channel) {
      var conf;
      var deferred = $q.defer();
      var cache = getCountCache(start, end, channel);

      if (cache) {
        deferred.resolve(cache.data);
      } else if (token() === '') {
        deferred.reject({
          noToken: true
        });
      } else {
        conf = {
          method: 'GET',
          url: commentUrl + '/count',
          headers: {
            'X-MITEYOU-AUTH-TOKEN': token()
          },
          params: {
            start: Math.floor(start / 1000),
            end: Math.floor(end / 1000),
            type: channel.type === 'GR' ? 'gro' : 'sat',
            channel: resolveChannel(channel)
          }
        };
        $http(conf).then(function (response) {
          if (!isNaN(response.data)) {
            deferred.resolve(response.data);
            setCountCache(start, end, channel, response.data);
          } else {
            deferred.reject(response);
          }
        }, deferred.reject, deferred.notify);
      }
      return deferred.promise;
    }

    function setCommentCache(start, end, channel, value) {
      props.commentCache.push({
        start: start,
        end: end,
        channel: channel.id,
        time: Date.now(),
        data: value
      });
      while (props.commentCache.length > maxCommentCache) {
        props.commentCache.shift();
      }
      saveCache();
    }

    function getCommentCache(start, end, channel) {
      return props.commentCache.filter(function (a) {
        return a.start === start && a.end === end && a.channel === channel.id;
      })[0];
    }

    function setCountCache(start, end, channel, value) {
      props.countCache.push({
        start: start,
        end: end,
        channel: channel.id,
        time: Date.now(),
        data: value
      });
      saveCache();
    }

    function getCountCache(start, end, channel) {
      return props.countCache.filter(function (a) {
        return a.start === start && a.end === end && a.channel === channel.id;
      })[0];
    }

    function load(start, end, channel) {
      var margin = 0;
      var deferred = $q.defer();

      props.data = [];
      props.comments = [];
      props.info = {
        start: start,
        end: end,
        channel: channel,
        query: resolveChannel(channel)
      };
      margin = Math.abs(delay()) + 10000;
      request(start - margin, end + margin, channel)
        .then(function (value) {
          props.data = value;
          processData();
          deferred.resolve(value);
        }, deferred.reject, deferred.notify);
      return deferred.promise;
    }

    function filteredComments() {
      if (angular.isFunction(filter())) {
        return comments().filter(filter());
      }
      return comments();
    }
  }
}());
