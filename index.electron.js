const { app, shell, BrowserWindow, BrowserView, Menu } = require("electron");

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

function buildAppMenu() {
  const template = [];

  if (process.platform === "darwin") {
    template.push({
      label: app.name,
      submenu: [
        {
          label: `${app.name}について`,
          role: "about"
        },
        {
          type: "separator"
        },
        {
          label: `${app.name}を隠す`,
          role: "hide"
        },
        {
          label: "ほかを隠す",
          role: "hideothers"
        },
        {
          label: "すべてを表示",
          role: "unhide"
        },
        {
          type: "separator"
        },
        {
          label: "MiyouTVを終了",
          role: "quit",
          click: () => app.quit()
        }
      ]
    });
  } else {
    template.push({
      label: "ファイル",
      submenu: [
        {
          label: "MiyouTVを終了",
          role: "quit",
          click: () => app.quit()
        }
      ]
    });
  }
  template.push({
    label: "編集",
    submenu: [
      {
        label: "元に戻す",
        role: "undo"
      },
      {
        label: "やり直す",
        role: "redo"
      },
      {
        type: "separator"
      },
      {
        label: "切り取り",
        role: "cut"
      },
      {
        label: "コピー",
        role: "copy"
      },
      {
        label: "貼り付け",
        role: "paste"
      },
      {
        label: "削除",
        role: "delete",
        click: () => win.webContents.delete()
      },
      {
        type: "separator"
      },
      {
        label: "すべて選択",
        role: "selectall"
      }
    ]
  });
  template.push({
    label: "表示",
    submenu: [
      {
        label: "MiyouTVを再読み込み",
        role: "reload",
        accelerator: "CmdOrCtrl+R",
        click: () => win.webContents.reload()
      },
      {
        label: "開発者ツール",
        role: "toggledevtools",
        accelerator: "CmdOrCtrl+Shift+I",
        click: () => win.webContents.toggleDevTools()
      },
      {
        type: "separator"
      },
      {
        label: "全画面表示",
        role: "togglefullscreen",
        accelerator: "F11",
        click: () => win.setFullScreen(!win.isFullScreen())
      }
    ]
  });
  template.push({
    label: "ヘルプ",
    submenu: [
      {
        label: app.name + "について",
        click: () => {
          shell.openExternal("http://miyou.tv");
        }
      }
    ]
  });

  return Menu.buildFromTemplate(template);
}

function buildContextMenu(params) {
  const noParams = typeof params !== "object";
  const template = [
    {
      label: "戻る",
      click: () => win.webContents.goBack(),
      visible: noParams || win.webContents.canGoBack()
    },
    {
      label: "進む",
      click: () => win.webContents.goForward(),
      visible: noParams || win.webContents.canGoForward()
    },
    {
      label: "MiyouTVを再読み込み",
      role: "reload",
      click: () => win.webContents.reload()
    },
    {
      type: "separator"
    },
    {
      label: "元に戻す",
      role: "undo",
      visible: noParams || params.editFlags.canUndo
    },
    {
      label: "やり直す",
      role: "redo",
      visible: noParams || params.editFlags.canRedo
    },
    {
      type: "separator",
      visible: noParams || params.editFlags.canUndo || params.editFlags.canRedo
    },
    {
      label: "切り取り",
      role: "cut",
      visible: noParams || params.editFlags.canCut
    },
    {
      label: "コピー",
      role: "copy",
      visible: noParams || params.editFlags.canCopy
    },
    {
      label: "貼り付け",
      role: "paste",
      visible: noParams || params.editFlags.canPaste
    },
    {
      label: "削除",
      role: "delete",
      visible: noParams || params.editFlags.canDelete,
      click: () => win.webContents.delete()
    },
    {
      type: "separator",
      visible: noParams || params.isEditable || params.editFlags.canCopy
    },
    {
      label: "すべて選択",
      role: "selectall",
      visible: noParams || params.editFlags.canSelectAll
    },
    {
      type: "separator",
      visible: noParams || params.editFlags.canSelectAll
    },
    {
      label: "Googleで検索",
      click: () => {
        shell.openExternal(
          "https://www.google.co.jp/search?q=" + params.selectionText
        );
      },
      visible: !noParams && params.editFlags.canCopy
    },
    {
      label: "Wikipediaで検索",
      click: () => {
        shell.openExternal(
          "https://ja.wikipedia.org/wiki/?search=" + params.selectionText
        );
      },
      visible: !noParams && params.editFlags.canCopy
    },
    {
      label: "２ちゃんねる検索",
      click: () => {
        shell.openExternal("http://find.2ch.sc/?STR=" + params.selectionText);
      },
      visible: !noParams && params.editFlags.canCopy
    },
    {
      type: "separator",
      visible: !noParams && params.editFlags.canCopy
    },
    {
      label: "MiyouTVを終了",
      role: "quit",
      click: () => app.quit()
    }
  ];
  template.forEach(a => {
    if (a.visible != null && !a.visible) {
      a.type = null;
      a.role = null;
    }
  });

  return Menu.buildFromTemplate(template);
}

function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    width: 1440,
    height: 789,
    minWidth: 320,
    minHeight: 480,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, "dist/preload.js"),
      contextIsolation: true,
      enableRemoteModule: true
    }
  });

  // and load the index.html of the app.
  win.loadFile("index.html");

  // Open the DevTools.
  if (process.env.NODE_ENV === "development") {
    win.webContents.openDevTools();
  }

  // Emitted when the window is closed.
  win.on("closed", () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });

  const view = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, "dist/preload.js"),
      contextIsolation: true,
      enableRemoteModule: true,
      plugins: true
    }
  });
  view.webContents.loadFile("index.html", { hash: "view" });
  if (process.env.NODE_ENV === "development") {
    view.webContents.openDevTools();
  }
  win.setBrowserView(view);

  Menu.setApplicationMenu(buildAppMenu());
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
app.on("web-contents-created", (e, webContents) => {
  webContents.on("context-menu", (e, params) => {
    buildContextMenu(params).popup();
  });
});

const path = require("path");
process.mainModule.paths.push(path.join(app.getPath("exe"), "../node_modules"));

try {
  require("./bundle.js");
} catch (e) {
  require("./dist/bundle.js");
}

try {
  require("electron-reload")(
    [
      path.resolve(__filename),
      path.resolve(__dirname, "bundle.js"),
      path.resolve(__dirname, "index.html"),
      path.resolve(__dirname, "dist/")
    ],
    {
      electron: process.execPath
    }
  );
} catch (e) {}

let pluginPath = "";
try {
  const fs = require("fs");
  pluginPath = path.join(app.getAppPath(), "../mpv/mpvjs.node");
  if (!fs.existsSync(pluginPath)) {
    pluginPath = path.join(app.getAppPath(), "../mpv/mpvjs.dylib");
  }
  if (!fs.existsSync(pluginPath)) {
    pluginPath = path.resolve(
      path.dirname(require.resolve("mpv.js")) || "node_modules/mpv.js/",
      "build/Release/mpvjs.node"
    );
  }
} catch (e) {
  pluginPath = path.resolve("node_modules/mpv.js/build/Release/mpvjs.node");
}
if (process.platform !== "linux") {
  process.chdir(path.dirname(pluginPath));
}
app.commandLine.appendSwitch("no-sandbox");
app.commandLine.appendSwitch("ignore-gpu-blacklist");
app.commandLine.appendSwitch(
  "register-pepper-plugins",
  `${pluginPath};application/x-mpvjs`
);
app.commandLine.appendSwitch(
  "js-flags",
  "--max-old-space-size=512 --gc_interval=100"
);
