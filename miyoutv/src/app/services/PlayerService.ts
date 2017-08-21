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
declare const wcjsRenderer : any;

export interface PlayerSetting {
  mute: boolean;
  volume: number;
  deinterlace: string;
  aspectRatio: string;
}

export interface PlayerService {
  deinterlaceList: string[];
  playing(): boolean;
  state(): number;
  length(): number;
  position(value?: number): number;
  time(value?: number): number;
  volume(value?: number): number;
  mute(value?: boolean): boolean;
  rate(value?: number): number;
  overwriteLength(value?: number): number;
  preseekTime(value?: number): number;
  init(screen: Element): void;
  suspend(): void;
  play(mrl?: string): void;
  pause(): void;
  togglePause(): void;
  stop(): void;
  toggleMute(): void;
  close(): void;
  audioTrackCount(): number;
  audioTrack(value?: number): number;
  toggleAudioTrack(): void;
  audioChannel(value?: number): number;
  audioDelay(value?: number): number;
  videoTrackCount(): number;
  videoTrack(value?: number): number;
  toggleVideoTrack(): void;
  deinterlace(value?: string): string;
  aspectRatio(value?: string): string;
  subtitlesCount(): number;
  subtitlesTrack(value?: number): number;
  toggleSubtitlesTrack(): void;
  subtitlesDelay(value?: number): number;
  normalSpeed(): void;
  speedUp(): void;
  speedDown(): void;
  jumpForward(value: number | string): void;
  jumpBackward(value: number | string): void;
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
        (): boolean => this.mute(),
        (): number => this.volume(),
        (): string => this.deinterlace(),
        (): string => this.aspectRatio(),
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
          if (this.preseekTime() !== 0) {
            this.time(this.preseekTime());
          }
          this.preseekTime(0);
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
      mute: this.mute(),
      volume: this.volume(),
      deinterlace: this.deinterlace(),
      aspectRatio: this.aspectRatio(),
    };
    this.CommonService.saveLocalStorage('player', setting);
  }

  protected loadSetting(): void {
    const setting: PlayerSetting = this.CommonService.loadLocalStorage('player') || {};
    this.mute(setting.mute);
    this.volume(setting.volume);
    if (angular.isDefined(setting.deinterlace)) {
      this.deinterlace(setting.deinterlace);
    } else {
      this.deinterlace(this._deinterlace);
    }
    if (angular.isDefined(setting.aspectRatio)) {
      this.aspectRatio(setting.aspectRatio);
    } else {
      this.aspectRatio(this._aspectRatio);
    }
  }

  public playing(): boolean {
    return this.player.playing;
  }

  public state(): number {
    return this.player.state;
  }

  public length(): number {
    if (this.player.length === 0 && this.overwriteLength() > 0) {
      return this.overwriteLength();
    }
    return this.player.length;
  }

  public position(value?: number): number {
    let message: string;

    if (!isNaN(value)) {
      this.player.position = parseFloat(value as any);
      message = this.formattedTime();
      this.setScreenText(message);
    }
    return this.player.position;
  }

  public time(value?: number): number {
    let newTime: number;

    if (!isNaN(value)) {
      newTime = parseInt(value as any, 10);
      if (this.player.time === 0 && this.overwriteLength() > 0) {
        this.position(newTime / this.overwriteLength());
      } else {
        this.player.time = newTime;
      }
    }
    if (this.player.time === 0 && this.overwriteLength() > 0) {
      return this.position() * this.overwriteLength();
    }
    return this.player.time;
  }

  public volume(value?: number): number {
    let message: string;

    if (!isNaN(value)) {
      if (value > 200) {
        this.player.volume = 200;
      } else if (value < 0) {
        this.player.volume = 0;
      } else {
        this.player.volume = parseInt(value as any, 10);
      }
      message = `音量 ${this.volume()}%`;
      this.setScreenText(message);
    }
    return this.player.volume;
  }

  public mute(value?: boolean): boolean {
    if (angular.isDefined(value)) {
      this.player.mute = Boolean(value);
    }
    return this.player.mute;
  }

  public rate(value?: number): number {
    let newRate: number;
    let message: string;

    if (!isNaN(value)) {
      newRate = parseFloat(value as any);
      if (newRate >= this.playerRateLimit) {
        this.player.input.rate = this.playerRateLimit;
      } else if (newRate > 64) {
        this.player.input.rate = 64;
      } else if (newRate < 1 / 32) {
        this.player.input.rate = 1 / 32;
      } else {
        this.player.input.rate = newRate;
      }
      message = `再生速度 x${(Math.round(this.rate() * 100) / 100)}`;
      this.setScreenText(message);
    }
    return this.player.input.rate;
  }


  public overwriteLength(value?: number): number {
    if (!isNaN(value)) {
      this._overwriteLength = parseInt(value as any, 10);
    }
    return this._overwriteLength;
  }

  public preseekTime(value?: number): number {
    if (!isNaN(value)) {
      this._preseekTime = parseInt(value as any, 10);
    }
    return this._preseekTime;
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

  public audioTrackCount(): number {
    return this.player.audio.count;
  }

  public audioTrack(value?: number): number {
    let message: string;

    if (!isNaN(value)) {
      this.player.audio.track = parseInt(value as any, 10);
      if (this.audioTrack() > 0) {
        message = `音声${this.audioTrack()}`;
      } else {
        message = '音声無効';
      }
      this.setScreenText(message);
    }
    return this.player.audio.track;
  }

  public toggleAudioTrack(): void {
    let track: number = this.audioTrack() + 1;
    if (track <= 0) {
      track = 1;
    }
    this.audioTrack(track);
  }

  public audioChannel(value?: number): number {
    if (!isNaN(value)) {
      this.player.audio.channel = parseInt(value as any, 10);
    }
    return this.player.audio.channel;
  }

  public audioDelay(value?: number): number {
    if (!isNaN(value)) {
      this.player.audio.delay = parseInt(value as any, 10);
    }
    return this.player.audio.delay;
  }

  public videoTrackCount(): number {
    return this.player.video.count;
  }

  public videoTrack(value?: number): number {
    let message: string;

    if (!isNaN(value)) {
      this.player.video.track = parseInt(value as any, 10);

      if (this.videoTrack() > 0) {
        message = `映像${this.videoTrack()}`;
      } else {
        message = '映像無効';
      }
      this.setScreenText(message);
    }
    return this.player.video.track;
  }

  public toggleVideoTrack(): void {
    let track: number = this.videoTrack() + 1;
    if (track <= 0) {
      track = 1;
    }
    this.videoTrack(track);
  }
  public deinterlace(value?: string): string {
    let isEnabled: boolean;

    if (angular.isDefined(value)) {
      isEnabled = PlayerService.deinterlaceList.filter(
        (a: string): boolean => a === value,
      ).length > 0;
      if (isEnabled) {
        this.player.video.deinterlace.enable(value);
        this._deinterlace = value;
      } else {
        this.player.video.deinterlace.disable();
        this._deinterlace = '';
      }
    }
    return this._deinterlace;
  }

  public aspectRatio(value?: string): string {
    if (angular.isDefined(value)) {
      this._aspectRatio = value;
    }
    return this._aspectRatio;
  }

  public subtitlesCount(): number {
    return this.player.subtitles.count;
  }

  public subtitlesTrack(value?: number): number {
    let message: string;

    if (!isNaN(value)) {
      this.player.subtitles.track = parseInt(value as any, 10);
      if (this.subtitlesTrack() > 0) {
        message = `字幕${this.subtitlesTrack()}`;
      } else {
        message = '字幕無効';
      }
      this.setScreenText(message);
    }
    return this.player.subtitles.track;
  }

  public toggleSubtitlesTrack(): void {
    let track: number = this.subtitlesTrack() + 1;
    if (track <= 0) {
      track = 1;
    }
    this.subtitlesTrack(track);
  }

  public subtitlesDelay(value?: number): number {
    if (!isNaN(value)) {
      this.player.subtitles.delay = parseInt(value as any, 10);
    }
    return this.player.subtitles.delay;
  }

  public normalSpeed(): void {
    this.rate(1);
  }

  public speedUp(): void {
    let newRate: number = this.rate();
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
    this.rate(newRate);
  }

  public speedDown(): void {
    let newRate: number = this.rate();
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
    this.rate(newRate);
  }

  public jumpForward(value: number | string): void {
    if (/^-?[0-9.]+ms/.test(value as string)) {
      this.time(this.time() + parseFloat(value as string));
    } else if (/^-?[0-9.]+s/.test(value as string)) {
      this.time(this.time() + (parseFloat(value as string) * 1000));
    } else {
      this.position(this.position() + parseFloat(value as string));
    }
  }

  public jumpBackward(value: number | string): void {
    if (/^-?[0-9.]+ms/.test(value as string)) {
      this.time(this.time() - parseFloat(value as string));
    } else if (/^-?[0-9.]+s/.test(value as string)) {
      this.time(this.time() - (parseFloat(value as string) * 1000));
    } else {
      this.position(this.position() - parseFloat(value as string));
    }
  }

  public increaseVolume(value: number): void {
    this.volume(this.volume() + value);
  }

  public decreaseVolume(value: number): void {
    this.volume(this.volume() - value);
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
    return this.CommonService.formatTime(this.time());
  }

  public formattedLength(): string {
    return this.CommonService.formatTime(this.length());
  }

}

angular.module('app')
  .service('PlayerService', PlayerService);
