const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

exports.default = context => {
  if (context.electronPlatformName === "linux") {
    const execPath = path.join(
      context.appOutDir,
      context.packager.executableName
    );
    const appPath = path.join(context.appOutDir, "miyoutv-bin");
    const wrapperPath = path.join(__dirname, "electron-wrapper.sh");
    fs.renameSync(execPath, appPath);
    fs.copyFileSync(wrapperPath, execPath);
    const libffmpeg = path.join(context.appOutDir, "libffmpeg.so");
    execSync(
      `gcc -Wl,--no-as-needed -shared -lavformat -Wl,-rpath,/tmp/miyoutv -o "${libffmpeg}"`
    );
  }
};
