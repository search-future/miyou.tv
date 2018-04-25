const path = require('path');
const { execSync } = require('child_process');

exports.default = (context) => {
  if (context.electronPlatformName === 'linux') {
    const libffmpeg = path.join(context.appOutDir, 'libffmpeg.so');
    execSync(`gcc -Wl,--no-as-needed -shared -lavformat -o "${libffmpeg}"`);
  }
  if (context.electronPlatformName === 'win32') {
    const downloader = path.join(__dirname, 'download.js');
    execSync(`node ${downloader}`);
  }
};
