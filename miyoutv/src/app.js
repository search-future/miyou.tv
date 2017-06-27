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
(function (path, fs) {
  'use strict';

  var baseDir = path.dirname(global.module.filename);

  function loadDir(dir) {
    fs.readdirSync(path.join(baseDir, dir))
      .filter(function (a) {
        return /\.js$/.test(a);
      })
      .forEach(function (a) {
        var loader = document.createElement('script');

        loader.src = path.join(dir, a);
        document.body.appendChild(loader);
      });
  }

  loadDir('app/');
  loadDir('app/components/');
  loadDir('app/services/');
}(require('path'), require('fs')));
