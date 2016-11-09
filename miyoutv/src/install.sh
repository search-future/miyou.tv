export npm_config_wcjs_runtime="nw"
export npm_config_wcjs_runtime_version="0.12.3"

cd `dirname $0`/node_modules/webchimera.js/
node ./rebuild.js
