# 배포 실행 구성

## 배포 실행 방식

MVP 운영 환경은 Docker 없이 EC2 호스트 프로세스로 실행합니다.

- 프론트엔드: Nginx `:443` → Next.js standalone `127.0.0.1:3000`
- HTTP `:80` → HTTPS `:443` 리다이렉트
- 공개 브라우저 API: Nginx `:443/api/*` → 백엔드 EC2 사설 IP `:8080`
- Next.js 서버 API: Nginx `127.0.0.1:8081/api/*` → 같은 백엔드 upstream
- 백엔드: Spring Boot JAR `:8080` → systemd
- 데이터: PostgreSQL 15 이상. 피드백 이미지만 비공개 S3에 저장

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
- `backend/schema.sql`
- `frontend/server.js`, `.next/`, `public/`

## EC2 초기화

EC2 호스트별 최초 1회 초기화는 `deploy/scripts/README.md`를 참고합니다. 초기화
스크립트는 Java·Node.js·Nginx 설치와 systemd 등록만 수행하고 애플리케이션 산출물은
배포하지 않습니다.

백엔드 초기화 스크립트는 PostgreSQL 15 client를 설치하고 기존 JSON 동기화 timer를
비활성화합니다. 이어서 `deploy/config/backend.env.example`을 참고해
`/etc/poudy/backend.env`의 예시 값을 실제 DB와 S3 설정으로 교체합니다.

```bash
sudoedit /etc/poudy/backend.env
sudo chown root:poudy /etc/poudy/backend.env
sudo chmod 0640 /etc/poudy/backend.env
```

빈 DB의 첫 CodeDeploy는 artifact의 `schema.sql`을 한 트랜잭션으로 적용하고,
`POUDY_DB_INITIAL_DATA_S3_URI`의 카탈로그 SQL을 적용합니다. 이후 필수 테이블과 카탈로그
행을 검사합니다. 기존 DB는 같은 검증만 수행하며, 실패하면 실행 중이던 서비스를 재시작하지
않고 배포를 중단합니다.

## EC2 프론트 구성

프론트 EC2에서는 Nginx를 호스트에 설치하고 `nginx/ec2-frontend.conf`를 설정 파일로
사용합니다. Next.js standalone 프로세스는 `127.0.0.1:3000`에만 바인딩하고,
서버 컴포넌트와 런타임 sitemap은 `127.0.0.1:8081`의 로컬 Nginx를 사용합니다.

초기화 시 `/etc/letsencrypt/live/poudy.site/fullchain.pem`과
`privkey.pem`이 모두 없으면 HTTP bootstrap 설정을 사용합니다. 이 상태에서는
인증서 발급을 위해 HTTP-01 challenge와 기존 HTTP 프록시를 유지하며, 인증서가 없는
설정에 `ssl_certificate` 경로를 넣지 않습니다. 인증서가 발급되면
`nginx/ec2-frontend-https.conf`로 전환하고 일반 HTTP 요청을 HTTPS로 리다이렉트합니다.
HTTPS 설정은 인증서가 `poudy.site`와 `www.poudy.site`를 모두 포함할 때만 활성화됩니다.
기존 단일 도메인 인증서가 있으면 먼저 아래 절차로 같은 인증서 lineage를 확장해야 합니다.

### Certbot 최초 발급

프론트 EC2의 보안 그룹에서 먼저 TCP `443`을 인터넷에 개방한 뒤, 프론트 EC2에서
다음 명령을 순서대로 실행합니다. `poudy.site`와 `www.poudy.site`의 DNS A 레코드는
모두 프론트 EIP `54.116.229.77`을 가리켜야 합니다.

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
  --cert-name poudy.site \
  --domain poudy.site \
  --domain www.poudy.site \
  --expand \
  --email <운영_이메일> \
  --agree-tos \
  --no-eff-email

cd /opt/poudy/repository
sudo ./deploy/scripts/enable-frontend-https.sh
sudo nginx -t
sudo systemctl reload nginx
```

`--cert-name poudy.site`는 기존 `/etc/letsencrypt/live/poudy.site` lineage를 유지하고,
`--expand`는 apex만 포함한 기존 인증서를 두 호스트를 포함하는 인증서로 교체합니다.
`enable-frontend-https.sh`는 두 호스트가 인증서 SAN에 실제로 포함됐는지 검사한 뒤에만
Nginx 설정을 교체합니다. 따라서 인증서를 확장하기 전에 새 설정을 배포하지 않습니다.

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

- `www.poudy.site`의 HTTP·HTTPS 요청 → 경로와 query string을 보존한
  `https://poudy.site` 영구 리디렉션
- HTTP-01 challenge → 두 호스트 모두 `/var/www/letsencrypt`에서 직접 제공
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
curl -I --resolve www.poudy.site:80:127.0.0.1 \
  'http://www.poudy.site/products/601?source=canonical-probe'
curl -I --resolve www.poudy.site:443:127.0.0.1 \
  'https://www.poudy.site/products/601?source=canonical-probe'
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

두 `www` 요청은 모두 `301`과
`Location: https://poudy.site/products/601?source=canonical-probe`를 반환해야 합니다.
DNS를 우회하지 않은 외부 환경에서도 인증서와 최종 응답을 함께 확인합니다.

```bash
curl --fail --silent --show-error --location --head \
  'https://www.poudy.site/products/601?source=canonical-probe'
```

첫 응답은 위 대표 URL을 가리키는 `301`, 마지막 응답은 `poudy.site`의 정상 응답이어야
합니다. 인증서 검증을 생략하는 옵션은 사용하지 않습니다.

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
- AWS 자격 증명과 환경별 비밀 값은 저장소와 배포 산출물에 포함하지 않습니다.

인프라 로그 위치, journald 보존, CloudWatch Agent와 최소 알람 적용 절차는
[`deploy/monitoring/README.md`](monitoring/README.md)에 정리합니다.

## 피드백 보유 기간 관리

운영 프로필은 매일 03:30(Asia/Seoul)에 PostgreSQL `received_at`이 83일 지난 피드백과
제품 정정 요청을 최대 500건씩 고릅니다. 각 항목은 S3 최종 이미지와 전환 전 legacy
`feedback.json`/`management.json`을 먼저 삭제하고 DB 행을 마지막에 삭제합니다. S3 삭제가
실패하면 DB 행을 남겨 다음 날 재시도하므로 이미지 키를 잃지 않습니다. 이 7일 여유로 일시적인
실패가 있어도 개인정보 처리방침의 90일 한도 전에 복구할 수 있습니다.

운영자는 최소 주 1회 다음을 확인합니다.

1. `journalctl -u poudy-backend`에서 `만료 의견 보유기간 정리`의 실패 수가 0인지 확인합니다.
2. DB에서 `received_at <= now() - interval '83 days'`인 `feedback`과
   `product_correction_request` 행이 남지 않았는지 확인합니다.
3. 실패가 있으면 S3 delete 권한과 네트워크를 복구하고 서비스를 재시작하거나 다음 예약 실행을
   기다린 뒤, DB 행과 `poudy/feedback/{feedbackId}/images/`가 함께 없어졌는지 재확인합니다.
4. 점검 시각, cutoff, 선택·삭제·실패 건수와 조치 결과를 운영 기록에 남깁니다. 로그에는 의견
   ID나 내용이 출력되지 않습니다.

pending 이미지는 기존 조정기가 24시간 만료와 유예 시간을 기준으로 별도 정리합니다. 버킷
버전 관리가 비활성화되어 있으므로 일반 삭제는 복구할 수 없습니다.

## PostgreSQL 최초 전환

1. PostgreSQL 15 이상 UTF-8 DB를 만들고 `/etc/poudy/backend.env`에 DB 접속 값과 초기
   카탈로그 SQL의 `POUDY_DB_INITIAL_DATA_S3_URI`를 넣습니다.
2. 기존 S3 이력 이관 배포에서는 `POUDY_LEGACY_S3_MIGRATION_ENABLED=true`와 피드백·제품
   등록 요청 버킷 설정을 넣습니다. CodeDeploy가 스키마·초기 카탈로그를 준비한 뒤 importer가
   원본, 관리 상태와 이미지 메타데이터를 ID 기준 insert-only로 적재합니다.
3. 애플리케이션 로그의 이관 건수와 DB의 `feedback`, `product_correction_request`,
   `product_request` 건수를 S3 원본 수와 대조합니다. 문서 파싱이나 FK 검증이 실패하면 health
   check 전에 기동이 실패하므로 원인을 고치고 같은 배포를 재실행합니다.
4. 검증이 끝나면 `POUDY_LEGACY_S3_MIGRATION_ENABLED=false`로 바꾸고 초기 데이터 S3 URI를
   제거합니다. 기존 S3 원본은 위 보유기간 작업이 만료 시 함께 삭제하므로 즉시 지우지 않습니다.
