const fs = require("fs");
const path = require("path");
const https = require("https");
const { execFileSync } = require("child_process");
const { path7za } = require("7zip-bin");

// const downloadUrl = "https://mpv.srsfckn.biz//mpv-dev-latest.7z",
const downloadUrl = "https://mpv.srsfckn.biz/mpv-dev-20170913.7z";
const workDir = path.join(__dirname, "mpv");
const archivePath = path.join(workDir, path.basename(downloadUrl));
const outDir = path.join(workDir, "mpv-dev");

if (!fs.existsSync(workDir)) {
  fs.mkdirSync(workDir);
}
const outFile = fs.createWriteStream(archivePath, {
  autoClose: false
});
https.get(
  downloadUrl,
  {
    headers: {
      "User-Agent": `Node.js/${process.version}`
    }
  },
  res => {
    const length = parseInt(res.headers["content-length"], 10);
    let current = 0;
    console.log("Downloading MPV binary...");
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
      execFileSync(path7za, ["x", "-y", archivePath, `-o${outDir}`]);
      if (process.platform === "win32") {
        console.log("Copy to mpv.js");
        const src = path.join(
          outDir,
          process.arch === "x64" ? "64" : "32",
          "mpv-1.dll"
        );
        const dest = path.join(
          __dirname,
          "node_modules/mpv.js/build/Release/mpv-1.dll"
        );
        fs.copyFileSync(src, dest);
      }
      console.log("Complete!");
    });
  }
);
