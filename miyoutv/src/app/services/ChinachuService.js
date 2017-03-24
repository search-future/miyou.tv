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
    .factory('ChinachuService', ChinachuService);

  function ChinachuService(
    $q,
    $http,
    CommonService,
    categoryTable
  ) {
    var service = {
      status: {},
      data: {
        archive: {
          channels: [],
          programs: []
        },
        recorded: []
      },
      url: url,
      user: user,
      password: password,
      reloadInterval: reloadInterval,
      previewCacheLifetime: previewCacheLifetime,
      getUrl: getUrl,
      request: request,
      requestAll: requestAll,
      requestPreview: requestPreview,
      requestPreviewNow: requestPreviewNow,
      load: load,
      convertCategory: convertCategory,
      firstRecordTime: firstRecordTime,
      lastRecordTime: lastRecordTime,
      recordedDates: recordedDates,
      recordedHours: recordedHours,
      recordedChannels: recordedChannels,
      groupBy: groupBy,
      channelFromLegacy: channelFromLegacy,
      serviceFromLegacy: serviceFromLegacy,
      generateFilterPattern: generateFilterPattern
    };
    var props = {
      setting: {
        url: 'http://127.0.0.1:20772',
        user: '',
        password: '',
        reloadInterval: 300000,
        previewCacheLifetime: 604800000
      },
      previewStack: [],
      previewProcessing: false,
      previewCache: CommonService.loadLocalStorage('chinachu/previewCache') || []
    };

    loadSetting();
    initPreviewCache();
    return service;

    function saveSetting() {
      CommonService.saveLocalStorage('chinachu', props.setting);
    }

    function loadSetting() {
      angular.extend(props.setting, CommonService.loadLocalStorage('chinachu'));
    }

    function initPreviewCache() {
      var time = Date.now();
      props.previewCache = (CommonService.loadLocalStorage('chinachuPreviews') || []).filter(function (a) {
        if (time - a.time < previewCacheLifetime()) {
          return a.key;
        } else if (angular.isString(a.key)) {
          CommonService.removeFile('previews', a.key);
        }
        return false;
      });
    }

    function url(value) {
      if (angular.isDefined(value)) {
        props.setting.url = value;
        saveSetting();
      }
      return props.setting.url;
    }

    function user(value) {
      if (angular.isDefined(value)) {
        props.setting.user = value;
        saveSetting();
      }
      return props.setting.user;
    }

    function password(value) {
      if (angular.isDefined(value)) {
        props.setting.password = value;
        saveSetting();
      }
      return props.setting.password;
    }

    function reloadInterval(value) {
      if (!isNaN(value)) {
        props.setting.reloadInterval = parseInt(value, 10);
        saveSetting();
      }
      return props.setting.reloadInterval;
    }

    function previewCacheLifetime(value) {
      if (!isNaN(value)) {
        props.setting.previewCacheLifetime = parseInt(value, 10);
        saveSetting();
      }
      return props.setting.previewCacheLifetime;
    }

    function getUrl(path) {
      var wuiUrl = url() || 'http://127.0.0.1:20772';
      var auth = [];

      if (!/^https?:\/\//.test(wuiUrl)) {
        wuiUrl = 'http://' + wuiUrl;
      }
      if (user()) {
        auth.push(user());
        if (password()) {
          auth.push(password());
        }
        wuiUrl = wuiUrl.replace(
          /^(https?:\/\/)(.*)$/,
          '$1' + auth.join(':') + '@$2'
        );
      }
      wuiUrl = wuiUrl.replace(/\/$/, '');
      return [wuiUrl, path].join('');
    }

    function request(path, config) {
      var conf = angular.extend({}, config);

      conf.url = getUrl(path);
      conf.cache = angular.isDefined(conf.cache) ? conf.cache : true;
      return $http(conf);
    }

    function requestAll(paths, config) {
      var promises = [];

      paths.forEach(function (path) {
        promises.push(request(path, config));
      });
      return $q.all(promises);
    }

    function requestPreviewNow(id, format, params) {
      var deferred = $q.defer();
      var ext = /jpe?g$/.test(format) ? '.jpg' : '.png';
      var config = {
        params: params,
        responseType: 'blob'
      };
      var cache = loadPreviewCache(id, format, params);
      if (cache) {
        deferred.resolve(cache);
      } else {
        request(['/api/recorded/' + id + '/preview' + ext].join(''), config).then(function (response) {
          var reader = new FileReader();

          reader.onload = function () {
            deferred.resolve(reader.result);
            savePreviewCache(id, format, params, reader.result);
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

    function requestPreview(id, format, params) {
      var deferred = $q.defer();
      var cache = loadPreviewCache(id, format, params);
      if (cache) {
        deferred.resolve(cache);
      } else {
        pushPreviewStack(id, format, params, deferred);
      }
      return deferred.promise;
    }

    function processPreviewStack() {
      var options = null;
      if (!props.previewProcessing && props.previewStack.length > 0) {
        props.previewProcessing = true;
        options = props.previewStack.pop();
        requestPreviewNow(options.id, options.format, options.params)
          .then(function (data) {
            props.previewProcessing = false;
            options.deferred.resolve(data);
            processPreviewStack();
          }, function (response) {
            props.previewProcessing = false;
            options.deferred.reject(response);
            processPreviewStack();
          });
      }
    }

    function pushPreviewStack(id, format, params, deferred) {
      props.previewStack.push({
        id: id,
        format: format,
        params: params,
        deferred: deferred
      });
      processPreviewStack();
    }

    function savePreviewCache(id, format, params, dataUrl) {
      var jsonParams = angular.toJson(params);
      var key = Date.now().toString(36);
      props.previewCache.push({
        id: id,
        format: format,
        params: jsonParams,
        time: Date.now(),
        key: key
      });
      if (CommonService.saveFile('previews', key, dataUrl)) {
        CommonService.saveLocalStorage('chinachuPreviews', props.previewCache);
      }
    }

    function loadPreviewCache(id, format, params) {
      var jsonParams = angular.toJson(params);
      var cache = props.previewCache.filter(function (a) {
        return a.id === id && a.format === format && a.params === jsonParams;
      })[0];
      if (cache) {
        return CommonService.loadFile('previews', cache.key);
      }
      return null;
    }

    function load(clear) {
      var deferred = $q.defer();

      if (clear) {
        service.status = {};
        service.data.recorded = [];
        service.data.archive = {};
      }
      request('/api/status.json', {
        cache: false
      }).then(function (status) {
        service.status = status.data;
        request('/api/recorded.json', {
          cache: false
        }).then(function (recorded) {
          request('/archive.json', {
            cache: true
          }).then(function (archive) {
            service.data.recorded = recorded.data;
            service.data.archive = archive.data;
            deferred.resolve(archive);
          }, function (response) {
            service.data.recorded = recorded.data;
            deferred.reject(response);
          });
        }, deferred.reject);
      }, deferred.reject, deferred.notify);
      return deferred.promise;
    }

    function convertCategory(category) {
      var matchedCategory = null;
      if (angular.isNumber(category)) {
        matchedCategory = categoryTable[category];
      } else {
        matchedCategory = categoryTable.filter(function (a) {
          return a.name === category || a.localeName === category;
        })[0];
      }
      if (!matchedCategory) {
        matchedCategory = categoryTable[categoryTable.length - 1];
      }
      return matchedCategory;
    }

    function firstRecordTime(filter) {
      return Math.min.apply(
        null,
        service.data.recorded.filter(filter || Boolean).map(function (a) {
          return a.start;
        })
      );
    }

    function lastRecordTime(filter) {
      return Math.max.apply(
        null,
        service.data.recorded.filter(filter || Boolean).map(function (a) {
          return a.end;
        })
      );
    }

    function recordedDates(filter) {
      var dates = [];
      var start = new Date(firstRecordTime(filter));
      var end = new Date(lastRecordTime(filter));
      var date = new Date(start.getFullYear(), start.getMonth(), start.getDate());

      while (date.getTime() < end.getTime()) {
        dates.push(new Date(date));
        date.setDate(date.getDate() + 1);
      }
      return dates;
    }

    function recordedHours(filter) {
      var hours = [];
      var start = new Date(firstRecordTime(filter));
      var end = new Date(lastRecordTime(filter));
      var hour = new Date(start.getFullYear(), start.getMonth(), start.getDate(), start.getHours());

      while (hour.getTime() < end.getTime()) {
        hours.push(new Date(hour));
        hour.setHours(hour.getHours() + 1);
      }
      return hours;
    }

    function recordedChannels(filter) {
      var recorded = service.data.recorded.filter(filter || Boolean);
      var channels = [];
      var program;
      var ri;
      var ci;

      for (ri = 0; ri < recorded.length; ri += 1) {
        program = recorded[ri];
        for (ci = 0; ci < channels.length; ci += 1) {
          if (
            program.channel.type === channels[ci].type &&
            program.channel.sid === channels[ci].sid
          ) {
            channels[ci] = program.channel;
            break;
          }
        }
        if (ci === channels.length) {
          channels.push(program.channel);
        }
      }
      channels.sort(function (a, b) {
        var types = ['EX', 'CS', 'BS', 'GR'];
        if (a.type !== b.type) {
          return types.indexOf(b.type) - types.indexOf(a.type);
        }
        return parseInt(a.sid, 10) - parseInt(b.sid, 10);
      });
      return channels;
    }

    function groupBy(list, key, reverse) {
      var result = [];
      var current = 0;
      var index = 0;

      list.sort(function (a, b) {
        if (a[key] > b[key]) {
          return 1;
        } else if (a[key] < b[key]) {
          return -1;
        }
        return 0;
      });
      if (reverse) {
        list.reverse();
      }
      list.forEach(function (item) {
        if (current !== item[key]) {
          current = item[key];
          index = result.length;
          result.push({
            key: current,
            data: []
          });
        }
        result[index].data.push(item);
      });
      return result;
    }

    function channelFromLegacy(legacy) {
      var channel;

      if (!angular.isObject(legacy)) {
        return {};
      }
      if (service.data.archive.channels) {
        channel = service.data.archive.channels.filter(function (a) {
          return a.type === legacy.type && a.channel === legacy.channel;
        })[0];
      }
      return channel || {
        type: legacy.type,
        channel: legacy.channel,
        name: legacy.name,
        services: [{
          id: legacy.id,
          name: legacy.name,
          serviceId: parseInt(legacy.sid, 10)
        }]
      };
    }

    function serviceFromLegacy(legacy) {
      if (!angular.isObject(legacy)) {
        return {};
      }
      return channelFromLegacy(legacy).services.filter(function (a) {
        return a.serviceId === parseInt(legacy.sid, 10);
      })[0];
    }

    function generateFilterPattern(string) {
      var query = {
        channel: {},
        categoryName: {}
      };
      var options = angular.isString(string) ? string.replace('　', ' ') : '';
      var optionPettern = /([a-z]+): ?("[^"]*"|[^ ]+)?/g;
      var option;
      var key;
      var value;

      option = optionPettern.exec(options);
      while (option !== null) {
        key = option[1];
        value = angular.isString(option[2]) ? option[2].replace(/^"([^"]+)"$/, '$1') : '';
        switch (key) {
          case 'ch':
          case 'channel':
            query.channel.$ = value;
            break;
          case 'chtype':
          case 'channeltype':
            query.channel.type = value;
            break;
          case 'chnum':
          case 'channelnum':
            query.channel.channel = value;
            break;
          case 'sid':
          case 'serviceid':
            query.channel.sid = value;
            break;
          case 'chname':
          case 'channelname':
          case 'service':
          case 'servicename':
            query.channel.name = value;
            break;
          case 'cat':
          case 'category':
          case 'genre':
            query.categoryName.$ = value;
            break;
          case 'start':
            query.start = new Date(value).getTime();
            break;
          case 'end':
            query.end = new Date(value).getTime();
            break;
          default:
            query[key] = value;
        }
        option = optionPettern.exec(options);
      }
      query.$ = angular.isString(string) ? string.replace(optionPettern, '').trim() : '';
      return query;
    }
  }
}());
