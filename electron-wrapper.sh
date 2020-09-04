#!/bin/sh
LAVFORMAT=$(ldconfig -p | sed -n -e 's/^.*=>\s*\(.*libavformat\.so\.[0-9]\+\)$/\1/p')

if [ -e "$LAVFORMAT" ]
then
  SONAME=$(ldd "$(cd $(dirname $0) && pwd)/libffmpeg.so" | sed -n -e 's/^.*\(libavformat\.so\.[0-9]\+\).*$/\1/p')
  mkdir -p /tmp/miyoutv/
  ln -fs "$LAVFORMAT" "/tmp/miyoutv/$SONAME"
fi

exec "$(cd $(dirname $0) && pwd)/miyoutv-bin" --no-sandbox "$@"
