/*!
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
import * as CommonService from '../services/CommonService';

const wcjs: any = require(process.platform === 'linux' ? 'webchimera.js' : 'wcjs-prebuilt');
declare module angular { }
declare const wcjsRenderer: any;

export interface PlayerSetting {
  mute: boolean;
  volume: number;
  deinterlace: string;
  aspectRatio: string;
}

export interface PlayerService {
  deinterlaceList: string[];
  init(screen: Element): void;
  suspend(): void;
  play(mrl?: string): void;
  pause(): void;
  togglePause(): void;
  stop(): void;
  toggleMute(): void;
  close(): void;
  toggleAudioTrack(): void;
  toggleVideoTrack(): void;
  toggleSubtitlesTrack(): void;
  subtitlesDelay(value?: number): number;
  normalSpeed(): void;
  speedUp(): void;
  speedDown(): void;
  jumpForward(value: string): void;
  jumpBackward(value: string): void;
  increaseVolume(value: number): void;
  decreaseVolume(value: number): void;
  setScreenText(text: string, force?: boolean): void;
  getScreenText(): string;
  formattedTime(): string;
  formattedLength(): string;
}

export class PlayerService implements PlayerService {
  static serviceName: string = 'PlayerService';
  static $inject: string[] = [
    '$rootScope',
    '$window',
    '$q',
    'CommonService',
    'playerRateLimit',
  ];
  static deinterlaceList: string[] = [
    'blend',
    'bob',
    'discard',
    'linear',
    'mean',
    'x',
    'yadif',
    'yadif2x',
  ];

  private _player: any;
  private _overwriteLength: number = 0;
  private _preseekTime: number = 0;
  private _screenText: string = '';
  private _aspectRatio: string = '16:9';
  private _deinterlace: string = 'discard';
  protected renderContext: any;
  protected active: boolean = false;

  constructor(
    private $rootScope: ng.IRootScopeService,
    private $window: ng.IWindowService,
    private $q: ng.IQService,
    private CommonService: CommonService.CommonService,
    private playerRateLimit: number,
  ) {
    this._player = wcjs.createPlayer(['--network-caching', '5000']);
    this.player.onFrameReady = this.createEmitter('Player.FrameReady');
    this.player.onMediaChanged = this.createEmitter('Player.MediaChanged');
    this.player.onNothingSpecial = this.createEmitter('Player.NothingSpecial');
    this.player.onOpening = this.createEmitter('Player.Opening');
    this.player.onBuffering = this.createEmitter('Player.Buffering');
    this.player.onPlaying = this.createEmitter('Player.Playing');
    this.player.onPaused = this.createEmitter('Player.Paused');
    this.player.onForward = this.createEmitter('Player.Forward');
    this.player.onBackward = this.createEmitter('Player.Backward');
    this.player.onEncounteredError = this.createEmitter('Player.EncounteredError');
    this.player.onEndReached = this.createEmitter('Player.EndReached');
    this.player.onStopped = this.createEmitter('Player.Stopped');
    this.player.onTimeChanged = this.createEmitter('Player.TimeChanged');
    this.player.onPositionChanged = this.createEmitter('Player.PositionChanged');
    this.player.onSeekableChanged = this.createEmitter('Player.SeekableChanged');
    this.player.onPausableChanged = this.createEmitter('Player.PausableChanged');
    this.player.onLengthChanged = this.createEmitter('Player.LengthChanged');

    $rootScope.$watchGroup(
      [
        (): boolean => this.mute,
        (): number => this.volume,
        (): string => this.deinterlace,
        (): string => this.aspectRatio,
      ],
      (): void => {
        if (this.active) {
          this.saveSetting();
        }
      },
    );
    $rootScope.$on(
      '$destroy',
      $rootScope.$on('Player.FrameReady', (event, frame): void => {
        this.renderContext.render(
          frame,
          frame.width,
          frame.height,
          frame.uOffset,
          frame.vOffset,
        );
        this.active = true;
      }),
    );
    $rootScope.$on(
      '$destroy',
      $rootScope.$on('Player.MediaChanged', (): void => {
        let deregister: () => void = null;
        this.active = false;
        deregister = $rootScope.$on('Player.Playing', (): void => {
          this.loadSetting();
          if (this.preseekTime !== 0) {
            this.time = this.preseekTime;
          }
          this.preseekTime = 0;
          deregister();
        });
      }),
    );

    angular.element($window).on('unload', (): void => {
      this.close();
    });
  }

  get player() {
    return this._player;
  }

  protected createEmitter(name: string): (arg: any) => void {
    return (arg: any): void => {
      this.$rootScope.$broadcast(name, arg);
      this.$rootScope.$digest();
    };
  }

  protected saveSetting(): void {
    const setting: PlayerSetting = {
      mute: this.mute,
      volume: this.volume,
      deinterlace: this.deinterlace,
      aspectRatio: this.aspectRatio,
    };
    this.CommonService.saveLocalStorage('player', setting);
  }

  protected loadSetting(): void {
    const setting: PlayerSetting = this.CommonService.loadLocalStorage('player') || {};
    this.mute = setting.mute;
    this.volume = setting.volume;
    if (angular.isDefined(setting.deinterlace)) {
      this.deinterlace = setting.deinterlace;
    }
    if (angular.isDefined(setting.aspectRatio)) {
      this.aspectRatio = setting.aspectRatio;
    }
  }

  get playing(): boolean {
    return this.player.playing;
  }

  get state(): number {
    return this.player.state;
  }

  get length(): number {
    if (this.player.length === 0 && this.overwriteLength > 0) {
      return this.overwriteLength;
    }
    return this.player.length;
  }

  set position(position: number) {
    this.player.position = position;
    this.setScreenText(this.formattedTime());
  }
  get position(): number {
    return this.player.position;
  }

  set time(time: number) {
    const newTime: number = time;
    if (this.player.time === 0 && this.overwriteLength > 0) {
      this.position = newTime / this.overwriteLength;
    } else {
      this.player.time = newTime;
    }
  }

  get time(): number {
    if (this.player.time === 0 && this.overwriteLength > 0) {
      return this.position * this.overwriteLength;
    }
    return this.player.time;
  }

  set volume(volume: number) {
    if (volume > 200) {
      this.player.volume = 200;
    } else if (volume < 0) {
      this.player.volume = 0;
    } else {
      this.player.volume = volume;
    }
    const message = `音量 ${this.volume}%`;
    this.setScreenText(message);
  }
  get volume(): number {
    return this.player.volume;
  }

  set mute(value: boolean) {
    this.player.mute = value;
  }
  get mute(): boolean {
    return this.player.mute;
  }

  set rate(rate: number) {
    const newRate = rate;
    if (newRate >= this.playerRateLimit) {
      this.player.input.rate = this.playerRateLimit;
    } else if (newRate > 64) {
      this.player.input.rate = 64;
    } else if (newRate < 1 / 32) {
      this.player.input.rate = 1 / 32;
    } else {
      this.player.input.rate = newRate;
    }
    const message = `再生速度 x${(Math.round(this.rate * 100) / 100)}`;
    this.setScreenText(message);
  }
  get rate(): number {
    return this.player.input.rate;
  }

  set overwriteLength(length: number) {
    this._overwriteLength = length;
  }
  get overwriteLength(): number {
    return this._overwriteLength;
  }

  set preseekTime(time: number) {
    this._preseekTime = time;
  }
  get preseekTime(): number {
    return this._preseekTime;
  }

  get audioTrackCount(): number {
    return this.player.audio.count;
  }

  set audioTrack(track: number) {
    this.player.audio.track = track;
    let message: string;
    if (this.audioTrack > 0) {
      message = `音声${this.audioTrack}`;
    } else {
      message = '音声無効';
    }
    this.setScreenText(message);
  }
  get audioTrack(): number {
    return this.player.audio.track;
  }

  set audioChannel(channel: number) {
    this.player.audio.channel = channel;
  }
  get audioChannel(): number {
    return this.player.audio.channel;
  }

  set audioDelay(delay: number) {
    this.player.audio.delay = delay;
  }
  get audioDelay(): number {
    return this.player.audio.delay;
  }

  get videoTrackCount(): number {
    return this.player.video.count;
  }

  set videoTrack(track: number) {
    this.player.video.track = track;
    let message: string;
    if (this.videoTrack > 0) {
      message = `映像${this.videoTrack}`;
    } else {
      message = '映像無効';
    }
    this.setScreenText(message);
  }
  get videoTrack(): number {
    return this.player.video.track;
  }

  set deinterlace(mode: string) {
    const isEnabled: boolean = PlayerService.deinterlaceList.filter(
      (a: string): boolean => a === mode,
    ).length > 0;
    if (isEnabled) {
      this.player.video.deinterlace.enable(mode);
      this._deinterlace = mode;
    } else {
      this.player.video.deinterlace.disable();
      this._deinterlace = '';
    }
  }
  get deinterlace(): string {
    return this._deinterlace;
  }

  set aspectRatio(ratio: string) {
    this._aspectRatio = ratio;
  }
  get aspectRatio(): string {
    return this._aspectRatio;
  }

  get subtitlesCount(): number {
    return this.player.subtitles.count;
  }

  set subtitlesTrack(track: number) {
    this.player.subtitles.track = track;
    let message: string;
    if (this.subtitlesTrack > 0) {
      message = `字幕${this.subtitlesTrack}`;
    } else {
      message = '字幕無効';
    }
    this.setScreenText(message);
  }
  get subtitlesTrack(): number {
    return this.player.subtitles.track;
  }

  public init(screen: HTMLCanvasElement): void {
    this.renderContext = wcjsRenderer.setupCanvas(screen);
    this.renderContext.fillBlack();
    this.$rootScope.$broadcast('Player.Ready');
  }

  public suspend(): void {
    this.player.stop();
    this.player.playlist.clear();
    this.renderContext.fillBlack();
  }

  public play(mrl?: string): void {
    if (mrl) {
      this.active = false;
    }
    this.player.play(mrl);
  }
  public pause(): void {
    this.player.pause();
  }

  public togglePause(): void {
    this.player.togglePause();
  }

  public stop(): void {
    this.active = false;
    this.player.stop();
  }

  public toggleMute(): void {
    this.player.toggleMute();
  }

  public close(): void {
    this.player.close();
  }

  public toggleAudioTrack(): void {
    let track: number = this.audioTrack + 1;
    if (track <= 0) {
      track = 1;
    }
    this.audioTrack = track;
  }

  public toggleVideoTrack(): void {
    let track: number = this.videoTrack + 1;
    if (track <= 0) {
      track = 1;
    }
    this.videoTrack = track;
  }

  public toggleSubtitlesTrack(): void {
    let track: number = this.subtitlesTrack + 1;
    if (track <= 0) {
      track = 1;
    }
    this.subtitlesTrack = track;
  }

  public normalSpeed(): void {
    this.rate = 1;
  }

  public speedUp(): void {
    let newRate: number = this.rate;
    switch (Math.floor(parseFloat(newRate.toFixed(1)))) {
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
    this.rate = newRate;
  }

  public speedDown(): void {
    let newRate: number = this.rate;
    switch (Math.ceil(parseFloat(newRate.toFixed(1)))) {
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
    this.rate = newRate;
  }

  public jumpForward(time: string): void {
    if (/^-?[0 - 9.] + ms /.test(time as string)) {
      this.time = this.time + parseFloat(time as string);
    } else if (/^-?[0-9.]+s/.test(time as string)) {
      this.time = this.time + (parseFloat(time as string) * 1000);
    } else {
      this.position = this.position + parseFloat(time as string);
    }
  }

  public jumpBackward(time: string): void {
    if (/^-?[0 - 9.] + ms /.test(time as string)) {
      this.time = this.time - parseFloat(time);
    } else if (/^-?[0-9.]+s/.test(time as string)) {
      this.time = this.time - (parseFloat(time) * 1000);
    } else {
      this.position = this.position - parseFloat(time);
    }
  }

  public increaseVolume(value: number): void {
    this.volume = this.volume + value;
  }

  public decreaseVolume(value: number): void {
    this.volume = this.volume - value;
  }

  public setScreenText(text: string, force?: boolean): void {
    if (force || this.active) {
      this._screenText = text;
    }
  }

  public getScreenText(): string {
    const text: string = this._screenText;
    this._screenText = '';
    return text;
  }

  public formattedTime(): string {
    return this.CommonService.formatTime(this.time);
  }

  public formattedLength(): string {
    return this.CommonService.formatTime(this.length);
  }
}

angular.module('app')
  .service('PlayerService', PlayerService);
