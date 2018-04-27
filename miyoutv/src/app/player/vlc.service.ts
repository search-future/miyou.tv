/*!
Copyright 2016-2018 Brazil Ltd.

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
import * as fs from 'fs';
import * as path from 'path';
import { remote } from 'electron';
import { EventEmitter, Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

declare const wcjsRenderer: any;

process.mainModule.paths.push(path.join(remote.app.getPath('exe'), '../node_modules'));

if (process.platform === 'darwin' && !process.env.WCJS_TARGET) {
  let wcjsPath: string = '';
  try {
    wcjsPath = path.join(
      __non_webpack_require__.resolve('wcjs-prebuilt'),
      '../bin',
    );
  } catch (e) { }
  try {
    if (!fs.existsSync(wcjsPath)) {
      wcjsPath = path.join(
        __non_webpack_require__.resolve('webchimera.js'),
        '..',
      );
    }
    const wcjsTarget: string = path.join(
      remote.app.getPath('temp'),
      remote.app.getName(),
      'webchimera.js',
    );
    try {
      const paths: string[] = [wcjsPath];
      const libs: string[] = fs.readdirSync(path.join(wcjsPath, 'lib'));
      try {
        fs.mkdirSync(path.join(wcjsTarget, '..'));
      } catch (e) { }
      while (paths.length > 0) {
        const src: string = paths.shift();
        const dest: string = src.replace(wcjsPath, wcjsTarget);
        try {
          const stat: fs.Stats = fs.lstatSync(src);
          if (stat.isDirectory()) {
            paths.push(...fs.readdirSync(src).map((a: string): string => path.join(src, a)));
            fs.mkdirSync(dest);
          } else if (stat.isSymbolicLink()) {
            if (fs.existsSync(dest)) {
              fs.unlinkSync(dest);
            }
            if (/\.dylib$/.test(src)) {
              const basename: string = path.basename(src);
              const lib: string = libs.filter((a: string): boolean => (
                a.indexOf(`${basename.split('.')[0]}.`) === 0 && a !== basename
              ))[0];
              fs.symlinkSync(path.join(wcjsTarget, 'lib', lib), dest);
            } else {
              fs.symlinkSync(src, dest);
            }
          } else {
            fs.writeFileSync(dest, fs.readFileSync(src));
          }
        } catch (e) { }
      }
      process.env.WCJS_TARGET = wcjsTarget;
    } catch (e) { }
  } catch (e) { }
}

export enum VlcLogLevel { Debug, Info, Warning, Error }
export enum VlcState { NothingSpecial, Opening, Buffering, Playing, Paused, Stopped, Ended, Error }
export enum VlcAudio { Error, Stereo, ReverseStereo, Left, Right, Dolby }

interface PlayerSetting {
  rate: number;
  mute: boolean;
  volume: number;
  deinterlace: string;
  aspectRatio: string;
}

@Injectable()
export class VlcService {
  public static deinterlaceList: string[] = [
    'blend',
    'bob',
    'discard',
    'linear',
    'mean',
    'x',
    'yadif',
    'yadif2x',
  ];

  public readonly event: Observable<any> = new EventEmitter();
  public readonly player: any;
  public readonly valueChanges: Observable<any> = new EventEmitter();
  public overwriteLength: number = 0;
  public playerRateLimit: number = 8;
  protected _deinterlace: string = '';
  protected _aspectRatio: string = '16:9';
  protected renderContext: any;

  constructor(
    @Inject('playerOptions') private playerOptions: string[],
  ) {
    let wcjs: any;
    try {
      wcjs = __non_webpack_require__('wcjs-prebuilt');
    } catch (e) {
      try {
        wcjs = __non_webpack_require__('webchimera.js');
      } catch (e) {
        return;
      }
    }
    this.player = wcjs.createPlayer(playerOptions || []);
    this.player.onFrameSetup = (
      width: number,
      height: number,
      pixelFormat: string,
      videoFrame: any,
    ) => {
      (this.event as EventEmitter<any>).emit({
        width,
        height,
        pixelFormat,
        videoFrame,
        name: 'FrameSetup',
      });
    };
    this.player.onFrameReady = (videoFrame: any) => {
      (this.event as EventEmitter<any>).emit({
        videoFrame,
        name: 'FrameReady',
      });
    };
    this.player.onFrameCleanup = () => {
      (this.event as EventEmitter<any>).emit({ name: 'FrameCleanup' });
    };
    this.player.onMediaChanged = () => {
      (this.event as EventEmitter<any>).emit({ name: 'MediaChanged' });
    };
    this.player.onNothingSpecial = () => {
      (this.event as EventEmitter<any>).emit({ name: 'NothingSpecial' });
    };
    this.player.onOpening = () => {
      (this.event as EventEmitter<any>).emit({ name: 'Opening' });
    };
    this.player.onBuffering = (percents: number) => {
      (this.event as EventEmitter<any>).emit({
        percents,
        name: 'Buffering',
      });
    };
    this.player.onPlaying = () => {
      (this.event as EventEmitter<any>).emit({ name: 'Playing' });
    };
    this.player.onPaused = () => {
      (this.event as EventEmitter<any>).emit({ name: 'Paused' });
    };
    this.player.onForward = () => {
      (this.event as EventEmitter<any>).emit({ name: 'Forward' });
    };
    this.player.onBackward = () => {
      (this.event as EventEmitter<any>).emit({ name: 'Backward' });
    };
    this.player.onEncounteredError = () => {
      (this.event as EventEmitter<any>).emit({ name: 'EncounteredError' });
    };
    this.player.onEndReached = () => {
      (this.event as EventEmitter<any>).emit({ name: 'EndReached' });
    };
    this.player.onStopped = () => {
      (this.event as EventEmitter<any>).emit({ name: 'Stopped' });
    };
    this.player.onTimeChanged = (time: number) => {
      (this.event as EventEmitter<any>).emit({
        time,
        name: 'TimeChanged',
      });
    };
    this.player.onPositionChanged = (position: number) => {
      (this.event as EventEmitter<any>).emit({
        position,
        name: 'PositionChanged',
      });
    };
    this.player.onSeekableChanged = (seekable: boolean) => {
      (this.event as EventEmitter<any>).emit({
        seekable,
        name: 'SeekableChanged',
      });
    };
    this.player.onPausableChanged = (pausable: boolean) => {
      (this.event as EventEmitter<any>).emit({
        pausable,
        name: 'PausableChanged',
      });
    };
    this.player.onLengthChanged = (length: number) => {
      (this.event as EventEmitter<any>).emit({
        length,
        name: 'LengthChanged',
      });
    };
    this.player.onLogMessage = (level: number, message: string, format: string) => {
      (this.event as EventEmitter<any>).emit({
        level, message, format, length,
        name: 'LogMessage',
      });
    };

    this.event.filter((event: any): boolean => (
      event.name === 'LogMessage'
    )).subscribe((event: any) => {
      switch (event.level) {
        case VlcLogLevel.Error:
          if (event.message.indexOf('Unexpected channel configuration change') >= 0) {
            const track: number = this.audioTrack;
            this.audioTrack = 0;
            this.audioTrack = track;
            this.position = this.position;
          }
          break;
        default:
      }
    });
    this.event.filter(
      (event: any): boolean => event.name === 'FrameReady',
    ).subscribe((event: any) => {
      this.renderContext.render(
        event.videoFrame,
        event.videoFrame.width,
        event.videoFrame.height,
        event.videoFrame.uOffset,
        event.videoFrame.vOffset,
      );
    });
  }

  get playing(): boolean {
    return this.player.playing;
  }

  get state(): number {
    return this.player.state;
  }

  get length(): number {
    return this.player.length;
  }

  set position(position: number) {
    this.player.position = position;
  }
  get position(): number {
    return this.player.position;
  }

  set time(time: number) {
    this.player.time = time;
  }
  get time(): number {
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
    (this.valueChanges as EventEmitter<any>).emit({ volume: this.player.volume });
  }
  get volume(): number {
    return this.player.volume;
  }

  set mute(value: boolean) {
    this.player.mute = value;
    (this.valueChanges as EventEmitter<any>).emit({ mute: this.player.mute });
  }
  get mute(): boolean {
    return this.player.mute;
  }

  set rate(rate: number) {
    this.player.input.rate = rate;
    (this.valueChanges as EventEmitter<any>).emit({ rate: this.player.input.rate });
  }
  get rate(): number {
    return this.player.input.rate;
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
    (this.valueChanges as EventEmitter<any>).emit({ audioTrack: this.audioTrack });
  }
  get audioTrack(): number {
    return this.player.audio.track;
  }

  set audioChannel(channel: number) {
    this.player.audio.channel = channel;
    (this.valueChanges as EventEmitter<any>).emit({ audioChannel: this.audioChannel });
  }
  get audioChannel(): number {
    return this.player.audio.channel;
  }

  set audioDelay(delay: number) {
    this.player.audio.delay = delay;
    (this.valueChanges as EventEmitter<any>).emit({ audioDelay: this.audioDelay });
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
    (this.valueChanges as EventEmitter<any>).emit({ videoTrack: this.videoTrack });
  }
  get videoTrack(): number {
    return this.player.video.track;
  }

  set aspectRatio(value: string) {
    this._aspectRatio = value;
    (this.valueChanges as EventEmitter<any>).emit({ aspectRatio: this.aspectRatio });
  }
  get aspectRatio() {
    return this._aspectRatio;
  }

  set deinterlace(mode: string) {
    const isEnabled: boolean = VlcService.deinterlaceList.some(
      (a: string): boolean => a === mode,
    );
    if (isEnabled) {
      this.player.video.deinterlace.enable(mode);
      this._deinterlace = mode;
    } else {
      this.player.video.deinterlace.disable();
      this._deinterlace = '';
    }
    (this.valueChanges as EventEmitter<any>).emit({ deinterlace: this.deinterlace });
  }
  get deinterlace(): string {
    return this._deinterlace;
  }

  get subtitlesCount(): number {
    return this.player.subtitles.count;
  }

  set subtitlesTrack(track: number) {
    this.player.subtitles.track = track;
  }
  get subtitlesTrack(): number {
    return this.player.subtitles.track;
  }

  public init(screen: HTMLCanvasElement) {
    this.renderContext = wcjsRenderer.setupCanvas(screen);
    this.renderContext.fillBlack();
  }

  public suspend() {
    this.player.stop();
    this.player.playlist.clear();
    this.renderContext.fillBlack();
  }

  public play(mrl?: string) {
    if (mrl) {
      this.player.play(mrl);
    } else {
      this.player.play();
    }
  }
  public pause() {
    this.player.pause();
  }

  public togglePause() {
    this.player.togglePause();
  }

  public toggleMute() {
    this.player.toggleMute();
    (this.event as EventEmitter<any>).emit({ name: 'ValueChanged' });
  }

  public stop() {
    this.player.stop();
  }

  public close() {
    this.player.close();
  }
}
