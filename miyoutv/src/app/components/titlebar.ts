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

class TitlebarController {
  static componentName: string = 'titlebar';
  static $inject: string[] = [
    '$scope',
    'CommonService',
  ];

  public isFullscreen: boolean = false;
  public isMaximized: boolean = false;
  public isAlwaysOnTop: boolean = false;

  constructor(
    private $scope: ng.IScope,
    private CommonService: CommonService.CommonService,
  ) {
    $scope.$watch(
      (): boolean => CommonService.fullscreen,
      (value: boolean): void => {
        this.isFullscreen = value;
      },
    );
    $scope.$watch(
      (): boolean => CommonService.isMaximized,
      (value: boolean): void => {
        this.isMaximized = value;
      },
    );
    $scope.$watch(
      (): boolean => CommonService.alwaysOnTop,
      (value: boolean): void => {
        this.isAlwaysOnTop = value;
      },
    );
  }

  public toggleAlwaysOnTop(): void {
    this.CommonService.alwaysOnTop = !this.CommonService.alwaysOnTop;
  }

  public minimize(): void {
    this.CommonService.minimize();
  }

  public maximize(): void {
    this.CommonService.maximize();
  }

  public restore(): void {
    this.CommonService.restore();
  }

  public fullscreen(): void {
    this.CommonService.fullscreen = true;
  }

  public close(): void {
    this.CommonService.close();
  }
}

angular
  .module('app')
  .component('titlebar', {
    templateUrl: 'templates/titlebar.html',
    controller: TitlebarController,
  });
