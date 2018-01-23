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
import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BsModalService } from 'ngx-bootstrap/modal';
import { Subscription } from 'rxjs';

import { ViewSettingComponent } from './view-setting.component';
import { BackendSettingComponent } from './backend-setting.component';
import { MoritapoSettingComponent } from './moritapo-setting.component';

@Component({
  selector: 'head-nav',
  templateUrl: './head-nav.component.html',
})
export class HeadNavComponent implements OnInit, OnDestroy {
  public searchForm: FormGroup = new FormGroup({});
  public isCollapsed: boolean = true;
  private subscriptions: Subscription[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private modalService: BsModalService,
    private route: ActivatedRoute,
    private router: Router,
  ) { }

  get path(): string {
    return this.router.url.split('?')[0];
  }

  public ngOnInit() {
    this.searchForm = this.formBuilder.group({
      query: [],
    });
    this.subscriptions.push(
      this.route.queryParams.subscribe((params: { [key: string]: any }) => {
        this.searchForm.controls.query.setValue(params.query);
      }),
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach((a: Subscription) => {
      a.unsubscribe();
    });
  }

  public openViewSetting() {
    this.modalService.show(ViewSettingComponent, {
      class: 'modal-dialog-centered',
    });
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

  public search() {
    this.router.navigate(['programs', 'list'], {
      queryParams: {
        query: this.searchForm.value.query,
        page: '1',
      },
    });
  }
}
