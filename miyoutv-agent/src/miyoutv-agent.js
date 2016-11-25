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
const path = require('path');
const fs = require('fs');
const childProcess = require('child_process');

const expire = require('./lib/expire.js');
const reserve = require('./lib/reserve.js');
const updateArchive = require('./lib/updateArchive.js');
const runScheduler = require('./lib/runScheduler.js');

const configFile = path.join(
  path.dirname(require.main.filename || __filename),
  'config.json'
);
let config = {};
try {
  config = JSON.parse(fs.readFileSync(configFile));
} catch (e) {
  if (e.code === 'ENOENT') {
    console.log('%s: Create new config file.', new Date().toISOString());
    config = {
      mirakurunPath: 'http://unix:/var/run/mirakurun.sock:/',
      chinachuDir: '',
      schedulerIntervalTime: 3600000,
      archiveIntervalTime: 1800000,
      extraDiskSpace: 50000000,
      recordSeconds: 3600,
      recordRules: [],
    };
    fs.writeFileSync(configFile, JSON.stringify(config, null, '  '));
  }
}
const chinachuConfigFile = path.join(config.chinachuDir, 'config.json');
let chinachuConfig = {};
try {
  chinachuConfig = JSON.parse(fs.readFileSync(chinachuConfigFile));
} catch (e) {
  console.error('%s: %s', new Date().toISOString(), e.message);
  chinachuConfig = {};
}
const commonOptions = {
  mirakurunPath: config.mirakurunPath || chinachuConfig.mirakurunPath || 'http://unix:/var/run/mirakurun.sock:/',
  chinachuDir: config.chinachuDir,
  schedulerIntervalTime: (
    isNaN(config.schedulerIntervalTime) ? 3600000 : config.schedulerIntervalTime
  ),
  archiveIntervalTime: (
    isNaN(config.archiveIntervalTime) ? 1800000 : config.archiveIntervalTime
  ),
  extraDiskSpace: isNaN(config.extraDiskSpace) ? 50000000 : config.extraDiskSpace,
  recordSeconds: isNaN(config.recordSeconds) ? 3600 : config.recordSeconds,
  recordRules: config.recordRules || [],
  recordedDir: path.resolve(config.chinachuDir, chinachuConfig.recordedDir),
  archiveFile: path.join(config.chinachuDir, 'web/archive.json'),
  recordedFile: path.join(config.chinachuDir, 'data/recorded.json'),
  recordingFile: path.join(config.chinachuDir, 'data/recording.json'),
  reservesFile: path.join(config.chinachuDir, 'data/reserves.json'),
};

function updater() {
  updateArchive(commonOptions).then(
    () => setTimeout(updater, commonOptions.archiveIntervalTime),
    () => setTimeout(updater, commonOptions.archiveIntervalTime)
  );
}

function scheduler() {
  runScheduler(commonOptions);
  setTimeout(scheduler, commonOptions.schedulerIntervalTime);
}

function main() {
  const promises = [];

  if (commonOptions.extraDiskSpace > 0) {
    promises.push(expire(commonOptions));
  }
  if (commonOptions.recordRules.length > 0) {
    const start = (
      (Math.floor(Date.now() / commonOptions.recordSeconds / 1000) + 1) *
      commonOptions.recordSeconds * 1000
    );
    const end = start + (commonOptions.recordSeconds * 1000);
    promises.push(reserve(commonOptions, start, end));
  }
  Promise.all(promises).then(() => setTimeout(main, 60000), () => setTimeout(main, 60000));
}

try {
  childProcess.execSync(`renice -n 10 -p ${process.pid}`);
  childProcess.execSync(`ionice -c 2 -n 7 -p ${process.pid}`);
} catch (e) {
  console.error('%s: %s', new Date().toISOString(), e.message);
}

if (commonOptions.archiveIntervalTime > 0) {
  updater();
}
if (commonOptions.schedulerIntervalTime > 0) {
  scheduler();
}
main();
