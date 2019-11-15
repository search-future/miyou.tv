const path = require("path");
const fs = require("fs");
const tar = require("tar");
const { execSync } = require("child_process");

const prebuildsDir = path.join(
  path.dirname(require.resolve("mpv.js")),
  "prebuilds"
);
const prebuilds = fs.readdirSync(prebuildsDir);

for (const filename of prebuilds) {
  const basename = path.basename(filename, ".tar.gz");
  const [platform, arch] = basename.split("-").slice(-2);
  const os = platform.replace("win32", "win");
  const file = path.join(prebuildsDir, filename);
  const cwd = `mpv/${os}-${arch}`;
  try {
    fs.mkdirSync(cwd, { recursive: true });
  } catch (e) {
    if (e.code !== "EEXIST") {
      throw e;
    }
  }
  tar.x({ cwd, file, strip: 2, sync: true });
}

if (fs.existsSync("mpv/mpv-dev/64/mpv-1.dll") && fs.existsSync("mpv/win-x64")) {
  fs.copyFileSync("mpv/mpv-dev/64/mpv-1.dll", "mpv/win-x64/mpv-1.dll");
}

if (
  fs.existsSync("mpv/mpv-dev/32/mpv-1.dll") &&
  fs.existsSync("mpv/win-ia32/")
) {
  fs.copyFileSync("mpv/mpv-dev/32/mpv-1.dll", "mpv/win-ia32/mpv-1.dll");
}

if (process.platform === "darwin") {
  execSync("./collect-dylib-deps.sh");
}
