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
const childProcess = require('child_process');

function df(dir) {
  let result = {};
  try {
    const stdout = childProcess.execSync(`/bin/df -k '${dir}'`, {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf-8',
    });
    const lines = stdout.trim().split('\n');
    const values = lines[lines.length - 1].split(/\s+/);
    result = {
      total: values[1],
      used: values[2],
      free: values[3],
    };
  } catch (e) {
    console.error('%s: %s', new Date().toISOString(), e.message);
  }
  return result;
}

module.exports = df;
