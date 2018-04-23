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
import 'core-js/es6/reflect';
import 'core-js/es7/reflect';
import 'rxjs';
import 'zone.js/dist/zone-mix';

import '@fortawesome/fontawesome';
import '@fortawesome/fontawesome-free-solid';

import '@angular/animations';
import '@angular/common';
import '@angular/common/http';
import '@angular/core';
import '@angular/forms';
import '@angular/platform-browser';
import '@angular/platform-browser/animations';
import '@angular/platform-browser-dynamic';
import '@angular/router';

import '@ngx-loading-bar/core';
import '@ngx-loading-bar/http-client';
import '@ngx-loading-bar/router';
import 'ag-grid-angular/main';
import 'angular2-hotkeys';
import 'ng2-toastr/ng2-toastr';
import 'ngx-bootstrap/alert';
import 'ngx-bootstrap/chronos';
import 'ngx-bootstrap/collapse';
import 'ngx-bootstrap/datepicker';
import 'ngx-bootstrap/dropdown';
import 'ngx-bootstrap/locale';
import 'ngx-bootstrap/modal';
import 'ngx-bootstrap/pagination';
import 'ngx-bootstrap/tabs';
import 'ngx-contextmenu';
import 'ts-md5/dist/md5';
import 'videogular2/core';
import 'videogular2/buffering';
import 'videogular2/streaming';

interface Window {
  Hls: any;
  wcjsRenderer: any;
}
declare const window: Window;

window.Hls = require('hls.js');
window.wcjsRenderer = require('webgl-video-renderer');
