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
- 백엔드 프록시 기본 설정 설치
- Nginx 설정 검증 및 enable/start

프론트 EC2에서 백엔드 EC2의 사설 IP를 설정합니다.

```bash
cd /opt/poudy/repository
sudo ./deploy/scripts/configure-frontend-backend.sh <백엔드-사설-IP>
```

이 명령은 `/api/*` 요청의 전달 대상을 변경하고 Nginx를 reload합니다.

## 실행 시점

두 스크립트는 재실행할 수 있도록 작성되어 있습니다. 서비스는 산출물이 배포된 뒤
다음 명령으로 별도로 시작합니다.

```bash
sudo systemctl restart poudy-backend
sudo systemctl restart poudy-frontend
```

## CodeDeploy Agent

CodeDeploy 배포 그룹에 EC2를 등록하기 전에 각 인스턴스에서 한 번 실행합니다.

```bash
cd /opt/poudy/repository
sudo ./deploy/scripts/bootstrap-codedeploy-agent.sh
```

기본 리전은 `ap-northeast-2`이며, 다른 리전을 사용할 때만 `AWS_REGION`을 지정합니다.
설치 스크립트에는 AWS 자격 증명을 포함하지 않습니다.

스크립트에는 AWS 자격 증명, API 키, 데이터 파일을 포함하지 않습니다.
