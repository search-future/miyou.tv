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
  AfterViewChecked,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';

import { Player } from './player.service';

@Component({
  selector: 'video-screen',
  template: '<canvas [ngStyle]="canvasStyle" (window:resize)="adjustSize()" #screen></canvas> \
    <div [ngStyle]="textStyle">{{text}}</div>',
})
export class VideoScreenComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('screen') screen: ElementRef;
  public canvasStyle: any = {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    margin: 'auto',
  };
  public text: string;
  public textStyle: any = {
    position: 'absolute',
    top: 0,
    right: 0,
    pointerEvents: 'none',
    whiteSpace: 'pre',
    transitionProperty: 'opacity',
    transitionTimingFunction: 'linear',
  };
  private subscriptions: Subscription[] = [];

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private elementRef: ElementRef,
    private player: Player,
  ) { }

  public ngOnInit() {
    this.player.init(this.screen.nativeElement);
    this.player.screenText.do((screenText: any) => {
      if (this.player.active || screenText.force) {
        this.text = screenText.message;
        this.textStyle.opacity = 1;
        this.textStyle.transitionDelay = '0s';
        this.textStyle.transitionDuration = '0s';
      }
    }).delay(0).subscribe(() => {
      this.textStyle.opacity = 0;
      this.textStyle.transitionDelay = '2s';
      this.textStyle.transitionDuration = '1s';
    });
  }

  public ngAfterViewChecked() {
    this.adjustSize();
  }

  public ngOnDestroy() {
    this.player.suspend();
    this.subscriptions.forEach((a: Subscription) => {
      a.unsubscribe();
    });
  }

  public adjustSize(): void {
    const element: HTMLElement = this.elementRef.nativeElement;
    const aspectRatioString: string = this.player.aspectRatio;
    const aspectRatio: string[] = aspectRatioString.split(':');
    let width: number = 0;
    let height: number = 0;

    if (aspectRatio.length === 2) {
      width = element.offsetWidth;
      height = (
        (element.offsetWidth * parseInt(aspectRatio[1], 10))
        / parseInt(aspectRatio[0], 10)
      );
      if (height > element.offsetHeight) {
        width = (
          (element.offsetHeight * parseInt(aspectRatio[0], 10))
          / parseInt(aspectRatio[1], 10)
        );
        height = element.offsetHeight;
      }
    } else {
      width = element.offsetWidth;
      height = element.offsetHeight;
    }
    this.canvasStyle.width = `${width}px`;
    this.canvasStyle.height = `${height}px`;
  }
}
