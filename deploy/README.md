# 배포 실행 구성

## 배포 실행 방식

MVP 운영 환경은 Docker 없이 EC2 호스트 프로세스로 실행합니다.

- 프론트엔드: Nginx `:80` → Next.js standalone `127.0.0.1:3000`
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

Nginx 라우팅은 다음 규칙을 사용합니다.

- `/api/*` → 백엔드 EC2 사설 IP `8080`
- 그 외 요청 → 프론트 Next.js `3000`
- 프론트 호스트 확인 → `/nginx-health`
- 백엔드 호스트 확인 → `/actuator/health`

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
