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
import * as PlayerService from '../services/PlayerService';

declare module angular { }

interface Program {
  [key: string]: any;
}

interface ChartData {
  n_hits: number;
  start: number;
}

class SeekbarController {
  static componentName: string = 'seekbar';
  static $inject: string[] = [
    '$scope',
    'CommonService',
    'PlayerService',
  ];

  public mode: string;
  public offset: number;
  public chartData: ChartData[];
  public programList: Program[];
  public position: number;
  public isClock: boolean = true;
  public time: string = '0';
  public length: string = '0';
  public clockTime: string = '0';
  public end: string = '0';
  public isSeeking: boolean = false;
  public endTime: string;
  public separators: number[];
  public chartPoints: string;
  public next: () => void;
  public previous: () => void;

  constructor(
    private $scope: ng.IScope,
    private CommonService: CommonService.CommonService,
    private PlayerService: PlayerService.PlayerService,
  ) {
    $scope.$watch(
      (): number => PlayerService.position,
      (value: number): void => {
        if (!this.isSeeking) {
          this.position = value;
        }
        this.time = PlayerService.formattedTime();
        this.length = PlayerService.formattedLength();
        this.clockTime = this.time;
        this.endTime = this.length;
        if (this.offset) {
          this.clockTime = CommonService.formatDate(
            PlayerService.time + this.offset,
            'A HHHH:mm:ss',
          );
          this.endTime = CommonService.formatDate(
            PlayerService.length + this.offset,
            'A HHHH:mm:ss',
          );
        }
      },
    );

    $scope.$watchGroup(
      [
        (): Program[] => this.programList,
        (): number => this.offset,
        (): number => PlayerService.length,
      ],
      (values: [Program[], number, number]): void => {
        const [list, offset, length]: [Program[], number, number] = values;
        this.separators = [];
        if (
          angular.isArray(list) &&
          offset &&
          length
        ) {
          list.forEach((a: Program): void => {
            const position: number = (a.startAt - offset) / length;
            this.separators.push(Math.floor(position * 100000) / 100000);
          });
        }
      },
    );
    $scope.$watchGroup(
      [
        (): ChartData[] => this.chartData,
        (): number => this.offset,
        (): number => PlayerService.length,
      ],
      (values: [ChartData[], number, number]): void => {
        const data: ChartData[] = values[0];
        const length: number = values[2];
        const width: number = 100;
        const height: number = 100;
        const points: string[] = [];
        let offset: number = values[1];

        if (length && angular.isArray(data)) {
          const max: number = Math.max.apply(null, data.map(a => a.n_hits));
          if (offset) {
            offset -= 60000;
          } else if (angular.isObject(data[0])) {
            offset = data[0].start - 60000;
          } else {
            offset = 0;
          }
          const xscale: number = width / length;
          const yscale: number = height / max;

          points.push(`0,${height}`);
          for (let i: number = 0; i < data.length; i += 1) {
            if (data[i].start >= offset) {
              const x: number = (data[i].start - offset) * xscale;
              const y: number = height - (data[i].n_hits * yscale);
              points.push(`${x},${y}`);
            }
          }
          this.chartPoints = points.join(' ');
        } else {
          this.chartPoints = '';
        }
      },
    );
  }

  public seek(position: number): void {
    if (this.isSeeking) {
      this.PlayerService.position = position;
    }
  }
}
angular.module('app')
  .component('seekbar', {
    bindings: {
      mode: '=',
      offset: '<',
      chartData: '<',
      programList: '<',
      next: '&',
      previous: '&',
    },
    templateUrl: 'templates/seekbar.html',
    controller: SeekbarController,
  });
