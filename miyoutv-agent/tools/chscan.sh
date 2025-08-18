#!/bin/sh
# Copyright 2016-2025 Brazil Ltd.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

CMD=$0
TIME=10
SPAN=5

usage() {
    echo "Usage:"
    echo "$CMD --list <channellist> [--time <checktime>] [--span <checkspan>] checksignal [<checksignaloptions>]"
    echo "$CMD --list <channellist> [--time <checktime>] [--span <checkspan>] recdvbchksig [<recdvbchksigoptions>]"
    echo
    echo "Options:"
    echo "-l, --list <channellist>:     Set channel list file"
    echo "-t, --time <checktime>:       Set check time in seconds(default: 10)"
    echo "-s, --span <checkspan>:       Set check span in seconds(default: 5)"
    echo "-h, --help:                   Show this help"
}

for OPT in "$@"
do
    case $OPT in
        '-h'|'--help')
            usage
            exit 1
            ;;
        '-t'|'--time')
            TIME=$2
            shift 2
            ;;
        '-s'|'--span')
            SPAN=$2
            shift 2
            ;;
        '-l'|'--list')
            LIST=$2
            shift 2
            ;;
        *)
            if echo "$1" | grep -q -v '^-.*'
            then
                break
            fi
            ;;
    esac
done
if [ -z "$1" ]
then
    usage
    exit 1
fi
while read -r LINE
do
        RESULT=$(
            "$@" "$LINE" 2>&1 &
            PID=$!
            sleep "$TIME"
            kill -TERM "$PID" > /dev/null 2>&1
        )
        echo "$LINE: $(echo "$RESULT" | tr "\r" "\n" | grep -v -e 'SIGTERM' -v -e '^\s*$'| tail -n2 | head -n1)"
        sleep "$SPAN"
done < "$LIST"
