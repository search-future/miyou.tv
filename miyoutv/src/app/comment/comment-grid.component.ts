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
  EventEmitter,
  Inject,
  Input,
  LOCALE_ID,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ColDef, GridOptions } from 'ag-grid/main';
import { ToastsManager } from 'ng2-toastr/ng2-toastr';
import { Observable, Subscription } from 'rxjs';

import { CommentPlayer } from './comment-player.service';
import { CommentService } from './comment.service';
import { DateExPipe } from '../shared/date-ex.pipe';

@Component({
  selector: 'comment-grid',
  templateUrl: 'comment-grid.component.html',
})
export class CommentGridComponent implements OnInit, OnDestroy {
  @Input() hourFirst: number = 4;
  @Input() hourFormat: string = '';
  @Input() channelOrder: string[] = ['gr', 'bs', 'cs'];
  @Output() jump: EventEmitter<number> = new EventEmitter();
  public headForm: FormGroup;
  public footForm: FormGroup;
  public channels: any[] = [];
  public threads: string[] = [];
  public intervals: any[] = [];
  public count: number = 0;
  public speed: number = 0;
  public autoScroll: boolean = true;
  public gridOptions: GridOptions = {
    rowSelection: 'single',
    enableColResize: true,
    enableSorting: true,
    suppressCellSelection: true,
    suppressLoadingOverlay: true,
    suppressNoRowsOverlay: true,
    onGridReady: () => {
      this.onGridReady();
    },
    getRowNodeId: (data: any): string => data.id,
  };
  public columnDefs: ColDef[] = [{
    colId: 'playTime',
    field: 'time',
    headerName: '時間',
    width: 70,
    cellStyle: {
      textAlign: 'right',
    },
    cellRenderer: (params: any): string => {
      const time: number = params.value - this.commentPlayer.offset.getTime();
      const sign: string = time >= 0 ? '' : '-';
      const h: string = String(Math.floor(Math.abs(time) / 3600000));
      const m: string = String(
        Math.floor((Math.abs(time) % 3600000) / 60000) + 100,
      ).slice(-2);
      const s: string = String(
        Math.floor((Math.abs(time) % 60000) / 1000) + 100,
      ).slice(-2);
      const text: string = `${sign}${((parseInt(h, 10) > 0) ? [h, m, s] : [m, s]).join(':')}`;
      return `<div title="${text}">${text}</div>`;
    },
  }, {
    colId: 'time',
    field: 'time',
    headerName: '時刻',
    width: 90,
    cellRenderer: (params: any): string => {
      const text: string = this.datePipe.transform(
        params.value,
        this.hourFirst,
        this.hourFormat,
        'HHHH:mm:ss',
      );
      return `<div title="${text}">${text}</div>`;
    },
    cellStyle: {
      textAlign: 'right',
    },
  }, {
    colId: 'text',
    field: 'text',
    tooltipField: 'text',
    headerName: 'コメント',
    width: 428,
  }, {
    colId: 'name',
    field: 'name',
    tooltipField: 'name',
    headerName: '名前',
    width: 180,
  }, {
    colId: 'id',
    field: 'id',
    tooltipField: 'id',
    headerName: 'ID',
    width: 180,
  }, {
    colId: 'email',
    field: 'email',
    tooltipField: 'email',
    headerName: 'メール',
    width: 240,
  }, {
    colId: 'title',
    field: 'title',
    tooltipField: 'title',
    headerName: 'スレッド',
    width: 240,
  }];
  protected _autoScrolling: number = 0;
  protected datePipe: DateExPipe;
  private subscriptions: Subscription[] = [];

  constructor(
    @Inject(LOCALE_ID) private locale: string,
    private formBuilder: FormBuilder,
    private toastsManager: ToastsManager,
    private commentService: CommentService,
    public commentPlayer: CommentPlayer,
  ) {
    this.datePipe = new DateExPipe(locale);
  }

  set autoScrolling(autoScrolling: boolean) {
    if (autoScrolling) {
      if (this._autoScrolling < 2) {
        this._autoScrolling += 1;
      }
    } else if (this._autoScrolling > 0) {
      this._autoScrolling -= 1;
    }
  }

  get autoScrolling(): boolean {
    return this._autoScrolling > 0;
  }

  public ngOnInit() {
    this.headForm = this.formBuilder.group({
      channels: [],
      threads: [],
    });
    this.footForm = this.formBuilder.group({
      autoScroll: [this.autoScroll],
    });
    this.subscriptions.push(
      this.headForm.valueChanges.subscribe((data: any) => {
        if (this.channels.length > 0) {
          const query: string = this.channels.filter((a: any, i: number): boolean => (
            data.channels[i]
          )).map((a: any): string => a.id).join('||');
          if (this.commentService.loadQuery(this.commentPlayer.channel) !== query) {
            this.commentService.saveQuery(this.commentPlayer.channel, query);
            this.commentPlayer.init();
          }
        }
        if (this.threads.length > 0) {
          const threads: string[] =
            this.threads.filter((a: any, i: number): boolean => data.threads[i]);
          if (this.commentPlayer.threadFilter.join(',') !== threads.join(',')) {
            this.commentPlayer.threadFilter = threads;
          }
        }
      }),
      this.commentPlayer.valueChanges.subscribe((data: any) => {
        this.gridOptions.api.refreshCells({
          columns: ['playTime'],
          force: true,
        });
      }),
      this.commentPlayer.intervals.subscribe((intervals: any) => {
        this.intervals = intervals;
        let getChannals: Observable<any[]>;
        if (this.channels.length > 0) {
          getChannals = Observable.of(this.channels);
        } else {
          getChannals = this.commentService.request('GET', 'channels').mergeMap(
            (response: any): Observable<any[]> => {
              response.channels.sort((a: any, b: any): number => {
                const aType: number = this.channelOrder.indexOf(a.type.slice(0, 2));
                const aNum: number = parseInt(a.type.slice(2), 10);
                const bType: number = this.channelOrder.indexOf(b.type.slice(0, 2));
                const bNum: number = parseInt(b.type.slice(2), 10);
                return ((aType - bType) * 100) + (aNum - bNum);
              });
              this.channels = response.channels.map((a: any): any => Object.assign({}, a, {
                type: a.type.slice(0, 2),
              }));
              return Observable.of(this.channels);
            },
          );
        }
        getChannals.subscribe(
          (channels: any[]) => {
            const queries: string[] =
              this.commentService.loadQuery(this.commentPlayer.channel).split('||');
            this.headForm.setControl(
              'channels',
              this.formBuilder.array(channels.map((a: any): boolean => (
                queries.indexOf(a.id) >= 0
              ))),
            );
          },
          (error: any) => {
            this.toastsManager.warning('チャンネル情報の取得に失敗しました。', 'Program error', {
              toastLife: 10000,
              dismiss: 'click',
              newestOnTop: true,
              positionClass: 'toast-top-right',
            });
          },
        );
      }),
      this.commentPlayer.count.subscribe((count: number) => {
        this.count = count;
      }),
      this.commentPlayer.time.subscribe((time: number) => {
        if (this.commentPlayer.offset) {
          const start = time + this.commentPlayer.offset.getTime() - 60000;
          for (const interval of this.intervals) {
            if (interval.start >= start) {
              this.speed = interval.n_hits;
              break;
            }
          }
        }
      }),
    );
  }

  public ngOnDestroy() {
    this.subscriptions.forEach((a: Subscription) => {
      a.unsubscribe();
    });
  }

  protected onGridReady() {
    this.subscriptions.push(
      this.footForm.valueChanges.subscribe((data: any) => {
        this.autoScroll = data.autoScroll;
        if (this.autoScroll) {
          this.gridOptions.api.setSortModel([{
            colId: 'playTime',
            sort: 'asc',
          }]);
        }
      }),
      this.commentPlayer.data.subscribe((data: any[]) => {
        const threads: string[] = this.commentPlayer.rawData.map(
          (a: any): string => a.title,
        ).filter(
          (a: string, i: number, array: string[]): boolean => array.indexOf(a) === i,
        );
        if (this.threads.length !== threads.length) {
          this.threads = threads;
          this.headForm.setControl(
            'threads',
            this.formBuilder.array(this.threads.map((a: string): boolean => (
              this.commentPlayer.threadFilter.indexOf(a) >= 0
            ))),
          );
        }
        this.autoScrolling = this.autoScroll;
        this.gridOptions.api.setRowData(data);
      }),
      this.commentPlayer.comment.buffer(this.commentPlayer.time).filter((data: any[]): boolean => (
        data.length > 0
      )).map((data: any[]) => data.pop()).subscribe((comment: any) => {
        if (this.autoScroll) {
          this.autoScrolling = true;
          this.gridOptions.api.ensureNodeVisible(
            (a: any): boolean => a.data.id === comment.id,
            'bottom',
          );
        }
      }),
    );
    this.gridOptions.api.addEventListener('sortChanged', (): void => {
      const sortModel: {
        colId: string;
        sort: string;
      }[] = this.gridOptions.api.getSortModel();

      if (
        sortModel.length > 1 ||
        sortModel[0].colId !== 'playTime' ||
        sortModel[0].sort !== 'asc'
      ) {
        this.footForm.patchValue({
          autoScroll: false,
        });
      }
    });
    this.gridOptions.api.addEventListener('bodyScroll', (e: { direction: string }): void => {
      if (e.direction === 'vertical') {
        if (this.autoScrolling) {
          this.autoScrolling = false;
        } else {
          this.footForm.patchValue({
            autoScroll: false,
          });
        }
      }
    });
    this.gridOptions.api.addEventListener('rowDoubleClicked', (): void => {
      const selectedtRows: any[] = this.gridOptions.api.getSelectedRows();
      if (selectedtRows.length > 0) {
        this.jump.next(selectedtRows[0].time - this.commentPlayer.offset.getTime());
      }
    });
  }
}
