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
import { FormBuilder, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Subscription } from 'rxjs';

import { StorageService } from '../shared/storage.service';
import { WindowService } from '../shared/window.service';

@Component({
  selector: 'backend-setting',
  templateUrl: './backend-setting.component.html',
})
export class BackendSettingComponent implements OnInit, OnDestroy {
  public form: FormGroup = new FormGroup({});
  public garaponEnabled: boolean = false;
  public garaponEntryUrl: string = 'http://miyou.tv/apply-garapon/';
  private subscriptions: Subscription[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private modalRef: BsModalRef,
    private storageService: StorageService,
    private windowService: WindowService,
  ) { }

  public ngOnInit() {
    const backendType: string = this.storageService.loadLocalStorage('backendType');
    const chinachuUrl: string = this.storageService.loadLocalStorage('chinachuUrl');
    const chinachuUser: string = this.storageService.loadLocalStorage('chinachuUser');
    const chinachuPassword: string = this.storageService.loadLocalStorage('chinachuPassword');
    const garaponAuth: boolean = this.storageService.loadLocalStorage('garaponAuth');
    const garaponUrl: string = this.storageService.loadLocalStorage('garaponUrl');
    const garaponUser: string = this.storageService.loadLocalStorage('garaponUser');
    const garaponPassword: string = this.storageService.loadLocalStorage('garaponPassword');
    const playerMode: string = this.storageService.loadLocalStorage('playerMode');

    this.garaponEnabled = true;
    this.form = this.formBuilder.group({
      backendType: [
        backendType || 'chinachu',
        Validators.required,
      ],
      chinachuAuth: [
        !!chinachuUser || !!chinachuPassword,
      ],
      chinachuUrl: [
        chinachuUrl || '',
        (c: FormControl): any => (
          this.form.value.backendType === 'chinachu' ? Validators.required(c) : null
        ),
      ],
      chinachuUser: [
        chinachuUser || '',
        (c: FormControl): any => (
          this.form.value.backendType === 'chinachu' && this.form.value.chinachuAuth ?
            Validators.required(c) : null
        ),
      ],
      chinachuPassword: [
        chinachuPassword || '',
        (c: FormControl): any => (
          this.form.value.backendType === 'chinachu' && this.form.value.chinachuAuth ?
            Validators.required(c) : null
        ),
      ],
      garaponAuth: [
        typeof garaponAuth === 'boolean' ? garaponAuth : true,
      ],
      garaponUrl: [
        garaponUrl || '',
        (c: FormControl): any => (
          this.form.value.backendType === 'garapon' && !this.form.value.garaponAuth ?
            Validators.required(c) : null
        ),
      ],
      garaponUser: [
        garaponUser || '',
        (c: FormControl): any => (
          /^garapon/.test(this.form.value.backendType) ? Validators.required(c) : null
        ),
      ],
      garaponPassword: [
        garaponPassword || '',
        (c: FormControl): any => (
          /^garapon/.test(this.form.value.backendType) ? Validators.required(c) : null
        ),
      ],
      playerMode: [
        playerMode || 'mpv',
      ],
    });

    this.subscriptions.push(
      this.form.valueChanges.subscribe(() => {
        for (const key in this.form.controls) {
          this.form.controls[key].updateValueAndValidity({ onlySelf: true, emitEvent: false });
        }
      }),
    );
  }

  public ngOnDestroy() {
    this.subscriptions.forEach((a: Subscription) => {
      a.unsubscribe();
    });
  }

  public open(url: string) {
    this.windowService.openExternal(url);
  }

  public submit() {
    this.storageService.saveLocalStorage('backendType', this.form.value.backendType);
    switch (this.form.value.backendType) {
      case 'chinachu':
        this.storageService.saveLocalStorage('chinachuUrl', this.form.value.chinachuUrl);
        this.storageService.saveLocalStorage(
          'chinachuUser',
          this.form.value.chinachuAuth ? this.form.value.chinachuUser : '',
        );
        this.storageService.saveLocalStorage(
          'chinachuPassword',
          this.form.value.chinachuAuth ? this.form.value.chinachuPassword : '',
        );
        this.storageService.saveLocalStorage('playerMode', this.form.value.playerMode);
        break;
      case 'garapon':
        this.storageService.saveLocalStorage('garaponAuth', this.form.value.garaponAuth);
        this.storageService.saveLocalStorage(
          'garaponUrl',
          this.form.value.garaponAuth ? '' : this.form.value.garaponUrl,
        );
        this.storageService.saveLocalStorage('garaponUser', this.form.value.garaponUser);
        this.storageService.saveLocalStorage('garaponPassword', this.form.value.garaponPassword);
        this.storageService.saveLocalStorage('playerMode', this.form.value.playerMode);
        break;
      case 'garaponv4':
        this.storageService.saveLocalStorage('garaponUser', this.form.value.garaponUser);
        this.storageService.saveLocalStorage('garaponPassword', this.form.value.garaponPassword);
        this.storageService.saveLocalStorage('playerMode', this.form.value.playerMode);
        break;
      default:
    }
    this.router.navigate([], {
      queryParams: {
        refresh: 1,
      },
    });
    this.close();
  }

  public close() {
    this.modalRef.hide();
  }
}
