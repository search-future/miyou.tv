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
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HotkeyModule } from 'angular2-hotkeys';
import { ToastModule } from 'ng2-toastr/ng2-toastr';
import { CollapseModule } from 'ngx-bootstrap/collapse';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { PaginationModule } from 'ngx-bootstrap/pagination';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { ContextMenuModule } from 'ngx-contextmenu';

import { CommentModule } from '../comment/comment.module';
import { SharedModule } from '../shared/shared.module';
import { PlayerModule } from '../player/player.module';
import { routedComponents, ProgramsRoutingModule } from './programs-routing.module';
import { ProgramsService } from './programs.service';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    HotkeyModule,
    ReactiveFormsModule,
    ToastModule.forRoot(),
    CollapseModule.forRoot(),
    BsDatepickerModule.forRoot(),
    BsDropdownModule.forRoot(),
    PaginationModule.forRoot(),
    TabsModule.forRoot(),
    ContextMenuModule.forRoot({
      useBootstrap4: true,
      autoFocus: true,
    }),
    CommentModule,
    SharedModule,
    PlayerModule,
    ProgramsRoutingModule,
  ],
  declarations: [
    routedComponents,
  ],
  providers: [
    ProgramsService,
  ],
})
export class ProgramsModule { }
