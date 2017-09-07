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
import * as PlayerService from '../services/PlayerService';

declare module angular { }

class VideoScreenController {
  static componentName: string = 'videoScreen';
  static $inject: string[] = [
    '$scope',
    '$element',
    'PlayerService',
  ];

  public text: string;
  public canvasStyle: JQLiteCssProperties = {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    margin: 'auto',
  };
  public textStyle: JQLiteCssProperties = {
    position: 'absolute',
    top: 0,
    right: 0,
    pointerEvents: 'none',
    whiteSpace: 'pre',
    transitionProperty: 'opacity',
    transitionTimingFunction: 'linear',
  };

  constructor(
    private $scope: ng.IScope,
    private $element: ng.IRootElementService,
    private PlayerService: PlayerService.PlayerService,
  ) {

    $scope.$watch(
      (): string => PlayerService.getScreenText(),
      (value: string): void => {
        if (value) {
          this.text = value;
          this.textStyle.opacity = 1;
          this.textStyle.transitionDelay = 0;
          this.textStyle.transitionDuration = 0;
        } else {
          this.textStyle.opacity = 0;
          this.textStyle.transitionDelay = '2s';
          this.textStyle.transitionDuration = '1s';
        }
      },
    );
    $scope.$on('Player.FrameReady', (): void => this.adjustSize());
    $scope.$on('$destroy', (): void => PlayerService.suspend());

    $element.on('wheel', (e: WheelEventInit): void => {
      if (e.deltaX !== 0) {
        this.PlayerService.jumpForward(`${(e.deltaX * 10000) / 120}ms`);
      }
      if (e.deltaY !== 0) {
        this.PlayerService.decreaseVolume(e.deltaY / 60);
      }
    });

    PlayerService.init($element.find('canvas')[0]);

  }

  protected adjustSize(): void {
    const aspectRatioString: string = this.PlayerService.aspectRatio;
    const aspectRatio: string[] = aspectRatioString.split(':');
    let width: number = 0;
    let height: number = 0;

    if (aspectRatio.length === 2) {
      width = this.$element[0].offsetWidth;
      height = (
        (this.$element[0].offsetWidth * parseInt(aspectRatio[1], 10))
        / parseInt(aspectRatio[0], 10)
      );
      if (height > this.$element[0].offsetHeight) {
        width = (
          (this.$element[0].offsetHeight * parseInt(aspectRatio[0], 10))
          / parseInt(aspectRatio[1], 10)
        );
        height = this.$element[0].offsetHeight;
      }
    } else {
      width = this.$element[0].offsetWidth;
      height = this.$element[0].offsetHeight;
    }
    this.canvasStyle.width = `${width}px`;
    this.canvasStyle.height = `${height}px`;
  }
}
angular.module('app')
  .component('videoScreen', {
    template: [
      '<canvas ng-style="$ctrl.canvasStyle"></canvas>',
      '<div ng-style="$ctrl.textStyle" ng-bind="$ctrl.text"></div>',
    ].join(''),
    controller: VideoScreenController,
  });
