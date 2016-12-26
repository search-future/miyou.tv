MiyouTV
====
MiyouTVは地上波/BS/CSテレビ放送を全録し、２ちゃんねるの実況スレのコメントを番組と同期して再生できるシステムです。

## Description
MiyouTVのシステムは大きく２つの部品から構成されます。ひとつはmiyoutv-agentが動作する全録サーバ、もう一つはそのサーバから番組データを取得して再生するための再生アプリケーション(miyoutv)です。

### miyoutv-agentが動作するサーバ(以降「全録サーバ」)
ChinachuとMirakurunが導入されているLinux環境が必須です。

### 再生アプリケーション miyoutv が動作するクライアントPC(以降「クライアントPC」)
現在LinuxおよびWindowsで動作します。モリタポアカウントを設定することでコメントを再生することができます。

クライアントPCは全録サーバと同一機で大丈夫です。また、全録サーバをLANの何処かに置き、クライアントPCで再生するといった使い方もできます。

## Demo
|![](https://search-future.github.io/miyou.tv/demo-player.png)|![](https://search-future.github.io/miyou.tv/demo-search.png)|![](https://search-future.github.io/miyou.tv/demo-programs.png)|![](https://search-future.github.io/miyou.tv/demo-recorded.png)|
|---|---|---|---|

## Software which this repository includes
### miyoutv
コメントを表示できるテレビ番組再生フロントエンドアプリケーションです。
miyoutv-agentが収集した番組表を利用できます。

### miyoutv-agent
Chinachuでの全録を支援するプログラムです。以下の機能を持ちます。
* Mirakurunから番組表を収集
* 時間単位での全録予約
* 古くなったファイルの削除
* Chinachuスケジューラーの実行

## Requirement
### miyoutv-agent
* [Chinachu](https://github.com/Chinachu/Chinachu)
* [Mirakurun](https://github.com/Chinachu/Mirakurun)
* [Node.js](http://nodejs.org/) `>=6.2.0`
* [PM2](http://pm2.keymetrics.io/) `>=2.0.12`

Chinachu *beta*とMirakurunが導入されている環境で動作します。

### miyoutv(Linux)
* [Node.js](http://nodejs.org/)
* `$ sudo apt-get install build-essential cmake libvlc-dev`

ChinachuとMirakurunがインストールされたサーバとWebChimera.jsをビルドできる環境が必要です。

## Installation
MiyouTVは**番組再生アプリケーションのmiyoutv**と**Chinachu補助ツールのmiyoutv-agent**から構成されています。
miyoutv単体でもChinachuクライアントとして動作しますが、全ての機能を利用するにはmiyoutv-agentの導入が必要です。

### Download
<https://github.com/search-future/miyou.tv/releases>

### miyoutv(Linux)
ダウンロードしたパッケージを任意のディレクトリに展開して、ディレクトリ内のinstall.shを実行してください。
```
$ tar xzf miyoutv-v*.*.*.tar.gz
$ miyoutv-v*.*.*/install.sh
$ mv miyoutv-v*.*.* miyoutv
```

### miyoutv(Windows)
ダウンロードしたパッケージを任意のディレクトリに展開してください。

### miyoutv-agent(Linux)
**現在、miyoutv-agentはChinachu gammaに対応していません。miyoutv-agentはChinachu betaで使用してください。**

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
1. 展開したディレクトリのmiyoutvを実行してください。
2. 上部ナビゲーションの設定メニューからChinachuの接続情報を設定します。
3. コメントを表示するには設定メニューからモリタポアカウントを設定します。
モリタポアカウントは<http://moritapo.jp/>から取得できます。
4. 番組をマウスオーバーでサムネイル、コメント数が表示されます。
5. 番組を選択して再生ボタンを押すか番組をダブルクリックで再生します。

## Build
Node.jsのインストールが必要です。
ソース一式をダウンロードして、build.shまたはbuild.cmdを実行するとビルド環境が整います。
```
$ ./build.sh
$ npm run build --
```

## Licence
[Apache License, Version 2.0](https://github.com/search-future/miyou.tv/blob/master/LICENSE)
