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
import { EventEmitter, Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { StorageService } from '../shared/storage.service';
import { CommentService } from './comment.service';

@Injectable()
export class CommentPlayer {
  public readonly comment: Observable<any> = new EventEmitter();
  public readonly count: Observable<number> = new EventEmitter();
  public readonly data: Observable<any[]> = new EventEmitter();
  public readonly intervals: Observable<any[]> = new EventEmitter();
  public readonly time: Observable<number> = new EventEmitter();
  public readonly valueChanges: Observable<any> = new EventEmitter();
  public readonly enabledChange: Observable<boolean> = new EventEmitter();
  public active: boolean = false;
  public rawData: any[] = [];
  protected _channel: string = '';
  protected _enabled: boolean = true;
  protected _intervals: any[] = [];
  protected _offset: Date;
  protected _threadFilter: string[];
  protected _time: number = 0;
  protected length: number = 0;
  protected pointer: number = 0;

  constructor(
    private storageService: StorageService,
    private commentService: CommentService,
  ) {
  }

  set enabled(enabled: boolean) {
    this._enabled = enabled;
    (this.enabledChange as EventEmitter<boolean>).emit(enabled);
  }
  get enabled() {
    return this._enabled;
  }

  set channel(channel: string) {
    this.init(this._offset, this.length, channel);
  }
  get channel() {
    return this._channel;
  }

  set threadFilter(threads: string[]) {
    this._threadFilter = threads;
    this.commit();
  }
  get threadFilter(): string[] {
    return this._threadFilter || [];
  }

  set duration(duration: number) {
    this.saveValue('duration', duration);
  }
  get duration(): number {
    return Math.abs(this.loadValue('duration')) || 5000;
  }

  set delay(delay: number) {
    this.saveValue('delay', delay);
  }
  get delay(): number {
    const delay: number = this.loadValue('delay');
    return delay != null ? delay : 0;
  }

  set maxItems(maxItems: number) {
    this.saveValue('maxItems', maxItems);
  }
  get maxItems(): number {
    return this.loadValue('maxItems') || 50;
  }

  set maxLines(maxLines: number) {
    this.saveValue('maxLines', maxLines);
  }
  get maxLines(): number {
    return this.loadValue('maxLines') || 10;
  }

  set offset(offset: Date) {
    this._offset = offset;
  }

  get offset(): Date {
    if (this._offset) {
      return new Date(this._offset.getTime() - this.delay);
    }
    return new Date('');
  }

  protected saveValue(key: string, value: any) {
    const values: any = this.storageService.loadLocalStorage('comment') || {};
    values[key] = value;
    (this.valueChanges as EventEmitter<any>).emit(values);
    this.storageService.saveLocalStorage('comment', values);
  }

  protected loadValue(key: string) {
    const values: any = this.storageService.loadLocalStorage('comment') || {};
    return values[key];
  }

  public init(
    offset: Date = this._offset,
    length: number = this.length,
    channel: string = this.channel,
  ) {
    this.active = false;
    this.rawData = [];
    this._intervals = [];
    this.commentService.request('GET', 'intervals', {
      params: new HttpParams()
        .set('channel', this.commentService.loadQuery(channel))
        .set('start', String(Math.floor((offset.getTime() + this.delay) / 60000 - 1) * 60000))
        .set('end', String(Math.ceil((offset.getTime() + this.delay + length) / 60000) * 60000))
        .set('interval', '1m')
        .set('fill', '1'),
    }).subscribe(
      (response: any) => {
        this._channel = channel;
        this._offset = offset;
        this.length = length;
        this._intervals = response.intervals.map((a: any): any => Object.assign({}, a, {
          isLoaded: false,
        }));
        (this.intervals as EventEmitter<any[]>).emit(response.intervals);
        (this.count as EventEmitter<number>).emit(response.n_hits);
        this.commit();
        this.active = true;
        this.seek(this._time);
      },
      () => {
        this._channel = channel;
        this._offset = offset;
        this.length = length;
        (this.intervals as EventEmitter<any[]>).emit([]);
        this.commit();
        this.active = !!this._offset && !!this.length;
      },
    );
  }

  public seek(time: number) {
    if (this.active) {
      let start: number = this._time + this.offset.getTime();
      const end: number = time + this.offset.getTime();
      if (time < this._time) {
        this.pointer = 0;
      } else if (time - this._time > this.duration) {
        start -= this.duration;
      }
      while (this.pointer < this.rawData.length) {
        const comment: any = this.rawData[this.pointer];
        if (comment.time >= end) {
          break;
        }
        if (
          comment.time >= start &&
          (
            this.threadFilter.length === 0 ||
            this.threadFilter.indexOf(comment.title) >= 0
          )
        ) {
          (this.comment as EventEmitter<any>).emit(comment);
        }
        this.pointer += 1;
      }
      this.load(time);
    }
    this._time = time;
    (this.time as EventEmitter<number>).emit(time);
  }

  public load(time: number) {
    const start: number = time + this.offset.getTime() - 60000;
    const end: number = time + this.offset.getTime() + 30000;
    const requestTargets: any[] = this._intervals.filter((a: any): boolean => (
      !a.isLoaded &&
      a.n_hits > 0 &&
      a.start > start &&
      a.start < end
    ));
    if (requestTargets.length > 0) {
      for (const target of requestTargets) {
        target.isLoaded = true;
      }
      this.commentService.request('GET', 'comments', {
        params: new HttpParams()
          .set('channel', this.commentService.loadQuery(this.channel))
          .set('start', String(requestTargets[0].start))
          .set('end', String(requestTargets[requestTargets.length - 1].start + 60000)),
      }).subscribe((response: any) => {
        if (response.n_hits > 0) {
          this.rawData.push(...response.comments);
          this.rawData.sort((a: any, b: any): number => a.time - b.time);
          this.commit();
        }
      });
    }
    this.pointer = 0;
  }

  protected commit() {
    (this.data as EventEmitter<any[]>).emit(this.rawData.filter((a: any): boolean => (
      this.threadFilter.length === 0 ||
      this.threadFilter.indexOf(a.title) >= 0
    )));
  }
}
