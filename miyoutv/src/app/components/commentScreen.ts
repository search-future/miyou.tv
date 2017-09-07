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
import * as CommentService from '../services/CommentService';

declare module angular { }

interface CommentData extends CommentService.Comment {
  enabled: boolean;
}

interface CommentObject {
  style?: JQLiteCssProperties;
  time?: number;
  element?: JQuery<HTMLElement>;
  index?: number;
  text?: string;
}

class CommentScreenController {
  static componentName: string = 'commentScreen';
  static $inject: string[] = [
    '$scope',
    '$element',
    '$window',
    '$timeout',
    'PlayerService',
  ];

  protected offset: number = 0;
  protected time: number = 0;
  protected duration: number = 5000;
  protected lines: CommentObject[] = [];
  protected dp: number = 0;
  protected cp: number = 0;

  public enabled: boolean;
  public options: {
    offset: number;
    duration: number;
    maxLines: number;
    maxItems: number;
  };
  public data: CommentData[];
  public comments: CommentObject[] = [];

  constructor(
    private $scope: ng.IScope,
    private $element: ng.IRootElementService,
    private $window: ng.IWindowService,
    private $timeout: ng.ITimeoutService,
    private PlayerService: PlayerService.PlayerService,
  ) {
    $scope.$watchGroup(
      [
        (): boolean => this.enabled,
        (): number => $element[0].clientWidth,
        (): number => $element[0].clientHeight,
      ],
      (values: [boolean, number, number]): void => {
        const [enabled, width, height]: [boolean, number, number] = values;
        if (!enabled || width <= 0 || height <= 0) {
          this.comments.forEach((a: CommentObject): void => {
            a.style.visibility = 'hidden';
          });
        } else {
          this.adjustLines();
        }
      });
    $scope.$watch(
      (): number => this.options.offset,
      (value: number): void => {
        this.offset = value || this.offset;
      },
    );
    $scope.$watch(
      (): number => this.options.duration,
      (value: number): void => {
        this.duration = value || this.duration;
      },
    );
    $scope.$watch(
      (): number => this.options.maxLines,
      (value: number): void => {
        const max: number = value || 10;
        const lines: CommentObject[] = [];
        for (let i: number = 0; i < max; i += 1) {
          lines.push(null);
        }
        this.lines = lines;
        this.adjustLines();
      },
    );
    $scope.$watch(
      (): number => this.options.maxItems,
      (value: number): void => {
        const max: number = value || 50;
        this.comments = [];
        for (let i: number = 0; i < max; i += 1) {
          this.comments.push({
            style: {
              position: 'absolute',
              visibility: 'hidden',
              transitionProperty: 'left',
              transitionTimingFunction: 'linear',
            },
          });
        }
        this.cp = 0;
        $timeout((): void => {
          for (let i: number = 0; i < this.comments.length; i += 1) {
            this.comments[i].element = $element.children().children().eq(i);
            this.initComment(this.comments[i]);
          }
        });
      });
    $scope.$watchCollection(
      (): CommentData[] => this.data,
      (): void => {
        this.dp = 0;
      },
    );
    $scope.$watch(
      (): number => PlayerService.time,
      (newValue: number, oldValue: number): void => {
        if (!this.enabled || $element[0].clientWidth <= 0 || $element[0].clientHeight <= 0) {
          return;
        }
        let start: number = oldValue + this.offset;
        const end: number = newValue + this.offset;
        if (newValue < oldValue) {
          this.dp = 0;
          this.comments.forEach((a: CommentObject): void => {
            a.style.visibility = 'hidden';
          });
        } else if (newValue - oldValue > this.duration) {
          start = (newValue - this.duration) + this.offset;
          this.comments.forEach((a: CommentObject): void => {
            a.style.visibility = 'hidden';
          });
        }
        while (this.dp < this.data.length) {
          if (this.data[this.dp].time >= end) {
            break;
          }
          if (this.data[this.dp].enabled !== false && this.data[this.dp].time >= start) {
            this.time = newValue;
            this.deployComment(this.data[this.dp]);
          }
          this.dp += 1;
        }
      },
    );
  }

  public $onInit(): void {
    angular.element(this.$window).on('resize', (): void => this.adjustLines());
  }

  public $onDestroy(): void {
    angular.element(this.$window).off('resize', (): void => this.adjustLines());
  }

  protected selectLine(comment: CommentObject): number {
    const screenWidth: number = this.$element[0].clientWidth;
    const commentWidth: number = comment.element[0].offsetWidth;
    const reachTime: number = (this.duration * screenWidth) / (screenWidth + commentWidth);
    let candidateLife: number = Infinity;
    let candidateRight: number = Infinity;
    let candidateIndex: number = 0;

    let remainingTime: number = 0;
    let lineElement: HTMLElement = null;
    let right: number = 0;

    for (let i: number = 0; i < this.lines.length; i += 1) {
      if (!this.lines[i] || this.lines[i].style.visibility === 'hidden') {
        return i;
      }
      remainingTime = (this.lines[i].time + this.duration) - comment.time;
      lineElement = this.lines[i].element[0];
      right = lineElement.offsetLeft + lineElement.offsetWidth;
      if (remainingTime <= reachTime && right <= this.$element[0].clientWidth) {
        return i;
      }
      if (remainingTime <= candidateLife && right < candidateRight) {
        candidateLife = remainingTime;
        candidateRight = right;
        candidateIndex = this.lines[i].index || i;
      }
    }
    if (Math.floor(candidateIndex + 0.25) >= Math.floor(candidateIndex)) {
      candidateIndex -= 1;
    }
    return candidateIndex + 0.25;
  }

  protected initComment(comment: CommentObject): void {
    comment.element.on('transitionend', (): void => {
      comment.style.visibility = 'hidden';
    });
  }

  protected initAnimation(comment: CommentObject): void {
    comment.style.transitionDuration = 0;
    comment.style.transitionDelay = 0;
    comment.style.left = '100%';
    this.$timeout((): void => {
      comment.style.transitionDuration = `${this.duration}ms`;
      comment.style.transitionDelay = `${comment.time - this.time}ms`;
      comment.style.left = `${-comment.element[0].offsetWidth}px`;
    });
  }

  protected adjustLines(): void {
    const lineHeight: number = this.$element[0].clientHeight / this.lines.length;
    const fontSize: number = (lineHeight * 2) / 3;

    this.$element.css('fontSize', `${fontSize}px`);
  }

  protected deployComment(data: CommentData): void {
    const comment: CommentObject = this.comments[this.cp];

    comment.time = data.time - this.offset;
    comment.text = data.text;
    comment.style.opacity = 0;
    comment.style.visibility = 'visible';
    this.$timeout((): void => {
      const index: number = this.selectLine(comment);

      comment.index = index;
      this.lines[Math.floor(index)] = comment;
      comment.style.top = `${(100 * index) / (this.lines.length + 1)}%`;
      comment.style.opacity = 1;
      this.initAnimation(comment);
    });
    this.cp += 1;
    if (this.cp >= this.comments.length) {
      this.cp = 0;
    }
  }
}

angular.module('app')
  .component('commentScreen', {
    template: [
      '<div ng-show="$ctrl.enabled">',
      '<div',
      'ng-repeat="comment in $ctrl.comments"',
      'ng-style="comment.style"',
      'ng-bind="comment.text"',
      '></div>',
      '</div>',
    ].join(' '),
    controller: CommentScreenController,
    bindings: {
      enabled: '<',
      options: '<',
      data: '<',
    },
  });
