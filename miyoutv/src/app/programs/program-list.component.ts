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
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastsManager } from 'ng2-toastr/ng2-toastr';
import { Observable, Subscription } from 'rxjs';

import { StorageService } from '../shared/storage.service';
import { ProgramsService } from './programs.service';

@Component({
  selector: 'program-list',
  templateUrl: 'program-list.component.html',
})
export class ProgramListComponent implements OnInit, OnDestroy {
  @ViewChild('viewport') viewport: ElementRef;
  public form: FormGroup;
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
        const page = this.page - 1;
        if (page > 0) {
          this.router.navigate([], {
            queryParams: {
              page,
              select: '',
            },
            queryParamsHandling: 'merge',
          });
          return false;
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
        const page = this.page + 1;
        if (page < this.hits / this.view + 1) {
          this.router.navigate([], {
            queryParams: {
              page,
              select: '',
            },
            queryParamsHandling: 'merge',
          });
          return false;
        }
      }
      return true;
    },
  }];
  public active: boolean = false;
  public query: string = '';
  public reverse: boolean = true;
  public view: number = 100;
  public page: number = 1;
  public archiveEnabled: boolean = false;
  public previewEnabled: boolean = true;
  public countMode: string = 'speed';
  public hourFirst: number = 4;
  public hourFormat: string = '';
  public hits: number = 0;
  public data: any[] = [];
  public pageStatus: string = '';
  public selectedItem: any;
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private formBuilder: FormBuilder,
    private viewContainerRef: ViewContainerRef,
    private toastsManager: ToastsManager,
    private storageService: StorageService,
    private programsService: ProgramsService,
  ) { }

  public ngOnInit() {
    this.toastsManager.setRootViewContainerRef(this.viewContainerRef);
    this.view = this.storageService.loadLocalStorage('listView') || this.view;
    this.reverse = this.storageService.loadLocalStorage('listReverse');
    this.programsService.previewParams = 'size=160x90';
    if (this.reverse == null) {
      this.reverse = true;
    }
    const refreshInterval: number = parseInt(
      this.storageService.loadLocalStorage('reloadInterval'),
      10,
    ) || 900000;

    this.form = this.formBuilder.group({
      source: ['archive'],
      sort: ['desc'],
      view: [this.view],
    });
    this.subscriptions.push(
      this.form.valueChanges.subscribe((data: any) => {
        this.router.navigate([], {
          queryParams: {
            src: data.source,
            sort: data.sort,
            view: data.view,
            page: data.view === this.view ? this.page : 1,
          },
          queryParamsHandling: 'merge',
        });
      }),
      this.route.queryParams.subscribe((params: any) => {
        const source: string = (params.src || 'archive');
        const useArchive: boolean = source === 'archive';
        const query: string = params.query || '';
        const reverse: boolean = params.sort != null ? params.sort === 'desc' : this.reverse;
        const view: number = !isNaN(params.view) ? parseInt(params.view, 10) : this.view;
        const page: number = !isNaN(params.page) ? parseInt(params.page, 10) : this.page;
        if (params.select) {
          this.selectedItem = this.data.find(
            (a: any): boolean => String(a.id) === String(params.select),
          );
        }
        if (this.active) {
          if (params.refresh) {
            this.active = false;
            this.programsService.stopImageLoader();
            this.init();
          } else if (
            this.programsService.useArchive !== useArchive ||
            this.query !== query ||
            this.reverse !== reverse ||
            this.view !== view ||
            this.page !== page
          ) {
            this.programsService.stopImageLoader();
            this.programsService.useArchive = useArchive;
            this.query = query;
            this.reverse = reverse;
            this.view = view;
            this.page = page;
            this.selectedItem = null;
            this.load();
          }
        }
        this.programsService.useArchive = useArchive;
        this.query = query;
        this.reverse = reverse;
        this.view = view;
        this.page = page;
        this.form.patchValue(
          {
            source,
            view,
            sort: reverse ? 'desc' : 'asc',
          },
          { emitEvent: false },
        );
        this.router.navigate([], {
          queryParams: {
            refresh: '',
          },
          queryParamsHandling: 'merge',
        });
        this.storageService.saveLocalStorage('listView', view);
        this.storageService.saveLocalStorage('listReverse', reverse);
        this.storageService.saveLocalStorage('source', source);
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
    this.active = true;
    this.load();
  }

  public load() {
    const query: any = this.parseQuery(this.query);
    this.data = [];
    this.programsService.stopImageLoader();
    this.programsService.search({
      page: this.page,
      view: this.view,
      keyword: query.keyword,
      type: query.type,
      channel: query.channel,
      category: query.category,
      start: query.start,
      end: query.end,
      reverse: this.reverse,
    }).delay(0).subscribe(
      (result: any) => {
        this.hits = result.hits;
        this.data = result.programs;
        const start: number = (this.page - 1) * this.view + 1;
        let end: number = this.page * this.view;
        if (end > this.hits) {
          end = this.hits;
        }
        this.pageStatus = `${start}-${end} / ${this.hits}`;
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

  protected parseQuery(query: string): { [key: string]: any } {
    const params: { [key: string]: any } = {};
    const options: string = query.replace('　', ' ');
    const optionPettern: RegExp = /([a-z]+): ?("[^"]*"|[^ ]+)?/g;

    let option: string[];
    while ((option = optionPettern.exec(options)) !== null) {
      const key: string = option[1];
      const value: string = option[2].replace(/^"([^"]+)"$/, '$1');
      switch (key) {
        case 'ch':
          params.channel = value;
          break;
        case 'cat':
        case 'genre':
          params.category = value;
          break;
        case 'start':
          params.start = new Date(value).getTime();
          break;
        case 'end':
          params.end = new Date(value).getTime();
          break;
        default:
          params[key] = value;
      }
    }
    params.keyword = query.replace(optionPettern, '').trim();
    return params;
  }

  public onPageChanged(e: any) {
    this.router.navigate([], {
      queryParams: {
        page: e.page,
        select: '',
      },
      queryParamsHandling: 'merge',
    });
  }

  public search(query: string) {
    this.router.navigate([], {
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
}
