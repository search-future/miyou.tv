const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');
const { path7za } = require('7zip-bin');

const workDir = path.join(__dirname, 'mpv');
const archivePath = path.join(workDir, 'mpv-dev.7z');
const outDir = path.join(workDir, 'mpv-dev');

if (!fs.existsSync(workDir)) {
  fs.mkdirSync(workDir);
}
const outFile = fs.createWriteStream(archivePath, {
  autoClose: false,
});
https.get({
  protocol: 'https:',
  host: 'mpv.srsfckn.biz',
  // path: '/mpv-dev-latest.7z',
  path: '/mpv-dev-20170913.7z',
  headers: {
    'User-Agent': `Node.js/${process.version}`
  },
}, (res) => {
  console.log('Downloading MPV binary...');
  res.pipe(outFile);
  res.on('end', () => {
    outFile.close();
    console.log('Decompressing...');
    execFileSync(path7za, ['x', '-y', archivePath, `-o${outDir}`]);
    let src = path.join(outDir, process.arch === 'x64' ? '64' : '32', 'mpv-1.dll');
    let dest = path.join(__dirname, 'node_modules/mpv.js/build/Release/mpv-1.dll');
    if (process.env.IS_PACK) {
      if (process.env.MPV_ARCH === 'win32') {
        src = path.join(outDir, '32/mpv-1.dll');
        dest = path.join(__dirname, 'build/win-ia32-unpacked/node_modules/mpv.js/build/Release/mpv-1.dll');
      } else {
        src = path.join(outDir, '64/mpv-1.dll');
        dest = path.join(__dirname, 'build/win-unpacked/node_modules/mpv.js/build/Release/mpv-1.dll');
      }
    }
    fs.writeFileSync(dest, fs.readFileSync(src, 'binary'), 'binary');
  });
});
