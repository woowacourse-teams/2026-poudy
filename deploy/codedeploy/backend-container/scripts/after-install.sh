#!/usr/bin/env bash

set -Eeuo pipefail

readonly deployment_script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly image_archive="/opt/poudy/backend/image.tar.gz"
readonly image_reference_file="/opt/poudy/backend/image-reference.txt"

test -s "${image_archive}"
test -s "${image_reference_file}"

image_reference="$(<"${image_reference_file}")"
[[ "${image_reference}" =~ ^poudy-backend:[[:xdigit:]]{7,64}$ ]]

docker load --input "${image_archive}"
docker image inspect "${image_reference}" >/dev/null

install -o root -g root -m 0755 \
    "${deployment_script_dir}/container-start.sh" \
    /usr/local/sbin/poudy-backend-container-start

install -o root -g root -m 0644 /dev/null /etc/poudy/backend-image.env
printf 'POUDY_BACKEND_IMAGE=%s\n' "${image_reference}" \
    > /etc/poudy/backend-image.env
chmod 0644 /etc/poudy/backend-image.env

# Keep the existing backend serving traffic until the replacement image and
# its runtime configuration have both passed validation.
if systemctl is-active --quiet poudy-backend.service; then
    systemctl stop poudy-backend.service
fi
