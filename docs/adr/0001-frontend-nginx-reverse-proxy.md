# ADR-0001: 프론트엔드 EC2의 Nginx reverse proxy와 백엔드 네트워크 경계

- 상태: accepted
- 결정일: 2026-08-19

## 문맥

Poudy MVP는 ALB 없이 프론트엔드 EC2를 외부 진입점으로 사용한다. 프론트엔드와
백엔드는 각각 하나의 EC2에서 호스트 프로세스로 실행하며, CodeBuild와 CodeDeploy로
아티팩트를 배포한다.

현재 AWS 계정에서는 공용 `project-public` 보안 그룹을 사용해야 하고, 팀이 해당
보안 그룹을 직접 수정할 수 없다. 특히 백엔드 EC2가 private subnet에만 있으면
CodeDeploy Agent가 AWS CodeDeploy 및 S3 엔드포인트로 outbound HTTPS 통신을 할 수
없다. NAT Gateway나 VPC Endpoint를 추가하면 비용과 공유 VPC 영향 검토가 필요하다.

따라서 백엔드는 초기 운영 동안 자동 할당 public IPv4를 가지되, 사용자 요청의
진입점이나 DNS 대상으로 사용하지 않는다. 인스턴스의 stop/start로 public IPv4가
바뀌어도 내부 통신과 배포가 깨지지 않도록 public IPv4 의존성을 분리한다.

## 결정

### Nginx의 위치와 책임

Nginx는 백엔드 EC2가 아니라 프론트엔드 EC2에만 설치한다. 백엔드에는 별도 Nginx를
두지 않고 Spring Boot JAR를 systemd로 실행한다.

```text
사용자
  ↓ 프론트엔드 외부 주소:80
프론트엔드 EC2
  └─ Nginx
      ├─ /              → Next.js standalone 127.0.0.1:3000
      └─ /api/*         → 백엔드 사설 IP:8080

백엔드 EC2
  └─ systemd → Spring Boot JAR :8080
```

Nginx를 선택한 이유는 다음과 같다.

- 브라우저가 하나의 외부 주소와 80 포트만 사용하도록 진입점을 통합한다.
- `/`와 `/api/*`를 프론트엔드·백엔드로 명시적으로 분리한다.
- Next.js와 Spring Boot의 실행·재시작 책임을 분리한다.
- 요청 헤더 전달, 연결 제한, timeout, health endpoint 같은 운영 설정을 애플리케이션
  코드와 분리한다.
- 이미 호스트 초기화 및 설정 검증 스크립트가 있어 현재 구성에 추가 운영 부담이
  가장 적다.

Nginx가 백엔드 포트를 자동으로 숨겨주는 것은 아니다. 공유 보안 그룹에
`8080/0.0.0.0/0`이 남아 있을 수 있으므로, 백엔드 OS 방화벽에서 `8080`을
프론트엔드 EC2의 사설 IP 또는 필요한 내부 출발지로 제한한다. Nginx는 라우팅을
담당하고, 외부 직접 접근 차단은 OS 방화벽이 담당한다.

### 백엔드 public IPv4와 EIP

- 백엔드 Nginx와 DNS에는 백엔드 public IPv4를 사용하지 않는다.
- 프론트엔드 Nginx는 백엔드의 안정적인 사설 IP를 대상으로 연결한다.
- 백엔드의 자동 할당 public IPv4는 CodeDeploy Agent와 S3·AWS 서비스로의 outbound
  HTTPS 통신을 위해 유지한다.
- 백엔드에는 EIP를 부여하지 않는다. MVP에서는 고정 백엔드 주소가 필요하지 않고,
  EIP 비용과 주소 관리 책임을 추가할 이유가 없다.
- 백엔드 public IPv4를 참조하는 SSH 스크립트, DNS, 외부 callback은 만들지 않는다.
  stop/start 후 public IPv4가 변경될 수 있기 때문이다.

## 대안 검토

### 백엔드 EC2에도 Nginx 설치

채택하지 않는다. 현재 백엔드는 단일 Spring Boot 프로세스이며, 백엔드 앞단에서
TLS 종료나 여러 upstream을 구성할 요구가 없다. Nginx를 백엔드에 추가해도 AWS
보안 그룹의 외부 8080 허용 문제를 해결하지 못하고, 설정·재시작·장애 지점을 늘린다.

### Next.js에서 API proxy 처리

채택하지 않는다. 프론트엔드 애플리케이션이 네트워크 경계와 proxy 운영 책임까지
맡게 되어 Nginx보다 배포·장애 분리가 어렵다.

### ALB 사용

현재는 채택하지 않는다. 단일 프론트엔드·백엔드 인스턴스의 MVP에 ALB 비용과
대상 그룹·WAF 권한 및 운영 구성을 추가하는 이득이 작다.

### private backend + NAT Gateway 또는 VPC Endpoint

현재는 채택하지 않는다. NAT Gateway는 비용이 발생하고, VPC Endpoint는 공유 VPC의
DNS·라우팅·보안 그룹에 영향을 줄 수 있어 기술 검토가 필요하다. CodeDeploy Agent의
outbound 요구를 충족하기 위한 대안으로만 추후 재검토한다.

Caddy나 Apache도 reverse proxy 대안이지만, 현재 저장소에 Nginx 설정·초기화·검증이
이미 갖춰져 있고 요구 기능을 충족하므로 교체할 근거가 없다.

## 결과와 검증 기준

- 외부 사용자는 프론트엔드 주소 하나로 화면과 `/api/*`를 사용한다.
- 프론트엔드 EC2에서 백엔드 사설 IP `:8080`으로 API가 응답한다.
- 백엔드 외부 public IP의 `:8080` 직접 접근은 OS 방화벽에서 차단된다.
- 백엔드가 stop/start되어 public IPv4가 바뀌어도 프론트 화면·API 경로는 유지된다.
- CodeDeploy Agent가 AWS CodeDeploy 및 S3로 outbound HTTPS 통신한다.
- 백엔드 public IPv4를 제거하거나 private networking으로 전환하는 것은 CI/CD 안정화
  및 대체 통신 경로 검증 이후 별도 결정한다.

## 참고

- [EC2 인스턴스 수명 주기](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-lifecycle.html)
- [EC2 중지 및 시작 시 IP 주소](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Stop_Start.html)
- [AWS 보안 그룹 규칙](https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html)
- [CodeDeploy Agent](https://docs.aws.amazon.com/codedeploy/latest/userguide/codedeploy-agent.html)
