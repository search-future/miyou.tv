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
import { Component, OnDestroy, OnInit, OnChanges } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Form, Validators } from '@angular/forms';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { StorageService } from '../shared/storage.service';

@Component({
  selector: 'view-setting',
  templateUrl: './view-setting.component.html',
})
export class ViewSettingComponent implements OnInit, OnDestroy {
  public form: FormGroup;
  public autoFormatName: string = '4-27';
  public countMode: string = 'speed';
  public previewEnabled: boolean = true;
  public hourFirst: string = '4';
  public hourFormat: string = '';
  private subscriptions: Subscription[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private bsModalRef: BsModalRef,
    private router: Router,
    private storageService: StorageService,
  ) { }

  public ngOnInit() {
    this.buildForm();
  }

  public ngOnDestroy() {
    this.subscriptions.forEach((a: Subscription) => {
      a.unsubscribe();
    });
  }

  public buildForm() {
    const countMode: string = this.storageService.loadLocalStorage('countMode');
    const previewEnabled: boolean = this.storageService.loadLocalStorage('previewEnabled');
    const hourFirst: number = this.storageService.loadLocalStorage('hourFirst');
    const hourFormat: string = this.storageService.loadLocalStorage('hourFormat');
    this.form = this.formBuilder.group({
      countMode: [
        countMode || 'speed',
        [
          Validators.required,
          Validators.pattern(/^(comment|speed|none)$/),
        ],
      ],
      previewEnabled: [
        typeof previewEnabled === 'boolean' ? previewEnabled : true,
        [
          Validators.required,
        ],
      ],
      hourFirst: [
        typeof hourFirst === 'number' ? String(hourFirst) : '4',
        [
          Validators.required,
          Validators.maxLength(2),
        ],
      ],
      hourFormat: [
        hourFormat || '',
        [
          Validators.required,
          Validators.pattern(/^([0-9][0-9]?:(12|24))?$/),
        ],
      ],
    });
    this.subscriptions.push(
      this.form.valueChanges.subscribe((data: any) => {
        const hour: number = parseInt(data.hourFirst, 10);
        this.autoFormatName = `${hour}-${(hour + 24) - 1}`;
      }),
    );
  }

  public submit() {
    const countMode: string = this.form.value.countMode;
    const previewEnabled: boolean = this.form.value.previewEnabled;
    const hourFirst: number = parseInt(this.form.value.hourFirst, 10);
    const hourFormat: string = this.form.value.hourFormat;

    this.storageService.saveLocalStorage('countMode', countMode);
    this.storageService.saveLocalStorage('previewEnabled', previewEnabled);
    this.storageService.saveLocalStorage('hourFirst', hourFirst);
    this.storageService.saveLocalStorage('hourFormat', hourFormat);
    this.router.navigate([], {
      queryParams: {
        refresh: 1,
      },
      queryParamsHandling: 'merge',
    });
    this.close();
  }

  public close() {
    this.bsModalRef.hide();
  }
}
