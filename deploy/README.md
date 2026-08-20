# 배포 실행 구성

## 배포 실행 방식

MVP 운영 환경은 Docker 없이 EC2 호스트 프로세스로 실행합니다.

- 프론트엔드: Nginx `:443` → Next.js standalone `127.0.0.1:3000`
- HTTP `:80` → HTTPS `:443` 리다이렉트
- 프론트엔드 Nginx: `/api/*` → 백엔드 EC2 사설 IP `:8080`
- 백엔드: Spring Boot JAR `:8080` → systemd
- 데이터: `/opt/poudy/data`에 S3 JSON을 다운로드

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

## EC2 프론트 구성

프론트 EC2에서는 Nginx를 호스트에 설치하고 `nginx/ec2-frontend.conf`를 설정 파일로
사용합니다. Next.js standalone 프로세스는 `127.0.0.1:3000`에만 바인딩합니다.

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

- `/api/*` → 백엔드 EC2 사설 IP `8080`
- 그 외 요청 → 프론트 Next.js `3000`
- 프론트 호스트 확인 → `/nginx-health`
- 백엔드 호스트 확인 → `/actuator/health`

HTTPS 활성화 후 로컬 검증:

```bash
curl -I http://poudy.site
curl -k --resolve poudy.site:443:127.0.0.1 https://poudy.site/nginx-health
curl -k --resolve poudy.site:443:127.0.0.1 https://poudy.site/api/categories
```

프론트 EC2 초기화 후 백엔드의 사설 IP를 전달해 프록시 대상을 설정합니다.

```bash
sudo ./deploy/scripts/configure-frontend-backend.sh <백엔드-사설-IP>
```

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
