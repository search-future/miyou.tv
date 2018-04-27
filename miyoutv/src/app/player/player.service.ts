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
import { EventEmitter, Inject, Injectable } from '@angular/core';
import { VgAPI, VgStates } from 'videogular2/core';
import { Observable, Subject } from 'rxjs';

import { StorageService } from '../shared/storage.service';
import { MpvService } from './mpv.service';
import { VgWrapper } from './vg-wrapper.service';
import { VlcService, VlcState } from './vlc.service';

export enum PlayerState {
  Stopped = 'stopped',
  Playing = 'playing',
  Paused = 'paused',
  Loading = 'loading',
}

interface PlayerSetting {
  rate: number;
  mute: boolean;
  volume: number;
  deinterlace: string;
  aspectRatio: string;
}

@Injectable()
export class Player {
  public readonly event: Observable<any> = new EventEmitter();
  public readonly screenText: Subject<{ message: string, force?: boolean }> = new Subject();
  public readonly valueChanges: Observable<any> = new EventEmitter();
  public active: boolean = false;
  public mode: string = 'mpv';
  public overwriteLength: number = 0;
  public playerRateLimit: number = 8;
  public preseekTime: number = 0;
  protected player: any;
  private eventNameTable: any = {
    NothingSpecial: 'emptied',
    Opening: 'loadstart',
    Buffering: 'progress',
    Playing: 'play',
    Paused: 'pause',
    Forward: 'seeked',
    Backward: 'seeked',
    EncounteredError: 'error',
    EndReached: 'ended',
    LengthChanged: 'durationchange',
  };

  constructor(
    @Inject('playerOptions') private playerOptions: string[],
    private storageService: StorageService,
    private mpv: MpvService,
    private vgWrapper: VgWrapper,
    private vlc: VlcService,
  ) {
    this.mpv.valueChanges.subscribe((value: any) => {
      (this.valueChanges as EventEmitter<any>).emit(value);
    });
    this.mpv.event.subscribe((event: any) => {
      (this.event as EventEmitter<any>).emit(event);
    });

    this.vgWrapper.valueChanges.subscribe((value: any) => {
      (this.valueChanges as EventEmitter<any>).emit(value);
    });
    this.vgWrapper.event.subscribe((event: any) => {
      switch (event.name) {
        case 'timeupdate':
          (this.event as EventEmitter<any>).emit({
            name: 'positionchanged',
            position: this.position,
          });
          (this.event as EventEmitter<any>).emit({
            name: 'timechanged',
            time: this.time,
          });
          break;
        default:
          if (this.eventNameTable[event.name]) {
            (this.event as EventEmitter<any>).emit(Object.assign({}, event, {
              name: this.eventNameTable[event.name],
            }));
          } else {
            (this.event as EventEmitter<any>).emit(event);
          }
      }
    });

    this.vlc.valueChanges.subscribe((value: any) => {
      (this.valueChanges as EventEmitter<any>).emit(value);
    });
    this.vlc.event.subscribe((event: any) => {
      if (this.eventNameTable[event.name]) {
        (this.event as EventEmitter<any>).emit(Object.assign({}, event, {
          name: this.eventNameTable[event.name],
        }));
      } else {
        (this.event as EventEmitter<any>).emit(Object.assign({}, event, {
          name: event.name.toLocaleLowerCase(),
        }));
      }
    });

    Observable.zip(
      this.event.filter((event: any): boolean => event.name === 'mediachanged'),
      this.event.filter((event: any): boolean => event.name === 'play'),
    ).subscribe(() => {
      this.loadSetting();
      (this.valueChanges as EventEmitter<any>).emit({
        audioTrack: this.audioTrack,
        videoTrack: this.videoTrack,
        subtitlesTrack: this.subtitlesTrack,
      });
      this.event.filter(
        (event: any): boolean => event.name === 'positionchanged',
      ).skip(1).take(1).subscribe(() => {
        if (this.preseekTime !== 0) {
          this.time = this.preseekTime - 10000;
        }
        this.preseekTime = 0;
        this.active = true;
      });
    });
  }

  get playing(): boolean {
    return this.player ? this.player.playing : false;
  }

  get state(): PlayerState {
    if (this.player) {
      switch (this.player.state) {
        case 'Opening':
        case 'Buffering':
        case VgStates.VG_LOADING:
          return PlayerState.Loading;
        case 'Playing':
        case VgStates.VG_PLAYING:
          return PlayerState.Playing;
        case 'Paused':
        case VgStates.VG_PAUSED:
          return PlayerState.Paused;
        case 'NothingSpecial':
        case 'Stopped':
        case 'Ended':
        case 'Error':
        case VgStates.VG_ENDED:
          return PlayerState.Stopped;
        default:
      }
      return this.player.state;
    }
    return PlayerState.Stopped;
  }

  get length(): number {
    if (this.player) {
      if (this.player.length === 0 && this.overwriteLength > 0) {
        return this.overwriteLength;
      }
      return this.player.length;
    }
    return 0;
  }

  get vgUrl(): Observable<string> {
    return this.vgWrapper.url;
  }

  set position(position: number) {
    if (this.player) {
      this.player.position = position;
    }
  }
  get position(): number {
    return this.player ? this.player.position : 0;
  }

  set time(time: number) {
    if (this.player) {
      if (this.player.time === 0 && this.overwriteLength > 0) {
        this.position = time / this.overwriteLength;
      } else {
        this.player.time = time;
      }
    }
  }
  get time(): number {
    if (this.player) {
      if (this.player.time === 0 && this.overwriteLength > 0) {
        return this.position * this.overwriteLength;
      }
      return this.player.time;
    }
    return 0;
  }

  set volume(volume: number) {
    if (this.player) {
      if (volume > 200) {
        this.player.volume = 200;
      } else if (volume < 0) {
        this.player.volume = 0;
      } else {
        this.player.volume = volume;
      }
      const message: string = `音量 ${this.volume}%`;
      this.screenText.next({ message });
      this.saveSetting();
    }
  }
  get volume(): number {
    return this.player ? this.player.volume : 0;
  }

  set mute(value: boolean) {
    if (this.player) {
      this.player.mute = value;
      this.saveSetting();
    }
  }
  get mute(): boolean {
    return this.player ? this.player.mute : false;
  }

  set rate(rate: number) {
    if (this.player) {
      const newRate: number = rate;
      if (newRate >= this.playerRateLimit) {
        this.player.rate = this.playerRateLimit;
      } else if (newRate > 64) {
        this.player.rate = 64;
      } else if (newRate < 1 / 32) {
        this.player.rate = 1 / 32;
      } else {
        this.player.rate = newRate;
      }
      const message: string = `再生速度 x${(Math.round(this.rate * 100) / 100)}`;
      this.screenText.next({ message });
      this.saveSetting();
    }
  }
  get rate(): number {
    return this.player ? this.player.rate : 1;
  }

  get audioTrackCount(): number {
    return this.player ? this.player.audioTrackCount : 0;
  }

  set audioTrack(track: number) {
    this.player.audioTrack = track;
    let message: string;
    if (this.audioTrack > 0) {
      message = `音声${this.audioTrack}`;
    } else {
      message = '音声無効';
    }
    this.screenText.next({ message });
  }
  get audioTrack(): number {
    return this.player ? this.player.audioTrack : 0;
  }

  set audioChannel(channel: number) {
    this.player.audioChannel = channel;
  }
  get audioChannel(): number {
    return this.player ? this.player.audioChannel : 0;
  }

  set audioDelay(delay: number) {
    this.player.audioDelay = delay;
  }
  get audioDelay(): number {
    return this.player ? this.player.audioDelay : 0;
  }

  get videoTrackCount(): number {
    return this.player ? this.player.videoTrackCount : 0;
  }

  set videoTrack(track: number) {
    this.player.videoTrack = track;
    let message: string;
    if (this.videoTrack > 0) {
      message = `映像${this.videoTrack}`;
    } else {
      message = '映像無効';
    }
    this.screenText.next({ message });
  }
  get videoTrack(): number {
    return this.player ? this.player.videoTrack : 0;
  }

  set aspectRatio(value: string) {
    if (this.player) {
      this.player.aspectRatio = value;
      this.saveSetting();
    }
  }
  get aspectRatio() {
    return this.player ? this.player.aspectRatio : '16:9';
  }

  set deinterlace(mode: string) {
    if (this.player) {
      this.player.deinterlace = mode;
      this.saveSetting();
    }
  }
  get deinterlace(): string {
    return this.player ? this.player.deinterlace : '';
  }

  get subtitlesCount(): number {
    return this.player ? this.player.subtitlesCount : 0;
  }

  set subtitlesTrack(track: number) {
    if (this.player) {
      this.player.subtitlesTrack = track;
      let message: string;
      if (this.subtitlesTrack > 0) {
        message = `字幕${this.subtitlesTrack}`;
      } else {
        message = '字幕無効';
      }
      this.screenText.next({ message });
    }
  }
  get subtitlesTrack(): number {
    return this.player ? this.player.subtitlesTrack : 0;
  }

  protected saveSetting() {
    if (this.active) {
      Observable.timer(500, 1000).take(2).subscribe(() => {
        if (this.active) {
          const setting: PlayerSetting = {
            rate: this.rate,
            mute: this.mute,
            volume: this.volume,
            deinterlace: this.deinterlace,
            aspectRatio: this.aspectRatio,
          };
          this.storageService.saveLocalStorage('player', setting);
        }
      });
    }
  }

  protected loadSetting() {
    const setting: PlayerSetting = this.storageService.loadLocalStorage('player') || {};
    if (setting.rate != null) {
      this.rate = setting.rate;
    }
    if (setting.mute != null) {
      this.mute = setting.mute;
    }
    if (setting.volume != null) {
      this.volume = setting.volume;
    }
    if (setting.deinterlace != null) {
      this.deinterlace = setting.deinterlace;
    }
    if (setting.aspectRatio != null) {
      this.aspectRatio = setting.aspectRatio;
    }
  }

  public initVlc(screen: HTMLCanvasElement) {
    if (this.mode === 'vlc') {
      this.vlc.init(screen);
      this.player = this.vlc;
    }
  }

  public initVg(api: VgAPI) {
    if (this.mode === 'vg') {
      this.vgWrapper.init(api);
      this.player = this.vgWrapper;
    }
  }

  public initMpv(screen: HTMLEmbedElement) {
    if (this.mode === 'mpv') {
      this.mpv.init(screen);
      this.player = this.mpv;
    }
  }

  public suspend() {
    if (this.player) {
      this.player.suspend();
      this.player = null;
    }
  }

  public play(mrl?: string) {
    if (this.player) {
      if (mrl) {
        this.active = false;
        this.player.play(mrl);
      } else {
        this.player.play();
      }
    }
  }

  public pause() {
    if (this.player) {
      this.player.pause();
    }
  }

  public togglePause() {
    if (this.player) {
      this.player.togglePause();
    }
  }

  public stop() {
    this.active = false;
    if (this.player) {
      this.player.stop();
    }
  }

  public toggleMute() {
    if (this.player) {
      this.player.toggleMute();
      this.saveSetting();
    }
  }

  public close() {
    if (this.player) {
      this.player.close();
    }
  }

  public toggleAudioTrack() {
    let track: number = this.audioTrack + 1;
    if (track <= 0) {
      track = 1;
    }
    this.audioTrack = track;
  }

  public toggleVideoTrack() {
    let track: number = this.videoTrack + 1;
    if (track <= 0) {
      track = 1;
    }
    this.videoTrack = track;
  }

  public toggleSubtitlesTrack() {
    let track: number = this.subtitlesTrack + 1;
    if (track <= 0) {
      track = 1;
    }
    this.subtitlesTrack = track;
  }

  public normalSpeed() {
    this.rate = 1;
  }

  public speedUp() {
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

  public speedDown() {
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

  public jumpForward(time: string) {
    if (/^-?[0-9.]+ms/.test(time as string)) {
      this.time = this.time + parseFloat(time as string);
    } else if (/^-?[0-9.]+s/.test(time as string)) {
      this.time = this.time + (parseFloat(time as string) * 1000);
    } else {
      this.position = this.position + parseFloat(time as string);
    }
  }

  public jumpBackward(time: string) {
    if (/^-?[0-9.]+ms/.test(time as string)) {
      this.time = this.time - parseFloat(time);
    } else if (/^-?[0-9.]+s/.test(time as string)) {
      this.time = this.time - (parseFloat(time) * 1000);
    } else {
      this.position = this.position - parseFloat(time);
    }
  }

  public increaseVolume(value: number) {
    this.volume = this.volume + value;
  }

  public decreaseVolume(value: number) {
    this.volume = this.volume - value;
  }
}
