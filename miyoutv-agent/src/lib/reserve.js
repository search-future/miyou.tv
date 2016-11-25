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

function createProgram(id, start, end, service, rule) {
  const program = {};
  program.id = id;
  program.category = rule.category || 'etc';
  program.channel = {
    id: `${service.channel.type}_${service.serviceId}`,
    type: service.channel.type,
    channel: service.channel.channel,
    sid: service.serviceId,
    name: service.name,
  };
  program.title = rule.title || 'MiyouTV Record';
  program.subTitle = rule.subtitle || '';
  program.fullTitle = (`${program.title} ${program.subTitle}`).trim();
  program.detail = rule.detail || '';
  program.episode = null;
  program.start = start;
  program.end = end;
  program.seconds = Math.floor((end - start) / 1000);
  program.flags = rule.flags || [];
  program.isManualReserved = true;
  program.isMiyoutvReserved = true;
  program.autoExpire = typeof rule.autoExpire === 'boolean' ? rule.autoExpire : true;
  return program;
}

function reserve(options, start, end) {
  return new Promise((resolve, reject) => {
    mirakurunRequest(options.mirakurunPath, '/api/services').then((services) => {
      awaiter(function* exec(sleep) {
        let recording;
        try {
          recording = JSON.parse(fs.readFileSync(options.recordingFile));
        } catch (e) {
          console.error('%s: %s', new Date().toISOString(), e.message);
          recording = [];
        }
        yield sleep(100);
        let reserves;
        try {
          reserves = JSON.parse(fs.readFileSync(options.reservesFile));
        } catch (e) {
          console.error('%s: %s', new Date().toISOString(), e.message);
          if (e.code === 'ENOENT') {
            reject(e);
            return;
          }
        }
        yield sleep(100);
        for (let i = 0; i < options.recordRules.length; i += 1) {
          const rule = options.recordRules[i];
          const service = services.find(a => a.id === rule.id);
          yield sleep(10);
          if (service) {
            const id = `${service.channel.type.toLowerCase()}${service.serviceId}-${Math.floor(start / 1000)}-miyoutv`;
            const isRecording = recording.some(a => a === id);
            yield sleep(10);
            if (!isRecording) {
              const updateIndex = reserves.findIndex(a => a.id === id);
              if (updateIndex >= 0) {
                console.log('%s: Update the reserve "%s".', new Date().toISOString(), id);
                reserves[updateIndex] = createProgram(id, start, end, service, rule);
              } else {
                console.log('%s: Add the reserve "%s".', new Date().toISOString(), id);
                reserves.push(createProgram(id, start, end, service, rule));
              }
              yield sleep(10);
            }
          }
        }
        try {
          fs.writeFileSync(options.reservesFile, JSON.stringify(reserves, null, '  '));
          console.log('%s: Updated reserves file.', new Date().toISOString());
          resolve();
        } catch (e) {
          console.error('%s: %s', new Date().toISOString(), e.message);
          reject(e);
        }
      });
    }, e => reject(e));
  });
}

module.exports = reserve;
