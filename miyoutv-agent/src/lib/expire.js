/*!
Copyright 2016-2023 Brazil Ltd.

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
const path = require('path');
const awaiter = require('./awaiter.js');
const fs = require('fs');
const df = require('./df.js');

function expire(options) {
  return new Promise((resolve, reject) => {
    awaiter(function* exec(sleep) {
      let recorded;
      try {
        recorded = JSON.parse(fs.readFileSync(options.recordedFile));
      } catch (e) {
        console.error('%s: %s', new Date().toISOString(), e.message);
        reject(e);
        return;
      }
      yield sleep(100);
      const expirableRecords = recorded.filter(a => a.autoExpire);
      console.log('%s: Found %d expirable records.', new Date().toISOString(), expirableRecords.length);
      yield sleep(100);
      expirableRecords.sort((a, b) => a.end - b.end);
      yield sleep(100);
      const expiredRecords = [];
      while (
        expirableRecords.length > 0 &&
        df(options.recordedDir).free < options.extraDiskSpace
      ) {
        const record = expirableRecords.shift();
        try {
          fs.unlinkSync(path.resolve(options.chinachuDir, record.recorded));
          console.log(
            '%s: %s "%s" deleted.',
            new Date().toISOString(),
            record.id,
            path.basename(record.recorded)
          );
          expiredRecords.push(record.id);
        } catch (e) {
          console.error('%s: %s', new Date().toISOString(), e.message);
          if (e.code === 'ENOENT') {
            expiredRecords.push(record.id);
          }
        }
        yield sleep(100);
      }
      recorded = recorded.filter(a => expiredRecords.indexOf(a.id) < 0);
      yield sleep(100);
      try {
        fs.writeFileSync(options.recordedFile, JSON.stringify(recorded));
        resolve();
      } catch (e) {
        console.error('%s: %s', new Date().toISOString(), e.message);
        reject(e);
      }
      console.log('%s: %d records expired.', new Date().toISOString(), expiredRecords.length);
    }, e => reject(e));
  });
}

module.exports = expire;
