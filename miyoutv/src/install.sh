export npm_config_wcjs_runtime="electron"
export npm_config_wcjs_runtime_version="0.36.7"

cd `dirname $0`/node_modules/webchimera.js/
node ./rebuild.js
