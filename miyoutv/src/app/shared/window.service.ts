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
import * as path from 'path';
import * as fs from 'fs';
import { remote } from 'electron';
import { Injectable } from '@angular/core';

@Injectable()
export class WindowService {
  private app: Electron.App;
  private shell: Electron.Shell;
  private win: Electron.BrowserWindow;
  private powerSaveBlocker: Electron.PowerSaveBlocker;
  private dataPath: string;
  private powerSaveBlockerId: number;

  constructor(
  ) {
    if (process.versions.electron) {
      this.app = remote.app;
      this.shell = remote.shell;
      this.win = remote.getCurrentWindow();
      this.powerSaveBlocker = remote.powerSaveBlocker;
    }
  }

  get window(): Electron.BrowserWindow {
    return this.win;
  }
  get isMaximized(): boolean {
    return this.win.isMaximized();
  }
  get isMinimized(): boolean {
    return this.win.isMinimized();
  }
  set fullscreen(flag: boolean) {
    this.win.setFullScreen(flag);
  }
  get fullscreen(): boolean {
    return this.win.isFullScreen();
  }
  set alwaysOnTop(flag: boolean) {
    this.win.setAlwaysOnTop(flag);
  }
  get alwaysOnTop(): boolean {
    return this.win.isAlwaysOnTop();
  }
  set powerSave(flag: boolean) {
    if (flag) {
      this.powerSaveBlocker.stop(this.powerSaveBlockerId);
    } else {
      this.powerSaveBlockerId = this.powerSaveBlocker.start('prevent-display-sleep');
    }
  }
  get powerSave(): boolean {
    return !(
      this.powerSaveBlockerId != null &&
      this.powerSaveBlocker.isStarted(this.powerSaveBlockerId)
    );
  }

  public openExternal(url: string, options?: { activate: boolean }) {
    this.shell.openExternal(url, options);
  }

  public maximize() {
    this.win.maximize();
  }

  public minimize() {
    this.win.minimize();
  }

  public restore() {
    this.win.restore();
  }

  public close() {
    this.win.close();
  }

  public reload() {
    this.win.reload();
  }

  public back() {
    window.history.back();
  }

  public quit() {
    this.app.quit();
  }
}
