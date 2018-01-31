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
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

import { Player } from './player.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'controlbar',
  templateUrl: 'controlbar.component.html',
})
export class ControlbarComponent implements OnInit, OnDestroy {
  @Input() public commentEnabled: boolean;
  @Input() public fullscreenEnabled: boolean;
  @Input() public sidebarEnabled: boolean;
  @Output() public commentToggle: EventEmitter<null> = new EventEmitter();
  @Output() public fullscreenToggle: EventEmitter<null> = new EventEmitter();
  @Output() public sidebarToggle: EventEmitter<null> = new EventEmitter();
  public form: FormGroup;
  public playing: boolean = false;
  private subscriptions: Subscription[] = [];

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private formBuilder: FormBuilder,
    public player: Player,
  ) { }

  ngOnInit() {
    this.form = this.formBuilder.group({
      volume: [this.player.volume],
    });
    this.subscriptions.push(
      this.form.valueChanges.subscribe((data: any) => {
        this.player.mute = false;
        this.player.volume = data.volume;
      }),
      this.player.event.subscribe(() => {
        this.playing = this.player.playing;
        this.changeDetectorRef.detectChanges();
      }),
      this.player.valueChanges.subscribe(() => {
        this.form.patchValue(
          {
            volume: this.player.volume,
          },
          { emitEvent: false },
        );
        this.changeDetectorRef.detectChanges();
      }),
    );
  }

  public ngOnDestroy() {
    this.subscriptions.forEach((a: Subscription) => {
      a.unsubscribe();
    });
  }
}
