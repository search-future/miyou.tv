#!/bin/sh
if [ "$(uname)" = "Linux" ]
then
    export npm_config_wcjs_runtime="electron"
    export npm_config_wcjs_runtime_version="1.4.13"

    npm install --no-optional
    npm install webchimera.js 7zip-bin app-builder-bin
    gcc -Wl,--no-as-needed -shared -lavformat -o "$(dirname $0)/node_modules/electron/dist/libffmpeg.so"
else
    export WCJS_VERSION="v0.2.7"
    export WCJS_RUNTIME="electron"
    export WCJS_RUNTIME_VERSION="v1.4.13"

    npm install --no-optional
    npm install wcjs-prebuilt 7zip-bin app-builder-bin
fi
