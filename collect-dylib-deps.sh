#!/bin/bash

set -ex
if [ $(uname -m) = "arm64" ]
then
  mpv=mpv/mac-arm64
  mpvjs=mpv/darwin-arm64/mpvjs.node
else
  mpv=mpv/mac-x64
  mpvjs=mpv/darwin-x64/mpvjs.node
fi
libmpv=$(otool -L $mpvjs | awk '/libmpv\.[0-9]+\.dylib/{print $1}')

cd "$( dirname "${BASH_SOURCE[0]}" )"
mkdir -p $mpv

copy_deps() {
  local dep=$1
  local depname=$(basename $dep)
  local depdir=$(dirname $dep)
  [[ -e $mpv/$depname ]] || install -m755 $dep $mpv
  otool -L $dep | awk '/(\/opt\/homebrew|\/usr\/local|@loader_path|@rpath).*(\.dylib|Python) /{print $1}' | while read lib; do
    local libpath=$(echo $lib | sed -e "s|@loader_path|$depdir|" -e "s|@rpath|$depdir|")
    local libname=$(basename $libpath)
    [[ $depname = $libname ]] && continue
    echo $libname
    install_name_tool -change $lib @loader_path/$libname $mpv/$depname
    [[ -e $mpv/$libname ]] && continue
    install -m755 $libpath $mpv
    copy_deps $libpath
  done
}

set +x
copy_deps $libmpv
set -x

cp -a $mpvjs $mpv/mpvjs.dylib

# See <https://github.com/Kagami/boram/issues/11>.
install_name_tool -change /System/Library/Frameworks/CoreImage.framework/Versions/A/CoreImage /System/Library/Frameworks/QuartzCore.framework/Versions/A/Frameworks/CoreImage.framework/Versions/A/CoreImage $mpv/libavfilter.*.dylib
install_name_tool -change $libmpv "@loader_path/$(basename $libmpv)" $mpv/mpvjs.dylib
