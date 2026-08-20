# EC2 호스트 초기화 스크립트

이 디렉터리의 스크립트는 Amazon Linux 2023 EC2에 애플리케이션 실행 환경을 한 번
구성하는 용도입니다. 애플리케이션 산출물을 배포하거나 애플리케이션 서비스를 시작하지는
않습니다. 단, 프론트엔드 초기화 스크립트는 Nginx를 활성화하고 시작해 기본 health
endpoint를 제공할 수 있게 합니다.

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
- `/var/www/letsencrypt` ACME webroot 생성
- 백엔드 프록시 기본 설정 설치
- Nginx 설정 검증 및 enable/start

인증서가 이미 발급된 호스트를 재초기화하면 `ec2-frontend-https.conf`를 활성화합니다.
인증서가 없으면 HTTP bootstrap 설정만 사용하므로 초기화와 CodeDeploy 재배포가
`nginx -t`에서 실패하지 않습니다.

프론트 EC2에서 백엔드 EC2의 사설 IP를 설정합니다.

```bash
cd /opt/poudy/repository
sudo ./deploy/scripts/configure-frontend-backend.sh <백엔드-사설-IP>
```

이 명령은 `/api/*` 요청의 전달 대상을 변경하고 Nginx를 reload합니다.

## HTTPS와 인증서

최초 발급 전에는 프론트 보안 그룹의 TCP `443`을 열고 DNS가 프론트 EIP를 가리키는지
확인합니다. Certbot은 EC2에서 별도로 설치·실행합니다.

```bash
sudo dnf install -y certbot
sudo certbot certonly --webroot \
  --webroot-path /var/www/letsencrypt \
  --domain poudy.site \
  --email <운영_이메일> \
  --agree-tos \
  --no-eff-email
sudo ./deploy/scripts/enable-frontend-https.sh
```

`enable-frontend-https.sh`는 인증서가 없으면 실패하고, 설정 검증이나 reload가
실패하면 기존 Nginx 설정으로 복구합니다. 인증서는 저장소에 복사하지 않습니다.

## 실행 시점

두 스크립트는 재실행할 수 있도록 작성되어 있습니다. 백엔드·프론트엔드 애플리케이션은
산출물이 배포된 뒤 다음 명령으로 별도로 시작합니다. Nginx는 프론트엔드 초기화 단계에서
이미 시작되므로 필요한 경우에만 별도로 재시작합니다.

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

기본 동작은 AWS 공식 설치 프로그램이 제공하는 최신 CodeDeploy Agent 패키지를 설치하는 것입니다.
특정 버전이 꼭 필요한 경우에만 해당 리전의 S3에 실제로 존재하는 버전을 지정합니다.

```bash
cd /opt/poudy/repository
sudo env CODEDEPLOY_AGENT_VERSION=<버전> \
  ./deploy/scripts/bootstrap-codedeploy-agent.sh
```

스크립트에는 AWS 자격 증명, API 키, 데이터 파일을 포함하지 않습니다.
