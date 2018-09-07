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
import { Inject, Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { ToastsManager } from 'ng2-toastr/ng2-toastr';
import { Observable } from 'rxjs';

import { ChinachuService } from '../shared/chinachu.service';
import { GaraponService } from '../shared/garapon.service';
import { GaraponSiteService } from '../shared/garapon-site.service';
import { ImageLoader } from '../shared/image-loader.service';
import { StorageService } from '../shared/storage.service';
import { CommentService } from '../comment/comment.service';

export interface SearchOptions {
  view?: number;
  page?: number;
  keyword?: string;
  type?: string;
  channel?: string;
  category?: number;
  start?: number;
  end?: number;
  reverse?: boolean;
  [key: string]: any;
}

@Injectable()
export class ProgramsService {
  public backendType: string;
  public url: string;
  public user: string;
  public password: string;
  public archiveEnabled: boolean = true;
  public useArchive: boolean = true;
  public previewParams: string;
  public previewPos: number = 70;
  public streamType: string = 'm2ts';
  public streamParams: string;
  protected commentReady: boolean = false;
  protected requests: {
    [key: string]: Observable<any>;
  } = {};

  constructor(
    @Inject('categoryTable') private categoryTable: any[],
    private toastsManager: ToastsManager,
    public chinachuService: ChinachuService,
    public commentService: CommentService,
    public garaponService: GaraponService,
    public garaponSiteService: GaraponSiteService,
    public imageLoader: ImageLoader,
    public storageService: StorageService,
  ) { }

  get isReady(): boolean {
    return Object.keys(this.requests).length > 0;
  }

  get channels(): Observable<any[]> {
    switch (this.backendType) {
      case 'chinachu':
        if (this.useArchive) {
          return this.requests.archiveChannels.map(
            (response: any): any => response.map((a: any): any => ({
              channel: String(a.serviceId),
              channelName: a.name,
              type: a.type,
            })),
          ).catch((): Observable<any> => (
            this.requests.recordedChannels
          ));
        }
        return this.requests.recordedChannels;
      case 'garapon':
        return this.requests.channels;
      case 'garaponv4':
        return this.requests.channels;
      default:
    }
    return Observable.of([]);
  }

  get startTime(): Observable<number> {
    return this.requests.start || Observable.of(Date.now());
  }

  get endTime(): Observable<number> {
    return this.requests.end || Observable.of(Date.now());
  }

  public init() {
    const moritapoUser: string = String(this.storageService.loadLocalStorage('moritapoEmail') || '');
    const moritapoPassword: string = String(this.storageService.loadLocalStorage('moritapoPassword') || '');
    let auth: boolean;
    let url: string;
    let apiVersion: number;
    let user: string;
    let password: string;
    let backendInit: Observable<any>;
    this.clearRequests();
    switch (this.storageService.loadLocalStorage('backendType')) {
      case 'garapon':
        this.archiveEnabled = false;
        auth = this.storageService.loadLocalStorage('garaponAuth');
        url = auth ? null : String(this.storageService.loadLocalStorage('garaponUrl') || '');
        apiVersion = auth ? null : this.storageService.loadLocalStorage('garaponApiVersion') || 3;
        user = String(this.storageService.loadLocalStorage('garaponUser') || '');
        password = String(this.storageService.loadLocalStorage('garaponPassword') || '');
        backendInit = this.initGarapon(user, password, url, apiVersion);
        break;
      case 'garaponv4':
        this.archiveEnabled = false;
        user = String(this.storageService.loadLocalStorage('garaponUser') || '');
        password = String(this.storageService.loadLocalStorage('garaponPassword') || '');
        backendInit = this.initGaraponV4(user, password);
        break;
      case 'chinachu':
      default:
        url = String(this.storageService.loadLocalStorage('chinachuUrl') || '');
        user = String(this.storageService.loadLocalStorage('chinachuUser') || '');
        password = String(this.storageService.loadLocalStorage('chinachuPassword') || '');
        backendInit = this.initChinachu(url, user, password).do((result: any[]) => {
          this.archiveEnabled = result[1] != null;
        });
    }
    return this.initComment(moritapoUser, moritapoPassword).catch(
      (error: any): Observable<null> => {
        this.toastsManager.warning(error.message, 'Comment API error', {
          toastLife: 10000,
          dismiss: 'click',
          newestOnTop: true,
          positionClass: 'toast-bottom-right',
        });
        return Observable.of(null);
      },
    ).mergeMap((): Observable<any> => backendInit).catch(
      (error: any): Observable<any> => {
        this.toastsManager.error(error.message, 'Backend error', {
          dismiss: 'click',
          newestOnTop: true,
          positionClass: 'toast-bottom-right',
        });
        return Observable.throw(error);
      },
    );
  }

  public initChinachu(url: string, user?: string, password?: string): Observable<any> {
    this.backendType = 'chinachu';
    this.chinachuService.url = url;
    this.chinachuService.user = user;
    this.chinachuService.password = password;

    this.requests.recorded = this.chinachuService.request('GET', '/api/recorded.json').map(
      (response: any[]): any[] => {
        response.sort((a: any, b: any): number => a.start - b.start);
        return response;
      },
    ).publishLast().refCount();
    this.requests.archive = this.chinachuService.request('GET', '/archive.json').map(
      (response: any): any => {
        response.programs.sort((a: any, b: any): number => a.startAt - b.startAt);
        return response;
      },
    ).publishLast().refCount();
    this.requests.start = this.requests.recorded.map(
      (response: any): number => Math.min.apply(
        null,
        response.map((a: any): number => a.start),
      ),
    ).publishLast().refCount();
    this.requests.end = this.requests.recorded.map(
      (response: any): number => Math.max.apply(
        null,
        response.map((a: any): number => a.end),
      ),
    ).publishLast().refCount();
    this.requests.archiveChannels = Observable.zip(
      this.requests.recorded,
      this.requests.archive,
    ).map(
      (responses: any[]): any[] => {
        const [recorded, archive]: any[] = responses;
        const result: any[] = [];
        if (archive) {
          for (const channel of archive.channels) {
            for (const service of channel.services) {
              if (recorded.some((program: any): boolean => (
                program.channel.type === channel.type &&
                program.channel.channel === channel.channel &&
                program.channel.sid === service.serviceId
              ))) {
                result.push(Object.assign(
                  {
                    type: channel.type,
                    channel: String(channel.channel),
                  },
                  service,
                ));
              }
            }
          }
        }
        const types: string[] = ['GR', 'BS', 'CS', 'SKY'];
        result.sort((a, b): number => {
          if (a.type === b.type) {
            return parseInt(a.serviceId, 10) - parseInt(b.serviceId, 10);
          }
          return types.indexOf(a.type) - types.indexOf(b.type);
        });
        return result;
      },
    ).publishLast().refCount();
    this.requests.recordedChannels = this.requests.recorded.map((response: any): any => {
      const result: any[] = [];
      for (const program of response) {
        const channel: any = result.find((a: any): boolean => (
          a.channel === String(program.channel.sid) &&
          a.channelName === program.channel.name &&
          a.type === program.channel.type
        ));
        if (channel) {
          channel.channelName = program.channel.name;
        } else {
          result.push({
            channel: String(program.channel.sid),
            channelName: program.channel.name,
            type: program.channel.type,
          });
        }
      }
      const types: string[] = ['GR', 'BS', 'CS', 'SKY'];
      result.sort((a, b): number => {
        if (a.type === b.type) {
          return parseInt(a.channel, 10) - parseInt(b.channel, 10);
        }
        return types.indexOf(a.type) - types.indexOf(b.type);
      });
      return result;
    }).publishLast().refCount();
    this.requests.programs = Observable.zip(
      this.requests.archive,
      this.requests.archiveChannels,
      this.requests.start,
      this.requests.end,
    ).map((results: [any, any, number, number]): any[] => {
      const [archive, channels, start, end]: [any, any, number, number] = results;
      const programs: any = archive.programs.filter((a: any): boolean => (
        typeof a.name === 'string' &&
        typeof a.description === 'string' &&
        Array.isArray(a.genres) &&
        a.startAt < end &&
        a.startAt + a.duration > start
      )).map((program: any): any => Object.assign({}, program, {
        channel: channels.find((channel: any): boolean => (
          channel.networkId === program.networkId &&
          channel.serviceId === program.serviceId
        )),
      })).filter((a: any): boolean => a.channel);
      programs.sort((a: any, b: any): Number => a.startAt - b.startAt);
      return programs;
    });
    return Observable.zip(
      this.requests.recorded,
      this.requests.archive.catch((e: any): Observable<null> => Observable.of(null)),
    );
  }

  public initGarapon(user: string, password: string, url?: string, apiVersion?: number): Observable<any> {
    let login: Observable<any>;
    this.backendType = 'garapon';
    this.garaponService.user = user;
    this.garaponService.password = password;
    if (url) {
      this.garaponService.url = url;
      this.garaponService.apiVersion = apiVersion;
      login = this.garaponService.login();
    } else {
      login = this.garaponService.loadBackend().mergeMap(
        (): Observable<any> => this.garaponService.login(),
      );
    }
    return login.do(() => {
      this.requests.channels = this.garaponService.request('POST', 'channel').map(
        (response: any): any => {
          if (
            response.status === 1 &&
            response.ch_list != null &&
            typeof response.ch_list === 'object'
          ) {
            const channels: any[] = [];
            for (const key in response.ch_list) {
              channels.push({
                channel: String(key),
                channelName: response.ch_list[key].ch_name,
                type: '1S',
              });
            }
            return channels;
          }
          throw new Error(`Status code: ${response.status}`);
        },
      ).publishLast().refCount();
      this.requests.start = this.garaponService.request('POST', 'search', {
        body: new HttpParams()
          .set('n', '1')
          .set('p', '1')
          .set('sort', 'sta')
          .toString(),
      }).map((response: any): any => {
        if (response.status === 1) {
          return new Date(response.program[0].startdate).getTime();
        }
        throw new Error(`Status code: ${response.status}`);
      }).publishLast().refCount();
      this.requests.end = this.garaponService.request('POST', 'search', {
        body: new HttpParams()
          .set('n', '1')
          .set('p', '1')
          .set('sort', 'std')
          .toString(),
      }).map((response: any): any => {
        if (response.status === 1) {
          const start: number = new Date(response.program[0].startdate).getTime();
          const duration: number = GaraponService.convertDuration(response.program[0].duration);
          return start + duration;
        }
        throw new Error(`Status code: ${response.status}`);
      }).publishLast().refCount();
    }).publishLast().refCount();
  }

  public initGaraponV4(user: string, password: string): Observable<any> {
    this.backendType = 'garaponv4';
    this.garaponService.user = user;
    this.garaponService.password = password;
    this.garaponSiteService.user = user;
    this.garaponSiteService.password = password;
    return this.garaponSiteService.login().mergeMap((response: any): Observable<any> => {
      if (response.status === 'success') {
        this.garaponService.apiVersion = 4;
        this.garaponService.url = `https://${response.gtvinfo.access_ip}`;
        if (response.gtvinfo.is_global_access === 1) {
          return this.garaponService.loginV4();
        }
        return Observable.of(response);
      }
      throw new Error(`Status code: ${response.status}`);
    }).do(() => {
      this.requests.tsids = this.garaponService.request('POST', 'Tuner/', {
        body: new HttpParams().set('action', 'getrecch').toString(),
      }).map((response: any): any => {
        if (response.status === 1) {
          return response.data.map((a: any): string => a.tsid10);
        }
        throw new Error(response.status);
      }).publishLast().refCount();
      this.requests.time = this.garaponService.request('POST', 'Tuner/', {
        body: new HttpParams().set('action', 'getrecdate').toString(),
      }).map((response: any): any => {
        if (response.status === 1) {
          return response.data;
        }
        throw new Error(response.status);
      }).publishLast().refCount();
      this.requests.start = this.requests.time.map((result): number => {
        const date: Date = new Date(result[0]);
        date.setHours(0);
        return date.getTime();
      }).publishLast().refCount();
      this.requests.end = this.requests.time.map((result): number => {
        const date: Date = new Date(result[result.length - 1]);
        date.setHours(24);
        return date.getTime() - 1;
      }).publishLast().refCount();
      this.requests.channels = this.garaponService.request('POST', 'Tuner/', {
        body: new HttpParams()
          .set('action', 'getrecch')
          .toString(),
      }).mergeMap((response: any): Observable<any> => {
        if (
          response.status === 1 &&
          Array.isArray(response.data)
        ) {
          const requests: Observable<any>[] = [];
          for (const channel of response.data) {
            requests.push(this.search({
              view: 100,
              page: 1,
              channel: String(channel.tsid10),
              reverse: true,
            }));
          }
          return Observable.zip(...requests);
        }
        return Observable.throw(new Error(response.status));
      }).map((results: any[]): any => {
        const channels: any[] = [];
        for (const result of results) {
          if (
            result.hits > 0 &&
            Array.isArray(result.programs) &&
            result.programs.length > 0
          ) {
            for (const program of result.programs) {
              if (!channels.some((a: any): boolean => (
                a.type === program.type &&
                a.channel === program.channel
              ))) {
                channels.push({
                  channel: program.channel,
                  channelName: program.channelName,
                  type: program.type,
                });
              }
            }
          }
        }
        channels.sort((a: any, b: any): number => {
          const diff: number = a.channel - b.channel || 0;
          if (a.type < b.type) {
            return diff * 10 - 1;
          }
          if (a.type > b.type) {
            return diff * 10 + 1;
          }
          return diff;
        });
        return channels;
      }).publishLast().refCount();
    });
  }

  public initComment(user: string, password: string) {
    return this.commentService.requestToken(user, password).catch((error: any): Observable<any> => {
      this.commentService.deleteToken();
      return Observable.throw(error);
    });
  }

  public search(options: SearchOptions = {}, useArchive: boolean = this.useArchive) {
    switch (this.backendType) {
      case 'chinachu':
        return this.searchChinachu(options, useArchive);
      case 'garapon':
        return this.searchGarapon(options);
      case 'garaponv4':
        return this.searchGaraponV4(options);
      default:
    }
  }

  protected searchChinachu(
    options: SearchOptions,
    useArchive: boolean = this.useArchive,
  ): Observable<any> {
    return Observable.zip(
      this.requests.recorded,
      this.requests.programs.catch((a: any): Observable<any> => Observable.of(null)),
    ).map((result: any[]): any => {
      const [recorded, archive]: any[] = result;
      const page: number = options.page || 1;
      const view: number = options.view || 100;
      if (useArchive && archive) {
        const programs: any[] = archive.filter((program: any): boolean => (
          (
            options.type == null ||
            String(program.channel.type) === String(options.type)
          ) && (
            options.channel == null ||
            String(program.channel.serviceId) === String(options.channel)
          ) && (
            isNaN(options.end) ||
            program.startAt < options.end
          ) && (
            isNaN(options.start) ||
            program.startAt + program.duration > options.start
          ) && (
            options.category == null ||
            this.chinachuService.convertCategory(
              Array.isArray(program.genres) ? program.genres[0].lv1 : 15,
            ).code === this.chinachuService.convertCategory(options.category).code
          ) && (
            options.keyword == null ||
            program.name.indexOf(options.keyword) >= 0 ||
            program.description.indexOf(options.keyword) >= 0
          )
        ));
        if (options.reverse != null && options.reverse) {
          programs.reverse();
        }
        return {
          programs: programs.slice(
            (page - 1) * view,
            page * view,
          ).map(this.getChinachuArchiveConverter(recorded)),
          hits: programs.length,
        };
      }
      const programs: any[] = recorded.filter((a: any): boolean => (
        (
          options.keyword == null ||
          a.fullTitle.indexOf(options.keyword) >= 0 ||
          a.detail.indexOf(options.keyword) >= 0
        ) && (
          options.type == null ||
          a.channel.type === options.type
        ) && (
          options.channel == null ||
          String(a.channel.sid) === String(options.channel)
        ) && (
          options.category == null ||
          this.chinachuService.convertCategory(a.category).code ===
          this.chinachuService.convertCategory(options.category).code
        ) && (
          isNaN(options.start) ||
          a.end > options.start
        ) && (
          isNaN(options.end) ||
          a.start < options.end
        ) && (
          options.keyword == null ||
          a.fullTitle.indexOf(options.keyword) >= 0 ||
          a.detail.indexOf(options.keyword) >= 0
        )
      ));
      if (options.reverse != null && options.reverse) {
        programs.reverse();
      }
      return {
        hits: programs.length,
        programs: programs.slice(
          (page - 1) * view,
          page * view,
        ).map(this.getChinachuRecordedConverter()),
      };
    });
  }

  protected searchGarapon(options: SearchOptions) {
    let params: HttpParams = new HttpParams()
      .set('n', (options.view || 100).toString())
      .set('p', (options.page || 1).toString())
      .set('s', 'e')
      .set('sort', options.reverse != null && options.reverse ? 'std' : 'sta');
    if (options.keyword) {
      params = params.set('key', options.keyword);
    }
    if (options.channel) {
      params = params.set('ch', options.channel);
    }
    if (!isNaN(options.category)) {
      params = params.set('genre0', String(options.category));
    } else if (options.category) {
      const category: any = this.categoryTable.find((a: any): boolean => (
        a.codeName === options.category || a.name === options.category
      ));
      if (category) {
        params = params.set('genre0', String(category.code));
      } else {
        params = params.set('genre0', '15');
      }
    }
    if (options.start) {
      params = params.set('sdate', GaraponService.timeToTimestamp(options.start));
    }
    if (options.end) {
      params = params.set('edate', GaraponService.timeToTimestamp(options.end));
    }
    return this.garaponService.request('POST', 'search', {
      body: params.toString(),
    }).map((result: any) => ({
      hits: result.hit,
      programs: result.program.map(this.getGaraponConverter()),
    }));
  }

  protected searchGaraponV4(options: SearchOptions): Observable<any> {
    return Observable.zip(
      this.requests.tsids,
      this.requests.start.catch((): Observable<null> => Observable.of(null)),
      this.requests.end.catch((): Observable<null> => Observable.of(null)),
    ).mergeMap((result: any[]): Observable<any> => {
      const [tsids, start, end]: any[] = result;
      let params: HttpParams = new HttpParams()
        .set('sort', options.reverse != null && options.reverse ? 'std' : 'sta')
        .set('num', (options.view || 100).toString())
        .set('page', (options.page || 1).toString());
      if (options.keyword) {
        params = params.set('keyword', options.keyword);
      }
      if (options.channel) {
        params = params.set('tsids', options.channel);
      } else {
        params = params.set('tsids', tsids.join(','));
      }
      if (options.type) {
        params = params.set('service_type', options.type.match('^([0-9]+).*')[1] || '');
      }
      if (!isNaN(options.category)) {
        params = params.set('genre1_no', String(options.category));
      } else if (options.category) {
        const category: any = this.categoryTable.find((a: any): boolean => (
          a.codeName === options.category || a.name === options.category
        ));
        if (category) {
          params = params.set('genre1_no', String(category.code));
        } else {
          params = params.set('genre1_no', '15');
        }
      }
      if (typeof options.start === 'number') {
        params = params.set('starttime', (options.start / 1000).toString(10));
      } else if (start) {
        params = params.set('starttime', (start / 1000).toString(10));
      }
      if (typeof options.end === 'number') {
        params = params.set('endtime', (options.end / 1000).toString(10));
      } else if (end) {
        params = params.set('endtime', (end / 1000).toString(10));
      }
      return this.garaponSiteService.request('POST', 'Program/Search/search', {
        body: params.toString(),
      });
    }).map((result: any): any => {
      if (result.status === 'success') {
        return {
          hits: result.hit,
          programs: result.programs.map(this.getGaraponV4Converter()),
        };
      }
      throw new Error(result.status);
    });
  }

  protected getChinachuArchiveConverter(recorded: any[] = []): (program: any) => any {
    return (program: any): any => {
      let category: number;
      if (Array.isArray(program.genres)) {
        category = program.genres[0].lv1;
      }
      const recordedProgram: any = recorded.find((a: any): boolean => (
        a.channel.type === program.channel.type &&
        a.channel.sid === program.channel.serviceId &&
        a.start < program.startAt + program.duration &&
        a.end > program.startAt
      ));
      let previewPos: number = this.previewPos;
      let preview: Observable<String>;
      let stream: any;
      if (recordedProgram) {
        previewPos += Math.floor((program.startAt - recordedProgram.start) / 1000);
        while (recordedProgram.seconds < previewPos) {
          previewPos = -30;
        }
        preview = this.chinachuService.isRecorded(recordedProgram.id).mergeMap(
          (isRecorded: boolean): Observable<string> => {
            if (isRecorded) {
              return this.imageLoader.load(
                this.chinachuService.getUrl([
                  `/api/recorded/${recordedProgram.id}/preview.png?pos=${previewPos}`,
                  this.previewParams,
                ].filter(a => a != null).join('&')),
              );
            }
            return Observable.throw(null);
          },
        );
        stream = this.chinachuService.getUrl([
          `/api/recorded/${recordedProgram.id}/watch.${this.streamType}`,
          this.streamParams,
        ].filter(a => a != null).join('?'));
      }
      const intervals: Observable<any> = this.commentService.request('GET', 'intervals', {
        params: new HttpParams()
          .set('channel', this.commentService.loadQuery(program.channel.name))
          .set('start', String(program.startAt))
          .set('end', String(program.startAt + program.duration))
          .set('interval', '1m'),
      }).publishLast().refCount();
      const commentCount: Observable<number> = intervals.map((result: any): number => (
        result.n_hits
      )).publishLast().refCount();
      const minutes: number = program.duration / 60000;
      const commentSpeed: Observable<number> = commentCount.map((count: number): number => (
        count / minutes
      ));
      const commentMaxSpeed: Observable<number> = intervals.map((result: any): number => (
        Math.max.apply(null, result.intervals.map((a: any): number => a.n_hits))
      ));
      return {
        commentCount,
        commentSpeed,
        commentMaxSpeed,
        preview,
        stream,
        id: program.id,
        type: program.channel.type,
        channel: String(program.channel.serviceId),
        channelName: program.channel.name,
        title: program.name,
        fullTitle: program.name,
        detail: program.description,
        category: this.chinachuService.convertCategory(category),
        duration: program.duration,
        start: new Date(program.startAt),
        end: new Date(program.startAt + program.duration),
        isRecorded: Observable.of(recordedProgram != null),
        recordedDuration: Observable.of(program.duration),
      };
    };
  }

  protected getChinachuRecordedConverter(): (program: any) => any {
    return (program: any): any => {
      const intervals: Observable<any> = this.commentService.request('GET', 'intervals', {
        params: new HttpParams()
          .set('channel', this.commentService.loadQuery(program.channel.name))
          .set('start', String(program.start))
          .set('end', String(program.end))
          .set('interval', '1m'),
      }).publishLast().refCount();
      const commentCount: Observable<number> = intervals.map((result: any): number => (
        result.n_hits
      )).publishLast().refCount();
      const minutes: number = program.seconds / 60;
      const commentSpeed: Observable<number> = commentCount.map((count: number): number => (
        count / minutes
      ));
      const commentMaxSpeed: Observable<number> = intervals.map((result: any): number => (
        Math.max.apply(null, result.intervals.map((a: any): number => a.n_hits))
      ));
      return {
        commentCount,
        commentSpeed,
        commentMaxSpeed,
        id: program.id,
        type: program.channel.type,
        channel: String(program.channel.sid),
        channelName: program.channel.name,
        title: program.title,
        fullTitle: program.fullTitle,
        detail: program.detail || '',
        category: this.chinachuService.convertCategory(program.category),
        duration: program.seconds * 1000,
        start: new Date(program.start),
        end: new Date(program.end),
        preview: this.chinachuService.isRecorded(program.id).mergeMap(
          (isRecorded: boolean): Observable<string> => {
            if (isRecorded) {
              return this.imageLoader.load(this.chinachuService.getUrl([
                `/api/recorded/${program.id}/preview.png?pos=${this.previewPos}`,
                this.previewParams,
              ].filter(a => a != null).join('&')));
            }
            return Observable.throw(null);
          },
        ),
        stream: this.chinachuService.getUrl([
          `/api/recorded/${program.id}/watch.${this.streamType}`,
          this.streamParams,
        ].filter(a => a != null).join('?')),
        isRecorded: this.chinachuService.isRecorded(program.id),
        recordedDuration: this.chinachuService.getRecordedDuration(program.id).catch(
          () => Observable.of(program.seconds * 1000),
        ),
      };
    };
  }

  protected getGaraponConverter(): (program: any) => any {
    return (program: any): any => {
      const duration: number = GaraponService.convertDuration(program.duration);
      const start: Date = new Date(program.startdate);
      const end: Date = new Date(start.getTime() + duration);
      const intervals: Observable<any> = this.commentService.request('GET', 'intervals', {
        params: new HttpParams()
          .set('channel', this.commentService.loadQuery(program.bc))
          .set('start', String(start.getTime()))
          .set('end', String(end.getTime()))
          .set('interval', '1m'),
      }).publishLast().refCount();
      const commentCount: Observable<number> = intervals.map((result: any): number => (
        result.n_hits
      )).publishLast().refCount();
      const minutes: number = duration / 60000;
      const commentSpeed: Observable<number> = commentCount.map((count: number): number => (
        count / minutes
      ));
      const commentMaxSpeed: Observable<number> = intervals.map((result: any): number => (
        Math.max.apply(null, result.intervals.map((a: any): number => a.n_hits))
      ));
      return {
        duration,
        start,
        end,
        commentCount,
        commentSpeed,
        commentMaxSpeed,
        id: program.gtvid,
        type: program.gtvid.slice(0, 2),
        channel: String(program.ch),
        channelName: program.bc,
        title: program.title,
        fullTitle: program.title,
        detail: program.description,
        category: this.garaponService.convertCategory(program.genre[0]),
        preview: this.imageLoader.load(this.garaponService.getPreviewUrl(program.gtvid)),
        stream: this.garaponService.getStreamUrl(program.gtvid),
        isRecorded: Observable.of(true),
        recordedDuration: Observable.of(duration),
      };
    };
  }

  protected getGaraponV4Converter(): (program: any) => any {
    return (program: any): any => {
      const isRecorded: Observable<boolean> = this.garaponService.request('POST', 'Program/', {
        body: new HttpParams()
          .set('action', 'check')
          .set('starttime', program.starttime)
          .set('endtime', program.endtime)
          .set('tsid10', program.tsid10)
          .set('service_type', program.service_type)
          .toString(),
      });
      const intervals: Observable<any> = this.commentService.request('GET', 'intervals', {
        params: new HttpParams()
          .set('channel', this.commentService.loadQuery(program.bcname))
          .set('start', String(program.starttime * 1000))
          .set('end', String(program.endtime * 1000))
          .set('interval', '1m'),
      }).publishLast().refCount();
      const commentCount: Observable<number> = intervals.map((result: any): number => (
        result.n_hits
      )).publishLast().refCount();
      const minutes: number = program.durationtime / 60;
      const commentSpeed: Observable<number> = commentCount.map((count: number): number => (
        count / minutes
      ));
      const commentMaxSpeed: Observable<number> = intervals.map((result: any): number => (
        Math.max.apply(null, result.intervals.map((a: any): number => a.n_hits))
      ));
      return {
        isRecorded,
        commentCount,
        commentSpeed,
        commentMaxSpeed,
        id: program.gtvid,
        type: program.gtvid.slice(0, 2),
        channel: String(program.tsid10),
        channelName: program.bcname,
        title: program.series_title || program.title,
        fullTitle: program.title,
        detail: program.description,
        category: this.garaponSiteService.convertCategory(program.genre[0]),
        duration: program.durationtime * 1000,
        start: new Date(program.starttime * 1000),
        end: new Date(program.endtime * 1000),
        preview: Observable.of(program.thumbnail_url),
        stream: this.garaponService.getV4Url(program.m3u8_url),
        recordedDuration: Observable.of(program.durationtime * 1000),
      };
    };
  }

  public clearRequests() {
    for (const key in this.requests) {
      delete this.requests[key];
    }
  }

  public stopImageLoader() {
    this.imageLoader.clearRequests();
  }
}
