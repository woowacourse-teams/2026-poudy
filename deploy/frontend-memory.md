# 프론트 메모리 완화 설정과 복구

#494의 EC2 프론트는 Next.js 이미지 변환을 비활성화하고 S3/CloudFront의 사전 생성
이미지를 사용한다. 운영 OOM을 재현하거나 MemoryMax를 더 낮추지 않는다.

## 호스트 초기화와 배포

`bootstrap-frontend.sh <production|staging>`는 저장소의
`deploy/systemd/poudy-frontend.service.d/allocator.conf`를 호스트에 설치하고
`configure-frontend-swap.sh`로 512MiB 이상의 `/swapfile`을 준비한다.
allocator drop-in과 fstab은 호스트 설정으로 유지하므로 CodeDeploy가 앱 unit을 교체하거나
이전 앱 산출물로 rollback해도 남는다. buildspec은 기존대로 앱 unit만 패키징한다.

swap 스크립트는 기존 swap 파일을 포맷하거나 resize하지 않는다. 작은 파일, swap 형식이
아닌 파일, 심볼릭 링크, 중복 또는 `noauto` fstab 항목은 실패시켜 수동 확인을 요구한다.
정상 파일과 fstab 항목은 재사용하고 활성화된 swap에 `swapon`을 다시 실행하지 않는다.

기존 호스트에 설정만 반영할 때는 전체 bootstrap으로 Nginx를 재시작하지 않는다.
저장소 경로에서 아래 명령을 실행한다.

```sh
sudo install -D -o root -g root -m 0644 \
  deploy/systemd/poudy-frontend.service.d/allocator.conf \
  /etc/systemd/system/poudy-frontend.service.d/allocator.conf
sudo bash deploy/scripts/configure-frontend-swap.sh
sudo systemctl daemon-reload
```

프로세스의 `MALLOC_ARENA_MAX`가 이미 2라면 설정 반영만으로 서비스를 재시작하지 않는다.
값이 다르면 정상 배포의 ApplicationStart에서 다시 시작한 뒤 확인한다. CodeDeploy의
ValidateService는 실제 프로세스 allocator, 활성 swap·fstab, 이미지 endpoint 404를 확인한다.

## nginx 연결 한도

`ec2-nginx.conf`의 `worker_connections`는 1500이다(#1230, #1276). 1024는 Amazon Linux 기본값을
옮긴 값이라 근거가 없었다. 이 스펙(t4g.micro, vCPU 2, 메모리 910MB)에서는 CPU가 아니라
메모리가 연결 수를 막는다.

- staging 복제 FE에서 백엔드까지 가는 동시 요청을 1,000에서 5,000까지 늘리자 요청 하나에
  메모리 약 55KB가 선형으로 들었다. 5,000에서 nginx 워커 합계 267MB, 남은 메모리 190MB,
  실패 0이었고 FE CPU는 최고 47%였다.
- 워커 2개가 요청마다 연결 2개(사용자·백엔드)를 쓰므로 `worker_connections`가 곧 동시 요청
  수다. nginx는 최고치까지 늘린 메모리를 reload 전에는 돌려주지 않는다.
- 기준은 운영 FE의 평소 남은 메모리 233MB다(2026-11-17, 부하 없을 때). 운영 Next.js는 실제
  트래픽을 받으며 RSS 약 300MB, swap 약 100MB까지 커진 뒤 평평하다. 처음 기준으로 삼은
  464MB는 복제본에서 Next.js를 막 띄운 직후 값이라 여유를 크게 잡았다.
- 예비는 커널·페이지 캐시 몫 150MB다. Next.js 증가분은 운영 측정값에 이미 들어 있고, 운영을
  직접 재므로 호스트 사이 차이 몫은 두지 않는다. (233 − 150) ÷ 0.055 ≈ 1,500이다.
- 1500으로 다시 잰 결과(2026-11-17, 복제 FE)는 캐시 없는 요청이 1,475명, 캐시 적중이
  4,000명까지 실패율 1% 아래였다. 캐시 적중이 연결 3,000개보다 많이 받는 건 nginx가 쉬는
  keep-alive 연결을 닫아 다시 쓰기 때문이다.
- 이때 nginx 워커 최고치는 캐시 없는 요청이 몰릴 때 110MB, 캐시 적중이 몰릴 때 151MB였다.
  사용자 쪽 TLS 연결은 하나에 약 46KB, 백엔드 쪽은 약 9KB라 사용자 쪽 연결만 쌓이면 더
  무겁다. 운영에서 남는 메모리는 각각 약 150MB, 약 110MB다. 최악의 경우 예비보다 40MB
  적지만 swap 265MB가 남아 1500을 유지한다.
- staging도 같은 파일을 써서 1500이다. staging이 운영과 같아야 부하 시험 결과를 운영에 옮길
  수 있다.
- 운영 FE의 평소 남은 메모리가 바뀌면 `(남은 메모리 − 150MB) ÷ 55KB`로 다시 계산한다. 최악의
  경우는 `worker_connections × 2 × 46KB`로 본다. 남은 메모리는 Next.js가 재시작한 뒤 하루
  넘게 지난 상태에서 잰다.

## 상태 확인

```sh
sudo systemctl show poudy-frontend.service \
  -p ActiveState -p NRestarts -p MainPID -p MemoryCurrent -p MemoryMax -p MemorySwapMax -p DropInPaths
pid=$(systemctl show poudy-frontend.service -p MainPID --value)
sudo grep -zFx 'MALLOC_ARENA_MAX=2' "/proc/$pid/environ"
sudo swapon --show --bytes
awk '$1 == "/swapfile" && $3 == "swap" {print}' /etc/fstab
free -m
df -h /
sudo nginx -t
```

공개 주소의 `/`, `/api/categories`는 200, `/_next/image?url=%2Ffavicon.ico&w=64&q=75`는
404여야 한다. 화면 검증은 목록·상세·검색·문의의 사본 선택과 원본 fallback, OG 이미지를
포함한다. bootstrap 실행 성공이나 PR 테스트 통과만으로 화면 검증을 완료 처리하지 않는다.

## 수동 복구와 rollback

서비스 장애 시 위 상태부터 확인하고 allocator 값이나 swap 설정을 추정으로 변경하지 않는다.
설정 파일을 수정하기 전에 기존 allocator.conf와 fstab을 별도 백업한다. swap 신규 생성에
실패한 경우 작은 파일을 다시 포맷하지 말고 디스크 여유·파일 형식부터 확인한다.

정상 앱 배포로 복구할 때는 CodeDeploy의 해당 FE 배포 그룹에서 마지막 성공 산출물을
사용하고 ValidateService와 공개 endpoint를 확인한다. 운영 FE·BE 배포 stage는 분리돼 있다.
현재 실행과 rollback 기준 실행 ID를 먼저 기록한다. rollback 자체도 서비스 재시작을
수반하므로 운영에서 검증 목적으로 장애를 만들지 않는다.

allocator 설정을 되돌려야 한다면 백업된 drop-in을 복원하고 `systemctl daemon-reload` 후
배포 절차에서 서비스를 다시 시작한다. 기존 drop-in이 없었다면 이 파일만 제거한다.
활성 swap은 복구 과정에서 바로 끄지 않는다. 메모리에 옮길 여유가 충분한지 확인한 뒤
별도 작업으로 판단하며, fstab과 swap 파일 삭제를 앱 rollback에 포함하지 않는다.

## 검증 명령

```sh
bash -n deploy/scripts/configure-frontend-swap.sh deploy/scripts/bootstrap-frontend.sh \
  deploy/codedeploy/frontend/scripts/validate-service.sh
python3 deploy/tests/frontend-swap.test.py
```

테스트는 임시 파일과 대체 Linux 명령을 사용한다. 실제 host 초기화·재배포·rollback
결과는 #494 댓글에 별도로 기록하고 본문 체크리스트에서 연결한다.
