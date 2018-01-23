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
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import {
  categoryTable,
  commentTokenUrl,
  commentUrl,
  garaponAuthUrl,
  garaponAuthUrlV4,
  garaponDevId,
  garaponSiteUrl,
} from './app.constants';
import { SharedModule } from './shared/shared.module';
import { AppComponent } from './app.component';

@NgModule({
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    SharedModule,
  ],
  declarations: [AppComponent],
  bootstrap: [AppComponent],
  providers: [
    { provide: 'categoryTable', useValue: categoryTable },
    { provide: 'commentTokenUrl', useValue: commentTokenUrl },
    { provide: 'commentUrl', useValue: commentUrl },
    { provide: 'garaponAuthUrl', useValue: garaponAuthUrl },
    { provide: 'garaponAuthUrlV4', useValue: garaponAuthUrlV4 },
    { provide: 'garaponDevId', useValue: garaponDevId },
    { provide: 'garaponSiteUrl', useValue: garaponSiteUrl },
  ],
})
export class AppModule { }
