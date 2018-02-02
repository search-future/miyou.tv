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
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { CommentPlayer } from './comment-player.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'comment-config',
  templateUrl: 'comment-config.component.html',
})
export class CommentConfigComponent implements OnInit, OnDestroy {
  public form: FormGroup;
  private subscriptions: Subscription[] = [];

  constructor(
    private formBuilder: FormBuilder,
    public commentplayer: CommentPlayer,
  ) { }

  public ngOnInit() {
    this.form = this.formBuilder.group({
      duration: [this.commentplayer.duration / 1000],
      delay: [this.commentplayer.delay / 1000],
      maxLines: [this.commentplayer.maxLines],
      maxItems: [this.commentplayer.maxItems],
    });
    this.subscriptions.push(
      this.form.valueChanges.subscribe((data: any) => {
        const duration: number = data.duration * 1000;
        const delay: number = data.delay * 1000;
        if (
          !isNaN(duration) &&
          duration !== this.commentplayer.duration
        ) {
          this.commentplayer.duration = duration;
        }
        if (
          !isNaN(delay) &&
          delay !== this.commentplayer.delay
        ) {
          this.commentplayer.delay = delay;
        }
        if (
          !isNaN(data.maxLines) &&
          data.maxLines !== this.commentplayer.maxLines
        ) {
          this.commentplayer.maxLines = data.maxLines;
        }
        if (
          !isNaN(data.maxItems) &&
          data.maxItems !== this.commentplayer.maxItems
        ) {
          this.commentplayer.maxItems = data.maxItems;
        }
      }),
      this.commentplayer.valueChanges.subscribe((data: any) => {
        this.form.patchValue(
          Object.assign({}, data, {
            duration: data.duration / 1000,
            delay: data.delay / 1000,
          }),
          { emitEvent: false },
        );
      }),
    );
  }

  public ngOnDestroy() {
    this.subscriptions.forEach((a: Subscription) => {
      a.unsubscribe();
    });
  }
}
