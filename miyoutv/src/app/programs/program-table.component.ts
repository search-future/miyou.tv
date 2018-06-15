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
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastsManager } from 'ng2-toastr/ng2-toastr';
import { BsDatepickerConfig, BsLocaleService } from 'ngx-bootstrap/datepicker';
import { Observable, Subscription } from 'rxjs';

import { StorageService } from '../shared/storage.service';
import { CommentService } from '../comment/comment.service';
import { ProgramsService } from './programs.service';

@Component({
  selector: 'program-table',
  templateUrl: 'program-table.component.html',
})
export class ProgramTableComponent implements OnInit, OnDestroy {
  @ViewChild('viewport') viewport: ElementRef;
  public form: FormGroup;
  public dpConfig: Partial<BsDatepickerConfig> = {
    containerClass: 'theme-default',
    dateInputFormat: 'YYYY/MM/DD',
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
  }, {
    left: (): boolean => {
      if (
        document.elementFromPoint(0, 0).className !== 'cfp-hotkeys' &&
        this.viewport.nativeElement.contains(document.activeElement)
      ) {
        const focusable: NodeList = this.viewport.nativeElement.querySelectorAll((
          '[tabindex]:not([tabindex^="-"])'
        ));
        const currentRect: ClientRect = document.activeElement.getBoundingClientRect();
        for (let i = focusable.length - 1; i >= 0; i -= 1) {
          const rect: ClientRect = (focusable[i] as HTMLElement).getBoundingClientRect();
          if (
            rect.top <= currentRect.top &&
            rect.bottom > currentRect.top &&
            rect.right < currentRect.right
          ) {
            (focusable[i] as HTMLElement).focus();
            return false;
          }
        }
      }
      return true;
    },
  }, {
    right: (): boolean => {
      if (
        document.elementFromPoint(0, 0).className !== 'cfp-hotkeys' &&
        this.viewport.nativeElement.contains(document.activeElement)
      ) {
        const focusable: NodeList = this.viewport.nativeElement.querySelectorAll((
          '[tabindex]:not([tabindex^="-"])'
        ));
        const currentRect: ClientRect = document.activeElement.getBoundingClientRect();
        for (let i = 0; i < focusable.length; i += 1) {
          const rect: ClientRect = (focusable[i] as HTMLElement).getBoundingClientRect();
          if (
            rect.top <= currentRect.top &&
            rect.bottom > currentRect.top &&
            rect.left > currentRect.left
          ) {
            (focusable[i] as HTMLElement).focus();
            return false;
          }
        }
      }
      return true;
    },
  }];
  public active: boolean = false;
  public archiveEnabled: boolean = false;
  public previewEnabled: boolean = true;
  public countMode: string = 'speed';
  public hourFirst: number = 4;
  public hourFormat: string;
  public baseWidth: number = 200;
  public baseHeight: number = 240;
  public scrollX: number = 0;
  public scrollY: number = 0;
  public activeCategories: number[] = [];
  public currentDate: Date;
  public minDate: Date;
  public maxDate: Date;
  public hours: Date[] = [];
  public dates: Date[] = [];
  public data: any[] = [];
  public selectedItem: any;
  protected loader: Subscription;
  private subscriptions: Subscription[] = [];

  constructor(
    @Inject('categoryTable') public categoryTable: any[],
    private changeDetectorRef: ChangeDetectorRef,
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private viewContainerRef: ViewContainerRef,
    private toastsManager: ToastsManager,
    private localeService: BsLocaleService,
    private commentService: CommentService,
    private storageService: StorageService,
    private programsService: ProgramsService,
  ) { }

  public ngOnInit() {
    this.localeService.use('ja');
    this.toastsManager.setRootViewContainerRef(this.viewContainerRef);
    this.programsService.previewParams = 'size=160x90';
    const date: Date = new Date();
    date.setHours(this.hourFirst);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    this.currentDate = date;
    const refreshInterval: number = parseInt(
      this.storageService.loadLocalStorage('reloadInterval'),
      10,
    ) || 900000;

    this.form = this.formBuilder.group({
      source: ['archive'],
      date: [],
      categories: this.formBuilder.array(this.categoryTable.map((): boolean => false)),
    });
    this.subscriptions.push(
      this.form.valueChanges.subscribe((data: any) => {
        const date: Date = data.date || this.currentDate;
        this.router.navigate([], {
          queryParams: {
            src: data.source,
            date: [date.getFullYear(), date.getMonth() + 1, date.getDate()].join('-'),
            cat: data.categories.map((a: boolean, i: number): number => {
              if (a) {
                return this.categoryTable[i].code;
              }
              return null;
            }).filter(((a: number): boolean => a != null)).join(','),
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
        const date: Date = params.date ? new Date(params.date) : new Date();
        date.setHours(this.hourFirst);
        date.setMinutes(0);
        date.setSeconds(0);
        date.setMilliseconds(0);
        if (params.cat) {
          this.activeCategories = params.cat.split(',').map((a: string): number => parseInt(a, 10));
        } else {
          this.activeCategories = [];
        }
        if (params.select) {
          this.selectedItem = this.data.map(
            (column: any): any[] => column.programs.find(
              (a: any): boolean => String(a.id) === String(params.select),
            ),
          ).find((a: any): boolean => a);
        }
        if (this.active) {
          if (this.minDate && date.getTime() < this.minDate.getTime()) {
            date.setTime(this.minDate.getTime());
          }
          if (this.maxDate && date.getTime() > this.maxDate.getTime()) {
            date.setTime(this.maxDate.getTime());
          }
          if (params.refresh) {
            this.active = false;
            this.programsService.stopImageLoader();
            this.init();
          } else if (
            this.programsService.useArchive !== useArchive ||
            this.currentDate.getDate() !== date.getDate() ||
            this.currentDate.getMonth() !== date.getMonth() ||
            this.currentDate.getFullYear() !== date.getFullYear()
          ) {
            this.programsService.stopImageLoader();
            for (const column of this.data) {
              column.programs = [];
              column.intervals = [];
            }
            this.viewport.nativeElement.scrollTop = 0;
            this.currentDate = date;
            this.programsService.useArchive = useArchive;
            this.load();
          }
        }
        this.currentDate = date;
        this.form.patchValue(
          {
            source,
            categories: this.categoryTable.map(
              (a: any): boolean => this.activeCategories.indexOf(a.code) >= 0,
            ),
          },
          { emitEvent: false },
        );
        this.router.navigate([], {
          queryParams: {
            date: [date.getFullYear(), date.getMonth() + 1, date.getDate()].join('-'),
            refresh: '',
          },
          queryParamsHandling: 'merge',
        });
      }),
      Observable.interval(refreshInterval).subscribe(() => {
        this.router.navigate([], {
          queryParams: {
            refresh: 1,
          },
          queryParamsHandling: 'merge',
        });
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
    this.countMode = this.storageService.loadLocalStorage('countMode') || 'speed';
    this.hourFirst = this.storageService.loadLocalStorage('hourFirst');
    this.hourFormat = this.storageService.loadLocalStorage('hourFormat');
    if (this.hourFirst == null) {
      this.hourFirst = 4;
    }
    this.currentDate.setHours(this.hourFirst);
    Observable.zip(
      this.programsService.channels,
      this.programsService.startTime,
      this.programsService.endTime,
    ).subscribe((results: any[]) => {
      const [channels, start, end]: any[] = results;
      const date: Date = new Date();
      date.setHours(this.hourFirst);
      date.setMinutes(0);
      date.setSeconds(0);
      date.setMilliseconds(0);
      this.hours = [];
      for (let i = 0; i < 24; i += 1) {
        this.hours.push(new Date(date));
        date.setHours(date.getHours() + 1);
      }
      this.dates = [];
      date.setTime(start);
      date.setHours(date.getHours() - this.hourFirst);
      date.setMinutes(0);
      date.setSeconds(0);
      date.setMilliseconds(0);
      date.setHours(this.hourFirst);
      this.minDate = new Date(date);
      while (date.getTime() < end) {
        this.dates.push(new Date(date));
        date.setDate(date.getDate() + 1);
      }
      date.setTime(end);
      date.setHours(date.getHours() - this.hourFirst);
      date.setMinutes(0);
      date.setSeconds(0);
      date.setMilliseconds(0);
      date.setHours(this.hourFirst);
      this.maxDate = new Date(date);
      this.data = channels.map((channel: any): any => Object.assign(
        {
          programs: [],
          intervals: [],
        },
        channel,
      ));
      this.active = true;
      this.load();
    });
  }

  public load() {
    const date: Date = new Date(this.currentDate);
    const start: number = date.getTime();
    date.setHours(date.getHours() + 24);
    const end: number = date.getTime();
    if (this.loader) {
      this.loader.unsubscribe();
    }
    this.loader = Observable.zip(...this.data.map(
      (column: any): Observable<any> =>
        this.commentService.request('GET', 'intervals', {
          params: new HttpParams()
            .set('channel', this.commentService.loadQuery(column.channelName))
            .set('start', String(start))
            .set('end', String(end))
            .set('interval', '1m'),
        }).catch((): Observable<any> => Observable.of({
          n_hits: 0,
          intervals: [],
        })).do((response: any) => {
          column.commentCount = response.n_hits;
          column.intervals = response.intervals;
        }),
    )).mergeMap((): Observable<any> => this.programsService.search({
      start,
      end,
      view: 100,
      page: 1,
    })).mergeMap((result: any): Observable<any> => {
      const requests: Observable<any>[] = [];
      let page: number = 1;
      while (result.hits > page * 100) {
        page += 1;
        requests.push(this.programsService.search({
          page,
          start,
          end,
          view: 100,
        }));
      }
      return Observable.concat(
        Observable.of(result),
        ...requests,
      );
    }).map((result: any): any[] => (
      result.programs
    )).subscribe(
      (programs: any[]) => {
        const maxDate: Date = new Date(this.currentDate);
        maxDate.setHours(maxDate.getHours() + 24);
        for (const column of this.data) {
          for (const program of programs.filter((a: any): boolean => (
            a.type === column.type &&
            a.channel === column.channel
          ))) {
            let commentCount: number = 0;
            let commentSpeed: number = 0;
            let commentMaxSpeed: number = 0;
            if (
              Array.isArray(column.intervals) &&
              column.intervals.length > 0
            ) {
              const minutes: number = program.duration / 60000;
              const intervals: any[] = column.intervals.filter((a: any): boolean => (
                a.start >= program.start && a.start < program.end
              ));
              commentCount = intervals.map((a: any): number => a.n_hits).reduce(
                (a: number, b: number): number => a + b,
                0,
              );
              commentSpeed = commentCount / minutes;
              commentMaxSpeed = Math.max.apply(null, intervals.map((a: any): number => a.n_hits));
            }
            column.programs.push(Object.assign({}, program, {
              top: this.calcTop(program.start),
              height: this.calcHeight(program.start, program.end),
              maxHeight: this.calcHeight(program.start, maxDate),
              commentCount: Observable.of(commentCount),
              commentSpeed: Observable.of(commentSpeed),
              commentMaxSpeed: Observable.of(commentMaxSpeed),
              showPreview: false,
            }));
          }
          this.changeDetectorRef.detectChanges();
        }
      },
      () => {
        this.toastsManager.error('番組情報の取得に失敗しました。', 'Backend Error', {
          dismiss: 'click',
          newestOnTop: true,
          positionClass: 'toast-bottom-right',
        });
      },
    );
  }

  protected calcTop(start: Date): number {
    let pos: number = ((start.getTime() - this.currentDate.getTime()) * this.baseHeight) / 3600000;
    if (pos < 0) {
      pos = 0;
    }
    return pos;
  }

  protected calcHeight(start: Date, end: Date): number {
    const top: number = this.calcTop(start);
    let height: number = ((end.getTime() - start.getTime()) * this.baseHeight) / 3600000;
    const overHeight: number = (top + height) - this.baseHeight * 24;
    if (top < 0) {
      height += top;
    }
    if (overHeight > 0) {
      height -= overHeight;
    }
    return height;
  }

  public onScroll(e: Event) {
    this.scrollX = (e.target as HTMLElement).scrollLeft;
    this.scrollY = (e.target as HTMLElement).scrollTop;
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
        select: item.id,
      },
      queryParamsHandling: 'merge',
      skipLocationChange: true,
    });
  }

  public play(item: any = this.selectedItem) {
    if (
      item != null &&
      typeof item === 'object'
    ) {
      this.router.navigate(['programs', 'play'], {
        queryParams: {
          type: item.type,
          channel: item.channel,
          start: item.start.getTime(),
          end: item.end.getTime(),
        },
      });
    }
  }

  public playColumn(e: MouseEvent, column: any) {
    if (
      e.currentTarget === e.target &&
      column != null &&
      typeof column === 'object'
    ) {
      const start: number = e.offsetY * 3600000 / this.baseHeight + this.currentDate.getTime();
      this.router.navigate(['programs', 'play'], {
        queryParams: {
          start,
          type: column.type,
          channel: column.channel,
        },
      });
    }
  }
}
