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
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { StorageService } from '../shared/storage.service';
import { WindowService } from '../shared/window.service';

@Component({
  selector: '',
  templateUrl: './moritapo-setting.component.html',
})
export class MoritapoSettingComponent implements OnInit {
  public form: FormGroup;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private bsModalRef: BsModalRef,
    private storageService: StorageService,
    private windowService: WindowService,
  ) { }

  public ngOnInit() {
    const email: string = String(this.storageService.loadLocalStorage('moritapoEmail'));
    const password: string = String(this.storageService.loadLocalStorage('moritapoPassword'));
    this.form = this.formBuilder.group({
      email: [
        email,
        [
          Validators.required,
          Validators.email,
        ],
      ],
      password: [
        password,
        Validators.required,
      ],
    });
  }

  public open(url: string) {
    this.windowService.openExternal(url);
  }

  public submit() {
    this.storageService.saveLocalStorage('moritapoEmail', this.form.value.email || '');
    this.storageService.saveLocalStorage('moritapoPassword', this.form.value.password || '');
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
