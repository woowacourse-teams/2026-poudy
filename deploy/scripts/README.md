# EC2 호스트 초기화 스크립트

이 디렉터리의 스크립트는 Amazon Linux 2023 EC2에 애플리케이션 실행 환경을 한 번
구성하는 용도입니다. 애플리케이션 산출물을 배포하거나 서비스를 시작하지는 않습니다.

## 백엔드 EC2

저장소 또는 배포 번들이 `/opt/poudy/repository`에 있다고 가정하면 다음과 같이 실행합니다.

```bash
cd /opt/poudy/repository
sudo ./deploy/scripts/bootstrap-backend.sh
```

구성 내용:

- Java 21 설치
- `poudy` system user 및 `/opt/poudy/backend`, `/opt/poudy/data` 생성
- `/etc/poudy/backend.env` 생성
- `poudy-backend.service` 설치 및 enable
- JSON 데이터 디렉터리의 기본 권한 설정

## 프론트엔드 EC2

```bash
cd /opt/poudy/repository
sudo ./deploy/scripts/bootstrap-frontend.sh
```

구성 내용:

- Node.js 22.22.1 ARM64 런타임과 Nginx 설치
- `poudy` system user 및 `/opt/poudy/frontend` 생성
- `/etc/poudy/frontend.env` 생성
- `poudy-frontend.service` 설치 및 enable
- `ec2-nginx.conf`와 `ec2-frontend.conf` 설치
- Nginx 설정 검증 및 enable/start

## 실행 시점

두 스크립트는 재실행할 수 있도록 작성되어 있습니다. 서비스는 산출물이 배포된 뒤
다음 명령으로 별도로 시작합니다.

```bash
sudo systemctl restart poudy-backend
sudo systemctl restart poudy-frontend
```

스크립트에는 AWS 자격 증명, API 키, 데이터 파일을 포함하지 않습니다.
