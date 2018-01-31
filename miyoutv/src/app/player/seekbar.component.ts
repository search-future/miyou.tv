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
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';

import { StorageService } from '../shared/storage.service';
import { Player } from './player.service';

@Component({
  selector: 'seekbar',
  templateUrl: 'seekbar.component.html',
})
export class SeekbarComponent implements OnInit, OnDestroy {
  @Input() public offset: Date;
  @Input() public showPrevious: boolean;
  @Input() public showNext: boolean;
  @Input() public chapters: number[] = [];
  @Input() public chartPoints: string;
  @Output() public previous: EventEmitter<null> = new EventEmitter();
  @Output() public next: EventEmitter<null> = new EventEmitter();
  public form: FormGroup;
  public hourFirst: number = 4;
  public hourFormat: string = '';
  public useClock: boolean = true;
  public time: number = 0;
  public length: number = 0;
  public clockTime: Date;
  public endTime: Date;
  public isSeeking: boolean = false;
  private subscriptions: Subscription[] = [];

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private formBuilder: FormBuilder,
    private storageService: StorageService,
    private player: Player,
  ) { }

  public ngOnInit() {
    this.hourFirst = this.storageService.loadLocalStorage('hourFirst');
    this.hourFormat = this.storageService.loadLocalStorage('hourFormat') || '';
    if (this.hourFirst == null) {
      this.hourFirst = 4;
    }
    this.form = this.formBuilder.group({
      position: [0],
    });
    this.subscriptions.push(
      this.form.valueChanges.subscribe((data) => {
        if (this.isSeeking) {
          this.player.position = data.position;
        }
      }),
      this.player.event.filter((event: any): boolean => (
        event.name === 'PositionChanged'
      )).subscribe((event: any) => {
        if (!this.isSeeking) {
          this.form.patchValue({ position: event.position }, { emitEvent: false });
        }
        this.time = this.player.time;
        this.length = this.player.length;
        if (this.offset) {
          this.clockTime = new Date(this.offset.getTime() + this.time);
          this.endTime = new Date(this.offset.getTime() + this.length);
        }
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
