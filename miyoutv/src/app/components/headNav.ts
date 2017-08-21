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

class HeadNavController {
  static componentName: string = 'headNav';
  static $inject: string[] = [
    '$scope',
    '$location',
    '$route',
    'CommonService',
  ];

  public isCollapsed: boolean = true;
  public searchText: string = '';
  public current: string = '';

  constructor(
    private $scope: ng.IScope,
    private $location: ng.ILocationService,
    private $route: ng.route.IRouteService,
    private CommonService: CommonService.CommonService,
  ) {
    $scope.$watch(
      (): string => $location.search().search,
      (value: string): void => {
        this.searchText = value;
      },
    );
    $scope.$watch(
      (): ng.route.ICurrentRoute => $route.current,
      (value: ng.route.ICurrentRoute): void => {
        if (value.locals) {
          this.current = value.locals.name;
        }
      },
    );
  }

  public close(): void {
    this.CommonService.close();
  }

  public openViewSetting(): void {
    this.CommonService.openViewSetting();
  }

  public openBackendSetting(): void {
    this.CommonService.openBackendSetting();
  }

  public openMoritapoSetting(): void {
    this.CommonService.openMoritapoSetting();
  }

  public search(): void {
    this.$location.search('search', this.searchText);
  }
}

angular.module('app')
  .component('headNav', {
    templateUrl: 'templates/headNav.html',
    controller: HeadNavController,
  });
