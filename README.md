# MiyouTV

MiyouTVは録画した地上波/BS/CSテレビ放送と２ちゃんねるの実況スレのコメントを同期して再生できるシステムです。

## Description

MiyouTVのシステムは録画バックエンドと番組データを取得して再生するアプリケーションから構成されます。

### 録画バックエンド

ガラポンTV、またはChinachuやEPGStationとMirakurun(またはmirackのタイムシフト録画)が導入されているLinux環境が必須です。

### 再生アプリケーションmiyoutvが動作するクライアント端末(以降「クライアント端末」)

Linux、Windows、macOS、Android、iOSに対応しています。モリタポアカウントを設定することでコメントを再生することができます。

クライアント端末はChinachuやEPGStationが実行されているPCでも大丈夫です。また、全録サーバーをLANの何処かに置き、クライアント端末で再生するといった使い方ができます。

## Demo

| ![](https://search-future.github.io/miyou.tv/demo-player.png) | ![](https://search-future.github.io/miyou.tv/demo-search.png) | ![](https://search-future.github.io/miyou.tv/demo-programs.png) | ![](https://search-future.github.io/miyou.tv/demo-recorded.png) |
| --- | --- | --- | --- |

## Software which this repository includes

### miyoutv

コメントを表示できるテレビ番組再生フロントエンドアプリケーションです。バックエンドが録画した番組情報、または、miyoutv-agentが収集した番組表を利用できます。

### miyoutv-agent

Chinachu betaでの全録を支援するプログラムです。以下の機能を持ちます。

- Mirakurunから番組表を収集
- 時間単位での全録予約
- 古くなったファイルの削除
- Chinachuスケジューラーの実行

**Chinachu gammaでは使用できません。Chinachu gammaではルール作成で全録できるルールを設定してください。その場合、EPGベースの全録となります。**

## Requirement

### miyoutv

- [ガラポンTV](http://garapon.tv/)
- [Chinachu](https://github.com/Chinachu/Chinachu)
- [EPGStation](https://github.com/l3tnun/EPGStation)
- [Mirakc](https://github.com/mirakc/mirakc)(タイムシフト録画)

バックエンドとして、ガラポン TV、Chinachu(β/γ)、EPGStation、mirakc(タイムシフト録画)のいずれかが必要です。

### miyoutv(Linux)

- `$ sudo apt install libmpv1 # Debian/Ubuntu`
- `$ sudo dnf install mpv-libs # CentOS8/Fedora`
- `$ sudo yum install mpv-libs # CentOS7`

libmpvのインストールが必要です。CentOSやFedoraでは事前に[RPM Fusionリポジトリを導入する](https://rpmfusion.org/Configuration)などの対応を行ってください。

### miyoutv-agent

- [Chinachu](https://github.com/Chinachu/Chinachu/tree/beta)
- [Mirakurun](https://github.com/Chinachu/Mirakurun)
- [Node.js](http://nodejs.org/) `>=6.2.0`
- [PM2](http://pm2.keymetrics.io/) `>=2.0.12`

Chinachu *beta*とMirakurunが導入されている環境で動作します。

## Installation

MiyouTVのシステムは**番組再生アプリケーションのmiyoutv**と**録画バックエンド**から構成されています。miyoutvはガラポンTVとChinachuとEPGStationのクライアントとして動作します。EPGに依存しない全録システムを構築するにはChinachu betaとmiyoutv-agentが必要です。

### Download

<https://github.com/search-future/miyou.tv/releases>

### miyoutv(Linux, AppImage)

ダウンロードしたAppImageファイルを実行してください。事前にlibmpvのインストールが必要です。

### miyoutv(Linux, tar.gz)

アーカイブファイルを展開されたディレクトリ内のmiyoutvを実行してください。

```
$ tar xzf miyoutv-v*.*.*.tar.gz
$ mv miyoutv-v*.*.* miyoutv
```

### miyoutv(Windows)

インストーラーをダウンロードして実行してください。

### miyoutv(macOS)

パッケージを展開して実行してください。

### miyoutv-agent(Linux)

**miyoutv-agentはChinachu beta専用です。Chinachu gammaで全録するにはルールを作成してください。**

1. miyoutv-agentパッケージを任意のディレクトリに展開してください。
2. config.sample.jsonをconfig.jsonにコピーして、編集します。
3. pm2-installを実行します。

```
$ cd miyoutv-agent
$ sudo ./pm2-install.sh # サービス登録
$ sudo pm2 start miyoutv-agent # 起動
$ sudo pm2 restart miyoutv-agent # 再起動
$ sudo pm2 stop miyoutv-agent # 停止
$ sudo ./pm2-uninstall.sh # サービス削除
```

設定項目

```
{
  "mirakurunPath": "http://unix:/var/run/mirakurun.sock:/", // MirakurunのPath
  "chinachuDir": "/home/chinachu/chinachu/", // Chinachuのインストールパス
  "schedulerIntervalTime": 3600000, // スケジューラーの実行間隔(ms, 0で無効)
  "extraDiskSpace": 50000000, // 自動録画ファイルを削除して確保する空き容量(kB)
  "recordSeconds": 3600, // 録画時間(秒)
  "recordRules": [// 自動予約ルール
    {
      "id": 3274001056 // Mirakurunのserviceのidを持つオブジェクトを指定します
    },
    {
      "id": 3273901048
    }
  ]
}
```

サービス一覧を取得

```
$ tools/servicelist.js
2016-11-10T02:40:31.920Z: Request "http://unix/api/channels".
type: GR
channel: 27
        id: 3273601024 name: ＮＨＫ総合１・東京 sid: 1024
        id: 3273601025 name: ＮＨＫ総合２・東京 sid: 1025
        id: 3273601408 name: ＮＨＫ携帯Ｇ・東京 sid: 1408
```

## Usage

1. インストーラーを実行、またはアーカイブを展開します。
2. 展開されたMiyouTVを実行します。
3. バックエンドの設定をします。
4. コメントを表示するにはモリタポアカウントを設定します。モリタポアカウントは<http://moritapo.jp/>から取得できます。
5. 次回以降の設定は上部ナビゲーションの設定ボタンから開きます。
6. 番組表にコメントカウントが表示されます。上部ナビゲーションから番組一覧やランキングへの切り替えができます。
7. 番組を選択すると番組詳細が表示されます。
8. 番組詳細にあるサムネイル上の再生ボタンを押すと番組の再生を開始します。

## Build

ビルドにはNode.jsとYarnのインストールが必要です。

ガラポンTV機能を有効にするにはガラポンAPIのデベロッパーIDが必要です。

```
$ echo GARAPON_DEVID=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX >> .env.local
```

### for Desktop

macOSはHomebrewでmpvをインストールしてください。

```
$ brew install mpv
```

Windowsはlibmpvをダウンロードしてください。

```
$ yarn download-mpv
```

```
$ yarn
$ yarn collect-mpv
$ yarn dist-electron
```

最新版の[mpv.js](https://github.com/Kagami/mpv.js/)を利用する場合は環境に合わせたディレクトリにビルドしたmpvjs.nodeを配置します。

```
$ mkdir -p mpv/<platform>-<arch>/ # win-x64 or win-ia32 or linux-x64 or darwin-x64 or darwin-arm64
$ cp -a /path/to/mpvjs.node mpv/<platform>-<arch>/
$ yarn download-mpv latest # for Windows
$ yarn collect-mpv
$ ./collect-dylib-deps.sh # Apple silicon
```

### for Android

```
$ yarn
$ vi ~/.gradle/gradle.properties
  MIYOUTV_UPLOAD_STORE_FILE=release.keystore
  MIYOUTV_UPLOAD_KEY_ALIAS=MiyouTV
  MIYOUTV_UPLOAD_STORE_PASSWORD=XXXXXXXX
  MIYOUTV_UPLOAD_KEY_PASSWORD=XXXXXXXX
$ yarn dist-android
```

### for iOS

```
$ yarn
$ cd ios/
$ pod install
$ launchctl setenv GARAPON_DEVID XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

## Licence

[Apache License, Version 2.0](https://github.com/search-future/miyou.tv/blob/master/LICENSE)
