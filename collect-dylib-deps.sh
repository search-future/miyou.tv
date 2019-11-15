#!/bin/bash

mpv=mpv/mac-x64

set -ex
cd "$( dirname "${BASH_SOURCE[0]}" )"
mkdir -p $mpv

copy_deps() {
  local dep=$1
  local depname=$(basename $dep)
  [[ -e $mpv/$depname ]] || install -m755 $dep $mpv
  otool -L $dep | awk '/\/usr\/local.*\.dylib /{print $1}' | while read lib; do
    local libname=$(basename $lib)
    [[ $depname = $libname ]] && continue
    echo $libname
    install_name_tool -change $lib @loader_path/$libname $mpv/$depname
    [[ -e $mpv/$libname ]] && continue
    install -m755 $lib $mpv
    copy_deps $lib
  done
}

set +x
copy_deps /usr/local/lib/libmpv.1.dylib
set -x

cp -a mpv/darwin-x64/mpvjs.node $mpv/mpvjs.dylib

# See <https://github.com/Kagami/boram/issues/11>.
install_name_tool -change /System/Library/Frameworks/CoreImage.framework/Versions/A/CoreImage /System/Library/Frameworks/QuartzCore.framework/Versions/A/Frameworks/CoreImage.framework/Versions/A/CoreImage $mpv/libavfilter.7.dylib
install_name_tool -change /usr/local/opt/mpv/lib/libmpv.1.dylib '@loader_path/libmpv.1.dylib' $mpv/mpvjs.dylib
