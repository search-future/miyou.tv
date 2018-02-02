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
import { ReactiveFormsModule } from '@angular/forms';
import { AgGridModule } from 'ag-grid-angular';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';

import { SharedModule } from '../shared/shared.module';
import { CommentService } from './comment.service';
import { CommentPlayer } from './comment-player.service';
import { CommentConfigComponent } from './comment-config.component';
import { CommentGridComponent } from './comment-grid.component';
import { CommentScreenComponent } from './comment-screen.component';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    BsDropdownModule.forRoot(),
    AgGridModule.withComponents([]),
    SharedModule,
  ],
  exports: [
    CommentConfigComponent,
    CommentGridComponent,
    CommentScreenComponent,
  ],
  declarations: [
    CommentConfigComponent,
    CommentGridComponent,
    CommentScreenComponent,
  ],
  providers: [
    CommentService,
    CommentPlayer,
  ],
})
export class CommentModule { }
