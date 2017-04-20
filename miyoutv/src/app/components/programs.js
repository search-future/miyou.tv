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
    .component('programs', {
      templateUrl: 'templates/programs.html',
      controller: ProgramsCtrl
    });

  function ProgramsCtrl(
    $scope,
    $element,
    $window,
    $location,
    $timeout,
    toaster,
    CommonService,
    ChinachuService,
    GaraponService,
    CommentService,
    categoryTable
  ) {
    var $ctrl = this;
    var active = false;
    var archive = {};
    var recorded = [];
    var viewport = $element[0].getElementsByClassName('scrollable')[0];
    var selectItem;
    var timer;
    var backendType = 'chinachu';
    var startHour = 0;
    var endHour = 0;
    var hourFirst;
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
      200: 'Database error'
    };

    $ctrl.baseWidth = 200;
    $ctrl.baseHeight = 60;
    $ctrl.archiveEnabled = true;
    $ctrl.programs = [];
    $ctrl.dates = [];
    $ctrl.hours = [];
    $ctrl.hHeaderStyle = {
      position: 'absolute',
      left: 0,
      top: 0
    };
    $ctrl.vHeaderStyle = {
      position: 'absolute',
      left: 0,
      top: 0
    };
    $ctrl.datepickerOptions = {
      formatMonth: 'M月',
      formatDayTitle: 'y/M',
      formatMonthTitle: 'y年',
      showWeeks: false
    };
    $ctrl.categories = categoryTable.filter(function (a) {
      return a.name !== 'etc';
    });
    $ctrl.categories.push(categoryTable.filter(function (a) {
      return a.name === 'etc';
    })[0]);

    $ctrl.$onInit = function () {
      active = true;
    };
    $ctrl.$onDestroy = function () {
      active = false;
      $timeout.cancel(timer);
      $timeout.cancel(reloader);
      GaraponService.cancelRequests();
    };

    $ctrl.selectItem = function (item) {
      if (angular.isDefined(item)) {
        selectItem = item;
      }
      return selectItem;
    };
    $ctrl.scrollToTime = function (time) {
      viewport.scrollTop = calcPos(new Date(time).getTime());
    };
    $ctrl.play = function (item) {
      if (item) {
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
      }
    };
    $ctrl.playColumn = function (column, $event) {
      var position = viewport.scrollTop + $event.offsetY;
      var start = calcTime(position);
      var isRecorded = recorded.some(function (a) {
        return (
          a.channel.type === column.channel.type &&
          a.channel.sid === column.channel.sid &&
          a.end > start &&
          a.start <= start
        );
      });
      if (isRecorded || recorded.length <= 0) {
        $location.url([
          '/player',
          '?mode=channel',
          '&type=', column.channel.type,
          '&sid=', column.channel.sid,
          '&start=', start
        ].join(''));
      } else {
        CommonService.errorModal('', '録画データが見つかりません。');
      }
    };
    $ctrl.search = function (value) {
      $location.search('search', value);
    };
    $ctrl.updateView = function () {
      $timeout.cancel(timer);
      timer = $timeout(updateView, 200);
    };

    $scope.$watch(function () {
      return $location.search().src;
    }, function (value) {
      $ctrl.source = value || 'archive';
    });
    $scope.$watch(function () {
      return $location.search().search;
    }, function (value) {
      if (value) {
        $location.url([
          '/list',
          '?src=', $ctrl.source,
          '&search=' + value
        ].join(''));
      }
    });
    $scope.$watchGroup([function () {
      return CommonService.loadLocalStorage('backendType');
    }, function () {
      return CommonService.loadLocalStorage('garaponAuth');
    }, function () {
      return CommonService.loadLocalStorage('garaponUrl');
    }, function () {
      return CommonService.loadLocalStorage('garaponUser');
    }, function () {
      return CommonService.loadLocalStorage('garaponPassword');
    }, function () {
      return ChinachuService.getUrl();
    }], function (values) {
      var garaponAuth = typeof values[1] === 'boolean' ? values[1] : true;
      var garaponUrl = values[2];
      var garaponUser = values[3];
      var garaponPassword = values[4];
      backendType = values[0];

      $timeout.cancel(timer);
      $timeout.cancel(reloader);
      GaraponService.cancelRequests();
      archive = {};
      recorded = [];
      $ctrl.programs = [];
      switch (backendType) {
        case 'garapon':
          $ctrl.archiveEnabled = false;
          connectGarapon(garaponAuth, garaponUrl, garaponUser, garaponPassword);
          break;
        case 'chinachu':
        default:
          $ctrl.archiveEnabled = true;
          connectChinachu();
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
      return selectItem;
    }, function (newValue, oldValue) {
      var newItem = newValue || {};
      var oldItem = oldValue || {};

      newItem.style = calcItemStyle(newItem);
      oldItem.style = calcItemStyle(oldItem);
    });
    $scope.$watch(function () {
      return CommonService.loadLocalStorage('countMode');
    }, function () {
      var column;
      var item;
      var ci;
      var ii;
      for (ci = 0; ci < $ctrl.programs.length; ci += 1) {
        column = $ctrl.programs[ci];
        for (ii = 0; ii < column.programs.length; ii += 1) {
          item = column.programs[ii];
          delete item.count;
          item.enabled = false;
        }
      }
      $timeout.cancel(timer);
      timer = $timeout(updateView, 200);
    });
    $scope.$watch(function () {
      return CommonService.loadLocalStorage('previewEnabled');
    }, function (value) {
      var column;
      var item;
      var ci;
      var ii;

      previewEnabled = typeof value === 'boolean' ? value : true;
      for (ci = 0; ci < $ctrl.programs.length; ci += 1) {
        column = $ctrl.programs[ci];
        for (ii = 0; ii < column.programs.length; ii += 1) {
          item = column.programs[ii];
          if (!previewEnabled) {
            delete item.preview;
          }
          item.enabled = false;
        }
      }
      $timeout.cancel(timer);
      timer = $timeout(updateView, 200);
    });
    $scope.$watchGroup([function () {
      return CommonService.loadLocalStorage('hourFirst');
    }, function () {
      return CommonService.loadLocalStorage('hourFormat');
    }], function (values) {
      var column;
      var item;
      var ci;
      var ii;

      hourFirst = angular.isNumber(values[0]) ? values[0] : 4;
      for (ci = 0; ci < $ctrl.programs.length; ci += 1) {
        column = $ctrl.programs[ci];
        for (ii = 0; ii < column.programs.length; ii += 1) {
          item = column.programs[ii];
          item.displayTime = CommonService.formatDate(item.start, 'A HHHH:mm');
        }
      }
      $ctrl.hours.forEach(function (a) {
        var hour = a;
        hour.hour = CommonService.convertHour(hour.time);
      });
      $timeout.cancel(timer);
      timer = $timeout(updateView, 200);
    });

    $scope.$watchGroup([function () {
      return viewport.scrollWidth;
    }, function () {
      return viewport.scrollHeight;
    }], function (values) {
      var width = values[0];
      var height = values[1];
      var search = $location.search();
      if (search.x < width) {
        viewport.scrollLeft = search.x;
      }
      if (search.y < height) {
        viewport.scrollTop = search.y;
      } else if (angular.isUndefined(search.y)) {
        viewport.scrollTop = height;
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

    angular.element(viewport).on('scroll', function (e) {
      $ctrl.vHeaderStyle.left = e.target.scrollLeft + 'px';
      $ctrl.vHeaderStyle.paddingTop = (Math.floor(e.target.scrollTop / $ctrl.baseHeight / 24) * $ctrl.baseHeight * 24) + 'px';
      $ctrl.hHeaderStyle.top = e.target.scrollTop + 'px';
      $location.search('x', e.target.scrollLeft);
      $location.search('y', e.target.scrollTop);
      $timeout.cancel(timer);
      timer = $timeout(updateView, 200);
      $scope.$digest();
    });
    angular.element($window).on('resize', function () {
      $timeout.cancel(timer);
      timer = $timeout(updateView, 200);
    });

    function calcPos(time) {
      var pos = ((time - startHour) * $ctrl.baseHeight) / 3600000;
      if (pos < 0) {
        pos = 0;
      }
      return pos;
    }

    function calcHeight(start, end) {
      var pos = ((start - startHour) * $ctrl.baseHeight) / 3600000;
      var height = ((end - start) * $ctrl.baseHeight) / 3600000;
      var overHeight = (pos + height) - calcPos(endHour);
      if (pos < 0) {
        height += pos;
      }
      if (overHeight > 0) {
        height -= overHeight;
      }
      return height;
    }

    function calcTime(pos) {
      return ((pos * 3600000) / $ctrl.baseHeight) + startHour;
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

    function connectChinachu() {
      ChinachuService.request('/archive.json').then(function (response) {
        if (
          angular.isObject(response) &&
          angular.isObject(response.data)
        ) {
          archive = response.data;
          $ctrl.archiveEnabled = true;
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
            return a.start - b.start;
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
          });
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
      var start;
      var end;
      if (noCache) {
        GaraponService.clearRequestCache();
      }
      GaraponService.request('search', {
        data: {
          n: 1
        }
      }).then(function (response) {
        if (
          checkGaraponSearch(response) &&
          angular.isArray(response.data.program) &&
          angular.isObject(response.data.program[0])
        ) {
          end = (
            GaraponService.convertDate(response.data.program[0].startdate) +
            GaraponService.convertDuration(response.data.program[0].duration)
          );
          return GaraponService.request('search', {
            data: {
              n: 1,
              p: response.data.hit
            }
          });
        }
        return null;
      }, requestError).then(function (response) {
        var i;
        var pageCount;
        if (
          checkGaraponSearch(response) &&
          angular.isArray(response.data.program) &&
          angular.isObject(response.data.program[0])
        ) {
          pageCount = parseInt(response.data.hit, 10) / 100;
          start = GaraponService.convertDate(response.data.program[0].startdate);
          initView(start, end);
          for (i = 0; i < pageCount; i += 1) {
            GaraponService.request('search', {
              data: {
                n: 100,
                p: i + 1
              }
            }).then(getGaraponLoader(start, end), requestError);
          }
        }
      }, requestError);
    }

    function getGaraponLoader(start, end) {
      return function (response) {
        var program;
        var column;
        var ri;
        var pi;
        if (
          checkGaraponSearch(response) &&
          angular.isArray(response.data.program)
        ) {
          for (ri = 0; ri < response.data.program.length; ri += 1) {
            program = response.data.program[ri];
            for (pi = 0; pi < $ctrl.programs.length; pi += 1) {
              column = $ctrl.programs[pi];
              if (
                column.sid === program.ch
              ) {
                break;
              }
              column = null;
            }
            if (!column) {
              column = {};
              column.type = program.gtvid.slice(0, 2);
              column.sid = program.ch;
              column.name = program.bc;
              column.commentQuery = resolveQuery(column.name);
              column.style = {
                height: calcHeight(start, end)
              };
              column.programs = [];
              $ctrl.programs.push(column);
            }
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
            program.style = calcItemStyle(program);
            program.displayTime = CommonService.formatDate(program.start, 'A HHHH:mm');
            program.isArchive = false;
            program.isRecorded = true;
            delete program.count;
            column.programs.push(program);
          }
          $ctrl.programs.sort(function (a, b) {
            var types = ['1S', 'GR', 'BS', 'CS', 'US', 'YU'];
            if (a.type !== b.type) {
              return types.indexOf(a.type) - types.indexOf(b.type);
            }
            return parseInt(a.sid, 10) - parseInt(b.sid, 10);
          });
          $timeout.cancel(timer);
          timer = $timeout(updateView, 200);
        }
      };
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

    function reload() {
      $timeout.cancel(reloader);
      GaraponService.cancelRequests();
      recorded = [];
      $ctrl.programs = [];
      switch (backendType) {
        case 'garapon':
          updateGarapon(true);
          break;
        case 'chinachu':
        default:
          updateChinachu(true);
      }
      reloader = $timeout(reload, reloadInterval);
    }

    function updateModel() {
      if (backendType === 'garapon') {
        $ctrl.source = 'garapon';
      } else if ($ctrl.source === 'garapon') {
        $ctrl.source = 'archive';
      }
      if (backendType === 'chinachu' && !$ctrl.archiveEnabled) {
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
      var start;
      var end;
      var programs = [];
      var program;
      var service;
      var column;
      var item;
      var ri;
      var pi;

      start = Math.min.apply(
        null,
        recorded.filter(function (a) {
          return a.isMiyoutvReserved;
        }).map(function (a) {
          return a.start;
        })
      );
      end = Math.max.apply(
        null,
        recorded.filter(function (a) {
          return a.isMiyoutvReserved;
        }).map(function (a) {
          return a.end;
        })
      );
      initView(start, end);

      for (ri = 0; ri < recorded.length; ri += 1) {
        program = recorded[ri];
        for (pi = 0; pi < programs.length; pi += 1) {
          column = programs[pi];
          if (
            column.type === program.channel.type &&
            column.sid === program.channel.sid
          ) {
            break;
          }
          column = null;
        }
        if (!column) {
          column = {};
          column.type = program.channel.type;
          column.sid = program.channel.sid;
          column.style = {
            height: calcHeight(start, end)
          };
          column.programs = [];
          programs.push(column);
          service = ChinachuService.serviceFromLegacy(program.channel, archive.channels);
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
              item.channel = program.channel;
              item.displayTime = CommonService.formatDate(item.start, 'A HHHH:mm');
              item.isArchive = true;
              item.isRecorded = false;
              if (angular.isArray(item.genres)) {
                item.categoryName = ChinachuService.convertCategory(item.genres[0].lv1);
              } else {
                item.categoryName = ChinachuService.convertCategory();
              }
              item.style = calcItemStyle(item);
              delete item.count;
              column.programs.push(item);
            }
          }
        }
        column.name = program.channel.name;
        column.commentQuery = resolveQuery(program.channel);
      }
      programs.sort(function (a, b) {
        var types = ['GR', 'BS', 'CS', 'EX'];
        if (a.type !== b.type) {
          return types.indexOf(a.type) - types.indexOf(b.type);
        }
        return parseInt(a.sid, 10) - parseInt(b.sid, 10);
      });
      $ctrl.programs = programs;
    }

    function loadChinachuRecorded() {
      var start;
      var end;
      var programs = [];
      var program;
      var column;
      var ri;
      var pi;

      start = Math.min.apply(
        null,
        recorded.map(function (a) {
          return a.start;
        })
      );
      end = Math.max.apply(
        null,
        recorded.map(function (a) {
          return a.end;
        })
      );
      initView(start, end);

      for (ri = 0; ri < recorded.length; ri += 1) {
        program = recorded[ri];
        for (pi = 0; pi < programs.length; pi += 1) {
          column = programs[pi];
          if (
            column.type === program.channel.type &&
            column.sid === parseInt(program.channel.sid, 10)
          ) {
            break;
          }
          column = null;
        }
        if (!column) {
          column = {};
          column.type = program.channel.type;
          column.sid = parseInt(program.channel.sid, 10);
          column.style = {
            height: calcHeight(start, end)
          };
          column.programs = [];
          programs.push(column);
        }
        column.name = program.channel.name;
        column.commentQuery = resolveQuery(program.channel);
        program.detail = program.description;
        program.categoryName = ChinachuService.convertCategory(program.category);
        program.style = calcItemStyle(program);
        program.displayTime = CommonService.formatDate(program.start, 'A HHHH:mm');
        program.isArchive = false;
        program.isRecorded = true;
        delete program.count;
        column.programs.push(program);
      }
      programs.sort(function (a, b) {
        var types = ['GR', 'BS', 'CS', 'EX'];
        if (a.type !== b.type) {
          return types.indexOf(a.type) - types.indexOf(b.type);
        }
        return parseInt(a.sid, 10) - parseInt(b.sid, 10);
      });
      $ctrl.programs = programs;
    }


    function calcItemStyle(item) {
      if ($ctrl.selectItem() === item) {
        return {
          top: calcPos(item.start) + 'px',
          minHeight: calcHeight(item.start, item.end) + 'px'
        };
      }
      return {
        top: calcPos(item.start) + 'px',
        height: calcHeight(item.start, item.end) + 'px'
      };
    }

    function resolveQuery(channel) {
      var name = angular.isObject(channel) ? channel.name : channel;
      var queries = CommonService.loadLocalStorage('commentQueries') || {};
      var query = queries[name];
      if (angular.isUndefined(query)) {
        query = CommentService.resolveChannel(name);
      }
      return query;
    }


    function initView(start, end) {
      if (isFinite(start) && isFinite(end)) {
        initBaseTime(start, end);
        initDateHeader(start, end);
        initDatepicker(start, end);
        initHourHeader(start, end);
      }
    }

    function initBaseTime(start, end) {
      var startDate = new Date(start);
      var endDate = new Date(end);
      startHour = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
        startDate.getHours()
      ).getTime();
      endHour = new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate(),
        endDate.getHours()
      ).getTime();
    }

    function initDateHeader(start, end) {
      var dates = [];
      var startDate = new Date(start);
      var endDate = new Date(end);
      var date = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

      while (date.getTime() < endDate.getTime()) {
        dates.push({
          time: new Date(date),
          isCurrent: false
        });
        date.setDate(date.getDate() + 1);
      }
      $ctrl.dates = dates;
    }

    function initHourHeader(start, end) {
      var hours = [];
      var hour = new Date(start);
      var i;

      for (i = 0; i < 48; i += 1) {
        hours.push({
          time: new Date(hour),
          hour: CommonService.convertHour(hour)
        });
        hour.setHours(hour.getHours() + 1);
      }
      $ctrl.hours = hours;
      $ctrl.vHeaderStyle.height = calcHeight(start, end);
    }

    function initDatepicker(start, end) {
      $ctrl.datepickerOptions.minDate = new Date(start);
      $ctrl.datepickerOptions.maxDate = new Date(end);
    }

    function updateView() {
      var top = viewport.scrollTop - $ctrl.baseHeight;
      var bottom = viewport.scrollTop + viewport.clientHeight + $ctrl.baseHeight;
      var left = viewport.scrollLeft - $ctrl.baseWidth;
      var right = viewport.scrollLeft + viewport.clientWidth + $ctrl.baseWidth;
      var start = calcTime(top);
      var end = calcTime(bottom);
      var checkedCategories = [];
      var categoryFilterEnabled = false;
      var column;
      var item;
      var ci;
      var ii;
      var countStart;
      var countEnd;

      $ctrl.categories.forEach(function (a) {
        if (a.checked) {
          checkedCategories.push(a.name);
        }
      });
      categoryFilterEnabled = (
        checkedCategories.length > 0 &&
        checkedCategories.length < $ctrl.categories.length
      );
      $ctrl.dates.forEach(function (a) {
        var date = a;
        date.isCurrent = isCurrentDate(date.time);
        if (date.isCurrent) {
          $ctrl.currentDate = date.time;
        }
      });
      for (ci = 0; ci < $ctrl.programs.length; ci += 1) {
        column = $ctrl.programs[ci];
        column.enabled = (
          ci * $ctrl.baseWidth <= right &&
          (ci + 1) * $ctrl.baseWidth >= left
        );
        if (column.enabled) {
          countStart = 0;
          countEnd = 0;
          for (ii = 0; ii < column.programs.length; ii += 1) {
            item = column.programs[ii];
            item.enabled = (
              item.start < end &&
              item.end > start &&
              (!categoryFilterEnabled || checkedCategories.indexOf(item.categoryName.name) >= 0)
            );
            if (item.enabled) {
              if (countMode !== 'none' && angular.isUndefined(item.count)) {
                if (!countStart || countStart > item.start) {
                  countStart = item.start;
                }
                if (!countEnd || countEnd < item.end) {
                  countEnd = item.end;
                }
              }
              initItem(item);
            }
          }
          if (countMode !== 'none' && countStart && countEnd) {
            CommentService.request('intervals', {
              params: {
                start: countStart,
                end: countEnd,
                channel: column.commentQuery,
                interval: '1m'
              }
            }).then(getCounter(ci), requestError);
          }
        }
      }
    }

    function isCurrentDate(time) {
      var date;
      var start;
      var end;
      var currentTime;

      date = new Date(time);
      date.setHours(hourFirst);
      date.setMinutes(0);
      date.setSeconds(0);
      date.setMilliseconds(0);
      start = date.getTime();
      date.setDate(date.getDate() + 1);
      end = date.getTime();
      currentTime = calcTime(viewport.scrollTop);

      return currentTime >= start && currentTime < end;
    }

    function initItem(item) {
      var program = item;
      var recordedProgram;
      var previewPos = 70;

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
        }
      }
    }

    function getCounter(columnIndex) {
      return function (response) {
        if (
          angular.isObject(response) &&
          angular.isObject(response.data) &&
          angular.isObject(response.data.data) &&
          angular.isArray(response.data.data.intervals)
        ) {
          $ctrl.programs[columnIndex].programs.filter(function (a) {
            return a.enabled && angular.isUndefined(a.count);
          }).forEach(function (item) {
            var program = item;
            var commentCount = 0;
            var commentSpeed = 0;

            response.data.data.intervals.filter(function (interval) {
              return interval.start >= program.start && interval.start < program.end;
            }).forEach(function (b) {
              commentCount += b.n_hits;
            });
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
          });
        }
      };
    }
  }
}());
