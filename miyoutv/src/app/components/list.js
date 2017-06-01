/*
Copyright 2017 Brazil Ltd.

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

  angular
    .module('app')
    .component('list', {
      templateUrl: 'templates/list.html',
      controller: ListCtrl
    });

  function ListCtrl(
    $scope,
    $element,
    $window,
    $location,
    $timeout,
    toaster,
    CommonService,
    ChinachuService,
    GaraponService,
    GaraponSiteService,
    CommentService
  ) {
    var $ctrl = this;
    var active = false;
    var archive = {};
    var recorded = [];
    var viewport = $element[0].getElementsByClassName('scrollable')[0];
    var selectItem;
    var timer;
    var backendType = 'chinachu';
    var countMode = 'speed';
    var previewEnabled = true;
    var reloader;
    var reloadInterval;
    var garaponLoginStatusMessages = {
      1: null,
      100: 'Parameter error',
      200: 'ガラポン端末のインターネット接続を確認してください。'
    };
    var garaponLoginMessages = {
      1: null,
      0: 'ガラポン端末へのログインに失敗しました。',
      100: 'ログインIDが間違っています。',
      200: 'ログインパスワードが間違っています。',
      400: 'Unknown developer'
    };
    var garaponSearchMessages = {
      1: null,
      0: 'Invalid session',
      100: 'Parameter error',
      200: 'Database error',
      success: null,
      unknown_developer: 'Unknown developer',
      invalid_params: 'Invalid params',
      internal_error: 'Internal error',
      unauthorized: 'Unauthorized',
      no_program: 'No program'
    };

    $ctrl.archiveEnabled = true;
    $ctrl.programs = [];
    $ctrl.source = 'archive';
    $ctrl.sortRule = 'start:true';
    $ctrl.archiveEnabled = false;
    $ctrl.filterEnabled = false;
    $ctrl.baseHeight = 125;

    $ctrl.$onInit = function () {
      active = true;
      angular.element(viewport).on('scroll', onScroll);
      angular.element($window).on('resize', onResize);
    };

    $ctrl.$onDestroy = function () {
      active = false;
      $timeout.cancel(timer);
      $timeout.cancel(reloader);
      ChinachuService.cancelRequests();
      GaraponService.cancelRequests();
      GaraponSiteService.cancelRequests();
      angular.element(viewport).off('scroll', onScroll);
      angular.element($window).off('resize', onResize);
    };

    $ctrl.search = function (value) {
      $location.search('search', value);
    };
    $ctrl.selectItem = function (item) {
      if (angular.isDefined(item)) {
        selectItem = item;
      }
      return selectItem;
    };
    $ctrl.play = function (item) {
      if (item) {
        if (item.isArchive) {
          if (item.isRecorded) {
            $location.url([
              '/player',
              '?mode=channel',
              '&type=', item.channel.type,
              '&sid=', item.channel.sid,
              '&start=', item.start,
              '&end=', item.end
            ].join(''));
          } else {
            CommonService.errorModal('', '録画データが見つかりません。');
          }
        } else {
          $location.url([
            '/player',
            '?mode=recorded',
            '&id=', item.id || item.gtvid
          ].join(''));
        }
      }
    };
    $ctrl.scrollTo = function (value) {
      viewport.scrollTop = value;
    };

    $scope.$watch(function () {
      return $location.search().src;
    }, function (value) {
      $ctrl.source = value || 'archive';
    });
    $scope.$watch(function () {
      return $location.search().search;
    }, function (value) {
      $ctrl.filterEnabled = !!value;
      $ctrl.filterPattern = generateFilterPattern(value);
      $ctrl.scrollTo(0);
      $timeout.cancel(timer);
      timer = $timeout(updateView, 200);
    });
    $scope.$watchGroup([function () {
      return $location.search().order;
    }, function () {
      return $location.search().desc;
    }], function (values) {
      var order = values[0];
      var desc = values[1];
      if (angular.isString(order) && angular.isString(desc)) {
        $ctrl.sortRule = [order, parseInt(values[1], 10) > 0].join(':');
      }
    });
    $scope.$watch(function () {
      return $ctrl.sortRule;
    }, function (value) {
      var order = value || 'start:true';
      var rule = order.split(':');
      $ctrl.sortKey = rule[0];
      $ctrl.sortReverse = rule[1] === 'true';
      $location.search('order', $ctrl.sortKey);
      $location.search('desc', $ctrl.sortReverse ? 1 : 0);
      $timeout.cancel(timer);
      timer = $timeout(updateView, 200);
    });
    $scope.$watchGroup([function () {
      return CommonService.loadLocalStorage('backendType');
    }, function () {
      return CommonService.loadLocalStorage('chinachuUrl');
    }, function () {
      return CommonService.loadLocalStorage('chinachuUser');
    }, function () {
      return CommonService.loadLocalStorage('chinachuPassword');
    }, function () {
      return CommonService.loadLocalStorage('garaponAuth');
    }, function () {
      return CommonService.loadLocalStorage('garaponUrl');
    }, function () {
      return CommonService.loadLocalStorage('garaponUser');
    }, function () {
      return CommonService.loadLocalStorage('garaponPassword');
    }], function (values) {
      var chinachuUrl = values[1];
      var chinachuUser = values[2];
      var chinachuPassword = values[3];
      var garaponAuth = typeof values[4] === 'boolean' ? values[4] : true;
      var garaponUrl = values[5];
      var garaponUser = values[6];
      var garaponPassword = values[7];
      backendType = values[0];
      $ctrl.preFilterPattern = {};
      $timeout.cancel(timer);
      $timeout.cancel(reloader);
      ChinachuService.cancelRequests();
      GaraponService.cancelRequests();
      GaraponSiteService.cancelRequests();
      archive = {};
      recorded = [];
      $ctrl.programs = [];
      switch (backendType) {
        case 'garapon':
          $ctrl.archiveEnabled = false;
          connectGarapon(garaponAuth, garaponUrl, garaponUser, garaponPassword);
          break;
        case 'garaponv4':
          $ctrl.archiveEnabled = false;
          $ctrl.preFilterPattern.isRecorded = true;
          connectGaraponV4(garaponUser, garaponPassword);
          break;
        case 'chinachu':
        default:
          $ctrl.archiveEnabled = true;
          connectChinachu(chinachuUrl, chinachuUser, chinachuPassword);
      }
    });
    $scope.$watch(function () {
      return $ctrl.source;
    }, function () {
      $location.search('src', $ctrl.source);
      updateModel();
      $timeout.cancel(timer);
      timer = $timeout(updateView, 200);
    });
    $scope.$watchCollection(function () {
      return recorded;
    }, function () {
      updateModel();
      $timeout.cancel(timer);
      timer = $timeout(updateView, 200);
    });
    $scope.$watch(function () {
      return CommonService.loadLocalStorage('countMode');
    }, function (value) {
      countMode = value || 'speed';
      $ctrl.programs.forEach(function (a) {
        var program = a;
        delete program.count;
        program.enabled = false;
      });
      $timeout.cancel(timer);
      timer = $timeout(updateView, 200);
    });
    $scope.$watch(function () {
      return CommonService.loadLocalStorage('previewEnabled');
    }, function (value) {
      previewEnabled = typeof value === 'boolean' ? value : true;

      $ctrl.programs.forEach(function (a) {
        var program = a;
        if (!previewEnabled) {
          delete program.preview;
        }
        program.enabled = false;
      });
      $timeout.cancel(timer);
      timer = $timeout(updateView, 200);
    });
    $scope.$watchGroup([function () {
      return CommonService.loadLocalStorage('hourFirst');
    }, function () {
      return CommonService.loadLocalStorage('hourFormat');
    }], function () {
      $ctrl.programs.forEach(function (a) {
        var program = a;
        program.displayTime = CommonService.formatDate(program.start, 'M/d EEE A HHHH:mm');
        program.enabled = false;
      });
      $timeout.cancel(timer);
      timer = $timeout(updateView, 200);
    });
    $scope.$watch(function () {
      return viewport.scrollHeight;
    }, function (value) {
      var search = $location.search();
      if (search.y < value) {
        viewport.scrollTop = search.y;
      }
    });
    $scope.$watch(function () {
      return CommonService.loadLocalStorage('reloadInterval');
    }, function (value) {
      reloadInterval = angular.isNumber(value) ? value : 300000;
      $timeout.cancel(reloader);
      if (reloadInterval > 0) {
        reloader = $timeout(reload, reloadInterval);
      }
    });

    function onScroll(e) {
      $location.search('y', e.target.scrollTop);
      $timeout.cancel(timer);
      timer = $timeout(updateView, 200);
    }

    function onResize() {
      $timeout.cancel(timer);
      timer = $timeout(updateView, 200);
    }


    function requestError(response) {
      if (response.status >= 400) {
        toaster.pop({
          type: 'error',
          title: 'HTTP error',
          body: [response.config.url, ' ', response.statusText, '(', response.status, ')'].join('')
        });
      } else if (active && response.status < 0) {
        toaster.pop({
          type: 'error',
          title: 'Connection error',
          body: [response.config.url, ' ', 'Connection failure'].join('')
        });
      }
    }

    function connectChinachu(url, user, password) {
      ChinachuService.url(url);
      ChinachuService.user(user);
      ChinachuService.password(password);
      ChinachuService.request('/archive.json').then(function (response) {
        if (
          angular.isObject(response) &&
          angular.isObject(response.data)
        ) {
          $ctrl.archiveEnabled = true;
          archive = response.data;
        } else {
          $ctrl.archiveEnabled = false;
        }
        updateChinachu();
      }, function () {
        $ctrl.archiveEnabled = false;
        updateChinachu();
      });
    }

    function updateChinachu(noCache) {
      var useCache = !noCache;
      ChinachuService.request('/api/recorded.json', {
        cache: useCache
      }).then(function (response) {
        if (
          angular.isObject(response) &&
          angular.isArray(response.data)
        ) {
          response.data.sort(function (a, b) {
            return b.start - a.start;
          });
          recorded = response.data;
        }
      }, requestError);
    }

    function connectGarapon(auth, url, user, password) {
      var promise;
      if (user && password) {
        GaraponService.user(user);
        GaraponService.password(password);
        if (auth || !url) {
          promise = GaraponService.loadBackend().then(function () {
            return GaraponService.login();
          }, function (result) {
            if (result.status) {
              requestError(result);
            } else if (result[1]) {
              toaster.pop({
                type: 'error',
                title: 'Garapon Web Authentication error',
                body: result[1]
              });
            }
          }, requestError);
        } else {
          GaraponService.backend(url);
          promise = GaraponService.login();
        }
        promise.then(function (response) {
          if (response) {
            updateGarapon();
          }
        }, function (response) {
          var message;
          if (
            angular.isObject(response) &&
            response.status === 200 &&
            angular.isObject(response.data)
          ) {
            if (garaponLoginStatusMessages[response.data.status]) {
              message = garaponLoginStatusMessages[response.data.status];
            } else if (garaponLoginMessages[response.data.login]) {
              message = garaponLoginMessages[response.data.login];
            } else {
              message = 'Unknown Error';
            }
            toaster.pop({
              type: 'error',
              title: 'Garapon TV login error',
              body: message
            });
          } else {
            requestError(response);
          }
        });
      }
    }

    function updateGarapon(noCache) {
      if (noCache) {
        GaraponService.clearRequestCache();
      }
      loadGarapon(1);
    }

    function loadGarapon(page) {
      GaraponService.request('search', {
        data: {
          n: 100,
          p: page
        }
      }).then(function (response) {
        var program;
        var ri;
        if (
          checkGaraponSearch(response) &&
          angular.isArray(response.data.program)
        ) {
          if (response.data.hit > page * 100) {
            loadGarapon(page + 1);
          }
          for (ri = 0; ri < response.data.program.length; ri += 1) {
            program = response.data.program[ri];
            program.channel = {
              type: program.gtvid.slice(0, 2),
              sid: program.ch,
              name: program.bc
            };
            program.detail = program.description;
            program.start = GaraponService.convertDate(program.startdate);
            program.end = program.start + GaraponService.convertDuration(program.duration);
            program.seconds = GaraponService.convertDuration(program.duration) / 1000;
            program.categoryName = GaraponService.convertCategory(program.genre[0]);
            program.displayTime = CommonService.formatDate(program.start, 'M/d EEE A HHHH:mm');
            program.isArchive = false;
            program.isRecorded = true;
            delete program.count;
            $ctrl.programs.push(program);
          }
          $timeout.cancel(timer);
          timer = $timeout(updateView, 200);
        }
      }, requestError);
    }

    function checkGaraponSearch(response) {
      if (
        angular.isObject(response) &&
        angular.isObject(response.data)
      ) {
        if (garaponSearchMessages[response.data.status]) {
          toaster.pop({
            type: 'error',
            title: 'Garapon TV Error',
            body: garaponSearchMessages[response.data.status]
          });
          return false;
        }
        return true;
      }
      return false;
    }

    function connectGaraponV4(user, password) {
      GaraponSiteService.user(user);
      GaraponSiteService.password(password);
      GaraponService.user(user);
      GaraponService.password(password);
      GaraponSiteService.login().then(function () {
        return GaraponService.loginV4();
      }).then(function () {
        updateGaraponV4();
      }, requestError);
    }

    function updateGaraponV4(noCache) {
      var start;
      var end;
      if (noCache) {
        GaraponService.clearRequestCache();
      }
      GaraponService.request('Tuner/', {
        data: {
          action: 'getrecdate'
        }
      }, requestError).then(function (response) {
        var startDate;
        var endDate;
        if (
          checkGaraponSearch(response) &&
          angular.isArray(response.data.data)
        ) {
          startDate = new Date(response.data.data[0]);
          endDate = new Date(response.data.data.slice(-1)[0]);
          startDate.setHours(0);
          endDate.setHours(0);
          endDate.setDate(endDate.getDate() + 1);
          start = startDate.getTime();
          end = endDate.getTime();
          return GaraponService.request('Tuner/', {
            data: {
              action: 'getrecch'
            }
          });
        }
        return null;
      }, requestError).then(function (response) {
        var tsids = [];
        var i;
        if (
          checkGaraponSearch(response) &&
          angular.isArray(response.data.data)
        ) {
          for (i = 0; i < response.data.data.length; i += 1) {
            tsids.push(response.data.data[i].tsid10);
          }
          loadGaraponV4(tsids.join(','), start, end, 1);
        }
      }, requestError);
    }

    function loadGaraponV4(tsids, start, end, page) {
      GaraponSiteService.request('Program/Search/search', {
        data: {
          tsids: tsids,
          starttime: start / 1000,
          endtime: end / 1000,
          num: 100,
          page: page
        }
      }).then(function (response) {
        var i;
        var program;
        if (
          checkGaraponSearch(response) &&
          angular.isArray(response.data.programs)
        ) {
          if (response.data.hit > page * 100) {
            loadGaraponV4(tsids, start, end, page + 1);
          }
          for (i = 0; i < response.data.programs.length; i += 1) {
            program = response.data.programs[i];
            program.channel = {
              type: program.gtvid.slice(0, 2),
              sid: program.tsid10,
              name: program.bcname
            };
            program.detail = program.description;
            program.start = program.starttime * 1000;
            program.end = program.endtime * 1000;
            program.seconds = program.durationtime;
            program.categoryName = GaraponSiteService.convertCategory(program.genre[0]);
            program.displayTime = CommonService.formatDate(program.start, 'M/d EEE A HHHH:mm');
            program.isArchive = false;
            program.isRecorded = true;
            program.v4Unverified = true;
            delete program.count;
            $ctrl.programs.push(program);
          }
          $timeout.cancel(timer);
          timer = $timeout(updateView, 200);
        }
      }, requestError);
    }

    function reload() {
      $timeout.cancel(reloader);
      ChinachuService.cancelRequests();
      GaraponService.cancelRequests();
      GaraponSiteService.cancelRequests();
      recorded = [];
      $ctrl.programs = [];
      switch (backendType) {
        case 'garapon':
          updateGarapon(true);
          break;
        case 'garaponv4':
          updateGaraponV4(true);
          break;
        case 'chinachu':
        default:
          updateChinachu(true);
      }
      reloader = $timeout(reload, reloadInterval);
    }

    function updateModel() {
      if (backendType === 'garapon' || backendType === 'garaponv4') {
        $ctrl.source = 'garapon';
      } else if ($ctrl.source === 'garapon') {
        $ctrl.source = 'archive';
      }
      if (backendType === 'chinachu' && recorded.length && !$ctrl.archiveEnabled) {
        $ctrl.source = 'recorded';
      }
      switch ($ctrl.source) {
        case 'archive':
          loadChinachuArchive();
          break;
        case 'recorded':
          loadChinachuRecorded();
          break;
        default:
      }
    }

    function loadChinachuArchive() {
      var programs = [];
      var program;
      var item;
      var existsChannel;
      var channel;
      var service;
      var ri;
      var pi;
      var start = Math.min.apply(
        null,
        recorded.filter(function (a) {
          return a.isMiyoutvReserved;
        }).map(function (a) {
          return a.start;
        })
      );
      var end = Math.max.apply(
        null,
        recorded.filter(function (a) {
          return a.isMiyoutvReserved;
        }).map(function (a) {
          return a.end;
        })
      );

      for (ri = 0; ri < recorded.length; ri += 1) {
        program = recorded[ri];
        channel = program.channel;
        service = ChinachuService.serviceFromLegacy(channel, archive.channels);
        existsChannel = false;
        for (pi = 0; pi < programs.length; pi += 1) {
          item = programs[pi];
          if (
            channel.type === item.channel.type &&
            channel.sid === item.channel.sid
          ) {
            existsChannel = true;
            break;
          }
        }
        if (!existsChannel) {
          for (pi = 0; pi < archive.programs.length; pi += 1) {
            item = archive.programs[pi];
            item.start = item.startAt;
            item.end = item.startAt + item.duration;
            if (
              item.networkId === service.networkId &&
              item.serviceId === service.serviceId &&
              item.start < end &&
              item.end > start
            ) {
              item.seconds = item.duration / 1000;
              item.title = item.name;
              item.detail = item.description;
              item.displayTime = CommonService.formatDate(item.start, 'M/d EEE A HHHH:mm');
              item.isArchive = true;
              item.isRecorded = false;
              item.channel = channel;
              if (angular.isArray(item.genres)) {
                item.categoryName = ChinachuService.convertCategory(item.genres[0].lv1);
              } else {
                item.categoryName = ChinachuService.convertCategory();
              }
              delete item.count;
              programs.push(item);
            }
          }
        }
      }
      $ctrl.programs = programs;
    }

    function loadChinachuRecorded() {
      var programs = recorded;

      programs.forEach(function (a) {
        var program = a;

        program.categoryName = ChinachuService.convertCategory(program.category);
        program.displayTime = CommonService.formatDate(program.start, 'M/d EEE A HHHH:mm');
        program.isArchive = false;
        program.isRecorded = true;
        delete program.count;
      });
      $ctrl.programs = programs;
    }

    function updateView() {
      var top = viewport.scrollTop;
      var bottom = viewport.scrollTop + viewport.clientHeight;
      var ii;
      var item;
      var preload = 5;
      var garaponV4VerifyItems = [];
      var garaponV4VerifyParams = [];

      $ctrl.viewStyle = {
        height: ($ctrl.baseHeight * $ctrl.filteredPrograms.length) + 'px',
        paddingTop: ((Math.floor(top / $ctrl.baseHeight) - preload) * $ctrl.baseHeight) + 'px'
      };
      for (ii = 0; ii < $ctrl.filteredPrograms.length; ii += 1) {
        item = $ctrl.filteredPrograms[ii];
        item.enabled = (
          (ii - preload) * $ctrl.baseHeight < bottom &&
          (ii + preload + 1) * $ctrl.baseHeight > top
        );
        if (item.enabled) {
          if (item.v4Unverified) {
            item.v4Unverified = false;
            garaponV4VerifyItems.push(item);
            garaponV4VerifyParams.push([
              item.starttime,
              item.endtime,
              item.tsid16,
              item.service_type
            ].join(','));
          }
          initItem(item);
        }
      }
      if (garaponV4VerifyParams.length > 0) {
        GaraponService.request('Program/', {
          data: {
            action: 'check',
            'programs[]': garaponV4VerifyParams
          }
        }).then(function (response) {
          var i;
          if (checkGaraponSearch(response)) {
            for (i = 0; i < response.data.data.length; i += 1) {
              if (response.data.data[i].result) {
                garaponV4VerifyItems[i].isRecorded = true;
                if (previewEnabled) {
                  garaponV4VerifyItems[i].preview = garaponV4VerifyItems[i].thumbnail_url;
                }
              } else {
                garaponV4VerifyItems[i].isRecorded = false;
              }
            }
          }
          garaponV4VerifyItems = null;
          $timeout.cancel(timer);
          timer = $timeout(updateView, 200);
        }, requestError);
      }
    }

    function initItem(item) {
      var program = item;
      var recordedProgram;
      var previewPos = 70;
      var commentQuery;

      if (program.isArchive) {
        if (!program.isRecorded || (previewEnabled && angular.isUndefined(program.preview))) {
          recordedProgram = recorded.filter(function (a) {
            return (
              a.channel.type === program.channel.type &&
              a.channel.sid === program.channel.sid &&
              a.end > program.start &&
              a.start <= program.start
            );
          })[0];
          if (recordedProgram) {
            previewPos += Math.floor((item.start - recordedProgram.start) / 1000);
            program.isRecorded = true;
            while (recordedProgram.seconds < previewPos) {
              previewPos = -30;
            }
          }
        }
      } else {
        recordedProgram = program;
      }
      if (previewEnabled && angular.isUndefined(program.preview)) {
        if (backendType === 'chinachu' && recordedProgram) {
          if (recordedProgram.seconds < previewPos) {
            previewPos = 10;
          }
          ChinachuService.requestPreview(recordedProgram.id, 'png', {
            pos: previewPos,
            size: '160x90'
          }).then(function (value) {
            if (previewEnabled) {
              program.preview = value;
            }
          });
        } else if (backendType === 'garapon') {
          GaraponService.requestPreview(recordedProgram.gtvid).then(function (value) {
            if (previewEnabled) {
              program.preview = value;
            }
          });
        } else if (backendType === 'garaponv4') {
          if (previewEnabled) {
            program.preview = program.thumbnail_url;
          }
        }
      }

      if (countMode !== 'none' && angular.isUndefined(item.count)) {
        commentQuery = resolveQuery(item.channel);
        CommentService.request('comments', {
          params: {
            channel: commentQuery,
            start: item.start,
            end: item.end,
            limit: 0
          }
        }).then(function (response) {
          var commentCount;
          var commentSpeed;
          if (
            angular.isObject(response) &&
            angular.isObject(response.data) &&
            angular.isObject(response.data.data) &&
            angular.isNumber(response.data.data.n_hits)
          ) {
            commentCount = response.data.data.n_hits;
            commentSpeed = (commentCount / (program.seconds / 60));
            switch (countMode) {
              case 'speed':
                program.count = commentSpeed.toFixed(1);
                break;
              case 'comment':
              default:
                program.count = commentCount;
            }
            program.countDetail = [
              'コメント数: ' + commentCount,
              '勢い： ' + commentSpeed.toFixed(1) + '/分'
            ].join('\n');
          }
        }, requestError);
      }
    }

    function resolveQuery(channel) {
      var name = angular.isObject() ? channel.name : channel;
      var queries = CommonService.loadLocalStorage('commentQueries') || {};
      var query = queries[name];
      if (angular.isUndefined(query)) {
        query = CommentService.resolveChannel(name);
      }
      return query;
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
