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
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subscriber } from 'rxjs';

import { StorageService } from './storage.service';

interface PreviewCache {
  url: string;
  key: string;
  time: number;
}

interface PreviewRequest {
  url: string;
  subscriber: Subscriber<string>;
}

@Injectable()
export class ImageLoader {
  public reverse: boolean = false;
  public timeout: number = 10000;
  public previewCacheLifetime: number = 604800000;
  protected processing: boolean = false;
  protected previewCache: PreviewCache[] = [];
  protected requests: {
    url: string;
    subscriber: Subscriber<string>;
  }[] = [];

  constructor(
    private httpClient: HttpClient,
    private storageService: StorageService,
  ) {
    this.initCache();
  }

  public loadNow(url: string, useCache: boolean = true): Observable<string> {
    return Observable.create((subscriber: Subscriber<string>) => {
      let cache: string;
      if (useCache) {
        cache = this.loadCache(url);
      }
      if (cache) {
        subscriber.next(cache);
        subscriber.complete();
      } else {
        this.httpClient.request('GET', url, {
          responseType: 'blob',
        }).timeout(this.timeout).subscribe(
          (response: Blob) => {
            if (response.size > 0) {
              const reader: FileReader = new FileReader();
              reader.onload = () => {
                subscriber.next(reader.result);
                subscriber.complete();
                this.saveCache(url, reader.result);
              };
              reader.onerror = () => {
                subscriber.error(reader.error);
              };
              reader.readAsDataURL(response);
            } else {
              subscriber.error(response);
            }
          },
          (error: any) => {
            subscriber.error(error);
          },
        );
      }
    });
  }

  public load(url: string, useCache: boolean = true): Observable<string> {
    return Observable.create((subscriber: Subscriber<string>) => {
      let cache: string;
      if (useCache) {
        cache = this.loadCache(url);
      }
      if (cache) {
        subscriber.next(cache);
        subscriber.complete();
      } else {
        this.pushRequest(url, subscriber);
        this.processRequest();
      }
    });
  }

  public clearRequests() {
    for (const request of this.requests) {
      request.subscriber.complete();
    }
    this.requests = [];
  }

  protected processRequest() {
    if (!this.processing && this.requests.length > 0) {
      this.processing = true;
      const options: PreviewRequest = this.reverse ? this.requests.pop() : this.requests.shift();
      this.loadNow(options.url).delay(100).subscribe(
        (data: string) => {
          this.processing = false;
          this.processRequest();
          options.subscriber.next(data);
          options.subscriber.complete();
        },
        (error: any) => {
          this.processing = false;
          this.processRequest();
          options.subscriber.error(error);
        },
      );
    }
  }

  protected pushRequest(
    url: string,
    subscriber: Subscriber<string>,
  ) {
    this.requests.push({
      url,
      subscriber,
    });
  }

  protected initCache() {
    const time: number = Date.now();
    const previewCache: PreviewCache[] = this.storageService.loadLocalStorage('previews');
    if (Array.isArray(previewCache) && previewCache.length > 0) {
      this.previewCache = [];
      for (const cache of previewCache) {
        if (time - cache.time < this.previewCacheLifetime) {
          this.previewCache.push(cache);
        } else if (typeof cache.key === 'string') {
          this.storageService.removeFile('previews', cache.key);
        }
      }
    }
  }

  protected saveCache(url: string, data: string) {
    const key: string = Date.now().toString(36);
    this.previewCache.push({
      url,
      key,
      time: Date.now(),
    });
    if (this.storageService.saveFile('previews', key, data)) {
      this.storageService.saveLocalStorage('previews', this.previewCache);
    }
  }

  protected loadCache(url: string): string {
    const cache: PreviewCache = this.previewCache.find(
      (a: PreviewCache): boolean => a.url === url,
    );
    if (cache) {
      return this.storageService.loadFile('previews', cache.key);
    }
    return null;
  }
}
