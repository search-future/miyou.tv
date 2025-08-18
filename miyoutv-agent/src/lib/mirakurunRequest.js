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
const http = require('http');
const url = require('url');

function mirakurunRequest(mirakurunPath, apiPath) {
  console.log('%s: Request "%s".', new Date().toISOString(), url.resolve(mirakurunPath, apiPath));
  let options = {};
  if (/^http:\/\/unix:/.test(mirakurunPath)) {
    options = {
      socketPath: mirakurunPath.split(':')[2],
      path: apiPath,
    };
  } else {
    const mirakurunUrl = url.parse(mirakurunPath);
    options = {
      protocol: mirakurunUrl.protocol,
      hostname: mirakurunUrl.hostname,
      port: mirakurunUrl.port,
      path: (
        `${mirakurunUrl.path.replace(/\/$/, '')}/${apiPath.replace(/^\//, '')}`
      ),
      auth: mirakurunUrl.auth,
    };
  }
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      const body = [];
      res.setEncoding('utf-8');

      res.on('data', (chunk) => {
        body.push(chunk);
      });
      res.on('end', (chunk) => {
        body.push(chunk);
        try {
          const data = JSON.parse(body.join(''));
          resolve(data);
        } catch (e) {
          console.error('%s: %s', new Date().toISOString(), e.message);
          reject(e);
        }
      });
    });
    req.on('error', (e) => {
      console.error('%s: %s', new Date().toISOString(), e.message);
      reject(e);
    });
    req.end();
  });
}

module.exports = mirakurunRequest;
