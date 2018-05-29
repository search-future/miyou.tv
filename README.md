MiyouTV
====
MiyouTVは録画した地上波/BS/CSテレビ放送と２ちゃんねるの実況スレのコメントを同期して再生できるシステムです。

## Description
MiyouTVのシステムは録画バックエンドと番組データを取得して再生するアプリケーションから構成されます。

### 録画バックエンド
ガラポンTV、またはChinachuとMirakurunが導入されているLinux環境が必須です。

### 再生アプリケーション miyoutv が動作するクライアントPC(以降「クライアントPC」)
Linux、Windows、macOSに対応しています。モリタポアカウントを設定することでコメントを再生することができます。

クライアントPCはChinachuやMirakurunと同一機でも大丈夫です。また、全録サーバーをLANの何処かに置き、クライアントPCで再生するといった使い方ができます。

## Demo
|![](https://search-future.github.io/miyou.tv/demo-player.png)|![](https://search-future.github.io/miyou.tv/demo-search.png)|![](https://search-future.github.io/miyou.tv/demo-programs.png)|![](https://search-future.github.io/miyou.tv/demo-recorded.png)|
|---|---|---|---|

## Software which this repository includes
### miyoutv
コメントを表示できるテレビ番組再生フロントエンドアプリケーションです。
バックエンドが録画した番組情報、または、miyoutv-agentが収集した番組表を利用できます。

### miyoutv-agent
Chinachu betaでの全録を支援するプログラムです。以下の機能を持ちます。
* Mirakurunから番組表を収集
* 時間単位での全録予約
* 古くなったファイルの削除
* Chinachuスケジューラーの実行

**Chinachu gammaでは使用できません。ルール作成で全録できるルールを設定してください。その場合、EPGベースの全録となります。**

## Requirement

### miyoutv
* [ガラポンTV](http://garapon.tv/)
* [Chinachu](https://github.com/Chinachu/Chinachu)
* [Mirakurun](https://github.com/Chinachu/Mirakurun)

バックエンドとして、ガラポンTV、またはChinachuとMirakurunが導入されているLinux環境が必要です。

### miyoutv(Linux, AppImage)
* `$ sudo apt-get install mpv vlc`

mpvかvlcのインストールが必要です。

### miyoutv(Linux, tar.gz)
* [Node.js](http://nodejs.org/)
* `$ sudo apt-get install build-essential cmake libvlc-dev mpv`

mpvのインストール、またはWebChimera.jsをビルドできる環境が必要です。

### miyoutv-agent
* [Chinachu](https://github.com/Chinachu/Chinachu)
* [Mirakurun](https://github.com/Chinachu/Mirakurun)
* [Node.js](http://nodejs.org/) `>=6.2.0`
* [PM2](http://pm2.keymetrics.io/) `>=2.0.12`

Chinachu *beta*とMirakurunが導入されている環境で動作します。

## Installation
MiyouTVのシステムは**番組再生アプリケーションのmiyoutv**と**録画バックエンド**から構成されています。
miyoutvはガラポンTVとChinachuのクライアントとして動作します。EPGに依存しない全録システムを構築するにはChinachu betaとmiyoutv-agentが必要です。
### Download
<https://github.com/search-future/miyou.tv/releases>

### miyoutv(Linux, AppImage)
ダウンロードしたAppImageファイルを実行してください。mpvまたはvlcのインストールが必要です。

### miyoutv(Linux, tar.gz)
アーカイブファイルを使用する場合は展開されたディレクトリ内のinstall.shを実行してください。
```
$ tar xzf miyoutv-v*.*.*.tar.gz
$ miyoutv-v*.*.*/install.sh
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
3. 上部ナビゲーションの設定メニューからバックエンドの設定をします。
4. コメントを表示するには設定メニューからモリタポアカウントを設定します。
モリタポアカウントは<http://moritapo.jp/>から取得できます。
5. 番組表にコメントカウントが表示されます。上部ナビゲーションから番組一覧への切り替えができます。
6. 番組を選択して再生ボタンを押すか番組をダブルクリックで再生します。

## Build
ビルドにはNode.jsのインストールが必要です。
macOSはHomebrewでmpvをインストールしてください。Linuxは開発パッケージとlibvlcの開発用パッケージを用意します。
ソース一式をダウンロードして、init.shまたはinit.cmdを実行するとビルド環境が整います。
ガラポンTV機能を有効にするにはガラポンAPIのデベロッパーIDが必要です。
```
$ ./init.sh
$ echo GARAPON_DEVID=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX >> .env.local
$ npm run dist --production
```

## Licence
[Apache License, Version 2.0](https://github.com/search-future/miyou.tv/blob/master/LICENSE)
