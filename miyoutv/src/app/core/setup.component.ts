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
import { Router } from '@angular/router';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';

import { StorageService } from '../shared/storage.service';
import { WindowService } from '../shared/window.service';
import { ViewSettingComponent } from './view-setting.component';
import { BackendSettingComponent } from './backend-setting.component';
import { MoritapoSettingComponent } from './moritapo-setting.component';

@Component({
  selector: 'setup',
  templateUrl: 'setup.component.html',
})

export class SetupComponent implements OnInit {
  protected bsModalRef: BsModalRef;
  public garaponEntryUrl: string = 'http://miyou.tv/apply-garapon/';

  constructor(
    private router: Router,
    private modalService: BsModalService,
    private storageService: StorageService,
    private windowService: WindowService,
  ) { }

  ngOnInit() { }

  public open(url: string) {
    this.windowService.openExternal(url);
  }

  public openBackendSetting() {
    this.modalService.show(BackendSettingComponent, {
      class: 'modal-dialog-centered',
    });
  }

  public openMoritapoSetting() {
    this.modalService.show(MoritapoSettingComponent, {
      class: 'modal-dialog-centered',
    });
  }

  public openViewSetting() {
    this.modalService.show(ViewSettingComponent, {
      class: 'modal-dialog-centered',
    });
  }

  public complete() {
    this.storageService.saveLocalStorage('isConfigured', true);
    this.router.navigate([''], {
      replaceUrl: true,
    });
  }
}
