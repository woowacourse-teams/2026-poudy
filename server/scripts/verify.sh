#!/bin/sh
set -eu

server_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$server_root"

exec ./gradlew build "$@"
