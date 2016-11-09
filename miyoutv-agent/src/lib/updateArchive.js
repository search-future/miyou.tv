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
const fs = require('fs');
const awaiter = require('./awaiter.js');
const mirakurunRequest = require('./mirakurunRequest.js');

function updateArchive(options) {
  return new Promise((resolve, reject) => {
    Promise.all([
      mirakurunRequest(options.mirakurunPath, '/api/channels'),
      mirakurunRequest(options.mirakurunPath, '/api/programs'),
    ]).then((values) => {
      awaiter(function* exec(sleep) {
        const writeData = {
          channels: values[0],
          programs: values[1],
        };
        console.log(
          '%s: %d channels and %d programs recieved.',
          new Date().toISOString(),
          writeData.channels.length,
          writeData.programs.length
        );
        yield sleep(100);
        let archiveData;
        try {
          archiveData = JSON.parse(fs.readFileSync(options.archiveFile)) || archiveData;
        } catch (e) {
          if (e.code !== 'ENOENT') {
            console.error('%s: %s', new Date().toISOString(), e.message);
          }
          archiveData = {};
        }
        yield sleep(100);
        if (archiveData.programs) {
          let start = 0;
          try {
            const recorded = JSON.parse(fs.readFileSync(options.recordedFile));
            yield sleep(100);
            start = Math.min.apply(null, recorded.map(a => a.start));
            yield sleep(100);
          } catch (e) {
            console.error('%s: %s', new Date().toISOString(), e.message);
            start = 0;
          }
          for (let i = 0; i < archiveData.programs.length; i += 1) {
            const program = archiveData.programs[i];
            if (program.startAt >= start) {
              const exists = writeData.programs.some(a => a.id === program.id);
              if (!exists) {
                writeData.programs.push(program);
              }
            }
            yield sleep(10);
          }
        }
        console.log(
          '%s: Archive %d channels and %d programs.',
          new Date().toISOString(),
          writeData.channels.length,
          writeData.programs.length
        );
        try {
          fs.writeFileSync(options.archiveFile, JSON.stringify(writeData));
          resolve();
        } catch (e) {
          console.error('%s: %s', new Date().toISOString(), e.message);
          reject(e);
        }
      });
    }, e => reject(e));
  });
}

module.exports = updateArchive;
