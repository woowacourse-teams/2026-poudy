#!/bin/sh
set -eu

server_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
repository_root=$(git -C "$server_root" rev-parse --show-toplevel)
artifacts="server/openapi.json common/api.zod.ts common/api.zod.types.d.ts"
snapshot=$(mktemp -d)

cleanup() {
    rm -rf "$snapshot"
}
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

for artifact in $artifacts; do
    source="$repository_root/$artifact"
    name=$(basename "$artifact")

    if [ -f "$source" ]; then
        cp "$source" "$snapshot/$name"
    else
        : > "$snapshot/$name.missing"
    fi
done

cd "$server_root"
./gradlew generateApiArtifacts

stale=0
for artifact in $artifacts; do
    generated="$repository_root/$artifact"
    name=$(basename "$artifact")

    if [ -f "$snapshot/$name.missing" ]; then
        [ -e "$generated" ] && stale=1
    elif ! cmp -s "$snapshot/$name" "$generated"; then
        stale=1
    fi
done

if [ "$stale" -ne 0 ]; then
    echo
    echo "OpenAPI 생성물이 최신이 아니어서 갱신했습니다. 생성물을 확인한 뒤 다시 검증하세요."
    git -C "$repository_root" status --short -- $artifacts
    exit 1
fi

./gradlew build "$@"
