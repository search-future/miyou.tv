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

class ControlbarController {
  static componentName: string = 'controlbar';
  static $inject: string[] = [
    '$scope',
    'CommonService',
    'PlayerService',
  ];

  public commentEnabled: boolean;
  public sidebarCollapsed: boolean;
  public isFullscreen: boolean = false;
  public playing: boolean = false;
  public mute: boolean = false;
  public volume: number = 100;

  constructor(
    private $scope: ng.IScope,
    private CommonService: CommonService.CommonService,
    private PlayerService: PlayerService.PlayerService,
  ) {
    $scope.$watch(
      (): boolean => CommonService.fullscreen,
      (value: boolean): void => {
        this.isFullscreen = value;
      },
    );
    $scope.$watch(
      (): boolean => PlayerService.playing,
      (value: boolean): void => {
        this.playing = value;
      },
    );
    $scope.$watch(
      (): boolean => PlayerService.mute,
      (value: boolean): void => {
        this.mute = value;
      },
    );
    $scope.$watch(
      (): number => PlayerService.volume,
      (value: number): void => {
        this.volume = value;
      },
    );
  }

  public stop(): void {
    this.CommonService.back();
  }

  public togglePause(): void {
    this.PlayerService.togglePause();
  }

  public speedUp(): void {
    this.PlayerService.speedUp();
  }

  public speedDown(): void {
    this.PlayerService.speedDown();
  }

  public jumpForward(value: string): void {
    this.PlayerService.jumpForward(value);
  }

  public jumpBackward(value: string): void {
    this.PlayerService.jumpBackward(value);
  }

  public toggleMute(): void {
    this.PlayerService.toggleMute();
  }

  public setVolume(volume: number): void {
    this.PlayerService.volume = volume;
  }

  public toggleFullscreen(): void {
    this.CommonService.fullscreen = !this.CommonService.fullscreen;
  }

  public toggleComment(): void {
    this.commentEnabled = !this.commentEnabled;
  }

  public toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

}

angular.module('app')
  .component('controlbar', {
    templateUrl: 'templates/controlbar.html',
    controller: ControlbarController,
    bindings: {
      commentEnabled: '=',
      sidebarCollapsed: '=',
    },
  });
