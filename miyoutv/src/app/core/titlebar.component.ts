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
import { ChangeDetectorRef, Component } from '@angular/core';

import { WindowService } from '../shared/window.service';

@Component({
  selector: 'titlebar',
  templateUrl: './titlebar.component.html',
})
export class TitlebarComponent {
  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private windowService: WindowService,
  ) { }

  get isFullscreen(): boolean {
    return this.windowService.fullscreen;
  }
  get isMaximized(): boolean {
    return this.windowService.isMaximized;
  }
  get isAlwaysOnTop(): boolean {
    return this.windowService.alwaysOnTop;
  }

  public toggleAlwaysOnTop() {
    this.windowService.alwaysOnTop = !this.windowService.alwaysOnTop;
    this.changeDetectorRef.detectChanges();
  }

  public minimize() {
    this.windowService.minimize();
    this.changeDetectorRef.detectChanges();
  }

  public maximize() {
    this.windowService.maximize();
    this.changeDetectorRef.detectChanges();
  }

  public restore() {
    this.windowService.restore();
    this.changeDetectorRef.detectChanges();
  }

  public fullscreen() {
    this.windowService.fullscreen = true;
    this.changeDetectorRef.detectChanges();
  }

  public close() {
    this.windowService.close();
  }
}
