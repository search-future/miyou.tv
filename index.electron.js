const { app, shell, BrowserWindow, Menu } = require("electron");

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

function buildAppMenu() {
  const template = [];

  if (process.platform === "darwin") {
    template.push({
      label: app.getName(),
      submenu: [
        {
          label: `${app.getName()}について`,
          role: "about"
        },
        {
          type: "separator"
        },
        {
          label: `${app.getName()}を隠す`,
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
        label: app.getName() + "について",
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
  win = new BrowserWindow({ width: 800, height: 600, frame: false });

  // and load the index.html of the app.
  win.loadFile("index.html");

  // Open the DevTools.
  win.webContents.openDevTools();

  // Emitted when the window is closed.
  win.on("closed", () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });
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
try {
  require("electron-reload")(
    [
      path.resolve(__filename),
      path.resolve(__dirname, "index.html"),
      path.resolve(__dirname, "dist/")
    ],
    {
      electron: process.execPath
    }
  );
} catch (e) {}
