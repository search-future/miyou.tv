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
  Input,
  QueryList,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { AnimationBuilder, AnimationPlayer, style, animate } from '@angular/animations';
import { Observable, Subscription } from 'rxjs';

import { CommentPlayer } from './comment-player.service';

@Component({
  selector: 'comment-screen',
  template: `
    <div #screen *ngIf="commentPlayer.enabled" [ngStyle]="style" (window.resize)="adjustFont()">
      <div #comments *ngFor="let comment of comments" [ngStyle]="comment.style">
        {{comment.text}}
      </div>
    </div>
  `,

})
export class CommentScreenComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('screen') screen: ElementRef;
  @ViewChildren('comments') elements: QueryList<ElementRef>;
  public comments: any[] = [];
  public style: any = {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    margin: 'auto',
  };
  protected pointer: number = 0;
  protected lines: any[] = [];
  protected time: number = 0;
  private subscriptions: Subscription[] = [];

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private animationBuilder: AnimationBuilder,
    public commentPlayer: CommentPlayer,
  ) { }

  public initItems(size: number) {
    const max: number = size || 50;
    this.comments = [];
    for (let i: number = 0; i < max; i += 1) {
      this.comments.push({
        style: {
          position: 'absolute',
          right: '100%',
        },
      });
    }
    this.pointer = 0;
  }

  public initLines(size: number) {
    const max: number = size || 10;
    const lines: any[] = [];
    for (let i: number = 0; i < max; i += 1) {
      lines.push(null);
    }
    this.lines = lines;
    this.adjustFont();
  }

  public adjustFont(): void {
    if (this.screen) {
      const lineHeight: number = this.screen.nativeElement.clientHeight / this.lines.length + 1;
      const fontSize: number = (lineHeight * 2) / 3;
      this.style.fontSize = `${fontSize}px`;
    }
  }

  public ngOnInit() {
    this.initLines(this.commentPlayer.maxLines);
    this.initItems(this.commentPlayer.maxItems);
    this.subscriptions.push(
      this.commentPlayer.enabledChange.subscribe((enabled: boolean) => {
        if (!enabled) {
          this.refresh();
        }
      }),
      this.commentPlayer.valueChanges.subscribe((data: any) => {
        this.initLines(data.maxLines);
        this.initItems(data.maxItems);
      }),
      this.commentPlayer.comment.buffer(this.commentPlayer.time).filter((data: any[]): boolean => (
        data.length > 0
      )).mergeMap((data: any[]): Observable<any> => (
        Observable.concat(...data.slice(-this.commentPlayer.maxLines).map(
          (a: any, i: number): Observable<any> => Observable.of(a),
        ))
      )).subscribe((data: any) => {
        if (this.commentPlayer.enabled) {
          const text: string = data.text.replace(
            />{1,2}[0-9-]+/g, '',
          ).replace(
            /^>.+$/g, '',
          ).replace(
            /[a-zA-Z]+:\/\/\S+/g, '',
          ).trim();
          if (text) {
            this.deploy(Object.assign({}, data, { text }));
          }
        }
      }),
      this.commentPlayer.time.subscribe((time: number) => {
        if (
          time < this.time ||
          time - this.time > 60000
        ) {
          this.refresh();
        }
        this.time = time;
      }),
    );
  }

  public ngAfterViewChecked() {
    this.adjustFont();
  }

  public ngOnDestroy() {
    this.subscriptions.forEach((a: Subscription) => {
      a.unsubscribe();
    });
  }

  protected deploy(data: any) {
    const comment: any = this.comments[this.pointer];
    comment.element = this.elements.find((a: any, index: number): boolean => (
      index === this.pointer
    ));
    this.pointer += 1;
    if (this.pointer + 1 >= this.commentPlayer.maxItems) {
      this.pointer = 0;
    }

    comment.time = data.time - this.commentPlayer.offset.getTime();
    comment.text = data.text;
    this.changeDetectorRef.detectChanges();
    comment.width = comment.element.nativeElement.offsetWidth;
    const index: number = this.selectLine(comment);
    comment.index = index;
    this.lines[Math.floor(index)] = comment;
    comment.style.top = `${(100 * index) / (this.lines.length + 1)}%`;
    this.changeDetectorRef.detectChanges();
    this.initAnimation(comment);
  }

  protected selectLine(comment: any) {
    const screenWidth: number = this.screen.nativeElement.clientWidth;
    const reachTime: number = (
      this.commentPlayer.duration * screenWidth / (screenWidth + comment.width)
    );
    let candidateLife: number = Infinity;
    let candidateRight: number = Infinity;
    let candidateIndex: number = 0;

    let remainingTime: number = 0;
    let right: number = 0;

    for (let i = 0; i < this.lines.length; i += 1) {
      if (!this.lines[i] || !this.lines[i].text) {
        return i;
      }
      remainingTime = this.lines[i].time + this.commentPlayer.duration - this.time;
      right = this.lines[i].element.nativeElement.offsetLeft + this.lines[i].width;
      if (remainingTime <= reachTime && right <= screenWidth) {
        return i;
      }
      if (remainingTime <= candidateLife && right < candidateRight) {
        candidateLife = remainingTime;
        candidateRight = right;
        candidateIndex = this.lines[i].index || i;
      }
    }
    if (Math.floor(candidateIndex + 0.25) > Math.floor(candidateIndex)) {
      candidateIndex -= 1;
    }
    return candidateIndex + 0.25;
  }

  protected initAnimation(comment: any): void {
    if (comment.animation) {
      comment.animation.destroy();
    }
    comment.animation = this.animationBuilder.build([
      style({ right: `${-comment.element.nativeElement.offsetWidth}px` }),
      animate(
        `${this.commentPlayer.duration}ms linear`,
        style({ right: '100%' }),
      ),
    ]).create(comment.element.nativeElement);
    comment.animation.onDestroy(() => {
      comment.destroyed = true;
    });
    comment.animation.onDone(() => {
      if (comment.destroyed) {
        comment.destroyed = false;
      } else {
        comment.text = '';
      }
    });
    comment.animation.play();
  }

  protected refresh() {
    for (const comment of this.comments) {
      comment.text = '';
      if (comment.animation) {
        comment.animation.finish();
      }
    }
    this.pointer = 0;
  }
}
