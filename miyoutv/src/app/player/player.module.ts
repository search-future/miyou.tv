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

import { SharedModule } from '../shared/shared.module';
import { Player } from './player.service';
import { ControlbarComponent } from './controlbar.component';
import { SeekbarComponent } from './seekbar.component';
import { VideoScreenComponent } from './video-screen.component';
import { FormatTimePipe } from './format-time.pipe';
import { PlayerConfigComponent } from './player-config.component';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SharedModule,
  ],
  exports: [
    ControlbarComponent,
    PlayerConfigComponent,
    SeekbarComponent,
    VideoScreenComponent,
    FormatTimePipe,
  ],
  declarations: [
    ControlbarComponent,
    PlayerConfigComponent,
    SeekbarComponent,
    VideoScreenComponent,
    FormatTimePipe,
  ],
  providers: [
    Player,
  ],
  entryComponents: [
    VideoScreenComponent,
  ],
})
export class PlayerModule { }
