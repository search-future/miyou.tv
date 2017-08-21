/*!
Copyright 2016 Brazil Ltd.

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
import { GridOptions, ICellRendererParams } from 'ag-grid/main';
import * as CommonService from '../services/CommonService';
import * as PlayerService from '../services/PlayerService';
import * as CommentService from '../services/CommentService';

declare module angular { }

interface Comment extends CommentService.Comment {
  enabled: boolean;
  playTime: number;
}

interface CommentChannel extends CommentService.CommentChannel {
  enabled: boolean;
}

interface CommentThread {
  title: string;
  enabled: boolean;
}

class CommentGridController {
  static componentName: string = 'commentGrid';
  static $inject: string[] = [
    '$scope',
    'CommonService',
    'PlayerService',
  ];

  protected autoScrolling: boolean = false;

  public options: {
    offset: number;
  } = {
    offset: 0,
  };
  public data: Comment[] = [];
  public channels: CommentChannel[] = [];
  public channelCount: number = 0;
  public threads: CommentThread[] = [];
  public autoScroll: boolean = true;
  public gridOptions: GridOptions = {
    rowSelection: 'single',
    enableColResize: true,
    enableSorting: true,
    suppressCellSelection: true,
    suppressLoadingOverlay: true,
    suppressNoRowsOverlay: true,
    columnDefs: [{
      colId: 'playTime',
      field: 'playTime',
      headerName: '時間',
      width: 70,
      cellStyle: {
        textAlign: 'right',
      },
      cellRenderer: (params: ICellRendererParams): string => {
        const time: string = this.CommonService.formatTime(params.value);
        return `<div title="${time}">${time}</div>`;
      },
    }, {
      colId: 'time',
      field: 'time',
      headerName: '時刻',
      width: 90,
      cellStyle: {
        textAlign: 'right',
      },
      cellRenderer: (params: ICellRendererParams): string => {
        const time: string = this.CommonService.formatDate(params.value, 'A HHHH:mm:ss');
        return `<div title="${time}">${time}</div>`;
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
    }],
    onGridReady: (): void => {
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
          this.autoScroll = false;
        }
      });
      this.gridOptions.api.addEventListener('bodyScroll', (e: { direction: string }): void => {
        if (e.direction === 'vertical') {
          if (this.autoScrolling) {
            this.autoScrolling = false;
          } else {
            this.autoScroll = false;
          }
        }
      });
      this.gridOptions.api.addEventListener('rowDoubleClicked', (): void => {
        const selectedtRows: any[] = this.gridOptions.api.getSelectedRows();
        if (selectedtRows.length > 0) {
          this.PlayerService.time(selectedtRows[0].playTime);
        }
      });
    },
  };

  constructor(
    private $scope: ng.IScope,
    private CommonService: CommonService.CommonService,
    private PlayerService: PlayerService.PlayerService,
  ) {
    $scope.$watch(
      (): CommentChannel[] => this.channels,
      (value: CommentChannel[]): void => {
        if (angular.isArray(value)) {
          this.channelCount = value.filter((a: CommentChannel): boolean => a.enabled).length;
        }
      },
      true,
    );
    $scope.$watch(
      (): number => this.options.offset,
      (): void => {
        this.updateData();
      },
    );
    $scope.$watchCollection(
      (): Comment[] => this.data,
      (): void => {
        this.updateData();
      },
    );
    $scope.$watch(
      (): CommentThread[] => this.threads,
      (): void => {
        this.updateData();
      },
    );
    $scope.$watch(
      (): number => PlayerService.time(),
      (newValue: number, oldValue: number): void => {
        if (this.autoScroll) {
          this.gridOptions.api.ensureNodeVisible((a: any): boolean => a.data.playTime >= oldValue);
          this.autoScrolling = true;
        }
      },
    );
  }

  protected updateData(): void {
    const data: Comment[] = this.data.filter((a: Comment): boolean => a.enabled !== false);
    if (angular.isNumber(this.options.offset)) {
      data.forEach((a: Comment): void => {
        a.playTime = a.time - this.options.offset;
      });
    }
    this.gridOptions.api.setRowData(data);
  }

  public autoScrollChanged(): void {
    if (this.autoScroll) {
      this.gridOptions.api.setSortModel([{
        colId: 'playTime',
        sort: 'asc',
      }]);
    }
  }
}
angular.module('app')
  .component('commentGrid', {
    templateUrl: 'templates/commentGrid.html',
    controller: CommentGridController,
    bindings: {
      options: '<',
      data: '<',
      channels: '=',
      threads: '=',
    },
  });
