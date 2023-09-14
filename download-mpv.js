const fs = require("fs");
const path = require("path");
const https = require("https");
const { execFileSync } = require("child_process");
const { path7za } = require("7zip-bin");

const [mode] = process.argv.slice(2);

const rssUrl =
  "https://sourceforge.net/projects/mpv-player-windows/rss?path=/libmpv";
const workDir = path.join(__dirname, "mpv");

(async () => {
  if (!fs.existsSync(workDir)) {
    fs.mkdirSync(workDir, { recursive: true });
  }

  if (mode === "latest") {
    await download(
      workDir,
      path.join(workDir, "libmpv/x64"),
      await getLatestUrl("x86_64")
    );
    await download(
      workDir,
      path.join(workDir, "libmpv/ia32"),
      await getLatestUrl("i686")
    );
  } else {
    await download(
      workDir,
      path.join(workDir, "libmpv/x64"),
      "https://sourceforge.net/projects/mpv-player-windows/files/libmpv/mpv-dev-x86_64-20200830-git-bb1f821.7z/download"
    );
    await download(
      workDir,
      path.join(workDir, "libmpv/ia32"),
      "https://sourceforge.net/projects/mpv-player-windows/files/libmpv/mpv-dev-i686-20200830-git-bb1f821.7z/download"
    );
  }
  console.log("Complete!");
})();

async function getLatestUrl(filter = "") {
  const pattern = new RegExp(
    `<item>[\\s\\S]*?<link>(.*?${filter}.*?)</link>[\\s\\S]*?</item>`
  );
  const url = await new Promise((resolve, reject) => {
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
  return url;
}

async function download(downloadDir, outDir, url) {
  let src = url;
  let statusCode = 302;
  while (statusCode === 302) {
    res = await new Promise((resolve, reject) => {
      https.get(src, res => {
        if (res.statusCode === 200) {
          console.log(`Downloading MPV binary from ${src}`);
          const downloadPath = path.join(
            downloadDir,
            path.basename(src).split("?").shift()
          );
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
    src = res.headers.location;
  }
}
