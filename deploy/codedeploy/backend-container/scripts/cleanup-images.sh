#!/usr/bin/env bash

set -Eeuo pipefail

# docker image ls는 생성 시각의 내림차순이다. 최근 세 이미지와 모든 컨테이너가
# 참조하는 이미지를 보존한다. 태그만 지워 다른 저장소의 별칭도 보존한다.
readonly retained_image_count=3
readonly image_environment_file="/etc/poudy/backend-image.env"
protected_ids=()
recent_ids=()
remove_references=()

# 서비스가 중지돼 컨테이너가 없어도 현재 배포 설정의 이미지는 복원용으로 남긴다.
# 참조가 손상됐거나 이미지가 사라졌다면 추가 정리를 하지 않는다.
if [[ -e "${image_environment_file}" ]]; then
    configured_reference="$(sed -n 's/^POUDY_BACKEND_IMAGE=//p' "${image_environment_file}")"
    [[ "${configured_reference}" =~ ^poudy-backend:[[:xdigit:]]{7,64}$ ]]
    protected_ids+=("$(docker image inspect --format '{{.Id}}' "${configured_reference}")")
    printf '[poudy-images] 현재 배포 이미지 보존: %s\n' "${configured_reference}"
fi

container_ids="$(docker container ls --all --quiet)"
for container_id in ${container_ids}; do
    protected_ids+=("$(docker container inspect --format '{{.Image}}' "${container_id}")")
done

images="$(docker image ls --no-trunc --format '{{.Repository}} {{.Tag}} {{.ID}}' poudy-backend)"
while read -r repository tag image_id; do
    [[ "${repository}" == poudy-backend && "${tag}" =~ ^[[:xdigit:]]{7,64}$ ]] || continue

    if [[ " ${recent_ids[*]:-} " != *" ${image_id} "* ]]; then
        if (( ${#recent_ids[@]} < retained_image_count )); then
            recent_ids+=("${image_id}")
        fi
    fi
    if [[ " ${recent_ids[*]:-} " == *" ${image_id} "* \
        || " ${protected_ids[*]:-} " == *" ${image_id} "* ]]; then
        continue
    fi
    remove_references+=("${repository}:${tag}")
done <<< "${images}"

printf '[poudy-images] 정리 전 디스크 사용량\n'
df -h /
printf '[poudy-images] 최근 %s개 이미지 및 컨테이너 참조 이미지 보존, 이전 태그 %s개 정리\n' \
    "${retained_image_count}" "${#remove_references[@]}"
if (( ${#remove_references[@]} > 0 )); then
    for reference in "${remove_references[@]}"; do
        # 강제 삭제하지 않는다. 컨테이너 참조 등으로 삭제할 수 없으면 배포 전에 중단한다.
        docker image rm "${reference}"
    done
fi
printf '[poudy-images] 정리 후 디스크 사용량\n'
df -h /
