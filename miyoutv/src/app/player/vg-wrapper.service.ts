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
import { Injectable, EventEmitter } from '@angular/core';
import { VgAPI, VgStates, VgEvents } from 'videogular2/core';
import { Observable, Subscription } from 'rxjs';

@Injectable()
export class VgWrapper {
  public url: Observable<string> = new EventEmitter();
  public readonly event: Observable<any> = new EventEmitter();
  public readonly valueChanges: Observable<any> = new EventEmitter();
  protected api: VgAPI;
  protected subscriptions: Subscription[] = [];
  protected mutedVolume: number = 100;

  constructor() { }

  get playing(): boolean {
    return this.state === VgStates.VG_PLAYING;
  }

  get state(): VgStates {
    return this.api ? this.api.state : VgStates.VG_ENDED;
  }

  get length(): number {
    return isFinite(this.api.duration) ? this.api.duration * 1000 : 0;
  }

  set position(position: number) {
    this.api.seekTime(position * 100, true);
  }
  get position(): number {
    return isFinite(this.api.duration) ? this.api.currentTime / this.api.duration : 0;
  }

  set time(time: number) {
    this.api.seekTime(time / 1000, false);
  }
  get time(): number {
    return this.api.currentTime * 1000;
  }

  set volume(volume: number) {
    if (volume > 200) {
      this.api.volume = 1;
    } else if (volume < 0) {
      this.api.volume = 0;
    } else {
      this.api.volume = volume / 200;
    }
  }
  get volume(): number {
    return this.api.volume * 200;
  }

  set mute(value: boolean) {
    if (value) {
      this.mutedVolume = this.api.volume;
      this.api.volume = 0;
    } else {
      this.api.volume = this.mutedVolume;
    }
  }
  get mute(): boolean {
    return this.api.volume <= 0;
  }

  set rate(rate: number) {
    const newRate: number = rate;
    if (newRate > 64) {
      this.api.playbackRate = 64;
    } else if (newRate < 1 / 32) {
      this.api.playbackRate = 1 / 32;
    } else {
      this.api.playbackRate = newRate;
    }
  }
  get rate(): number {
    return this.api.playbackRate;
  }

  get audioTrackCount(): number {
    return 2;
  }

  set audioTrack(track: number) {
    (this.valueChanges as EventEmitter<any>).emit({ audioTrack: this.audioTrack });
  }
  get audioTrack(): number {
    return 1;
  }

  set audioChannel(channel: number) {
    (this.valueChanges as EventEmitter<any>).emit({ audioChannel: this.audioChannel });
  }
  get audioChannel(): number {
    return 1;
  }

  set audioDelay(delay: number) {
    (this.valueChanges as EventEmitter<any>).emit({ audioChannel: this.audioDelay });
  }
  get audioDelay(): number {
    return 0;
  }

  get videoTrackCount(): number {
    return 2;
  }

  set videoTrack(track: number) {
    (this.valueChanges as EventEmitter<any>).emit({ videoTrack: this.videoTrack });
  }
  get videoTrack(): number {
    return 1;
  }

  set aspectRatio(value: string) {
    (this.valueChanges as EventEmitter<any>).emit({ aspectRatio: this.aspectRatio });
  }
  get aspectRatio() {
    return '16:9';
  }

  set deinterlace(mode: string) {
    (this.valueChanges as EventEmitter<any>).emit({ deinterlace: this.deinterlace });
  }
  get deinterlace(): string {
    return '';
  }

  get subtitlesCount(): number {
    return 1;
  }

  set subtitlesTrack(track: number) {
    (this.valueChanges as EventEmitter<any>).emit({ subtitlesTrack: this.subtitlesTrack });
  }
  get subtitlesTrack(): number {
    return 0;
  }

  public init(api: VgAPI) {
    for (const subscription of this.subscriptions) {
      subscription.unsubscribe();
    }
    this.subscriptions = [];
    this.api = api;
    for (const name in this.api.subscriptions) {
      this.subscriptions.push(this.api.subscriptions[name].subscribe((event: any) => {
        if (typeof event === 'object' && event.type) {
          (this.event as EventEmitter<any>).emit({ name: event.type });
        } else {
          (this.event as EventEmitter<any>).emit({ name, value: event });
        }
      }));
      switch (name) {
        case VgEvents.VG_DURATION_CHANGE:
          (this.valueChanges as EventEmitter<any>).emit({ length: this.length });
          break;
        case VgEvents.VG_RATE_CHANGE:
          (this.valueChanges as EventEmitter<any>).emit({ rate: this.rate });
          break;
        case VgEvents.VG_TIME_UPDATE:
          (this.valueChanges as EventEmitter<any>).emit({ time: this.time });
          (this.valueChanges as EventEmitter<any>).emit({ position: this.position });
          break;
        case VgEvents.VG_VOLUME_CHANGE:
          (this.valueChanges as EventEmitter<any>).emit({ volume: this.volume });
          (this.valueChanges as EventEmitter<any>).emit({ mute: this.mute });
          break;
        default:
      }
    }
  }

  public play(url?: string) {
    if (url) {
      (this.url as EventEmitter<string>).emit(`${url}&ext=.m3u8`);
      (this.event as EventEmitter<any>).emit({ name: 'mediachanged' });
    } else {
      this.api.play();
    }
  }

  public pause() {
    this.api.pause();
  }

  public togglePause() {
    if (this.api.state === VgEvents.VG_PLAYING) {
      this.api.pause();
    } else {
      this.api.play();
    }
  }

  public toggleMute() {
    this.mute = !this.mute;
  }

  public stop() {
    this.pause();
    (this.url as EventEmitter<string>).emit('');
    (this.event as EventEmitter<any>).emit({ name: 'stopped' });
  }

  public suspend() {
    this.stop();
  }
}
