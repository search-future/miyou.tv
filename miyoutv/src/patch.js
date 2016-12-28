/*
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
(function (path, childProcess) {
  'use strict';

  var command = '';
  var dataPath = '';
  if (process.versions.nw && process.platform === 'win32' && !process.env.VLC_PLUGIN_PATH) {
    command = process.env.npm_lifecycle_script || process.execPath + ' ' + process.execArgv.join(' ');
    dataPath = path.resolve(nw.App.getDataPath(), '../Main');
    childProcess.exec([
      command,
      ' --user-data-dir="',
      dataPath,
      '"'
    ].join(''), {
      env: {
        VLC_PLUGIN_PATH: path.join(
          path.dirname(process.env.npm_lifecycle_script ? '.' : process.execPath), 'node_modules/wcjs-prebuilt/bin/plugins'
        )
      }
    });
    setTimeout(nw.App.quit, 0);
  }
  if (process.versions.electron) {
    /* eslint-disable */
    window.jQuery = window.$ = require('./bower_components/jquery/dist/jquery.min.js');
    /* eslint-enable */
  }
}(require('path'), require('child_process')));
