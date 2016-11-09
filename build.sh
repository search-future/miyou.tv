#!/bin/sh
if [ "$(uname)" = "Linux" ]
then
    export npm_config_wcjs_runtime="nw"
    export npm_config_wcjs_runtime_version="0.12.3"

    npm install --no-optional
    npm install nw@0.12.3 webchimera.js
elif [ "$(uname)" = "Darwin" ]
then
    export WCJS_VERSION="v0.2.6"
    export WCJS_RUNTIME="nw"
    export WCJS_RUNTIME_VERSION="v0.17.3"

    npm install --no-optional
    npm install nw@0.17.3 wcjs-prebuilt --nwjs_build_type=sdk

else
    export WCJS_VERSION="v0.2.6"
    export WCJS_RUNTIME="nw"
    export WCJS_RUNTIME_VERSION="v0.17.1"

    npm install --no-optional
    npm install nw@0.17.1 wcjs-prebuilt --nwjs_build_type=sdk
fi
