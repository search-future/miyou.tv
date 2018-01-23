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
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable()
export class StorageService {
  private dataPath: string;

  constructor() {
    if (process.versions.electron) {
      this.dataPath = remote.app.getPath('userData');
    }
  }

  public saveLocalStorage(key: string, value: any) {
    if (value != null && typeof value === 'object') {
      window.localStorage.setItem(key, JSON.stringify(value));
    } else {
      window.localStorage.setItem(key, value);
    }
  }

  public loadLocalStorage(key: string): any {
    let value: any;
    try {
      value = JSON.parse(window.localStorage.getItem(key));
    } catch (e) {
      value = window.localStorage.getItem(key);
    }
    return value;
  }

  public removeLocalStorage(key: string) {
    window.localStorage.removeItem(key);
  }

  public saveSessionStorage(key: string, value: any) {
    if (value != null && typeof value === 'object') {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } else {
      window.sessionStorage.setItem(key, value);
    }
  }

  public loadSessionStorage(key: string): any {
    let value: any;

    try {
      value = JSON.parse(window.sessionStorage.getItem(key));
    } catch (e) {
      value = window.sessionStorage.getItem(key);
    }
    return value;
  }

  public removeSessionStorage(key: string) {
    window.sessionStorage.removeItem(key);
  }

  public saveFile(dirname: string, filename: string, value: any): boolean {
    const dirpath: string = path.resolve(this.dataPath, dirname);
    const filepath: string = path.join(this.dataPath, dirname, filename);
    let data: string;
    if (value != null && typeof value === 'object') {
      data = JSON.stringify(value);
    } else {
      data = value;
    }
    try {
      fs.mkdirSync(dirpath);
    } catch (e) {
      if (e.code !== 'EEXIST') {
        return false;
      }
    }
    try {
      fs.writeFileSync(filepath, data);
    } catch (e) {
      return false;
    }
    return true;
  }

  public loadFile(dirname: string, filename: string): any {
    const filepath: string = path.join(this.dataPath, dirname, filename);
    let data: string;
    let value: any;

    try {
      data = fs.readFileSync(filepath, 'utf8');
    } catch (e) {
      return null;
    }
    try {
      value = JSON.parse(data);
    } catch (e) {
      value = data;
    }
    return value;
  }

  public removeFile(dirname: string, filename: string): boolean {
    const filepath: string = path.join(this.dataPath, dirname, filename);
    try {
      fs.unlinkSync(filepath);
    } catch (e) {
      return false;
    }
    return true;
  }
}
