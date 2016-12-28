#!/bin/sh
if [ "$(uname)" = "Linux" ]
then
    export npm_config_wcjs_runtime="electron"
    export npm_config_wcjs_runtime_version="0.36.7"

    npm install --no-optional
    npm install electron-prebuilt@0.36.7 webchimera.js
elif [ "$(uname)" = "Darwin" ]
then
    export WCJS_VERSION="v0.2.7"
    export WCJS_RUNTIME="electron"
    export WCJS_RUNTIME_VERSION="v1.4.3"

    npm install --no-optional
    npm install electron@1.4.3 wcjs-prebuilt

else
    export WCJS_VERSION="v0.2.7"
    export WCJS_RUNTIME="electron"
    export WCJS_RUNTIME_VERSION="v1.4.3"

    npm install --no-optional
    npm install electron@1.4.3 wcjs-prebuilt
fi
