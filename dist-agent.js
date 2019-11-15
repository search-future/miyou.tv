const fs = require("fs");
const path = require("path");
const tar = require("tar");

const srcDir = path.join(__dirname, "miyoutv-agent");
const destDir = path.join(__dirname, "build/miyoutv-agent");
const distFile = path.join(__dirname, "build/miyoutv-agent.tar.gz");

const rules = [
  ["package.json"],
  ["processes.json"],
  ["config.sample.json"],
  ["pm2-install.sh"],
  ["pm2-uninstall.sh"],
  ["dist/miyoutv-agent.js"],
  ["dist/tools/servicelist.js", "tools"],
  ["tools/chscan.sh", "tools"],
  ["tools/lists/gr.txt", "tools"],
  ["tools/lists/catv.txt", "tools"],
  ["tools/lists/bs.txt", "tools"],
  ["tools/lists/cs.txt", "tools"]
];
rules.sort(([, a = ""], [, b = ""]) => {
  return path.join(destDir, a) > path.join(destDir, b) ? 1 : -1;
});

for (const [src, dest = ""] of rules) {
  if (!fs.existsSync(path.join(destDir, dest))) {
    fs.mkdirSync(path.join(destDir, dest), { recursive: true });
  }
  fs.copyFileSync(
    path.join(srcDir, src),
    path.join(destDir, dest, path.basename(src))
  );
}

tar.c(
  {
    file: distFile,
    sync: true,
    cwd: path.join(destDir, ".."),
    gzip: true
  },
  [path.basename(destDir)]
);

fs.unlinkSync(path.join(destDir, "package.json"));
