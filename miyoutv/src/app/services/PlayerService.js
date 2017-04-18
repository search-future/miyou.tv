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
(function (wcjs, renderer) {
  'use strict';

  angular.module('app')
    .factory('PlayerService', PlayerService);

  function PlayerService(
    $rootScope,
    $window,
    $q,
    CommonService,
    playerRateLimit
  ) {
    var service = {
      player: null,
      renderContext: null,
      init: init,
      suspend: suspend,
      playing: playing,
      length: length,
      state: state,
      position: position,
      time: time,
      volume: volume,
      mute: mute,
      rate: rate,
      play: play,
      pause: pause,
      togglePause: togglePause,
      stop: stop,
      toggleMute: toggleMute,
      close: close,
      audioTrackCount: audioTrackCount,
      audioTrack: audioTrack,
      toggleAudioTrack: toggleAudioTrack,
      audioChannel: audioChannel,
      audioDelay: audioDelay,
      videoTrackCount: videoTrackCount,
      videoTrack: videoTrack,
      toggleVideoTrack: toggleVideoTrack,
      deinterlace: deinterlace,
      subtitlesCount: subtitlesCount,
      subtitlesTrack: subtitlesTrack,
      toggleSubtitlesTrack: toggleSubtitlesTrack,
      subtitlesDelay: subtitlesDelay,
      aspectRatio: aspectRatio,
      normalSpeed: normalSpeed,
      speedUp: speedUp,
      speedDown: speedDown,
      jumpForward: jumpForward,
      jumpBackward: jumpBackward,
      increaseVolume: increaseVolume,
      decreaseVolume: decreaseVolume,
      setScreenText: setScreenText,
      getScreenText: getScreenText,
      formattedTime: formattedTime,
      formattedLength: formattedLength,
      overwriteLength: overwriteLength,
      preseekTime: preseekTime
    };
    var props = {
      overwriteLength: 0,
      preseekTime: 0,
      screenText: '',
      aspectRatio: '16:9',
      deinterlace: 'discard',
      active: false,
      deinterlaceList: [
        'blend',
        'bob',
        'discard',
        'linear',
        'mean',
        'x',
        'yadif',
        'yadif2x'
      ]
    };

    $rootScope.$watchGroup([
      function () {
        return mute();
      },
      function () {
        return volume();
      },
      function () {
        return deinterlace();
      },
      function () {
        return aspectRatio();
      }
    ], function () {
      if (props.active) {
        saveSetting();
      }
    });
    $rootScope.$on('$destroy',
      $rootScope.$on('Player.FrameReady', function (event, frame) {
        service.renderContext.render(
          frame,
          frame.width,
          frame.height,
          frame.uOffset,
          frame.vOffset
        );
        props.active = true;
      })
    );
    $rootScope.$on('$destroy',
      $rootScope.$on('Player.MediaChanged', function () {
        var deregister = null;
        props.active = false;
        deregister = $rootScope.$on('Player.Playing',
          function () {
            loadSetting();
            if (preseekTime() !== 0) {
              time(preseekTime());
            }
            preseekTime(0);
            deregister();
          });
      })
    );

    angular.element($window).on('unload', function () {
      close();
    });

    return service;

    function createEmitter(name) {
      return function (arg) {
        $rootScope.$broadcast(name, arg);
        $rootScope.$digest();
      };
    }

    function saveSetting() {
      var setting = {};
      setting.mute = mute();
      setting.volume = volume();
      setting.deinterlace = deinterlace();
      setting.aspectRatio = aspectRatio();
      CommonService.saveLocalStorage('player', setting);
      setting = {};
    }

    function loadSetting() {
      var setting = CommonService.loadLocalStorage('player') || {};
      mute(setting.mute);
      volume(setting.volume);
      if (angular.isDefined(setting.deinterlace)) {
        deinterlace(setting.deinterlace);
      } else {
        deinterlace(props.deinterlace);
      }
      if (angular.isDefined(setting.aspectRatio)) {
        aspectRatio(setting.aspectRatio);
      } else {
        aspectRatio(props.aspectRatio);
      }
    }

    function init(screen, forceCreate) {
      if (forceCreate || !service.player) {
        service.player = wcjs.createPlayer(['--network-caching', '5000']);
        service.player.onFrameReady = createEmitter('Player.FrameReady');
        service.player.onMediaChanged = createEmitter('Player.MediaChanged');
        service.player.onNothingSpecial = createEmitter('Player.NothingSpecial');
        service.player.onOpening = createEmitter('Player.Opening');
        service.player.onBuffering = createEmitter('Player.Buffering');
        service.player.onPlaying = createEmitter('Player.Playing');
        service.player.onPaused = createEmitter('Player.Paused');
        service.player.onForward = createEmitter('Player.Forward');
        service.player.onBackward = createEmitter('Player.Backward');
        service.player.onEncounteredError = createEmitter('Player.EncounteredError');
        service.player.onEndReached = createEmitter('Player.EndReached');
        service.player.onStopped = createEmitter('Player.Stopped');
        service.player.onTimeChanged = createEmitter('Player.TimeChanged');
        service.player.onPositionChanged = createEmitter('Player.PositionChanged');
        service.player.onSeekableChanged = createEmitter('Player.SeekableChanged');
        service.player.onPausableChanged = createEmitter('Player.PausableChanged');
        service.player.onLengthChanged = createEmitter('Player.LengthChanged');
      }
      service.renderContext = renderer.setupCanvas(screen);
      service.renderContext.fillBlack();
      $rootScope.$broadcast('Player.Ready');
    }

    function suspend() {
      service.player.stop();
      service.player.playlist.clear();
      service.renderContext.fillBlack();
    }

    function playing() {
      return service.player.playing;
    }

    function state() {
      return service.player.state;
    }

    function overwriteLength(value) {
      if (!isNaN(value)) {
        props.overwriteLength = parseInt(value, 10);
      }
      return props.overwriteLength;
    }

    function preseekTime(value) {
      if (!isNaN(value)) {
        props.preseekTime = parseInt(value, 10);
      }
      return props.preseekTime;
    }

    function length() {
      if (service.player.length === 0 && overwriteLength() > 0) {
        return overwriteLength();
      }
      return service.player.length;
    }

    function position(value) {
      var message = '';

      if (!isNaN(value)) {
        service.player.position = parseFloat(value);
        message = formattedTime();
        setScreenText(message);
      }
      return service.player.position;
    }

    function time(value) {
      var newTime = 0;

      if (!isNaN(value)) {
        newTime = parseInt(value, 10);
        if (service.player.time === 0 && overwriteLength() > 0) {
          position(newTime / overwriteLength());
        } else {
          service.player.time = newTime;
        }
      }
      if (service.player.time === 0 && overwriteLength() > 0) {
        return position() * overwriteLength();
      }
      return service.player.time;
    }

    function volume(value) {
      var message = '';

      if (!isNaN(value)) {
        if (value > 200) {
          service.player.volume = 200;
        } else if (value < 0) {
          service.player.volume = 0;
        } else {
          service.player.volume = parseInt(value, 10);
        }
        message = '音量 ' + volume() + '%';
        setScreenText(message);
      }
      return service.player.volume;
    }

    function mute(value) {
      if (angular.isDefined(value)) {
        service.player.mute = Boolean(value);
      }
      return service.player.mute;
    }

    function rate(value) {
      var newRate = 1;
      var message = '';

      if (!isNaN(value)) {
        newRate = parseFloat(value);
        if (newRate >= playerRateLimit) {
          service.player.input.rate = playerRateLimit;
        } else if (newRate > 64) {
          service.player.input.rate = 64;
        } else if (newRate < 1 / 32) {
          service.player.input.rate = 1 / 32;
        } else {
          service.player.input.rate = newRate;
        }
        message = '再生速度 x' + (Math.round(rate() * 100) / 100);
        setScreenText(message);
      }
      return service.player.input.rate;
    }

    function play(mrl) {
      if (mrl) {
        props.active = false;
      }
      service.player.play(mrl);
    }

    function pause() {
      service.player.pause();
    }

    function togglePause() {
      service.player.togglePause();
    }

    function stop() {
      props.active = false;
      service.player.stop();
    }

    function toggleMute() {
      service.player.toggleMute();
    }

    function close() {
      service.player.close();
    }

    function audioTrackCount() {
      return service.player.audio.count;
    }

    function audioTrack(value) {
      var message = '';

      if (!isNaN(value)) {
        service.player.audio.track = parseInt(value, 10);
        if (audioTrack() > 0) {
          message = '音声' + audioTrack();
        } else {
          message = '音声無効';
        }
        setScreenText(message);
      }
      return service.player.audio.track;
    }

    function toggleAudioTrack() {
      var track = audioTrack() + 1;
      if (track <= 0) {
        track = 1;
      }
      audioTrack(track);
    }

    function audioChannel(value) {
      if (!isNaN(value)) {
        service.player.audio.channel = parseInt(value, 10);
      }
      return service.player.audio.channel;
    }

    function audioDelay(value) {
      if (!isNaN(value)) {
        service.player.audio.delay = parseInt(value, 10);
      }
      return service.player.audio.delay;
    }

    function videoTrackCount() {
      return service.player.video.count;
    }

    function videoTrack(value) {
      var message = '';

      if (!isNaN(value)) {
        service.player.video.track = parseInt(value, 10);

        if (videoTrack() > 0) {
          message = '映像' + videoTrack();
        } else {
          message = '映像無効';
        }
        setScreenText(message);
      }
      return service.player.video.track;
    }

    function toggleVideoTrack() {
      var track = videoTrack() + 1;
      if (track <= 0) {
        track = 1;
      }
      videoTrack(track);
    }

    function deinterlace(value) {
      var isEnabled = false;

      if (angular.isDefined(value)) {
        isEnabled = props.deinterlaceList.filter(function (a) {
          return a === value;
        }).length > 0;
        if (isEnabled) {
          service.player.video.deinterlace.enable(value);
          props.deinterlace = value;
        } else {
          service.player.video.deinterlace.disable();
          props.deinterlace = '';
        }
      }
      return props.deinterlace;
    }

    function subtitlesCount() {
      return service.player.subtitles.count;
    }

    function subtitlesTrack(value) {
      var message = '';

      if (!isNaN(value)) {
        service.player.subtitles.track = parseInt(value, 10);
        if (subtitlesTrack() > 0) {
          message = '字幕' + subtitlesTrack();
        } else {
          message = '字幕無効';
        }
        setScreenText(message);
      }
      return service.player.subtitles.track;
    }

    function toggleSubtitlesTrack() {
      var track = subtitlesTrack() + 1;
      if (track <= 0) {
        track = 1;
      }
      subtitlesTrack(track);
    }

    function subtitlesDelay(value) {
      if (!isNaN(value)) {
        service.player.subtitles.delay = parseInt(value, 10);
      }
      return service.player.subtitles.delay;
    }

    function aspectRatio(value) {
      if (angular.isDefined(value)) {
        props.aspectRatio = value;
      }
      return props.aspectRatio;
    }

    function normalSpeed() {
      rate(1);
    }

    function speedUp() {
      var newRate = rate();
      switch (Math.floor(newRate.toFixed(1))) {
        case 3:
        case 2:
          newRate += 1;
          break;
        case 1:
          newRate += 1 / 10;
          break;
        default:
          newRate *= 2;
      }
      rate(newRate);
    }

    function speedDown() {
      var newRate = rate();
      switch (Math.ceil(newRate.toFixed(1))) {
        case 4:
        case 3:
          newRate -= 1;
          break;
        case 2:
          newRate -= 1 / 10;
          break;
        default:
          newRate /= 2;
      }
      rate(newRate);
    }

    function jumpForward(value) {
      if (/^-?[0-9.]+ms/.test(value)) {
        time(time() + parseFloat(value));
      } else if (/^-?[0-9.]+s/.test(value)) {
        time(time() + (parseFloat(value) * 1000));
      } else {
        position(position() + parseFloat(value));
      }
    }

    function jumpBackward(value) {
      if (/^-?[0-9.]+ms/.test(value)) {
        time(time() - parseFloat(value));
      } else if (/^-?[0-9.]+s/.test(value)) {
        time(time() - (parseFloat(value) * 1000));
      } else {
        position(position() - parseFloat(value));
      }
    }

    function increaseVolume(value) {
      volume(volume() + value);
    }

    function decreaseVolume(value) {
      volume(volume() - value);
    }

    function setScreenText(text, force) {
      if (force || props.active) {
        props.screenText = text;
      }
    }

    function getScreenText() {
      var text = props.screenText;
      props.screenText = '';
      return text;
    }

    function formattedTime() {
      return CommonService.formatTime(time());
    }

    function formattedLength() {
      return CommonService.formatTime(length());
    }
  }
}(
  require(process.platform === 'linux' ? 'webchimera.js' : 'wcjs-prebuilt'),
  require('webgl-video-renderer')
));
