#!/bin/sh
if [ "$(uname -m)" = "x86_64" ]
then
    ARCH="x64"
else
    ARCH="ia32"
fi
npm install --wcjs_runtime="electron" --wcjs_runtime_version="1.8.7" --wcjs_arch="$ARCH"

if [ "$(uname)" = "Linux" ]
then
    gcc -Wl,--no-as-needed -shared -lavformat -o "$(dirname $0)/node_modules/electron/dist/libffmpeg.so"
fi

if [ "$(expr substr $(uname -s) 1 5)" = "MINGW" ]
then
    node "$(dirname $0)/download.js"
fi
