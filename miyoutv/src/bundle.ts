/*!
Copyright 2016 Brazil Ltd.

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
import * as angular from 'angular';
import 'angular-animate';
import 'angular-route';
import 'angular-ui-bootstrap';
import 'angular-bootstrap-contextmenu';
import 'angular-hotkeys';
import 'angularjs-toaster';
import 'angular-loading-bar';
import 'angular-md5';
import * as agGrid from 'ag-grid/main';
agGrid.initialiseAgGridWithAngular1(angular);

interface Window {
  jQuery: JQuery;
  wcjsRenderer: any;
  angular: ng.IAngularStatic;
  agGrid: any;
}
declare const window: Window;

window.angular = angular;
window.jQuery = require('jquery');
window.wcjsRenderer = require('webgl-video-renderer');
require('bootstrap');
