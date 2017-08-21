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
import * as CommonService from '../services/CommonService';

declare module angular { }

interface RecordData {
  [key: string]: any;
}

interface CommentData {
  [key: string]: any;
}

interface Program {
  [key: string]: any;
}

interface ProgramInfo {
  id?: string;
  channel?: string;
  start?: number;
  end?: number;
  category?: string;
  title?: string;
  episode?: number;
  detail?: string;
  displayStartTime?: string;
  displayEndTime?: string;
}

interface CommentInfo {
  start?: number;
  end?: number;
  query?: string;
  displayStartTime?: string;
  displayEndTime?: string;
  count?: number;
}

class PlayerInfoController {
  static componentName: string = 'playerInfo';
  static $inject: string[] = [
    '$scope',
    'CommonService',
  ];

  public recordInfo: RecordData;
  public commentInfo: CommentData;
  public programList: Program[];
  public program: ProgramInfo = {};
  public comment: CommentInfo = {};

  constructor(
    private $scope: ng.IScope,
    private CommonService: CommonService.CommonService,
  ) {
    $scope.$watch(
      (): RecordData => this.recordInfo,
      (value: RecordData): void => {
        this.program = {};
        if (value) {
          this.program.id = value.id || value.gtvid;
          this.program.channel = value.channel.name;
          this.program.start = value.start;
          this.program.end = value.end;
          this.program.category = value.categoryName.localeName;
          this.program.title = value.fullTitle || value.title;
          this.program.episode = value.episode;
          this.program.detail = value.detail || value.description;
          this.program.displayStartTime = CommonService.formatDate(
            value.start, 'yyyy/MM/dd(EEE) A HHHH:mm',
          );
          this.program.displayEndTime = CommonService.formatDate(
            value.end, 'yyyy/MM/dd(EEE) A HHHH:mm',
          );
        }
      });
    $scope.$watch(
      (): Program[] => this.programList,
      (value: Program[]): void => {
        const programList: Program[] = value;

        if (angular.isArray(programList)) {
          programList.forEach((a: Program): void => {
            a.displayStartTime = CommonService.formatDate(a.startAt, 'MM/dd A HHHH:mm');
            a.displayEndTime = CommonService.formatDate(a.startAt + a.duration, 'MM/dd A HHHH:mm');
          });
        }
      },
    );
    $scope.$watch(
      (): CommentData => this.commentInfo,
      (value: CommentData): void => {
        if (angular.isObject(value as CommentData)) {
          this.comment = {};
          this.comment.start = value.start;
          this.comment.end = value.end;
          this.comment.query = (value.query || '').replace(/\|\|/g, ',');
          this.comment.displayStartTime = CommonService.formatDate(
            value.start,
            'yyyy/MM/dd(EEE) A HHHH:mm:ss',
          );
          this.comment.displayEndTime = CommonService.formatDate(
            value.end,
            'yyyy/MM/dd(EEE) A HHHH:mm:ss',
          );
          this.comment.count = value.count || 0;
        }
      },
      true,
    );
  }
}

angular.module('app')
  .component('playerInfo', {
    templateUrl: 'templates/playerInfo.html',
    controller: PlayerInfoController,
    bindings: {
      recordInfo: '<',
      commentInfo: '<',
      programList: '<',
    },
  });
