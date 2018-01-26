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
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { AlertModule } from 'ngx-bootstrap/alert';
import { ModalModule } from 'ngx-bootstrap/modal';

import { SharedModule } from '../shared/shared.module';
import { TitlebarComponent } from './titlebar.component';
import { ViewSettingComponent } from './view-setting.component';


@NgModule({
  imports: [
    BrowserModule,
    ReactiveFormsModule,
    RouterModule,
    AlertModule.forRoot(),
    ModalModule.forRoot(),
    SharedModule,
  ],
  exports: [
    TitlebarComponent,
    ViewSettingComponent,
  ],
  declarations: [
    TitlebarComponent,
    ViewSettingComponent,
  ],
  entryComponents: [
    ViewSettingComponent,
  ],
})
export class CoreModule { }

