# 배포 실행 구성

## 배포 실행 방식

MVP 운영 환경은 Docker 없이 EC2 호스트 프로세스로 실행합니다.

- 프론트엔드: Nginx `:80` → Next.js standalone `127.0.0.1:3000`
- 백엔드: Spring Boot JAR `127.0.0.1:8080` → systemd
- 데이터: `/opt/poudy/data`에 S3 JSON을 다운로드

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

ALB 라우팅은 다음 규칙을 사용합니다.

- `/api/*` → 백엔드 Target Group → 백엔드 EC2 `8080`
- 그 외 요청 → 프론트 Target Group → 프론트 EC2 `80`
- 프론트 health check → `/nginx-health`
- 백엔드 health check → `/actuator/health`

## 보안 실행 기준

- 애플리케이션은 `poudy` 전용 사용자로 실행합니다.
- systemd에 `NoNewPrivileges`, 파일 시스템 보호, CPU·메모리·프로세스 제한을 적용합니다.
- 백엔드 데이터 디렉터리는 systemd에서 읽기 전용으로 설정합니다.
- AWS 자격 증명과 환경별 비밀 값은 저장소와 배포 산출물에 포함하지 않습니다.
