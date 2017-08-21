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

class ViewSettingController {
  static componentName: string = 'viewSetting';
  static $inject: string[] = [
    '$scope',
    'CommonService',
  ];

  public autoFormatName: string = '4-27';
  public countMode: string = 'speed';
  public previewEnabled: boolean = true;
  public hourFirst: string = '4';
  public hourFormat: string = '';
  public close: () => void;
  public dismiss: () => void;

  constructor(
    private $scope: ng.IScope,
    private CommonService: CommonService.CommonService,
  ) {
    $scope.$watch(
      (): string => this.hourFirst,
      (value: string): void => {
        const hour: number = parseInt(value, 10);

        this.autoFormatName = `${hour}-${(hour + 24) - 1}`;
      },
    );
    $scope.$watch(
      (): string => CommonService.loadLocalStorage('countMode'),
      (value: string): void => {
        this.countMode = value || 'speed';
      },
    );
    $scope.$watch(
      (): boolean => CommonService.loadLocalStorage('previewEnabled'),
      (value: boolean): void => {
        this.previewEnabled = typeof value === 'boolean' ? value : true;
      },
    );
    $scope.$watch(
      (): number => CommonService.loadLocalStorage('hourFirst'),
      (value: number): void => {
        this.hourFirst = angular.isNumber(value) ? String(value) : '4';
      },
    );
    $scope.$watch(
      (): string => CommonService.loadLocalStorage('hourFormat'),
      (value: string): void => {
        this.hourFormat = value || '';
      },
    );
  }

  public ok(): void {
    const countMode: string = this.countMode;
    const previewEnabled: boolean = this.previewEnabled;
    const hourFirst: number = parseInt(this.hourFirst, 10);
    const hourFormat: string = this.hourFormat;

    this.CommonService.saveLocalStorage('countMode', countMode);
    this.CommonService.saveLocalStorage('previewEnabled', previewEnabled);
    this.CommonService.saveLocalStorage('hourFirst', hourFirst);
    this.CommonService.saveLocalStorage('hourFormat', hourFormat);
    this.close();
  }

  public cancel(): void {
    this.dismiss();
  }
}

angular
  .module('app')
  .component('viewSetting', {
    templateUrl: 'templates/viewSetting.html',
    controller: ViewSettingController,
    bindings: {
      close: '&',
      dismiss: '&',
    },
  });
