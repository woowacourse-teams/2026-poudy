# 배포 실행 구성

## 배포 실행 방식

MVP 운영 환경은 Docker 없이 EC2 호스트 프로세스로 실행합니다.

- 프론트엔드: Nginx `:443` → Next.js standalone `127.0.0.1:3000`
- HTTP `:80` → HTTPS `:443` 리다이렉트
- 공개 브라우저 API: Nginx `:443/api/*` → 백엔드 EC2 사설 IP `:8080`
- Next.js 서버 API: Nginx `127.0.0.1:8081/api/*` → 같은 백엔드 upstream
- 백엔드: Spring Boot JAR `:8080` → systemd
- 데이터: S3 JSON을 `/opt/poudy/data`에 주기적으로 동기화

현재 MVP에서는 ALB를 사용하지 않습니다. 프론트 EC2의 Nginx를 외부 진입점으로
사용하고, 백엔드 요청은 백엔드 EC2의 안정적인 사설 IP로 전달합니다. Nginx는
프론트 EC2에만 설치하며 백엔드 EC2는 Spring Boot JAR를 직접 실행합니다.

백엔드 EC2의 자동 할당 public IPv4는 CodeDeploy Agent와 S3·AWS 서비스로의 outbound
HTTPS 통신을 위해 유지할 수 있지만, 프론트 프록시·DNS·외부 API 주소로 사용하지
않습니다. 자동 public IPv4는 stop/start 후 바뀔 수 있으므로 백엔드 연결은 반드시
사설 IP를 사용합니다.

배포 산출물은 다음 스크립트로 생성합니다. 출력 디렉터리는 새로 만들어져야 합니다.

```bash
./deploy/scripts/package-artifacts.sh /tmp/poudy-artifacts
```

생성 결과:

- `backend/app.jar`
- `frontend/server.js`, `.next/`, `public/`

## EC2 초기화

EC2 호스트별 최초 1회 초기화는 `deploy/scripts/README.md`를 참고합니다. 초기화
스크립트는 Java·Node.js·Nginx 설치와 systemd 등록만 수행하고 애플리케이션 산출물은
배포하지 않습니다.

백엔드 초기화 스크립트는 `s3://techcourse-project-2026/poudy/data/`를 확인하는
`poudy-data-sync.timer`도 등록합니다. 기본 주기는 부팅 2분 후 최초 실행하고, 이후
약 5분마다입니다. S3 데이터 변경이 있을 때만 staging 검증과 백엔드 재시작을 수행하며,
변경이 없으면 S3 목록 확인 후 종료합니다.

초기화 후 첫 동기화와 상태 확인:

```bash
sudo systemctl start poudy-data-sync.service
sudo systemctl status poudy-data-sync.timer --no-pager
sudo journalctl -u poudy-data-sync.service -n 100 --no-pager
sudo systemctl list-timers poudy-data-sync.timer
```

이미 초기화가 끝난 백엔드 EC2에만 적용할 때는 다음 순서로 실행합니다.

```bash
cd /opt/poudy/repository
sudo dnf install -y awscli-2 jq
sudo install -d -o root -g root -m 0755 /var/lib/poudy/backend-data
sudo install -D -o root -g poudy -m 0640 \
  deploy/config/backend-data.env \
  /etc/poudy/backend-data.env
sudo install -o root -g root -m 0750 \
  deploy/scripts/sync-backend-data.sh \
  /usr/local/sbin/poudy-sync-backend-data
sudo install -o root -g root -m 0644 \
  deploy/systemd/poudy-data-sync.service \
  /etc/systemd/system/poudy-data-sync.service
sudo install -o root -g root -m 0644 \
  deploy/systemd/poudy-data-sync.timer \
  /etc/systemd/system/poudy-data-sync.timer
sudo systemctl daemon-reload
sudo systemctl enable --now poudy-data-sync.timer
sudo systemctl start poudy-data-sync.service
```

동기화 스크립트는 필수 JSON 파일과 각 파일의 최상위 배열을 검증한 뒤
`/opt/poudy/data`를 교체합니다. 백엔드 health check가 실패하면 이전 데이터로
복구합니다. S3에 파일을 여러 개 올릴 때는 모든 JSON 업로드가 끝난 뒤 더 이상 해당
prefix를 수정하지 않는 방식으로 배포해야 합니다. 장기적으로는 versioned prefix와
`_READY` marker를 두고 marker가 생긴 데이터만 동기화하는 방식이 더 안전합니다.

## EC2 프론트 구성

프론트 EC2에서는 Nginx를 호스트에 설치하고 `nginx/ec2-frontend.conf`를 설정 파일로
사용합니다. Next.js standalone 프로세스는 `127.0.0.1:3000`에만 바인딩하고,
서버 컴포넌트와 런타임 sitemap은 `127.0.0.1:8081`의 로컬 Nginx를 사용합니다.

초기화 시 `/etc/letsencrypt/live/poudy.site/fullchain.pem`과
`privkey.pem`이 모두 없으면 HTTP bootstrap 설정을 사용합니다. 이 상태에서는
인증서 발급을 위해 HTTP-01 challenge와 기존 HTTP 프록시를 유지하며, 인증서가 없는
설정에 `ssl_certificate` 경로를 넣지 않습니다. 인증서가 발급되면
`nginx/ec2-frontend-https.conf`로 전환하고 일반 HTTP 요청을 HTTPS로 리다이렉트합니다.

### Certbot 최초 발급

프론트 EC2의 보안 그룹에서 먼저 TCP `443`을 인터넷에 개방한 뒤, 프론트 EC2에서
다음 명령을 순서대로 실행합니다. `poudy.site`의 DNS A 레코드는 프론트 EIP
`54.116.229.77`을 가리켜야 합니다.

AWS CLI를 실행할 권한이 있는 환경에서 보안 그룹 ID를 확인하고 443을 추가합니다.

```bash
aws ec2 describe-instances \
  --region ap-northeast-2 \
  --instance-ids <FRONTEND_INSTANCE_ID> \
  --query 'Reservations[0].Instances[0].SecurityGroups[*].GroupId' \
  --output text

aws ec2 authorize-security-group-ingress \
  --region ap-northeast-2 \
  --group-id <FRONTEND_SECURITY_GROUP_ID> \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0
```

```bash
sudo dnf install -y certbot
sudo install -d -o root -g root -m 0755 /var/www/letsencrypt
sudo certbot certonly --webroot \
  --webroot-path /var/www/letsencrypt \
  --domain poudy.site \
  --email <운영_이메일> \
  --agree-tos \
  --no-eff-email

cd /opt/poudy/repository
sudo ./deploy/scripts/enable-frontend-https.sh
sudo nginx -t
sudo systemctl reload nginx
```

갱신 성공 시에도 동일한 전환 스크립트를 deploy hook으로 사용합니다.

```bash
sudo certbot renew --deploy-hook \
  /opt/poudy/repository/deploy/scripts/enable-frontend-https.sh
```

인증서 파일은 저장소에 커밋하지 않으며, Nginx는 다음 런타임 경로만 참조합니다.

```text
/etc/letsencrypt/live/poudy.site/fullchain.pem
/etc/letsencrypt/live/poudy.site/privkey.pem
```

Nginx 라우팅은 다음 규칙을 사용합니다.

- 공개 `/api/*` → 백엔드 EC2 사설 IP `8080`, 사용자 IP별 요청 제한 적용
- 로컬 `127.0.0.1:8081/api/*` → 같은 백엔드 upstream, 공개 요청 제한 미적용
- 그 외 요청 → 프론트 Next.js `3000`
- 프론트 호스트 확인 → `/nginx-health`
- 백엔드 호스트 확인 → `/actuator/health`

### Nginx 캐시 정책

`ec2-nginx.conf`는 Nginx 디스크 캐시 영역을 만들고, 프론트 설정은 다음 세 종류만
캐시합니다.

- `/_next/static/` 및 확장자가 명확한 정적 자산: 브라우저와 Nginx 캐시를 사용합니다.
  Next.js content hash 자산은 1일, 공개 파일은 1시간의 Nginx TTL을 사용합니다.
- 정확히 `GET /api/categories`: 200 응답만 30초 동안 캐시합니다. 쿼리 문자열과
  `Origin`을 캐시 키에 포함하고, `Authorization` 또는 Cookie가 있는 요청은 캐시를
  우회합니다. `X-Poudy-Cache: HIT|MISS|BYPASS`로 실제 경로를 확인할 수 있습니다.
- `/sitemap-pages.xml`, `/sitemap-products.xml`, `/sitemap-ingredients.xml`: 완성된 200 XML만
  `poudy_sitemaps` 파일 캐시에 저장합니다. 제품은 12시간, 페이지·성분은 24시간
  유지하며 만료 갱신이나 일시적인 Next.js 5xx에는 기존 정상 XML을 제공합니다.
  cache key는 query와 요청 헤더를 제외한 `sitemap:$uri`이고, Cookie·Authorization·
  RSC 관련 헤더는 upstream에 전달하지 않습니다.

feedback·product request를 포함한 변경 요청과 나머지 API는 캐시 대상이 아닙니다. S3
데이터가 갱신되면 최대 30초 동안 categories 응답이 이전 값일 수 있으므로, 더 짧은
최신성이 필요하면 TTL을 조정하거나 해당 경로를 캐시에서 제외합니다.

### Nginx 요청 제한 정책

공개 server block은 IP별로 모든 `/api/*`를 `30r/s`, `burst=120`으로 제한합니다.
자동완성과 제품 개수 API는 이 일반 제한만 적용합니다. 사용자 입력 과정에서 호출량이 많고
여러 사용자가 공인 IP를 공유할 수 있으므로 별도 낮은 한도를 중복 적용하지 않습니다. 공유
매칭 API만 추가로 `10r/s`, `burst=30` 제한을 받습니다. 두 제한 모두 `nodelay`이며 burst를
넘으면 429를 반환합니다. Spring MVC가 같은 공유 매칭 API로 처리하는 세미콜론 path
parameter도 추가 제한에 포함됩니다.
HTML/RSC 페이지와 sitemap에는 별도 요청 제한을 적용하지 않습니다.

access log는 query string이 없는 `$uri`, listener port와 `$limit_req_status`를 기록합니다.

설정을 반영할 때는 다음 순서를 지킵니다.

```bash
sudo nginx -t
sudo systemctl reload nginx
curl --fail --silent --show-error -D - \
  https://poudy.site/api/categories -o /dev/null
curl --fail --silent --show-error -D - \
  https://poudy.site/api/categories -o /dev/null
```

두 번째 요청에 `X-Poudy-Cache: HIT`가 나타나는지 확인합니다. 설정을 되돌릴 때는
이 커밋의 Nginx 템플릿을 이전 버전으로 복원하고 `nginx -t` 성공 후 reload합니다.

HTTPS 활성화 후 로컬 검증:

```bash
curl -I http://poudy.site
curl -k --resolve poudy.site:443:127.0.0.1 https://poudy.site/nginx-health
curl -k --resolve poudy.site:443:127.0.0.1 https://poudy.site/api/categories
curl http://127.0.0.1:8081/api/categories
ss -ltnp '( sport = :8081 )'
curl -k --resolve poudy.site:443:127.0.0.1 \
  -D - -o /dev/null https://poudy.site/sitemap-pages.xml
curl -k --resolve poudy.site:443:127.0.0.1 \
  -H 'Cookie: poudy_sitemap_probe=1' \
  -H 'Authorization: Bearer deployment-probe' \
  -H 'RSC: 1' \
  -D - -o /dev/null 'https://poudy.site/sitemap-pages.xml?probe=1'
```

`ss`는 `127.0.0.1:8081`만 보여야 하며 `0.0.0.0:8081`, `[::]:8081` 또는 프론트
사설 IP의 8081이 나타나면 배포하지 않습니다.
첫 sitemap 요청이 `MISS`였다면 두 번째 요청은 `X-Poudy-Cache: HIT`여야 하며,
`Set-Cookie`와 RSC 관련 `Vary`가 응답에 없어야 합니다. cold sitemap 생성 시간이
60초에 근접하면 실제 p99와 검증한 최악 시간에 여유를 더해 `proxy_read_timeout`,
`proxy_cache_lock_age`, `proxy_cache_lock_timeout`을 함께 조정합니다.

백엔드가 세미콜론 경로를 같은 API로 처리하는지 로컬 listener에서 비교합니다.

```bash
curl --fail --silent --show-error \
  'http://127.0.0.1:8081/api/products/share-matches?text=%ED%85%8C%EC%8A%A4%ED%8A%B8' \
  --output /tmp/poudy-share-match-canonical.json
curl --fail --silent --show-error \
  'http://127.0.0.1:8081/api/products;probe=1/share-matches;probe=1?text=%ED%85%8C%EC%8A%A4%ED%8A%B8' \
  --output /tmp/poudy-share-match-semicolon.json
sha256sum /tmp/poudy-share-match-canonical.json /tmp/poudy-share-match-semicolon.json
```

두 hash가 같아야 합니다. 공개 추가 제한은 낮은 트래픽 시간에 프론트 EC2 loopback으로
제한된 burst만 보내 확인합니다.

```bash
seq 1 60 | xargs -P 60 -I % curl --insecure --resolve poudy.site:443:127.0.0.1 \
  --silent --output /dev/null --write-out '%{http_code}\n' \
  'https://poudy.site/api/products;probe=1/share-matches;probe=1?text=%ED%85%8C%EC%8A%A4%ED%8A%B8' \
  | sort | uniq -c

sleep 10

seq 1 160 | xargs -P 160 -I % curl --insecure --resolve poudy.site:443:127.0.0.1 \
  --silent --output /dev/null --write-out '%{http_code}\n' \
  'https://poudy.site/api/brands' \
  | sort | uniq -c
```

각 실행에서 정상 응답과 429가 함께 나타나야 합니다. 이어서 access log에서
`listener=443`, `limit_req=REJECTED`와 query string이 기록되지 않은 것을 확인합니다.

프론트 EC2 초기화 후 백엔드의 사설 IP를 전달해 프록시 대상을 설정합니다.

```bash
sudo ./deploy/scripts/configure-frontend-backend.sh <백엔드-사설-IP>
```

이 스크립트는 공개·로컬 listener가 공유하는 `poudy_backend` upstream만 변경합니다.
Next.js의 서버 API 주소는 systemd의 고정 로컬 주소이므로 별도로 갱신하지 않습니다.
`poudy-frontend.service`는 `/etc/poudy/frontend.env`에 같은 키가 있더라도 `ExecStart`의
`/usr/bin/env`로 `POUDY_SERVER_API_BASE_URL=http://127.0.0.1:8081`을 최종 강제합니다.

공용 `project-public` 보안 그룹을 사용해야 해 `8080`에 인터넷 전체 허용 규칙이
남아 있을 수 있습니다. 따라서 Nginx만으로 외부 직접 접근이 차단된다고 가정하지
않고, 백엔드 OS 방화벽에서 `8080`을 프론트 EC2의 사설 IP 또는 필요한 내부
출발지로 제한합니다. 방화벽 적용 전 SSH 접속 경로를 보존하고 별도 세션에서
접근성을 검증합니다.

## 보안 실행 기준

- 애플리케이션은 `poudy` 전용 사용자로 실행합니다.
- systemd에 `NoNewPrivileges`, 파일 시스템 보호, CPU·메모리·프로세스 제한을 적용합니다.
- 백엔드 데이터 디렉터리는 systemd에서 읽기 전용으로 설정합니다.
- AWS 자격 증명과 환경별 비밀 값은 저장소와 배포 산출물에 포함하지 않습니다.

인프라 로그 위치, journald 보존, CloudWatch Agent와 최소 알람 적용 절차는
[`deploy/monitoring/README.md`](monitoring/README.md)에 정리합니다.

## 피드백 S3 수동 보유 기간 관리

피드백 버킷은 버전 관리가 비활성화되어 있고 운영 계정에는 S3 lifecycle 설정 권한이 없다고
가정합니다. 애플리케이션은 버킷 설정을 바꾸지 않습니다. 대신 서버의 정기 정리 작업이 24시간
지난 pending 이미지와 피드백 JSON이 없는 고아 최종 이미지를 정리하고, 10분 이상 지난
claim을 commit 또는 rollback으로 조정합니다.

접수된 피드백 JSON과 연결된 최종 이미지는 운영자가 AWS S3 콘솔에서 최소 주 1회 다음과 같이
삭제합니다. 주간 실행 사이의 최대 7일을 고려해 접수일로부터 83일 이상 지난 항목을 삭제하면
개인정보 처리방침의 90일 이내 보유 기준을 지킬 수 있습니다.

1. `poudy/feedback/`에서 `pending/`, `claims/`와 `*/images/`를 제외한
   `{feedbackId}.json` 객체를 확인합니다.
2. S3 `Last modified`가 실행 시각 기준 83일 이상 지난 JSON의 `feedbackId`를 기록합니다.
3. 각 ID의 `poudy/feedback/{feedbackId}/images/` 아래 객체와
   `poudy/feedback/{feedbackId}.json`을 모두 삭제합니다.
4. 같은 ID로 검색해 JSON과 이미지 객체가 하나도 남지 않았는지 확인합니다. 일부 삭제가
   실패하면 해당 ID 전체를 즉시 다시 확인하고 남은 객체를 삭제합니다.
5. 실행 시각, 83일 기준 시각, 대상 feedback ID, 삭제 객체 수, 실패와 재확인 결과를 운영
   기록에 남깁니다.

같은 주간 작업에서 `pending/`의 24시간 초과 객체와 `claims/`의 7일 초과 객체도 확인합니다.
정상 상태라면 서버가 이미 정리했어야 하므로 남은 객체는 스케줄러 장애, S3 권한 오류 또는
commit 판정 불명 신호입니다. claim의 `feedbackId`에 해당하는 피드백 JSON과 서버 로그를
확인해 다음과 같이 처리합니다.

- 피드백 JSON 저장이 확정된 경우: 최종 이미지는 보존하고 해당 pending과 claim만 삭제합니다.
- 피드백 JSON이 없는 rollback 상태가 확정된 경우: 해당 pending, 최종 이미지와 claim을 모두
  삭제합니다.
- 권한 오류, JSON hash 불일치 등으로 상태를 확정할 수 없는 경우: 객체를 추측으로 삭제하지
  않고 원인을 복구한 뒤 서버 조정 작업의 성공을 확인합니다.

이 점검의 대상 ID, 판정 근거, 삭제 객체와 미해결 사유도 같은 운영 기록에 남깁니다.

버전 관리가 비활성화되어 있으므로 일반 삭제가 영구 삭제이며 이전 버전이나 delete marker를
별도로 정리하지 않습니다. 주 1회 실행과 기록을 유지하기 어려우면 lifecycle 권한을 확보하거나
별도 자동 정리를 마련하기 전까지 피드백 이미지 첨부 기능을 운영에 노출하지 않습니다.
