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
import { Observable, Subscription } from 'rxjs';

@Injectable()
export class MpvService {
  public readonly event: Observable<any> = new EventEmitter();
  public readonly valueChanges: Observable<any> = new EventEmitter();
  protected path: string = '';
  protected _state: string = 'stopped';
  protected _length: number = 0;
  protected _time: number = 0;
  protected _position: number = 0;
  protected _volume: number = 0;
  protected _mute: boolean = false;
  protected _rate: number = 1;
  protected _audioTrack: number = 0;
  protected _audioTrackCount: number = 0;
  protected _videoTrack: number = 0;
  protected _videoTrackCount: number = 0;
  protected _subtitlesTrack: number = 0;
  protected _subtitlesCount: number = 0;
  protected _deinterlace: string = 'auto';
  protected _aspectRatio: string = '16:9';
  protected _audioChannel: number = 0;
  protected _audioDelay: number = 0;
  protected screen: any;
  protected options: any = {};
  protected observers: { [name: string]: (data: any) => void } = {};
  protected subscriptions: Subscription[] = [];
  protected volumeNotifier: Subscription = Observable.empty().subscribe();
  protected muteNotifier: Subscription = Observable.empty().subscribe();

  constructor() {
    this.observe('path', (data: any) => {
      this._length = 0;
      this.path = data.value;
      this._state = data.value ? 'loading' : 'stopped';
      (this.event as EventEmitter<any>).emit({ name: 'mediachanged', path: this.path });
      (this.event as EventEmitter<any>).emit({ name: this.state });
      if (data.value) {
        this.play();
      }
    });
    this.observe('file-format', (data: any) => {
      if (data.value === 'hls,applehttp') {
        this.property('framedrop', false);
      }
    });
    this.observe('pause', (data: any) => {
      this._state = data.value ? 'paused' : 'play';
      (this.event as EventEmitter<any>).emit({ name: this.state });
    });
    this.observe('speed', (data: any) => {
      this._rate = data.value;
      (this.valueChanges as EventEmitter<any>).emit({ rate: data.value });
    });
    this.observe('duration', (data: any) => {
      const length: number = data.value * 1000;
      if (this._length !== length) {
        this._length = length;
        (this.event as EventEmitter<any>).emit({ name: 'durationchange' });
      }
    });
    this.observe('percent-pos', (data: any) => {
      const position: number = data.value / 100;
      if (this._position !== position) {
        this._position = position;
        (this.event as EventEmitter<any>).emit({
          position,
          name: 'positionchanged',
        });
      }
      this._position = position;
    });
    this.observe('time-pos', (data: any) => {
      let time: number = data.value * 1000;
      if (time > this.length) {
        time = time % (2 ** 33 / 90);
      }
      if (this._time !== time) {
        this._time = time;
        (this.event as EventEmitter<any>).emit({
          time,
          name: 'timechanged',
        });
      }
    });
    this.observe('eof-reached', (data: any) => {
      if (data.value) {
        this._state = 'stopped';
        (this.event as EventEmitter<any>).emit({ name: 'ended' });
      }
    });
    this.observe('ao-volume', (data: any) => {
      const volume: number = data.value * 2;
      this._volume = volume;
      (this.valueChanges as EventEmitter<any>).emit({ volume });
    });
    this.observe('ao-mute', (data: any) => {
      this._mute = data.value;
      (this.valueChanges as EventEmitter<any>).emit({ mute: data.value });
    });
    this.observe('track-list/count', (data: any) => {
      this._audioTrackCount = 1;
      this._videoTrackCount = 1;
      this._subtitlesCount = 1;
      for (let i = 0; i < data.value; i += 1) {
        const name: string = `track-list/${i}/type`;
        if (!this.observers[name]) {
          this.postData('observe_property', name);
          this.observers[name] = (data: any) => {
            switch (data.value) {
              case 'audio':
                this._audioTrackCount += 1;
                (this.valueChanges as EventEmitter<any>).emit({ audioTrack: this.audioTrack || 1 });
                break;
              case 'video':
                this._videoTrackCount += 1;
                (this.valueChanges as EventEmitter<any>).emit({ videoTrack: this.videoTrack || 1 });
                break;
              case 'sub':
                this._subtitlesCount += 1;
                (this.valueChanges as EventEmitter<any>).emit({
                  subtitlesTrack: this.subtitlesTrack || 1,
                });
                break;
              default:
            }
          };
        }
      }
    });
    this.observe('vid', (data: any) => {
      this._videoTrack = data.value;
      (this.valueChanges as EventEmitter<any>).emit({ videoTrack: this.videoTrack });
    });
    this.observe('aid', (data: any) => {
      this._audioTrack = data.value;
      (this.valueChanges as EventEmitter<any>).emit({ audioTrack: this.audioTrack });
    });
    this.observe('sid', (data: any) => {
      this._subtitlesTrack = data.value;
      (this.valueChanges as EventEmitter<any>).emit({ subtitlesTrack: this.subtitlesTrack });
    });
    this.observe('deinterlace', (data: any) => {
      this._deinterlace = data.value ? 'auto' : '';
      (this.valueChanges as EventEmitter<any>).emit({ deinterlace: this.deinterlace });
    });
    this.observe('video-aspect', (data: any) => {
      if (data.value > 0) {
        const target: number = Math.round(data.value * 1000);
        let ratio: string = '';
        for (let i: number = 1; i < 10; i += 1) {
          const h = Math.round(data.value * i);
          const v = i;
          if (Math.round(h / v * 1000) === target) {
            ratio = v === 5 ? `${h * 2}:${v * 2}` : `${h}:${v}`;
            break;
          }
        }
        if (!ratio) {
          const h = Math.round(data.value * 100);
          const v = 100;
          if (Math.round(h / v * 1000) === target) {
            ratio = `${h}:${v}`;
          }
        }
        this._aspectRatio = ratio;
        (this.valueChanges as EventEmitter<any>).emit({ aspectRatio: this.aspectRatio });
      } else if (data.value === 0) {
        this._aspectRatio = '';
        (this.valueChanges as EventEmitter<any>).emit({ aspectRatio: '' });
      } else {
        this._aspectRatio = '16:9';
        (this.valueChanges as EventEmitter<any>).emit({ aspectRatio: '16:9' });
      }
    });
    this.observe('audio-delay', (data: any) => {
      this._audioDelay = data.value;
      (this.valueChanges as EventEmitter<any>).emit({ audioDelay: this.audioDelay });
    });
  }

  get playing(): boolean {
    return this._state === 'play';
  }

  get state(): string {
    return this._state;
  }

  get length(): number {
    return this._length;
  }

  set position(position: number) {
    this.property('percent-pos', position * 100);
  }
  get position(): number {
    return this._position;
  }

  set time(time: number) {
    this.property('time-pos', time / 1000);
  }

  get time(): number {
    return this._time;
  }

  set volume(volume: number) {
    let newVolume: number = volume / 2;
    if (newVolume > 100) {
      newVolume = 100;
    } else if (volume < 0) {
      newVolume = 0;
    }
    this._volume = volume;
    this.volumeNotifier.unsubscribe();
    this.volumeNotifier = Observable.timer(0, 200).takeUntil(
      this.valueChanges.filter((data: any): boolean => data.volume != null),
    ).subscribe(() => {
      this.property('ao-volume', newVolume);
    });
  }
  get volume(): number {
    return this._volume;
  }

  set mute(mute: boolean) {
    this._mute = mute;
    this.muteNotifier.unsubscribe();
    this.muteNotifier = Observable.timer(0, 200).takeUntil(
      this.valueChanges.filter((data: any): boolean => data.mute != null),
    ).subscribe(() => {
      this.property('ao-mute', mute);
    });
  }
  get mute(): boolean {
    return this._mute;
  }

  set rate(rate: number) {
    let speed: number = rate;
    if (speed > 100) {
      speed = 100;
    } else if (speed < 0.01) {
      speed = 0.01;
    }
    this.property('speed', speed);
  }
  get rate(): number {
    return this._rate;
  }

  get audioTrackCount(): number {
    return this._audioTrackCount;
  }

  set audioTrack(track: number) {
    this.property('aid', track > 0 ? track : 0);
  }
  get audioTrack(): number {
    return this._audioTrack;
  }

  set audioChannel(channel: number) {
    let option: string;
    switch (channel) {
      case 4:
        option = 'dual_mono_mode=sub';
        this._audioChannel = 4;
        break;
      case 3:
        option = 'dual_mono_mode=main';
        this._audioChannel = 3;
        break;
      case 1:
        option = 'dual_mono_mode=both';
        this._audioChannel = 1;
        break;
      case 0:
      default:
        option = 'dual_mono_mode=auto';
        this._audioChannel = 0;
    }
    this.property('ad-lavc-o', option);
    (this.valueChanges as EventEmitter<any>).emit({ audioChannel: this.audioChannel });
  }
  get audioChannel(): number {
    return this._audioChannel;
  }

  set audioDelay(delay: number) {
    this.property('audio-delay', delay);
  }
  get audioDelay(): number {
    return this._audioDelay;
  }

  get videoTrackCount(): number {
    return this._videoTrackCount;
  }

  set videoTrack(track: number) {
    this.property('vid', track > 0 ? track : 0);
  }
  get videoTrack(): number {
    return this._videoTrack;
  }

  set aspectRatio(value: string) {
    const [h, v]: string[] = value.split(':');
    if (h && v) {
      this.property('video-aspect', parseInt(h, 10) / parseInt(v, 10));
    } else if (h && !isNaN(h as any)) {
      this.property('video-aspect', parseFloat(h));
    } else {
      this.property('video-aspect', 0);
    }
  }
  get aspectRatio() {
    return this._aspectRatio;
  }

  set deinterlace(mode: string) {
    this.property('deinterlace', !!mode);
  }
  get deinterlace(): string {
    return this._deinterlace;
  }

  get subtitlesCount(): number {
    return this._subtitlesCount;
  }

  set subtitlesTrack(track: number) {
    this.property('sid', track > 0 ? track : 0);
  }
  get subtitlesTrack(): number {
    return this._subtitlesTrack;
  }

  private postData(type: string, data: any) {
    if (this.screen && this.screen.postMessage) {
      const message: any = { type, data };
      this.screen.postMessage(message);
    }
  }

  protected property(name: string, value: any) {
    if (typeof value === 'string') {
      this.options[name] = value;
      const options: string[] = [];
      for (const name in this.options) {
        options.push(`${name}=${this.options[name]}`);
      }
      options.push(`start=${this.time / 1000}`);
      this.postData('command', ['loadfile', this.path, 'replace', options.join(',')]);
    } else {
      const data: any = { name, value };
      this.postData('set_property', data);
    }
  }

  protected observe(name: string, observer: (data: any) => void) {
    this.observers[name] = observer;
  }

  public init(screen: HTMLEmbedElement) {
    this._state = 'stopped';
    this._length = 0;
    screen.addEventListener('message', (e: any) => {
      const message: any = e.data;
      if (message.type === 'ready') {
        for (const name in this.observers) {
          this.postData('observe_property', name);
        }
      } else if (message.type === 'property_change') {
        const data: any = message.data;
        const observer: (data: any) => void = this.observers[data.name];
        if (observer) {
          observer(data);
        }
      }
    });
    this.screen = screen;
  }

  public play(path?: string) {
    if (path) {
      this._audioChannel = 0;
      this.options = {
        'ad-lavc-o': 'dual_mono_mode=auto',
      };
      const options: string[] = [];
      for (const name in this.options) {
        options.push(`${name}=${this.options[name]}`);
      }
      this.postData('command', ['loadfile', path, 'replace', options.join(',')]);
    }
    this.property('pause', false);
  }
  public pause() {
    this.property('pause', true);
  }

  public togglePause() {
    if (this.playing) {
      this.pause();
    } else {
      this.play();
    }
  }

  public stop() {
    this.postData('command', ['loadfile', '']);
  }

  public toggleMute() {
    this.mute = !this.mute;
  }

  public suspend() {
    this.postData('command', ['quit']);
  }
}
