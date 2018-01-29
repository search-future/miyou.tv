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

import { StorageService } from './shared/storage.service';
import { WindowService } from './shared/window.service';

@Component({
  selector: 'miyoutv',
  templateUrl: 'app.component.html',
})
export class AppComponent implements OnInit, OnDestroy {
  constructor(
    private storageService: StorageService,
    private windowService: WindowService,
  ) { }

  public ngOnInit() {
    if (!this.storageService.loadSessionStorage('isLoaded')) {
      this.upgradeSetting();
      this.loadWindowState();
    }
    this.storageService.saveSessionStorage('isLoaded', true);
  }

  public ngOnDestroy() {
    this.saveWindowState();
  }

  protected upgradeSetting() {
    const chinachuSetting: any = this.storageService.loadLocalStorage('chinachu');
    if (chinachuSetting != null && typeof chinachuSetting === 'object') {
      this.storageService.saveLocalStorage('chinachuUrl', chinachuSetting.url);
      this.storageService.saveLocalStorage('chinachuUser', chinachuSetting.user);
      this.storageService.saveLocalStorage('chinachuPassword', chinachuSetting.password);
      this.storageService.removeLocalStorage('chinachu');
    }
    this.storageService.removeLocalStorage('commentCache');
    this.storageService.removeLocalStorage('commentCountCache');
    this.storageService.removeLocalStorage('comment_token');
    this.storageService.removeFile('comments', 'commentCache.json');
  }

  public saveWindowState() {
    if (!(
      this.windowService.isMinimized ||
      this.windowService.isMaximized ||
      this.windowService.fullscreen
    )) {
      this.storageService.saveLocalStorage('windowState', {
        x: window.screenX,
        y: window.screenY,
        width: window.outerWidth,
        height: window.outerHeight,
      });
      this.storageService.saveLocalStorage('alwaysOnTop', this.windowService.alwaysOnTop);
    }
  }

  public loadWindowState() {
    const windowState: any = this.storageService.loadLocalStorage('windowState') || {};
    window.moveTo(windowState.x, windowState.y);
    window.resizeTo(windowState.width, windowState.height);
    this.windowService.alwaysOnTop = this.storageService.loadLocalStorage('alwaysOnTop') === true;
  }
}
