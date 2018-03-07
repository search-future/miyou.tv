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
import { Routes, RouterModule } from '@angular/router';

import { ProgramTableComponent } from './program-table.component';
import { ProgramListComponent } from './program-list.component';
import { ProgramRankingComponent } from './program-ranking.component';
import { ProgramPlayComponent } from './program-play.component';

const routes: Routes = [
  { path: '', redirectTo: 'table', pathMatch: 'full' },
  { path: 'table', component: ProgramTableComponent },
  { path: 'list', component: ProgramListComponent },
  { path: 'ranking', component: ProgramRankingComponent },
  { path: 'play', component: ProgramPlayComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProgramsRoutingModule { }

export const routedComponents = [
  ProgramTableComponent,
  ProgramListComponent,
  ProgramRankingComponent,
  ProgramPlayComponent,
];
