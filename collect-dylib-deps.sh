#!/bin/bash

set -ex
cd "$( dirname "${BASH_SOURCE[0]}" )"
mkdir -p build/miyoutv-mac/mpv

copy_deps() {
  local dep=$1
  local depname=$(basename $dep)
  [[ -e build/miyoutv-mac/mpv/$depname ]] || install -m755 $dep build/miyoutv-mac/mpv
  otool -L $dep | awk '/\/usr\/local.*\.dylib /{print $1}' | while read lib; do
    local libname=$(basename $lib)
    [[ $depname = $libname ]] && continue
    echo $libname
    install_name_tool -change $lib @loader_path/$libname build/miyoutv-mac/mpv/$depname
    [[ -e build/miyoutv-mac/mpv/$libname ]] && continue
    install -m755 $lib build/miyoutv-mac/mpv
    copy_deps $lib
  done
}

set +x
copy_deps /usr/local/lib/libmpv.1.dylib
set -x

cp -a node_modules/mpv.js/build/Release/mpvjs.node build/miyoutv-mac/mpv/mpvjs.dylib

# See <https://github.com/Kagami/boram/issues/11>.
install_name_tool -change /System/Library/Frameworks/CoreImage.framework/Versions/A/CoreImage /System/Library/Frameworks/QuartzCore.framework/Versions/A/Frameworks/CoreImage.framework/Versions/A/CoreImage build/miyoutv-mac/mpv/libavfilter.6.dylib
install_name_tool -change /usr/local/opt/mpv/lib/libmpv.1.dylib '@loader_path/libmpv.1.dylib' build/miyoutv-mac/mpv/mpvjs.dylib
