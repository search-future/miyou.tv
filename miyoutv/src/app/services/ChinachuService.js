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
      programTable: programTable,
      recordedProgramTable: recordedProgramTable,
      groupBy: groupBy,
      channelFromLegacy: channelFromLegacy,
      serviceFromLegacy: serviceFromLegacy
    };
    var props = {
      setting: {
        url: 'http://127.0.0.1:10772',
        user: '',
        password: '',
        reloadInterval: 300000
      },
      previewStack: [],
      previewProcessing: false,
      previewCache: CommonService.loadLocalStorage('chinachu/previewCache') || []
    };

    loadSetting();
    loadPreviewCache();
    return service;

    function saveSetting() {
      CommonService.saveLocalStorage('chinachu', props.setting);
    }

    function loadSetting() {
      angular.extend(props.setting, CommonService.loadLocalStorage('chinachu'));
    }

    function savePreviewCache() {
      CommonService.saveLocalStorage('chinachuPreviews', props.previewCache);
    }

    function loadPreviewCache() {
      var time = Date.now();
      props.previewCache = (CommonService.loadLocalStorage('chinachuPreviews') || []).filter(function (a) {
        return time - a.time > 604800000;
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

    function getUrl(path) {
      var wuiUrl = url() || 'http://127.0.0.1:10772';
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
        responseType: 'arraybuffer'
      };
      var jsonParams = angular.toJson(params);
      var cache = props.previewCache.filter(function (a) {
        return a.id === id && a.format === format && a.params === jsonParams;
      })[0];
      if (cache) {
        deferred.resolve(cache.data);
      } else {
        request(['/api/recorded/' + id + '/preview' + ext].join(''), config).then(function (response) {
          var dataUrl = URL.createObjectURL(new Blob([response.data], {
            type: response.headers('content-type')
          }));
          deferred.resolve(dataUrl);
          props.previewCache.push({
            id: id,
            format: format,
            params: jsonParams,
            time: Date.now(),
            data: dataUrl
          });
          savePreviewCache();
        }, deferred.reject, deferred.notify);
      }
      return deferred.promise;
    }

    function requestPreview(id, format, params) {
      var deferred = $q.defer();
      var jsonParams = angular.toJson(params);
      var cache = props.previewCache.filter(function (a) {
        return a.id === id && a.format === format && a.params === jsonParams;
      })[0];
      if (cache) {
        deferred.resolve(cache.data);
      } else {
        props.previewStack.push({
          id: id,
          format: format,
          params: params,
          deferred: deferred
        });
        processPreviewStack();
      }
      return deferred.promise;
    }

    function processPreviewStack() {
      var options = null;
      if (!props.previewProcessing && props.previewStack.length > 0) {
        props.previewProcessing = true;
        options = props.previewStack.pop();
        requestPreviewNow(options.id, options.forEach, options.params)
          .then(function (data) {
            props.previewProcessing = false;
            options.deferred.resolve(data);
          }, function (response) {
            props.previewProcessing = false;
            options.deferred.reject(response);
          });
      }
    }

    function load(clear) {
      var deferred = $q.defer();

      if (clear) {
        service.status = {};
        service.data.recorded = [];
        service.data.archive = {
          channels: [],
          programs: []
        };
      }
      request('/api/status.json', {
        cache: false
      }).then(function (status) {
        service.status = status;
        request('/api/recorded.json', {
          cache: false
        }).then(function (recorded) {
          recorded.data.forEach(function (a) {
            var program = a;
            var time = new Date(program.start);

            program.date = new Date(
              time.getFullYear(),
              time.getMonth(),
              time.getDate()
            ).getTime();
            program.weekDay = time.getDay();
            program.channelId = program.channel.id;
            program.channelName = program.channel.name;
            program.categoryName = convertCategory(program.category).localeName;
          });
          service.data.recorded = recorded.data;
          request('/archive.json', {
            cache: false
          }).then(function (archive) {
            service.data.archive = archive.data;
            deferred.resolve(archive);
          }, deferred.reject);
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

    function firstRecordTime() {
      return Math.min.apply(null, service.data.recorded.filter(function (a) {
        return a.autoExpire;
      }).map(function (a) {
        return a.start;
      }));
    }

    function lastRecordTime() {
      return Math.max.apply(null, service.data.recorded.filter(function (a) {
        return a.autoExpire;
      }).map(function (a) {
        return a.end;
      }));
    }

    function recordedDates() {
      var dates = [];
      var start = new Date(firstRecordTime());
      var end = new Date(lastRecordTime());
      var date = new Date(start.getFullYear(), start.getMonth(), start.getDate());

      while (date.getTime() < end.getTime()) {
        dates.push(date.getTime());
        date.setDate(date.getDate() + 1);
      }
      return dates;
    }

    function recordedHours() {
      var hours = [];
      var start = new Date(firstRecordTime());
      var end = new Date(lastRecordTime());
      var hour = new Date(start.getFullYear(), start.getMonth(), start.getDate(), start.getHours());

      while (hour.getTime() < end.getTime()) {
        hours.push(hour.getTime());
        hour.setHours(hour.getHours() + 1);
      }
      return hours;
    }

    function programTable() {
      var table = [];
      var ci = 0;
      var si = 0;
      var channel = {};
      var channelService = [];
      var channelId = '';
      var column = {};

      for (ci = 0; ci < service.data.archive.channels.length; ci += 1) {
        channel = service.data.archive.channels[ci];
        for (si = 0; si < channel.services.length; si += 1) {
          channelService = channel.services[si];
          channelId = [channel.type, channelService.serviceId].join('_');
          column = {
            id: channelId,
            type: channel.type,
            name: channelService.name,
            programs: []
          };
          column.programs = service.data.archive.programs
            .filter(getProgramFilter(
              channelService.networkId,
              channelService.serviceId
            ));
          column.programs.forEach(setCategory);
          if (column.programs.length > 0) {
            table.push(column);
          }
          channelService = null;
        }
      }
      return table;

      function getProgramFilter(networkId, serviceId) {
        return function (a) {
          return (
            a.name &&
            a.networkId === networkId &&
            a.serviceId === serviceId
          );
        };
      }

      function setCategory(a) {
        var program = a;
        if (angular.isArray(program.genres)) {
          program.categoryName = convertCategory(program.genres[0].lv1);
        } else {
          program.categoryName = convertCategory();
        }
      }
    }

    function recordedProgramTable() {
      var start = firstRecordTime();
      var end = lastRecordTime();
      var channels = [];
      var table = [];

      function timeFilter(a) {
        return a.startAt < end && a.startAt + a.duration > start;
      }

      service.data.recorded.forEach(function (a) {
        if (channels.indexOf(a.channel.id) < 0) {
          channels.push(a.channel.id);
        }
      });
      table = programTable().filter(function (a) {
        var channel = a;

        if (channels.indexOf(a.id) >= 0) {
          channel.programs = a.programs.filter(timeFilter);
          return channel.programs.length > 0;
        }
        return false;
      });
      channels = null;
      return table;
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
      if (!angular.isObject(legacy)) {
        return {};
      }
      return service.data.archive.channels.filter(function (a) {
        return a.type === legacy.type && a.channel === legacy.channel;
      })[0];
    }

    function serviceFromLegacy(legacy) {
      var channel = {};

      if (!angular.isObject(legacy)) {
        return {};
      }
      channel = channelFromLegacy(legacy);
      if (channel && channel.services) {
        return channel.services.filter(function (a) {
          return a.serviceId === parseInt(legacy.sid, 10);
        })[0];
      }
      return {
        id: legacy.id,
        name: legacy.name,
        serviceId: parseInt(legacy.sid, 10)
      };
    }
  }
}());
