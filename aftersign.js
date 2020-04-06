const path = require("path");
const { notarize } = require("electron-notarize");

exports.default = async context => {
  if (context.electronPlatformName === "darwin") {
    const appBundleId = context.packager.appInfo.id;
    const appPath = path.join(
      context.appOutDir,
      `${context.packager.appInfo.productFilename}.app`
    );
    await notarize({
      appBundleId,
      appPath,
      appleId: process.env.APPLEID,
      appleIdPassword: process.env.APPLEIDPASS,
      ascProvider: process.env.ASCPROVIDER
    });
  }
};
