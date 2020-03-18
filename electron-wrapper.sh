#!/bin/sh

exec "$(cd $(dirname $0) && pwd)/miyoutv-bin" --no-sandbox "$@"
