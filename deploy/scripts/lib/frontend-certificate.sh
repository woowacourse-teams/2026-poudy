#!/usr/bin/env bash

set -Eeuo pipefail

frontend_certificate_covers_hosts() {
    local certificate_path="$1"
    shift

    [[ -s "${certificate_path}" ]] || return 1
    command -v openssl >/dev/null 2>&1 || return 2

    local hostname
    local check_output
    for hostname in "$@"; do
        # OpenSSL 3.0.x 일부 버전은 -checkhost 불일치도 0으로 종료하므로
        # 종료 코드와 C locale의 명시적인 성공 출력을 함께 검증합니다.
        check_output="$(LC_ALL=C openssl x509 \
            -in "${certificate_path}" \
            -noout \
            -checkhost "${hostname}" 2>&1)" \
            || return 1
        [[ "${check_output}" == "Hostname ${hostname} does match certificate" ]] \
            || return 1
    done
}
