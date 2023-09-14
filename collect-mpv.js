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
  if (!fs.existsSync(`${cwd}/mpvjs.node`)) {
    tar.x({ cwd, file, strip: 2, sync: true });
  }
}

if (fs.existsSync("mpv/win-x64")) {
  if (fs.existsSync("mpv/libmpv/x64/mpv-1.dll")) {
    fs.copyFileSync("mpv/libmpv/x64/mpv-1.dll", "mpv/win-x64/mpv-1.dll");
  }
  if (fs.existsSync("mpv/libmpv/x64/libmpv-2.dll")) {
    fs.copyFileSync("mpv/libmpv/x64/libmpv-2.dll", "mpv/win-x64/libmpv-2.dll");
  }
}

if (fs.existsSync("mpv/win-ia32/")) {
  if (fs.existsSync("mpv/libmpv/ia32/mpv-1.dll")) {
    fs.copyFileSync("mpv/libmpv/ia32/mpv-1.dll", "mpv/win-ia32/mpv-1.dll");
  }
  if (fs.existsSync("mpv/libmpv/ia32/libmpv-2.dll")) {
    fs.copyFileSync(
      "mpv/libmpv/ia32/libmpv-2.dll",
      "mpv/win-ia32/libmpv-2.dll"
    );
  }
}

if (process.platform === "win32") {
  const src = path.join(__dirname, `mpv/libmpv/${process.arch}/mpv-1.dll`);
  const dest = path.join(
    __dirname,
    "node_modules/mpv.js/build/Release/mpv-1.dll"
  );
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

if (process.platform === "darwin") {
  execSync("./collect-dylib-deps.sh");
}
