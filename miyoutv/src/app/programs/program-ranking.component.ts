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
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewContainerRef,
  ViewChild,
} from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastsManager } from 'ng2-toastr/ng2-toastr';
import { BsDatepickerConfig, BsLocaleService } from 'ngx-bootstrap/datepicker';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { Observable, Subscription } from 'rxjs';

import { CommentService } from '../comment/comment.service';
import { StorageService } from '../shared/storage.service';
import { ProgramsService } from './programs.service';
import { LoadingBarService } from '@ngx-loading-bar/core';

@Component({
  selector: 'program-ranking',
  templateUrl: 'program-ranking.component.html',
})
export class ProgramRankingComponent implements OnInit, OnDestroy {
  @ViewChild('viewport') viewport: ElementRef;
  @ViewChild('confirm') confirmTemplateRef: TemplateRef<any>;
  protected hasModal: boolean = false;
  public form: FormGroup;
  public modalRef: BsModalRef;
  public dpConfig: Partial<BsDatepickerConfig> = {
    containerClass: 'theme-default',
    dateInputFormat: 'yyyy/MM/dd',
    showWeekNumbers: false,
  };
  public hotkeys: any[] = [{
    up: (): boolean => {
      if (
        document.elementFromPoint(0, 0).className !== 'cfp-hotkeys' &&
        this.viewport.nativeElement.contains(document.activeElement)
      ) {
        const focusable: NodeList = this.viewport.nativeElement.querySelectorAll((
          '[tabindex]:not([tabindex^="-"])'
        ));
        for (let i = 0; i < focusable.length; i += 1) {
          if (focusable[i] === document.activeElement) {
            let index = i - 1;
            if (index <= 0) {
              index = focusable.length - 1;
            }
            (focusable[index] as HTMLElement).focus();
            return false;
          }
        }
      }
      return true;
    },
  }, {
    down: (): boolean => {
      if (
        document.elementFromPoint(0, 0).className !== 'cfp-hotkeys' &&
        this.viewport.nativeElement.contains(document.activeElement)
      ) {
        const focusable: NodeList = this.viewport.nativeElement.querySelectorAll((
          '[tabindex]:not([tabindex^="-"])'
        ));
        for (let i = 0; i < focusable.length; i += 1) {
          if (focusable[i] === document.activeElement) {
            let index = i + 1;
            if (index >= focusable.length) {
              index = 0;
            }
            (focusable[index] as HTMLElement).focus();
            return false;
          }
        }
      }
      return true;
    },
  }];
  public active: boolean = false;
  public type: string;
  public channel: string;
  public start: Date;
  public end: Date;
  public unique: boolean = true;
  public view: number = 25;
  public archiveEnabled: boolean = false;
  public previewEnabled: boolean = true;
  public hourFirst: number = 4;
  public hourFormat: string = '';
  public minDate: Date;
  public maxDate: Date;
  public channels: any[] = [];
  public types: string[] = [];
  public channelName: string;
  public data: any[] = [];
  public selectedItem: any;
  protected loader: Subscription;
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private formBuilder: FormBuilder,
    private viewContainerRef: ViewContainerRef,
    private loadingBarService: LoadingBarService,
    private toastsManager: ToastsManager,
    private localeService: BsLocaleService,
    private bsModalService: BsModalService,
    private commentService: CommentService,
    private storageService: StorageService,
    private programsService: ProgramsService,
  ) { }

  public ngOnInit() {
    this.localeService.use('ja');
    this.toastsManager.setRootViewContainerRef(this.viewContainerRef);
    this.view = parseInt(this.storageService.loadLocalStorage('rankingView'), 10) || this.view;
    this.unique = this.storageService.loadLocalStorage('rankingUnique') !== 'false';
    this.programsService.previewParams = 'size=160x90';
    const refreshInterval: number = parseInt(
      this.storageService.loadLocalStorage('reloadInterval'),
      10,
    ) || 900000;

    const date: Date = new Date();
    date.setHours(this.hourFirst - 24);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    this.start = new Date(date);
    date.setHours(this.hourFirst + 24);
    this.end = new Date(date);

    this.form = this.formBuilder.group({
      source: ['archive'],
      unique: [0],
      date: [],
      target: [',,1'],
      view: [this.view],
    });
    this.subscriptions.push(
      this.form.valueChanges.subscribe((data: any) => {
        const target: string[] = (data.target ? data.target : ',').split(',');
        const [type, channel]: string[] = target;
        const days: number = !isNaN(target[2] as any) ? parseInt(target[2], 10) : 1;
        const date: Date = new Date(data.date || this.start);
        date.setHours(this.hourFirst);
        date.setMinutes(0);
        date.setSeconds(0);
        date.setMilliseconds(0);
        const start: Date = new Date(date);
        date.setDate(date.getDate() + days);
        const end: Date = new Date(date);
        date.setTime(this.start.getTime());
        date.setHours(this.hourFirst);
        if (
          start.getTime() === date.getTime() &&
          end.getTime() !== this.end.getTime()
        ) {
          date.setTime(this.maxDate.getTime());
          date.setHours(this.hourFirst);
          date.setMinutes(0);
          date.setSeconds(0);
          date.setMilliseconds(0);
          end.setTime(date.getTime());
          date.setDate(date.getDate() - days);
          start.setTime(date.getTime());
        }
        this.router.navigate([], {
          queryParams: {
            type,
            channel,
            start: [start.getFullYear(), start.getMonth() + 1, start.getDate()].join('-'),
            end: [end.getFullYear(), end.getMonth() + 1, end.getDate()].join('-'),
            src: data.source,
            uniq: data.unique ? 1 : 0,
            view: data.view,
          },
          queryParamsHandling: 'merge',
        });
        this.form.patchValue(
          { date: null },
          { emitEvent: false },
        );
      }),
      this.route.queryParams.subscribe((params: any) => {
        const source: string = (params.src || 'archive');
        const useArchive: boolean = source === 'archive';
        const type: string = params.type || '';
        const channel: string = params.channel || '';
        const unique: boolean = params.uniq != null ? params.uniq === '1' : this.unique;
        const view: number = !isNaN(params.view) ? parseInt(params.view, 10) : this.view;
        const start: Date = params.start ? new Date(params.start) : new Date(this.start);
        start.setHours(this.hourFirst);
        start.setMinutes(0);
        start.setSeconds(0);
        start.setMilliseconds(0);
        const end: Date = params.end ? new Date(params.end) : new Date(this.end);
        end.setHours(this.hourFirst);
        end.setMinutes(0);
        end.setSeconds(0);
        end.setMilliseconds(0);
        const days: number = Math.round((end.getTime() - start.getTime()) / 86400000);

        if (params.select) {
          this.selectedItem = this.data.find(
            (a: any): boolean => String(a.index) === params.select,
          );
        }
        if (this.active) {
          if (this.minDate && start.getTime() < this.minDate.getTime()) {
            start.setTime(this.minDate.getTime());
          }
          if (this.maxDate && end.getTime() > this.maxDate.getTime()
          ) {
            end.setTime(this.maxDate.getTime());
          }
          if (params.refresh) {
            this.active = false;
            this.programsService.stopImageLoader();
            this.init();
          } else if (
            this.programsService.useArchive !== useArchive ||
            this.type !== type ||
            this.channel !== channel ||
            this.start.getTime() !== start.getTime() ||
            this.end.getTime() !== end.getTime() ||
            this.unique !== unique ||
            this.view !== view
          ) {
            this.programsService.stopImageLoader();
            this.programsService.useArchive = useArchive;
            this.type = type;
            this.channel = channel;
            this.start = start;
            this.end = end;
            this.view = view;
            this.unique = unique;
            this.selectedItem = null;
            this.load();
          }
        }
        this.programsService.useArchive = useArchive;
        this.type = type;
        this.channel = channel;
        this.start = start;
        this.end = end;
        this.unique = unique;
        this.view = view;
        this.form.patchValue(
          {
            source,
            view,
            unique: unique ? 1 : 0,
            target: [type, channel, days].join(','),
          },
          { emitEvent: false },
        );
        this.router.navigate([], {
          queryParams: {
            refresh: '',
          },
          queryParamsHandling: 'merge',
        });
        this.storageService.saveLocalStorage('rankingView', view);
        this.storageService.saveLocalStorage('rankingUnique', unique);
      }),
      Observable.interval(refreshInterval).subscribe(() => {
        this.router.navigate([], {
          queryParams: {
            refresh: 1,
          },
          queryParamsHandling: 'merge',
        });
      }),
      this.bsModalService.onHide.subscribe(() => {
        this.hasModal = false;
      }),
      this.bsModalService.onShow.subscribe(() => {
        this.hasModal = true;
      }),
    );

    if (this.programsService.isReady) {
      this.setup();
    } else {
      this.init();
    }
  }

  ngOnDestroy() {
    if (this.loader) {
      this.loader.unsubscribe();
    }
    this.programsService.stopImageLoader();
    this.loadingBarService.complete();
    this.subscriptions.forEach((a: Subscription) => {
      a.unsubscribe();
    });
  }

  public init() {
    this.data = [];
    this.programsService.init().subscribe(
      () => {
        this.setup();
      },
      () => {
        this.active = true;
      },
    );
  }

  public setup() {
    this.archiveEnabled = this.programsService.archiveEnabled;
    this.previewEnabled = this.storageService.loadLocalStorage('previewEnabled') !== false;
    this.hourFirst = this.storageService.loadLocalStorage('hourFirst');
    this.hourFormat = this.storageService.loadLocalStorage('hourFormat');
    Observable.zip(
      this.programsService.channels,
      this.programsService.startTime,
      this.programsService.endTime,
    ).subscribe((results: any[]) => {
      const [channels, start, end]: any[] = results;
      this.channels = channels;
      this.types = [];
      for (const channel of channels) {
        if (
          this.types.indexOf(channel.type) < 0 &&
          !/^[0-9]S$/.test(channel.type)
        ) {
          this.types.push(channel.type);
        }
      }
      const date: Date = new Date(start);
      date.setMinutes(0);
      date.setSeconds(0);
      date.setMilliseconds(0);
      this.minDate = new Date(date);
      date.setTime(end);
      date.setMinutes(0);
      date.setSeconds(0);
      date.setMilliseconds(0);
      this.maxDate = new Date(date);
      this.active = true;
      this.load();
    });
  }

  public load() {
    if (this.loader) {
      this.loader.unsubscribe();
    }
    this.loadingBarService.complete();
    this.data = [];

    let channels: any[];
    if (this.type && this.channel) {
      channels = this.channels.filter((a: any): boolean => (
        a.type === this.type &&
        a.channel === this.channel
      ));
      this.channelName = channels.length > 0 ? channels[0].channelName : '総合';
    } else if (this.type) {
      channels = this.channels.filter((a: any): boolean => (
        a.type === this.type
      ));
      this.channelName = channels.length > 0 ? channels[0].type : '総合';
    } else {
      channels = this.channels;
      this.channelName = '総合';
    }
    const date: Date = new Date(this.start);
    const requests: Observable<any>[] = [];
    while (date.getTime() < this.end.getTime()) {
      const start: number = date.getTime();
      date.setHours(date.getHours() + 24);
      if (date.getTime() > this.end.getTime()) {
        date.setTime(this.end.getTime());
      }
      const end: number = date.getTime();
      for (const channel of channels) {
        requests.push(this.commentService.request('GET', 'intervals', {
          params: new HttpParams()
            .set('channel', this.commentService.loadQuery(channel.channelName))
            .set('start', String(start))
            .set('end', String(end))
            .set('interval', '1m'),
        }).catch((): Observable<any> => Observable.of({
          n_hits: 0,
        })).mergeMap((result: any): Observable<any> => {
          let intervals: any[] = [];
          if (
            result.intervals != null &&
            Array.isArray(result.intervals)
          ) {
            intervals = result.intervals.map((a: any): any => Object.assign({}, a, channel));
          }
          return Observable.of(Object.assign({}, result, { intervals }));
        }));
      }
    }

    let index: number = 0;
    let rank: number = 0;
    let current: number;
    this.loader = Observable.zip(...requests).map((results: any[]): any => ({
      n_hits: results.map((a: any): number => a.n_hits)
        .reduce((a: number, b: number): number => a + b, 0),
      intervals: results.map((a: any): any[] => a.intervals)
        .reduce((a: any[], b: any[]): any[] => [...a, ...b], [])
        .sort((a: any, b: any): number => b.n_hits - a.n_hits),
    })).mergeMap(
      (result: any): Observable<any> => Observable.concat(...result.intervals.map(
        (interval: any): Observable<any> => Observable.defer((): Observable<any> => {
          const item: any = this.data.find((a: any): boolean => (
            a.program.type === interval.type &&
            a.program.channel === interval.channel &&
            a.program.start <= interval.start + 60000 &&
            a.program.end > interval.start
          ));
          if (item) {
            return this.unique ? Observable.empty() : Observable.of(Object.assign(
              {},
              item,
              interval,
              {
                start: new Date(interval.start),
              },
            ));
          }
          return this.programsService.search({
            page: 1,
            view: 1,
            type: interval.type,
            channel: interval.channel,
            end: interval.start + 60000,
            reverse: true,
          }).delay(0).map((search: any): any => {
            const [program]: [any] = search.programs;
            if (
              program != null &&
              typeof program === 'object' &&
              program.end > interval.start
            ) {
              const minutes: number = program.duration / 60000;
              const intervals: any[] = result.intervals.filter((a: any): boolean => (
                a.type === program.type &&
                a.channel === program.channel &&
                a.start >= program.start &&
                a.start < program.end
              ));
              const commentCount: number = intervals.map((a: any): number => a.n_hits).reduce(
                (a: number, b: number): number => a + b,
                0,
              );
              const commentSpeed: number = commentCount / minutes;
              const commentMaxSpeed: number = Math.max.apply(
                null,
                intervals.map((a: any): number => a.n_hits),
              );
              return Object.assign({}, interval, {
                program,
                commentCount: Observable.of(commentCount),
                commentSpeed: Observable.of(commentSpeed),
                commentMaxSpeed: Observable.of(commentMaxSpeed),
                start: new Date(interval.start),
              });
            }
            throw program;
          });
        }).delay(100).catch((): Observable<any> => Observable.empty()),
      )).take(this.view),
    ).subscribe(
      (result: any) => {
        index += 1;
        if (current !== result.n_hits) {
          rank = index;
          current = result.n_hits;
        }
        this.data.push(Object.assign({}, result, { rank, index }));
        this.loadingBarService.complete();
        this.loadingBarService.start();
      },
      null,
      () => {
        this.loadingBarService.complete();
      },
    );
  }

  public search(query: string) {
    this.router.navigate(['programs', 'list'], {
      queryParams: {
        query,
        page: 1,
      },
      queryParamsHandling: 'merge',
    });
  }

  public select(item: any) {
    this.router.navigate([], {
      queryParams: {
        select: item.index,
      },
      queryParamsHandling: 'merge',
      skipLocationChange: true,
    });
  }

  public playModal(item: any = this.selectedItem) {
    if (!this.hasModal && item) {
      this.selectedItem = item;
      this.select(item);
      this.modalRef = this.bsModalService.show(this.confirmTemplateRef, {
        class: 'modal-dialog-centered',
      });
    }
  }

  public play(item: any = this.selectedItem) {
    if (
      item != null &&
      typeof item === 'object' &&
      item.program != null &&
      typeof item.program === 'object'
    ) {
      this.router.navigate(['programs', 'play'], {
        queryParams: {
          type: item.program.type,
          channel: item.program.channel,
          start: item.program.start.getTime(),
          end: item.program.end.getTime(),
        },
      });
    }
  }

  public playInterval(item: any = this.selectedItem) {
    if (
      item != null &&
      typeof item === 'object' &&
      item.program != null &&
      typeof item.program === 'object'
    ) {
      this.router.navigate(['programs', 'play'], {
        queryParams: {
          type: item.program.type,
          channel: item.program.channel,
          start: item.start.getTime(),
          end: item.program.end.getTime(),
        },
      });
    }
  }
}
