const fs = require("fs");
const path = require("path");
const https = require("https");
const { execFileSync } = require("child_process");
const { path7za } = require("7zip-bin");

const rssUrl =
  "https://sourceforge.net/projects/mpv-player-windows/rss?path=/libmpv";
const workDir = path.join(__dirname, "mpv");

(async () => {
  if (!fs.existsSync(workDir)) {
    fs.mkdirSync(workDir);
  }

  await download(workDir, path.join(workDir, "libmpv/x64"), "x86_64-20200830");
  await download(workDir, path.join(workDir, "libmpv/ia32"), "i686-20200830");
  console.log("Complete!");
})();

async function download(downloadDir, outDir, filter = "") {
  // get RSS
  const pattern = new RegExp(
    `<item>[\\s\\S]*?<link>(.*?${filter}.*?)</link>[\\s\\S]*?</item>`
  );
  const latest = await new Promise((resolve, reject) => {
    https.get(rssUrl, res => {
      let rss = "";
      res.on("data", chunk => {
        rss += chunk;
      });
      res.on("end", () => {
        const matches = rss.match(pattern);
        if (matches) {
          resolve(matches[1]);
        }
      });
      res.on("error", error => {
        reject(error);
      });
    });
  });
  // download
  let url = latest;
  let statusCode = 302;
  while (statusCode === 302) {
    res = await new Promise((resolve, reject) => {
      https.get(url, res => {
        if (res.statusCode === 200) {
          console.log(`Downloading MPV binary from ${url}`);
          const downloadPath = path.join(downloadDir, path.basename(url));
          const outFile = fs.createWriteStream(downloadPath, {
            autoClose: false
          });
          const length = parseInt(res.headers["content-length"], 10);
          let current = 0;
          res.pipe(outFile);
          res.on("data", chunk => {
            current += chunk.length;
            process.stdout.write(`\r${((current / length) * 100).toFixed(1)}%`);
          });
          res.on("end", () => {
            process.stdout.write("\n");
            outFile.close();
          });
          outFile.on("close", () => {
            console.log("Decompressing...");
            execFileSync(path7za, ["x", "-y", downloadPath, `-o${outDir}`]);
            resolve(res);
          });
        } else {
          resolve(res);
        }
        res.on("error", error => {
          reject(error);
        });
      });
    });
    statusCode = res.statusCode;
    url = res.headers.location;
  }
}
