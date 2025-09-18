/*!
Copyright 2016-2025 Brazil Ltd.

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
const path = require('path');
const mirakurunRequest = require('./lib/mirakurunRequest.js');

const exit = process.exit;

let mirakurunPath = process.argv[2];
if (!mirakurunPath) {
  const configFile = path.resolve(
    path.dirname(require.main.filename || __filename),
    '../config.json'
  );
  let config;
  try {
    config = JSON.parse(fs.readFileSync(configFile));
  } catch (e) {
    console.error(e.message);
  }
  if (config && config.mirakurunPath) {
    mirakurunPath = config.mirakurunPath;
  } else {
    exit(1);
  }
}
mirakurunRequest(mirakurunPath, '/api/channels').then((channels) => {
  for (let ci = 0; ci < channels.length; ci += 1) {
    const channel = channels[ci];
    console.log('type: %s', channel.type);
    console.log('channel: %s', channel.channel);
    for (let si = 0; si < channel.services.length; si += 1) {
      const service = channel.services[si];
      console.log('\tid: %s name: %s sid: %s', service.id, service.name, service.serviceId);
    }
  }
});
