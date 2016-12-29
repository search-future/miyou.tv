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
(function (http, url) {
  'use strict';

  angular
    .module('app')
    .factory('ChinachuPlayerService', ChinachuPlayerService);

  function ChinachuPlayerService(
    $q,
    $rootScope,
    ChinachuService,
    PlayerService
  ) {
    var service = {
      program: null,
      requestRecordedLength: requestRecordedLength,
      playRecorded: playRecorded,
      channelStart: channelStart,
      channelNext: channelNext,
      channelPrevious: channelPrevious
    };

    return service;

    function requestRecordedLength(id) {
      var deferred = $q.defer();
      ChinachuService.request(['/api/recorded', id, 'file.json'].join('/'))
        .then(function (file) {
          var fileSize = file.data.size;
          var chinachuUrl = url.parse(ChinachuService.getUrl());
          var request = http.request({
            method: 'GET',
            protocol: chinachuUrl.protocol,
            hostname: chinachuUrl.hostname,
            port: chinachuUrl.port,
            path: ['/api/recorded', id, 'watch.m2ts?c:v=copy&c:a=copy&ss=10&t=10'].join('/'),
            auth: chinachuUrl.auth,
            timeout: 10000
          }, function (watch) {
            var streamSize = watch.headers['content-length'];
            var ms = (fileSize * 10000) / streamSize;
            deferred.resolve(ms);
          });
          request.on('error', deferred.reject);
          request.end();
        }, deferred.reject, deferred.notify);
      return deferred.promise;
    }

    function playRecorded(id) {
      var mrl = ChinachuService.getUrl(['/api/recorded', id, 'watch.m2ts?c:v=copy&c:a=copy'].join('/'));
      requestRecordedLength(id).then(function (value) {
        PlayerService.overwriteLength(value);
        PlayerService.play(mrl);
      }, function () {
        PlayerService.play(mrl);
      });
      service.program = null;
      ChinachuService
        .request(['/api/recorded/', id, '.json'].join(''))
        .then(function (response) {
          service.program = response.data;
        });
    }

    function channelStart(type, sid, start, end) {
      var deregister = null;
      var recorded = [];
      var program = {};

      if (ChinachuService.data.recorded.length <= 0) {
        deregister = $rootScope.$watch(function () {
          return ChinachuService.data.recorded.length;
        }, function (value) {
          if (value > 0) {
            service.channelStart(type, sid, start, end);
            deregister();
          }
        });
        return;
      }
      recorded = ChinachuService.data.recorded.filter(function (a) {
        return (
          a.channel.type === type &&
          a.channel.sid === sid &&
          a.end > start &&
          (!end || a.start < end)
        );
      });
      recorded.sort(function (a, b) {
        return a.end - b.end;
      });
      program = recorded[0];
      PlayerService.preseekTime(start - program.start);
      playRecorded(program.id);
      $rootScope.$on('$destroy',
        $rootScope.$on('Player.EndReached', channelNext)
      );
    }

    function channelNext() {
      var current = service.program;
      var recorded = {};
      var program = {};

      recorded = ChinachuService.data.recorded.filter(function (a) {
        return (
          a.channel.type === current.channel.type &&
          a.channel.sid === current.channel.sid &&
          a.start >= current.end
        );
      });
      if (recorded.length <= 0) {
        return;
      }
      recorded.sort(function (a, b) {
        return a.end - b.end;
      });
      program = recorded[0];
      playRecorded(program.id);
      current = null;
    }

    function channelPrevious() {
      var current = service.program;
      var program = {};
      var recorded = [];

      recorded = ChinachuService.data.recorded.filter(function (a) {
        return (
          a.channel.type === current.channel.type &&
          a.channel.sid === current.channel.sid &&
          a.end <= current.start
        );
      });
      if (recorded.length <= 0) {
        return;
      }
      recorded.sort(function (a, b) {
        return b.end - a.end;
      });
      program = recorded[0];
      playRecorded(program.id);
      current = null;
    }
  }
}(
  require('http'),
  require('url')
));
