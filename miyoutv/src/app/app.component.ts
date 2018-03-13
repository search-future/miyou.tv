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
import { Router } from '@angular/router';
import { Hotkey, HotkeysService } from 'angular2-hotkeys';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { Subscription } from 'rxjs';

import { StorageService } from './shared/storage.service';
import { WindowService } from './shared/window.service';
import { QuitModalComponent } from './shared/quit-modal.component';

@Component({
  selector: 'miyoutv',
  templateUrl: 'app.component.html',
})
export class AppComponent implements OnInit, OnDestroy {
  protected hasModal: boolean;
  private subscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private hotkeysService: HotkeysService,
    private bsModalService: BsModalService,
    private storageService: StorageService,
    private windowService: WindowService,
  ) { }

  get isFullscreen(): boolean {
    return this.windowService.fullscreen;
  }

  public ngOnInit() {
    if (!this.storageService.loadSessionStorage('isLoaded')) {
      this.upgradeSetting();
      this.loadWindowState();
    }
    this.storageService.saveSessionStorage('isLoaded', true);

    this.subscriptions.push(
      this.bsModalService.onHide.subscribe(() => {
        this.hasModal = false;
      }),
      this.bsModalService.onShow.subscribe(() => {
        this.hasModal = true;
      }),
    );

    this.hotkeysService.add([new Hotkey(
      'mod+r',
      (event: KeyboardEvent): boolean => {
        this.router.navigate([], {
          queryParams: {
            refresh: 1,
          },
          queryParamsHandling: 'merge',
        });
        return false;
      },
      [],
      'バックエンドのデータを更新',
    ), new Hotkey(
      'mod+w',
      (event: KeyboardEvent): boolean => {
        this.openQuitModal();
        return false;
      },
      [],
      'MiyouTVを終了',
    ), new Hotkey(
      'esc',
      (event: KeyboardEvent): boolean => {
        if (this.windowService.fullscreen) {
          this.windowService.fullscreen = false;
        } else {
          this.openQuitModal();
        }
        return true;
      },
      [],
      '全画面表示解除/MiyouTVを終了',
    )]);
    if (!this.storageService.loadLocalStorage('isConfigured')) {
      this.router.navigate(['setup'], {
        replaceUrl: true,
      });
    }
  }

  public ngOnDestroy() {
    this.saveWindowState();
    this.subscriptions.forEach((a: Subscription) => {
      a.unsubscribe();
    });
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

  public openQuitModal() {
    if (!this.hasModal) {
      this.bsModalService.show(QuitModalComponent, {
        class: 'modal-dialog-centered',
      });
    }
  }
}
