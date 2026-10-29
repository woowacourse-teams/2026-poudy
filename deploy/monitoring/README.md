# MVP 인프라 로그·모니터링

## 현재 적용 상태

2026-09-25 기준 production 모니터링 구성이 실제 AWS 환경에 적용되어 있습니다.
이 문서의 아래 적용 절차는 재구성·검증·장애 대응을 위한 운영 기준으로 사용합니다.

### 운영 대상

- 리전: `ap-northeast-2`
- 프론트엔드 EC2: `i-0b3254c52503db10f`
  - Elastic IP: `54.116.229.77`
  - Private IP: `10.0.0.57`
- 백엔드 EC2: `i-0192ed4a2f51748fe`
  - 현재 Public IP: `43.202.164.103` (Elastic IP 아님)
  - Private IP: `10.0.3.84`
- EC2 IAM role: `ec2-project`
- Security Group: `project-public`

백엔드 `:8080`은 운영 프론트 EC2의 Private IP에서만 접근할 수 있도록 호스트
방화벽을 적용합니다. 외부 모니터링은 운영 도메인으로, 프론트 Nginx는 백엔드
Private IP로 접근합니다.

### 적용 완료 항목

- 프론트·백엔드 EC2에 CloudWatch Agent 설치 및 설정 완료
- Agent 상태: `running`, Config status: `configured`
- 지표 namespace: `Poudy/Infra`, 수집 주기: 60초
- 수집 지표: 메모리, 루트 디스크, 프로세스 생존 지표
- 프론트 로그: Nginx access/error, CodeDeploy Agent/deployment, Certbot
- 백엔드 로그: CodeDeploy Agent/deployment
- 백엔드 `poudy-backend.service` journal: Alloy가 Loki로 전송하며 검색어 이벤트와
  예외·스택 프레임은 전송 전에 제외
- Loki 수집 경로: 백엔드 Alloy → Cloudflare Tunnel/Access `logs-write.poudy.site` → Loki
- Loki 수집 검증: Grafana Explore에서 백엔드 로그 8건 조회 확인
- Loki: S3 object storage와 Compactor retention 활성화, 보존 기간 168h(7일)
- Loki Compactor의 expiration 검사가 약 15분 간격으로 실행되는 로그 확인
- 수집 시작 후 7일이 지나지 않아 S3 객체의 실제 만료 삭제는 아직 확인 전; 로컬 인덱스 작업공간 사용량도 관찰 필요
- 프론트엔드 `poudy-frontend.service` journal은 중앙 수집하지 않음
- 로컬 journald 보존: 14일·200MB 상한
- CloudWatch Logs 보존: 14일
- Dashboard: `DASHBOARD-poudy-prod`
- SNS Topic: `poudy-infra-alerts`
  - ARN: `arn:aws:sns:ap-northeast-2:843255971531:poudy-infra-alerts`
- self-hosted Blackbox Exporter 공개 경로 Probe:
- Production: `https://poudy.site/categories`, `https://poudy.site/api/categories`
- Staging: `https://staging.poudy.site/categories`, `https://staging.poudy.site/api/categories`
- Grafana `Poudy Frontend Availability` 대시보드와 Production·Staging 헬스 알림 규칙 적용 완료

### 현재 CloudWatch Alarm

정상 동작까지 확인한 알람은 다음과 같습니다.

- 프론트엔드 메모리: `mem_used_percent > 85%`
- 백엔드 메모리: `mem_used_percent > 85%`
- 프론트엔드 디스크: `used_percent > 80%`
- 백엔드 디스크: `used_percent > 80%`
- 프론트엔드 EC2 Status Check: `StatusCheckFailed > 0`
- 백엔드 EC2 Status Check: `StatusCheckFailed > 0`

CPU·프로세스 알람은 현재 Grafana 공개 경로 모니터링과의 중복을 고려해 구성하지
않았습니다. CodeDeploy 배포 실패 이벤트의 SNS 연결과 Nginx 5xx metric filter도
현재 범위에서는 구성하지 않았습니다.

## 결정

단일 프론트 EC2와 백엔드 EC2의 MVP에는 APM, OpenTelemetry, 별도 로그 SaaS를 도입하지
않습니다. 다음의 작은 구성을 사용합니다.

- 로컬 장애 분석: `journald`를 유지하고 14일·200MB 상한을 명시합니다.
- 중앙 로그: CloudWatch Agent로 Nginx, CodeDeploy, Certbot 로그를 수집하고, Alloy가
  백엔드 systemd journal을 필터링해 Loki로 전송합니다. 각 로그의 첫 줄만 보내고, 검색어
  원문을 담는 검색 이벤트는 보내지 않습니다.
- 자원 지표: CloudWatch Agent로 메모리, 루트 디스크, 핵심 프로세스 생존 여부만 60초
  간격으로 수집합니다. CPU와 EC2 status check는 기본 CloudWatch 지표를 사용합니다.
- 외부 경로: Monitoring EC2의 self-hosted Blackbox Exporter가 Production·Staging의 공개
  프론트 페이지와 API를 1분마다 확인합니다. Prometheus가 결과를 저장하고 Grafana가 상태
  대시보드와 헬스 장애 알림을 제공합니다.
- 배포 실패: 현재는 CodeDeploy 콘솔에서 확인합니다. CodeDeploy state-change 이벤트의
  SNS 연결은 팀 결정에 따라 구성하지 않습니다.

Next.js stdout/stderr journal은 로컬에만 둡니다. Spring Boot journal은 Alloy가
`poudy-backend.service`만 읽어 Loki로 보내며, 수집 파이프라인에서 ISO 날짜로 시작하지 않는 줄(예외
클래스·메시지, `Caused by:`, 스택 프레임, 여러 줄 메시지의 이어진 줄, 시작 배너)과 `searchType=` 키가 있는
검색 이벤트(상품 검색, 공유 텍스트)를 제외합니다. 운영과 staging은 같은 규칙을 씁니다(#890). Loki 데이터는 S3에 저장하고
Compactor retention은 168h(7일)로 설정되어 있습니다. 실제 만료 삭제와 Monitoring EC2의
로컬 인덱스 작업공간 사용량을 운영 중 확인해야 합니다. PostHog는 사용자 행동 분석
범위이므로 이 구성에 포함하지 않습니다.

## 현재 로그 위치와 보존

| 대상 | 위치 | 현재 보존 | MVP 처리 |
| --- | --- | --- | --- |
| Nginx access/error | `/var/log/nginx/access.log`, `/var/log/nginx/error.log` | CloudWatch Logs 14일 | CloudWatch Logs 14일 |
| Next.js systemd | `journalctl -u poudy-frontend.service` | journald 14일·200MB | 중앙 수집하지 않음 |
| Spring Boot systemd | `journalctl -u poudy-backend.service` | journald 14일·200MB; Loki 7일(S3) | Alloy 필터링 후 Loki |
| CodeDeploy | `/var/log/aws/codedeploy-agent/`, `/opt/codedeploy-agent/deployment-root/deployment-logs/` | Agent 기본 회전·정리 | CloudWatch Logs 14일 |
| CodeBuild | `/aws/codebuild/project-2026` | CloudWatch Logs 14일 | CloudWatch Logs 14일 |
| Certbot | `/var/log/letsencrypt/`, `journalctl -u certbot.timer` | CloudWatch Logs 14일 | CloudWatch Logs 14일 |

CodeDeploy Agent 로그는 인스턴스에 남는 파일을 우선 사용하고, CodeDeploy 콘솔의
배포 상태 이벤트를 장애 알림의 기준으로 삼습니다. CodeBuild는 이미 CloudWatch Logs를
사용하므로 새 수집기를 붙이지 않습니다.

## 저장소 템플릿

- `cloudwatch-agent-frontend.json`: Nginx, CodeDeploy, Certbot + FE 자원 지표
- `cloudwatch-agent-backend.json`: CodeDeploy + BE 자원 지표
- `journald-poudy.conf`: 로컬 journal의 영속 저장·상한
- `grafana/dashboards/poudy-backend-production.json`: 운영 메트릭·상태·로그·JVM 대시보드의 파일 프로비저닝용 클래식 JSON
- `grafana/dashboards/poudy-backend-staging.json`: 스테이징 전용 메트릭·상태·로그 대시보드
- `grafana/dashboards/poudy-backend-logs.json`: 파일 프로비저닝용 클래식 JSON 형식의 Loki 로그 전용 대시보드
- `grafana/provisioning/dashboards/poudy.yaml`: 파일 기반 대시보드 프로비저닝 설정
- `alloy/staging.alloy`: 스테이징 EC2의 systemd/프로세스/Actuator 메트릭, `/actuator/health` HTTP probe, 백엔드 journal을 수집하는 Alloy 설정
- `alloy/production-backend.alloy`: 운영 백엔드 EC2의 같은 수집 설정. 2026-10-21까지는 서버의 `/etc/alloy/config.alloy`에만 있었고, #890에서 저장소로 옮기며 로그 필터를 staging과 맞췄다
- `alloy/production-frontend.alloy`: 운영 프론트 EC2 자원·Nginx/Next.js 프로세스와 systemd 지표를 Prometheus로 보내는 설정
- `alloy/staging-frontend.alloy`: staging 프론트 EC2에 둘 같은 구성의 설정. `environment="staging"`, `service="poudy-frontend"`를 붙인다
- `blackbox/blackbox.yml`, `prometheus/prometheus.yml`, `compose/compose.override.yaml`: 공개 페이지/API 가용성 프로브 구성
- `grafana/dashboards/poudy-frontend-availability.json`: Production·Staging 공개 페이지/API 상태 및 응답시간 대시보드
- `grafana/dashboards/poudy-frontend-production-resources.json`: 운영 프론트 EC2 자원·프로세스 대시보드
- `grafana/dashboards/poudy-frontend-staging-resources.json`: staging 프론트 EC2 자원·프로세스 대시보드

### Frontend 공개 경로 모니터링

Grafana Cloud Synthetic Monitoring 대신 Monitoring EC2의 Blackbox Exporter가 네 개의 공개
HTTPS URL을 60초마다 확인합니다. Prometheus는 각 `probe_success`, HTTP 상태 코드, 응답시간을
저장합니다. Exporter 포트는 호스트에 공개하지 않고 Compose 내부 네트워크에서만 접근합니다.

| 환경 | 경로 | 대상 URL |
| --- | --- | --- |
| Production | 프론트 페이지 | `https://poudy.site/categories` |
| Production | 공개 API | `https://poudy.site/api/categories` |
| Staging | 프론트 페이지 | `https://staging.poudy.site/categories` |
| Staging | 공개 API | `https://staging.poudy.site/api/categories` |

대시보드는 각 경로 상태를 `UP`/`DOWN`으로 표시하고 최근 응답시간과 HTTP 상태 코드를
보여줍니다. 알림은 공개 페이지/API 가용성 장애만 대상으로 하며 CPU·메모리 등 자원 알림을
추가하지 않습니다. Probe는 실제 사용자 브라우저의 렌더링이 아니라 HTTP 응답만 검사합니다.
`HTTP Probe Phase Timing` 패널은 DNS resolve, TCP connect, TLS, server processing,
response transfer 시간을 나눠 보여줘 느린 요청에서 어느 구간이 늘었는지 확인할 수 있습니다.
2026-09-28에는 Production과 경로를 맞추기 위해 Staging 프론트 Probe를 `/categories`로
변경하고 Monitoring EC2에 반영했습니다. 설정 적용 후 네 공개 endpoint가 모두 `UP`이고,
phase timing 시계열이 표시되는 것을 Grafana에서 확인했습니다.

2026-09-26 적용 확인: 네 경로의 Probe가 모두 `UP`이고 HTTP 200을 반환하는 것을 Grafana
대시보드에서 확인했습니다. Grafana 관리형 규칙 `Poudy Production Frontend Health Down`과
`Poudy Staging Frontend Health Down`은 각 환경의 네트워크 Probe 중 가장 낮은
`probe_success`가 1 미만인 상태로 2분 지속되면 `Discord Production` 연락처로 알립니다.
두 규칙은 `Poudy Frontend Alert` 폴더의 `poudy-frontend` 평가 그룹에서 1분마다 실행되며,
`environment`와 `severity=critical` 라벨을 사용합니다. 규칙 저장 후 모두 `Normal` 상태,
조건 임계값 1로 저장된 것을 확인했습니다. 실제 장애를 발생시켜 프론트 규칙의 발송을
시험하지는 않았습니다. 현재 두 알림 규칙은 Grafana UI에서 만든 Grafana-managed 규칙이며,
저장소에 provisioning 원본을 두지는 않았습니다. 대시보드는 저장소 JSON을 원본으로 사용합니다.

Monitoring EC2에 적용할 때는 기존 Compose 서비스와 Prometheus 설정을 백업한 뒤 이 파일들을
대응 경로에 설치합니다. `compose.override.yaml`은 기존 `compose.yaml`에 Blackbox 서비스만
추가합니다. 설정 검증 후 Prometheus를 재시작하고, Grafana 대시보드 provider가 파일을 읽는지
확인합니다.

```text
deploy/monitoring/blackbox/blackbox.yml
  -> /opt/poudy-monitoring/config/blackbox/blackbox.yml
deploy/monitoring/prometheus/prometheus.yml
  -> /opt/poudy-monitoring/config/prometheus/prometheus.yml
deploy/monitoring/compose/compose.override.yaml
  -> /opt/poudy-monitoring/compose/compose.override.yaml
deploy/monitoring/grafana/dashboards/poudy-frontend-availability.json
  -> /opt/poudy-monitoring/data/grafana/dashboards/poudy/poudy-frontend-availability.json
```

2026-10-10 `staging.poudy.site`를 staging 프론트 EC2로 옮기면서 Staging 프론트 페이지 Probe를
`https://poudy-staging.vercel.app/categories`에서 `https://staging.poudy.site/categories`로
바꿨습니다(#654).

### Staging 프론트 수집 구조

staging 프론트 EC2도 운영 프론트와 같은 Alloy 구성(`alloy/staging-frontend.alloy`)을 씁니다.
staging 백엔드와 같은 `environment="staging"`으로 보내므로 `service="poudy-frontend"`로 구분합니다.
staging 백엔드 Alloy는 호스트·프로세스 지표에 `service` 라벨을 붙이지 않기 때문에, `poudy-backend-staging.json`의
호스트 지표 패널(CPU·메모리·디스크·네트워크·스왑·OOM)은 `service!="poudy-frontend"`로
프론트 호스트를 뺍니다.

### Staging 수집 구조

2026-09-25 진행 상태: Staging Grafana 대시보드와 JSON 파일을 준비했고, Staging EC2에
공식 저장소의 Alloy `v1.19.2`를 설치해 `/etc/alloy/config.alloy`에 설정했습니다.
`alloy validate`와 `systemctl is-active alloy`가 성공했고, Prometheus에서 Staging의
Actuator·호스트·프로세스 시계열을 확인했습니다. Cloudflare Access 서비스 토큰을 사용한
Loki 쓰기도 검증했습니다.

스테이징 백엔드 `i-00b689c66dc629d79`는 Amazon Linux 2023 ARM64이며, Actuator는
loopback 전용 포트에서 `/actuator/health`와 `/actuator/prometheus`를 제공합니다.
Alloy는 이 로컬 엔드포인트와 호스트 지표를 수집해 `metrics-write.poudy.site`를 통해
Prometheus로 remote write하고, `poudy-backend.service` journal은 첫 줄이 아닌 줄과 검색 이벤트를
제거한 뒤 `logs-write.poudy.site`를 통해 Loki로 보냅니다. 필터는 운영의
`production-backend.alloy`와 같습니다. Prometheus relabel
단계에서 모든 스테이징 시계열에 `environment="staging"`을 붙여 운영과 분리합니다.

Alloy의 Blackbox exporter는 `http://127.0.0.1:8081/actuator/health`를 60초마다 확인해
`probe_success` 메트릭을 Prometheus로 전송합니다. Staging Grafana 대시보드의
`Actuator Health` 패널은 이 probe 값을 표시하며, 1은 HTTP 2xx, 0은 실패를 뜻합니다.
Grafana 관리형 알림 `Staging Backend Actuator Health Down`은
`max(probe_success{environment="staging",instance="prometheus.exporter.blackbox.actuator_health"}) or vector(0)`
가 1 미만인 상태로 2분 지속되면 `Discord Production` 연락처로 알립니다. 규칙은
`poudy-staging` 평가 그룹에서 1분 간격으로 실행됩니다. 적용 시 probe 값 1과 규칙 상태
`Normal`을 확인했습니다. 비파괴 테스트로 firing Discord 도착을 확인했고, 사용자가
2026-09-26 resolved 알림도 도착했음을 확인했습니다.

수집 경로는 확인했습니다. Loki connectivity test 로그는 `service="alloy-connectivity-test"`
라벨로 조회되었고, 백엔드 Alloy의 journald source 및 `loki.process.backend` drop counter도
동작했습니다. 초기에는 확인한 최근 30분 로그가 모두 민감 이벤트 필터에 걸려 Staging 패널에
표시되지 않았지만, 2026-09-26 Grafana 확인에서는 Spring Boot 시작 로그와 DispatcherServlet 초기화
로그가 Staging 대시보드에 표시됐습니다. 로그 파이프라인과 라벨은 정상이며, 안전 로그가 발생하지
않는 시간대에는 패널이 비어 있을 수 있습니다. 민감 이벤트 필터는 유지합니다.

Alloy의 `CF_ACCESS_CLIENT_ID`와 `CF_ACCESS_CLIENT_SECRET`는 서비스 토큰이며 설정 파일에
넣지 않습니다. Staging 인스턴스 전용 토큰을 `/etc/alloy/credentials`에 저장하고 Alloy
systemd 서비스에 환경 파일로 주입한 뒤, 두 Access 경로의 요청이 성공하는지 확인하고
서비스를 시작합니다. Production 토큰을 복사해 재사용하지 않습니다.

스테이징 대시보드 JSON은 Monitoring EC2의
`/opt/poudy-monitoring/data/grafana/dashboards/poudy/poudy-backend-staging.json`에 배치했습니다.
2026-09-26 갱신본은 UID `poudy-backend-staging`, 17개 패널(JVM heap 사용률과 live thread,
네트워크·swap·OOM·HTTP 성능 지표 포함)을
검증해 운영 파일로 반영했습니다. 같은 날 운영 프론트 자원 대시보드도 UID
`poudy-frontend-production-resources`, 7개 패널로 파일 프로비저닝 경로에 배치했습니다.
`poudy.yaml` provider가 이 디렉터리를 읽으며
Grafana UI에서도 대시보드 UID `poudy-backend-staging`과 `Staging Backend Logs` 패널을
확인했습니다. JSON은 저장소 원본으로 유지하고, query나 패널 설명을 바꿀 때 이 파일을 수정해
배포합니다. 2026-09-26 Grafana 확인에서는 Spring Boot 시작 및 DispatcherServlet 초기화 로그가
표시됐습니다. 로그 발생이 적은 시간대에는 패널이 비어 있을 수 있습니다.

`/actuator/prometheus`는 Staging Alloy가 이미 60초마다 스크랩하고 있으며, Spring Boot의
Micrometer Prometheus registry에서 JVM 메트릭을 노출합니다. Staging 대시보드에는 JVM heap
사용률과 live thread 패널을 추가했습니다. 2026-09-26 운영 EC2의 기존 Alloy 설정을 확인해
`/actuator/prometheus` 스크랩이 이미 구성된 것을 확인했고, Monitoring EC2의 Prometheus에서
`environment="prod"`인 `jvm_memory_used_bytes` 시계열 8개를 조회했습니다. 따라서 JVM 수집을
새로 설정할 필요는 없습니다. 운영 대시보드의 클래식 JSON을 Staging과 같은 17개 패널 구성으로
정리해 Monitoring EC2의 파일 프로비저닝 경로에 배치했습니다. 2026-09-26 Grafana UI에서
`JVM Heap Usage (%)`와 `JVM Live Threads` 패널을 확인했고, 두 그래프 모두 데이터가 표시되는
것을 확인했습니다. 운영 백엔드 JVM 수집과 대시보드 반영은 완료했습니다.

Staging JVM 시계열은 `job="poudy_backend_actuator"`, HTTP 요청 계열은 `job="poudy-backend"`로
수집됩니다. 둘은 서로 다른 scrape job이므로 패널도 각각 해당 라벨을 사용합니다. 2026-09-26
Grafana에서 Staging JVM heap과 live thread 그래프의 데이터 및 Production의 JVM·HTTP 요청·p95
패널을 확인했습니다.
Production 백엔드 리소스 패널은 이전에 프론트(`ip-10-0-0-57`)와 백엔드
(`ip-10-0-3-84`) 시계열을 함께 표시했습니다. 공통 `service` 라벨이 없어 환경만으로는 둘을
구분하지 못했으며, JSON을 백엔드 인스턴스로 제한해 2026-09-26 Grafana의 기존 Production UID
`ad2z7mm`에 다시 가져와 덮어썼습니다. 현재 CPU·메모리·디스크 패널에는 백엔드 인스턴스만
표시됩니다. Monitoring EC2에는 저장소에 없는 오래된
`poudy-backend-production.json` 프로비저닝 파일이 남아 있어 동일 제목·다른 UID의 복제본이
생겼습니다. 이 파일은 `/opt/poudy-monitoring/backup/dashboard-duplicate-cleanup-20260926/`에
백업한 뒤 프로비저닝 감시 경로에서 제거했고, Grafana의 복제본을 삭제했습니다. 원래의
`disableDeletion: true` 설정은 복구했습니다. 현재 Production 대시보드 UID는 `ad2z7mm`입니다.

### 성능 지표 추가 검토

Unix exporter는 기본 collector로 네트워크(`netdev`), 디스크 I/O(`diskstats`), 메모리
(`meminfo`), VM 통계(`vmstat`)를 이미 노출하며 `enable_collectors = ["systemd"]`는 이 기본
collector 집합에 systemd를 더합니다. 따라서 네트워크 처리량, swap 사용·입출력, OOM kill은
별도 exporter 설치 없이 기존 호스트 시계열을 대시보드에서 조회할 수 있습니다. 서비스별
네트워크·가상 인터페이스를 제외해 실제 호스트 NIC 위주로 표시합니다.

Spring Boot MVC는 `http.server.requests` 요청 계측을 제공하고, Actuator Prometheus endpoint가
Staging과 Production Alloy에 이미 스크랩됩니다. 운영 프로필에는 p95 응답시간 계산용 HTTP 요청
히스토그램을 켰고 Staging·Production 양쪽에 배포한 뒤 `http_server_requests_seconds_bucket`
시계열을 확인했습니다. HTTP 요청 수, 5xx 비율, p95와 호스트 네트워크·swap·OOM 패널은 운영 확인용이며
이 항목들에 별도 Discord 알림은 만들지 않습니다. 외부 URL probe 응답시간은 공개 경로의
end-to-end 측정으로 별도 유지합니다.

디스크 사용률은 이미 표시합니다. IOPS와 디스크 처리량·지연 패널은 애플리케이션 EC2에서 지금
우선 수집할 지표로 보지 않고, DB를 EC2에 도입한 뒤 DB 인스턴스의 성능 대시보드 항목으로
추가 검토합니다.

2026-09-26 저장소 대시보드 원본에 위 네트워크·swap·OOM·HTTP 성능 패널을 추가하고,
`application-prod.yml`에 10ms~5s 범위의 HTTP request histogram을 켰습니다. 새 네트워크·swap
패널은 프론트 대시보드에서 NIC `ens5` 시계열이 표시되는 것까지 확인했습니다. Alloy collector
변경은 없습니다. 서비스별 성능 알림도 추가하지 않았습니다.

SSM으로 Staging 및 Production 백엔드의
`/opt/poudy/backend/config/application-prod.yml`에 현재 저장소 설정을 설치하고 각 백엔드
서비스를 재시작했습니다. 두 인스턴스 모두 systemd active, `/actuator/health` 200,
`/actuator/prometheus` 200을 확인했습니다. 각 환경에서 읽기 전용 `/api/categories` 요청을
보낸 뒤 `http_server_requests_seconds_bucket{uri="/api/categories"}` 시계열도 확인했습니다.
당시 배포 파이프라인도 같은 외부 설정을 설치하도록 갱신했습니다. 이후 배포는 JAR만
교체하게 바뀌었지만, 호스트에 설치된 파일이 남아 최신 설정을 계속 덮어썼습니다.
2026-10-22 운영 장애 복구 때 이 파일을 백업으로 보존하고 로드 대상에서 제외했습니다.
운영 호스트 JAR는 `20-config-source.conf`로 JAR 내부 설정만 읽도록 고정하며,
서버별 값은 `/etc/poudy/backend.env`로 전달합니다. 모니터링 앱 설정도 저장소의
`application-prod.yml`을 변경해 배포합니다. 디스크 IOPS·처리량·
지연은 DB 도입 후 DB 인스턴스 대시보드 항목으로 검토합니다.

Grafana는 제목이 아니라 UID로 대시보드를 식별하므로, 다른 UID로 가져오면 같은 제목의
별도 대시보드가 생깁니다. 이 과정에서 생긴 복제본 UID `poudy-backend-production`은 오래된
서버 측 프로비저닝 파일 때문에 목록에서 계속 되살아났습니다. 2026-09-26 원본 파일을 백업한 뒤
프로비저닝 경로에서 제거하고 Grafana의 복제본도 삭제했습니다. 원본 JSON과 기존 프로비저닝
설정은 Monitoring EC2 백업 디렉터리에 보관되어 있으며, 저장소의 Production UID `ad2z7mm`는
유지됩니다.

Grafana를 통합 조회 창구로 쓰기 위해 운영 프론트 EC2에 Grafana 공식 RPM 저장소의 Alloy
v1.19.2를 설치했습니다. 2026-09-26 `production-frontend.alloy`를 설치하고 `alloy validate`를
통과시켰으며, systemd가 `/etc/alloy/credentials`를 읽도록 설정했습니다. 사용자가 입력한
Cloudflare Access 서비스 토큰은 `/etc/alloy/credentials`에 저장되어 있고, Alloy는 활성화되어
실행 중입니다. Prometheus와 Grafana에서 프론트 CPU·메모리·루트 디스크 지표와
`poudy-frontend.service`, `nginx.service`의 상태를 확인했습니다. Next.js 프로세스는 Linux의
`comm` 값이 `next-server (v16.3.0)`이며 `/proc`에서 15자로 잘리는 점을 반영해 Alloy 매처를
`comm = ["next-server (v1"]`로 수정했습니다. 설정 검증과 서비스 재시작은 성공했습니다.
Grafana 프론트 자원 대시보드에서 Next.js 프로세스 1개와 Nginx 프로세스 4개를 확인했습니다.
이 설정은 기존 CloudWatch 수집을 대체하지 않으며, Alloy 지표와 대시보드가 안정적으로
확인된 뒤 중복 수집 정리를 검토합니다.

### 환경별 모니터링 체크리스트

| 항목 | Production | Staging | 확인 범위와 한계 |
| --- | --- | --- | --- |
| 로그 저장·수집 | journald, CloudWatch Logs, Loki(S3) | journald, Alloy → Loki(S3) | 전송과 Loki 조회 경로 확인. Staging의 안전한 Spring 시작·초기화 로그가 표시됨. 로그가 발생하지 않는 시간대에는 패널이 비어 있을 수 있음 |
| 핵심 지표 대시보드 | CPU, 메모리, 디스크, 서비스·프로세스 상태, Actuator, 로그, JVM heap·live threads, 네트워크·swap·OOM·HTTP 성능 패널 | CPU, 메모리, 디스크, 서비스·프로세스 상태, Actuator Health, 로그, JVM heap·live threads, 네트워크·swap·OOM·HTTP 성능 패널 | 두 JSON의 17개 패널을 Grafana에 반영하고 주요 패널 확인 완료. 2026-09-26 Production 복제본 UID `poudy-backend-production`을 삭제하고 정상 UID `ad2z7mm`을 보존했음. histogram 시계열 확인 완료 |
| 팀 장애 알림 | 서비스·자원 및 Actuator 관련 규칙, Discord 연락처 | `/actuator/health` 장애만 Discord 연락처로 알림 | Staging health 알림의 firing Discord 도착과 정상 복구 후 resolved 도착 확인 |
| 배포 파이프라인 | `main` → `poudy-pipeline` → CodeBuild/CodeDeploy | `dev` → `poudy-staging-pipeline` → CodeBuild/CodeDeploy (백엔드 다음 프론트) | 설정은 CodePipeline/AWS에 있으며 PR preview만 Vercel에 있고 저장소에 파이프라인 IaC는 없음 |

Staging 백엔드 `/actuator/health` 장애 규칙은 비파괴 테스트에서 실제 firing Discord 알림과
복구 후 resolved 알림 도착까지 확인했습니다. Production 백엔드 Discord 연락처 발송도 별도로
테스트한 이력이 있습니다. Production·Staging JVM
패널과 백엔드 전용 리소스, 프론트 자원 대시보드의 기존 지표는 Grafana에서 확인했습니다.
Production 백엔드 리소스 쿼리는 프론트 시계열 혼입을 막도록 백엔드 인스턴스로 제한했고,
기존 Grafana UID `ad2z7mm`에 반영해 백엔드 한 대만 표시되는 것을 확인했습니다. HTTP 요청
histogram은 양쪽 백엔드에 배포하고 시계열까지 확인했습니다.
프론트엔드 애플리케이션 로그의
중앙 수집은 별도 결정 전까지 보류합니다.

### Grafana 대시보드 코드 관리

운영 대시보드 JSON은 Grafana 13 V2 내보내기 파일이고, Loki 전용 대시보드는
파일 프로비저닝과 호환되는 클래식 JSON입니다. 운영 대시보드 JSON에는 CPU·메모리·디스크·
서비스 상태·Actuator health·백엔드 로그 패널이 들어 있습니다. Loki 전용 대시보드에는
운영 백엔드 로그를 넓게 조회하는 Logs 패널이 있습니다. 로그 쿼리는 실제 Explore에서
확인한 라벨 셀렉터를 사용합니다.

```logql
{environment="prod", service="poudy-backend"}
```

`poudy.yaml`은 Loki 전용 대시보드를 Grafana 최상위 폴더에 읽기 전용 원본으로
프로비저닝합니다. 운영 대시보드 V2 파일은 기존 UI 관리 대시보드의 내보내기본이므로 이
프로비저닝 경로에 복사하지 않습니다. Production 파일 UID는 기존 UI 대시보드 UID `ad2z7mm`과
일치합니다. 2026-09-26 수정 JSON을 이 UID에 다시 가져와 덮어쓰고 Grafana UI에서 주요 패널을
확인했습니다. 컨테이너 안 대시보드 경로는
`/var/lib/grafana/dashboards/poudy`입니다.

Production 파일은 프로비저닝되지 않으므로, 저장소에서 고친 뒤 같은 UID로 직접 가져와야 Grafana에
반영됩니다. #711의 부하 테스트 패널 4개는 이 단계가 빠져 한동안 운영 Grafana에 없었습니다.
2026-10-23 v0.18.0의 JSON(#890 에러 패널과 #711 패널 포함, 패널 23개)을 `ad2z7mm`에 가져와
덮어썼고, Grafana 버전은 22입니다.

| 저장소 경로 | Grafana 컨테이너 경로 |
| --- | --- |
| `deploy/monitoring/grafana/dashboards/poudy-backend-staging.json` | `/var/lib/grafana/dashboards/poudy/poudy-backend-staging.json` |
| `deploy/monitoring/grafana/dashboards/poudy-backend-logs.json` | `/var/lib/grafana/dashboards/poudy/poudy-backend-logs.json` |
| `deploy/monitoring/grafana/provisioning/dashboards/poudy.yaml` | `/etc/grafana/provisioning/dashboards/poudy.yaml` |

2026-09-25에 Monitoring EC2의 실제 구성을 확인하고 적용했습니다. 컨테이너는
`poudy-grafana`이며, 호스트의 `/opt/poudy-monitoring/config/grafana/provisioning`이
`/etc/grafana/provisioning`에 읽기 전용으로, `/opt/poudy-monitoring/data/grafana`가
`/var/lib/grafana`에 마운트되어 있습니다. 호스트의 프로비저닝 파일과 Loki 대시보드
파일은 위 경로에 설치했고, Grafana 컨테이너를 재시작했습니다. 시작 로그에서 대시보드
프로비저닝이 완료된 것을 확인했으며, `https://monitoring.poudy.site/d/poudy-backend-logs/poudy-backend-logs`
에서 로그 행이 표시되는 것도 확인했습니다. 대시보드는 Loki 데이터소스 UID `loki`를
사용합니다.

```bash
sudo docker ps --format 'table {{.Names}}\t{{.Image}}' | grep -i grafana
sudo docker inspect <grafana-container-name> \
  --format '{{json .Mounts}}'
sudo docker inspect <grafana-container-name> \
  --format '{{json .Config.Labels}}'
```

실행 환경에 재배포할 때는 기존 Grafana 데이터 볼륨이나 컨테이너 설정을 덮어쓰지 말고,
실제 Compose 파일과 마운트 위치를 먼저 확인합니다. 대시보드 파일은 provider가 30초마다
스캔하고, provider 설정 변경은 Grafana 재시작 후 반영됩니다. 프로비저닝 대시보드는
파일이 원본입니다. `allowUiUpdates: false`이므로 변경은 JSON을 수정해 배포해야 합니다.
Grafana UI에서 편집할 수 없으며, UI에서 임시 편집한 내용은 코드에 반영되지 않습니다.

CloudWatch Agent JSON 템플릿에는 애플리케이션 journal 수집을 넣지 않습니다.
백엔드 journal은 Alloy와 Loki 경로를 사용합니다. CloudWatch 로그 그룹은 무기한 보존으로
남지 않도록 아래의 사전 생성 명령으로 14일 보존을 먼저 설정합니다.

## 적용·재검증 순서

아래 명령은 현재 구성을 처음 적용하거나 재검증할 때 사용합니다. 모든 AWS 명령은
`ap-northeast-2`에서 실행합니다. 계정 ID와 production 인스턴스 ID는 현재 환경에
맞춰 반영되어 있습니다.

### 0. 백엔드 `:8080` 상태 확인

현재 운영 백엔드의 호스트 방화벽을 확인합니다. 공유 보안 그룹은 변경하지 않습니다.

보안 그룹을 바꾸기 전에 현재 연결과 SSH 세션을 보존합니다. 먼저 AWS에서 백엔드의
보안 그룹과 `8080` 규칙을 확인합니다.

```bash
aws ec2 describe-instances \
  --instance-ids i-0192ed4a2f51748fe \
  --query 'Reservations[0].Instances[0].SecurityGroups[*].GroupId' \
  --output text --region ap-northeast-2

BACKEND_SG_ID="$(aws ec2 describe-instances \
  --instance-ids i-0192ed4a2f51748fe \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
  --output text --region ap-northeast-2)"

aws ec2 describe-security-groups \
  --group-ids "$BACKEND_SG_ID" \
  --query 'SecurityGroups[0].IpPermissions[?FromPort==`8080`]' \
  --output json --region ap-northeast-2
```

백엔드에서 프로세스가 loopback이 아닌 주소에 열려 있는지와 OS 방화벽 상태를 확인합니다.

```bash
sudo ss -ltnp | grep ':8080'
curl --fail --silent http://127.0.0.1:8080/actuator/health
sudo firewall-cmd --state 2>/dev/null || true
sudo firewall-cmd --list-all 2>/dev/null || true
sudo nft list ruleset
sudo systemctl status poudy-backend-firewall.service --no-pager
sudo systemctl is-enabled poudy-backend-firewall.service
```

외부 네트워크에서 public IPv4 직접 접근이 차단됐는지 확인합니다.

```bash
curl -i --connect-timeout 5 http://43.202.164.103:8080/api/categories
```

다음 private 경로 명령은 운영 프론트 EC2의 SSM 세션에서 실행합니다. 공개 도메인
명령은 외부 클라이언트에서 실행합니다.

```bash
curl --fail --silent --show-error http://10.0.3.84:8080/api/categories
curl --fail --silent --show-error https://poudy.site/api/categories
```

### 운영 백엔드 8080 호스트 방화벽

`deploy/firewall/production-backend.nft`가 규칙의 원본입니다. 운영 백엔드 EC2에서
저장소 checkout을 같은 커밋으로 맞춘 뒤 설치 스크립트를 실행합니다. 이 스크립트는
production instance ID를 IMDSv2로 확인하고, 방화벽 전용 테이블만 교체합니다.

```bash
sudo ./deploy/scripts/install-production-backend-firewall.sh
```

적용 뒤 저장소 설정과 `/etc`에 설치한 파일이 같은지 확인합니다.

```bash
sha256sum deploy/firewall/production-backend.nft /etc/poudy/backend-firewall.nft
sha256sum deploy/systemd/poudy-backend-firewall.service /etc/systemd/system/poudy-backend-firewall.service
sha256sum deploy/systemd/poudy-backend.service.d/10-firewall.conf /etc/systemd/system/poudy-backend.service.d/10-firewall.conf
sudo nft list table inet poudy_backend
sudo systemctl is-enabled poudy-backend-firewall.service
sudo systemctl is-active poudy-backend-firewall.service poudy-backend.service
```

방화벽은 `10.0.0.57`에서 오는 IPv4 `TCP/8080`만 통과시키고 다른 IPv4 출발지 및
모든 IPv6 `TCP/8080`을 차단합니다. `22/tcp`, 다른 포트, 아웃바운드, 공유 보안 그룹
규칙은 건드리지 않습니다. systemd drop-in이 방화벽 서비스의 성공을 백엔드 시작
조건으로 지정하며, 방화벽 서비스는 부팅 때 규칙을 다시 로드합니다. 운영 재부팅은
검증만을 위해 수행하지 않습니다.

긴급 롤백은 현재 SSM 세션을 유지한 채 방화벽 전용 서비스를 비활성화합니다. 이 조치는
외부 `8080` 차단을 해제하므로 복구 확인 뒤에는 저장소 설정을 수정하고 재적용합니다.

```bash
sudo systemctl disable --now poudy-backend-firewall.service
sudo rm -f /etc/systemd/system/poudy-backend.service.d/10-firewall.conf
sudo systemctl daemon-reload
sudo nft list table inet poudy_backend 2>/dev/null || true
```

```bash
curl --fail --silent --show-error \
  --resolve poudy.site:443:127.0.0.1 \
  https://poudy.site/api/categories

```

### Staging 백엔드 8080 호스트 방화벽

2026-10-12 staging BE(`i-00b689c66dc629d79`, `10.0.0.185`)에도 운영과 같은
호스트 방화벽을 적용했습니다. 규칙 원본은 `deploy/firewall/staging-backend.nft`이며
staging FE `10.0.0.51`에서 오는 IPv4 `TCP/8080`만 허용합니다. 나머지 IPv4와
모든 IPv6의 `TCP/8080`은 차단합니다. Docker는 host network를 사용하므로 같은
INPUT 규칙이 적용됩니다. SSH, 아웃바운드와 loopback 관리 포트 `8081`은 유지합니다.

```bash
sudo ./deploy/scripts/install-staging-backend-firewall.sh
sudo nft list table inet poudy_backend
sudo systemctl is-enabled poudy-backend-firewall.service
sudo systemctl is-active poudy-backend-firewall.service poudy-backend.service
curl --fail --silent http://127.0.0.1:8081/actuator/health
```

방화벽 서비스와 백엔드 시작 의존성 drop-in은 운영과 공유합니다. 설치 스크립트는
staging BE 인스턴스 ID를 확인합니다. 외부 검증은 BE 공인 IP의 `:8080` 직접 요청이
실패하고 `https://staging.poudy.site/api/categories`의 Cookie를 포함한 캐시 우회
요청이 200인지 확인합니다. 긴급 롤백은 위 운영 절차와 같습니다.

### 1. IAM과 로그 그룹

현재 `ec2-project` role과 로그 그룹 적용이 완료되었습니다. 새 환경이나 권한 오류가
확인될 때만 아래 최소 권한을 기준으로 검토합니다. `CloudWatchAgentServerPolicy`
전체 권한을 그대로 추가하는 대신, 미리 로그 그룹과 보존 정책을 만든 뒤 아래 최소 권한만
부여합니다.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "WritePoudyInfraLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogStream",
        "logs:DescribeLogStreams",
        "logs:PutLogEvents"
      ],
      "Resource": [
        "arn:aws:logs:ap-northeast-2:843255971531:log-group:/poudy/prod/infra/frontend/nginx:log-stream:*",
        "arn:aws:logs:ap-northeast-2:843255971531:log-group:/poudy/prod/infra/frontend/codedeploy:log-stream:*",
        "arn:aws:logs:ap-northeast-2:843255971531:log-group:/poudy/prod/infra/frontend/certbot:log-stream:*",
        "arn:aws:logs:ap-northeast-2:843255971531:log-group:/poudy/prod/infra/backend/codedeploy:log-stream:*"
      ]
    },
    {
      "Sid": "PublishPoudyInfraMetrics",
      "Effect": "Allow",
      "Action": "cloudwatch:PutMetricData",
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "cloudwatch:namespace": "Poudy/Infra"
        }
      }
    }
  ]
}
```

로그 그룹은 한 번만 만들고 14일 보존을 설정합니다.

```bash
for group in \
  /poudy/prod/infra/frontend/nginx \
  /poudy/prod/infra/frontend/codedeploy \
  /poudy/prod/infra/frontend/certbot \
  /poudy/prod/infra/backend/codedeploy; do
  aws logs create-log-group --log-group-name "$group" --region ap-northeast-2 2>/dev/null || true
  aws logs put-retention-policy --log-group-name "$group" --retention-in-days 14 --region ap-northeast-2
done
```

기존 CodeBuild 그룹도 같은 기준으로 정리합니다.

```bash
aws logs put-retention-policy \
  --log-group-name /aws/codebuild/project-2026 \
  --retention-in-days 14 \
  --region ap-northeast-2
```

### 2. 호스트 journal 보존

프론트와 백엔드 EC2에서 각각 실행합니다.

```bash
sudo install -d -o root -g systemd-journal -m 2755 /var/log/journal
sudo install -D -o root -g root -m 0644 \
  /opt/poudy/repository/deploy/monitoring/journald-poudy.conf \
  /etc/systemd/journald.conf.d/10-poudy.conf
sudo systemctl restart systemd-journald
sudo journalctl --vacuum-time=14d --vacuum-size=200M
```

확인:

```bash
journalctl --disk-usage
journalctl -u nginx.service -u poudy-frontend.service --since '24 hours ago' --no-pager
journalctl -u poudy-backend.service --since '24 hours ago' --no-pager
journalctl -u certbot.timer --since '30 days ago' --no-pager
```

### 3. CloudWatch Agent 설치·시작

Amazon Linux 2023에서는 공식 패키지를 사용합니다. 인스턴스 role에 위 권한을 먼저
반영하고, 프론트 호스트에서 다음을 실행합니다.

```bash
sudo dnf install -y amazon-cloudwatch-agent
sudo install -D -o root -g root -m 0644 \
  /opt/poudy/repository/deploy/monitoring/cloudwatch-agent-frontend.json \
  /opt/aws/amazon-cloudwatch-agent/etc/poudy-frontend.json
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/poudy-frontend.json
sudo systemctl enable amazon-cloudwatch-agent
sudo systemctl restart amazon-cloudwatch-agent
```

백엔드에서는 파일명만 `cloudwatch-agent-backend.json`과 `poudy-backend.json`으로
바꿉니다. 수집기 상태와 설정 오류는 다음으로 확인합니다.

```bash
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a status -m ec2
sudo journalctl -u amazon-cloudwatch-agent --since '30 minutes ago' --no-pager
sudo tail -n 100 /opt/aws/amazon-cloudwatch-agent/logs/configuration-validation.log
```

### 4. 알람과 알림

현재 SNS topic 생성, 이메일 구독 확인, CloudWatch Alarm의 In alarm 알림 테스트까지
완료되었습니다. 구성을 재생성할 때만 다음 절차를 사용합니다.

```bash
aws sns create-topic --name poudy-infra-alerts --region ap-northeast-2
aws sns subscribe \
  --topic-arn arn:aws:sns:ap-northeast-2:843255971531:poudy-infra-alerts \
  --protocol email \
  --notification-endpoint <운영_알림_이메일> --region ap-northeast-2
```

이번에 추가한 Grafana 프론트 알림은 공개 페이지/API 헬스만 감시합니다. 기존 백엔드
Actuator health 규칙과 CloudWatch 자원·EC2 상태 알람은 그대로 유지합니다. 스테이징 프론트
자원 지표는 대시보드에 기록하되 별도 자원 알림을 만들지 않았습니다.

| 신호 | 지표/방법 | 시작 임계치 |
| --- | --- | --- |
| Production 프론트/API | `min(probe_success{job="poudy_public_endpoints",environment="production"}) or vector(0)` | `< 1`, 2분 지속, 1분 평가 |
| Staging 프론트/API | `min(probe_success{job="poudy_public_endpoints",environment="staging"}) or vector(0)` | `< 1`, 2분 지속, 1분 평가 |
| Production 백엔드 | `/actuator/health` HTTP probe | 기존 `Backend Actuator Health Down` 규칙 |
| Staging 백엔드 | `/actuator/health` HTTP probe | 기존 `Staging Backend Actuator Health Down` 규칙 |
| 메모리 | `Poudy/Infra mem_used_percent` | 최대 `> 85%`, 1분 5회 |
| 디스크 | `Poudy/Infra disk_used_percent` | 최대 `> 80%`, 1분 3회 |
| EC2 장애 | `AWS/EC2 StatusCheckFailed` | 합계 `> 0`, 2회 |

CPU·프로세스·Nginx 5xx·CodeDeploy 실패 알람은 현재 구성하지 않았습니다. Grafana가
공개 경로의 서비스 상태를 담당하고, CodeDeploy 실패는 콘솔에서 확인합니다.

### 공개 경로 Probe 운영 기준

외부 HTTPS 체크는 위의 Blackbox Exporter와 Prometheus 설정으로 관리합니다. 대상을
추가하거나 변경할 때 `prometheus/prometheus.yml`의 `poudy_public_endpoints` job과
프론트 availability 대시보드를 함께 수정합니다. 공개 프론트 페이지는 Vercel 배포까지,
공개 API URL은 DNS·Cloudflare·Nginx의 백엔드 프록시 경로까지 검사합니다. 이 방식은
브라우저 렌더링이나 사용자별 응답을 확인하지 않으며, 내부 서비스 상태는 각 환경의
Actuator health probe로 별도 감시합니다.

Nginx 5xx metric filter는 현재 저장소의 query-string 없는 access log 형식에 맞춥니다.

```bash
aws logs put-metric-filter \
  --log-group-name /poudy/prod/infra/frontend/nginx \
  --filter-name PoudyNginx5xx \
  --filter-pattern '[ip, timestamp, request, status_code=5*, bytes, request_time, upstream_status, user_agent]' \
  --metric-transformations metricName=Nginx5xx,metricNamespace=Poudy/Infra,metricValue=1,defaultValue=0 \
  --region ap-northeast-2
```

CodeDeploy 실패 SNS 알림은 현재 구성하지 않습니다. 필요해질 때 각 애플리케이션의
CodeDeploy notification rule 또는 EventBridge state-change 이벤트를 기존 SNS topic에
연결합니다.

## 보안 정책

- Nginx access log는 method·path·status·latency·upstream status만 남기며 query string,
  Referer, Cookie, Authorization header를 기록하지 않습니다.
- Nginx error log는 `warn` 이상만 남깁니다. 운영 장애 분석에 필요한 경우에도 원문에
  토큰이 포함된 요청 URL을 넣지 않도록 애플리케이션에서 secret을 예외 메시지로 만들지
  않습니다.
- Next.js journal은 중앙 수집하지 않습니다. Spring Boot journal은 Loki로 보내기 전에
  `PRODUCT_SEARCH` 이벤트 및 예외·스택 프레임을 필터링합니다. 이 필터는 Alloy 단계의
  보호 장치이며 애플리케이션 코드의 로그 정책 검토를 대체하지 않습니다.
- CloudWatch Agent role에는 로그 생성·쓰기와 `Poudy/Infra` 지표 발행만 허용합니다.
  로그 그룹 생성·보존 변경·알람 생성 권한은 운영자 또는 IaC 배포 역할에만 둡니다.
- CodeDeploy wire log는 기본값을 유지합니다. AWS 문서대로 일시적인 장애 조사 외에는
  활성화하지 않습니다. S3 전송 내용이 평문으로 남을 수 있습니다.

## 운영 확인 명령

```bash
sudo tail -n 100 /var/log/nginx/error.log
sudo tail -n 100 /var/log/aws/codedeploy-agent/codedeploy-agent.log
sudo tail -n 100 /var/log/letsencrypt/letsencrypt.log
sudo journalctl -u poudy-frontend.service -u nginx.service -n 100 --no-pager
sudo journalctl -u poudy-backend.service -n 100 --no-pager
df -h /
free -m
systemctl is-active nginx poudy-frontend poudy-backend codedeploy-agent
```


## AWS 배포 관측과 Discord 알림 (#977)

### 알림 경로

2026-10-29 Monitoring EC2 `i-0e58cd6958e0a4519` (`10.0.0.203`)에 적용했다.
`i-0b29b5e3e4ac3d6b6`는 Data Hub이므로 모니터링 설치 대상으로 사용하지 않는다.

| 경로 | 알림 범위 |
|---|---|
| CloudWatch → 수집기 → Prometheus → Grafana → Worker → Discord | 운영·스테이징 파이프라인 실패 집계와 환경별 BE·FE 빌드 실패 집계 |
| CodeDeploy → 수집기 → Worker → Discord | 배포 ID별 상태 관측, 실패·오류 코드, 중단·성공, 장시간 진행 |
| 수집기 heartbeat → Worker Cron → 운영 Discord | 수집 정상 상태를 15분 이상 확인하지 못한 경우와 연결 회복 |

Grafana의 기존 연락처는 유지하고 `Poudy Deployment production`, `Poudy Deployment staging`
두 webhook 연락처와 `Poudy Deployment Alert` 폴더를 추가했다. Worker가 보유한 기존
Discord 채널로 전달하므로 Discord webhook 비밀 값을 서버나 저장소로 복사하지 않는다.

### 조회와 경보 기준

수집기는 **Monitoring 서버에서만** 기존 EC2 역할을 사용한다. 별도 IAM 권한이나
장기 AWS 키 없이 AWS CLI를 순차 실행하며 정상 주기는 60초다. 한 주기가 오래 걸려도
다음 주기를 겹쳐 실행하지 않는다. 서비스는 단일 CPU의 25%, 메모리 256MiB로 제한한다.
이는 전체 호스트 CPU 25%라는 뜻이 아니다.

| 항목 | 기준 |
|---|---|
| 파이프라인 실패 | `FailedPipelineExecutions`, 두 파이프라인 |
| 빌드 실패 | `FailedBuilds`, 네 CodeBuild 프로젝트 |
| 실패 집계 경보 | 새 실패 집계를 관측한 뒤 15분 동안 조건 활성, 60초 평가 |
| 장시간 배포 | 생성 후 10분이 지났고 아직 완료되지 않은 배포, ID별 1회 |
| 수집 이상 | 조회 실패 또는 주기 갱신 지연이 3분 지속 |
| 전송 대기 | 대기열이 10분 이상 비어 있지 않은 경우 |
| 외부 생존 확인 | AWS 조회와 로컬 Grafana·Prometheus health 정상 확인 후 5분마다 heartbeat, Worker가 5분마다 확인. 평가 주기만큼 추가 지연 가능 |

장시간 기준은 최근 14일에서 그룹별 최대 25개 배포를 조회해 성공 표본의
`max(10분, p95 × 2를 분 단위 올림)`으로 정한다. 적용 시 네 그룹 모두 10분이었다.
조회 당시의 표본 요약은 서버의 `deployment/history-summary.json`에 보관한다.
긴 QUEUED 대기도 경고할 수 있으며 배포 실패라고 단정하지 않는다.

CloudWatch는 여섯 고정 지표를 `GetMetricData` 한 번에 조회한다. 30일 동안 60초마다
동작하면 약 43,200회 호출, 259,200개 metric request다. 단가가 1,000개당 $0.01인
경우 약 $2.59/월이며 실제 리전·요금·재시도에 따라 달라진다. 새 유료 경보나 EC2는
생성하지 않는다. Worker heartbeat는 KV에 하루 약 288회 추가 기록하며 기존 PR 알림과
요금 한도를 공유한다. 무료 한도 내라고 전체 사용량까지 보장하지 않는다.

### 영속 상태와 누락 보완

- CodeDeploy는 이전 조회 이후의 모든 페이지와 진행 중 ID를 확인한다. 초기 설치 때
  완료된 과거 배포는 알리지 않고, 오래 진행 중인 배포는 별도로 발견한다.
- 조회 위치와 알림 대기열을 같은 JSON에 원자적으로 저장한다. 재시작 뒤 이력을 다시
  조회하며, 전송 성공 확인 전에 대기열에서 지우지 않는다.
- 전송 실패는 60초부터 최대 1시간까지 backoff하며 429의 Retry-After도 반영한다.
  재시도 대기는 이벤트별로 적용해 한 채널 오류가 다른 채널을 막지 않게 한다.
  Worker는 배포 이벤트 ID를 7일 기억해 재전송 중복을 줄인다. 응답 유실과 KV 동시성에
  따른 중복 가능성은 남는다.
- CloudWatch는 최근 1시간을 겹쳐 확인해 늦은 표본과 같은 분의 집계 증가를 반영한다.
  중단 뒤에는 최대 7일까지 재조회한다. 첫 설치 때는 과거 실패를 조용히 기준으로 삼는다.
- 일반 API 200, Grafana 경보 해제, 개별 배포 성공을 전체 릴리스 성공으로 표현하지 않는다.

CodeDeploy의 `creator=codeDeployRollback`과 `rollbackInfo.rollbackTriggeringDeploymentId`로
원본이 명시된 경우 자체 복구 배포로 표시한다. 과거 스테이징의 원본 `d-AH9EQ5RLL`과
복구 `d-ALXT3WKB9`의 연결을 확인했다. **CodePipeline 단계 롤백의 정확한 시작·결과는
현재 조회 권한으로 판정하지 않는다.** 수동 재배포도 자동으로 롤백이라고 분류하지 않는다.

머지 후 미실행과 전체 파이프라인 정체는 아직 자동 판정하지 않는다. 커밋별 기대 배포와
권위 있는 완료 신호를 연결해야 하며, 현재의 단계·이력 조회 거부 상태에서 모든 최신
커밋의 완료를 확인한다고 약속할 수 없다. 신규 머지 감시 기능을 추가한 것으로 기록하지 않는다.

### 파일과 운영 명령

| 저장소 원본 | 서버 경로 |
|---|---|
| `deployment/collector.py`, `deployment/configure.py` | `/usr/local/lib/poudy-deployment-monitor/` |
| `deployment/config.json` | `/etc/poudy-deployment-monitor/config.json` |
| `deployment/poudy-deployment-monitor.service` | `/etc/systemd/system/poudy-deployment-monitor.service` |
| `prometheus/prometheus.yml`의 배포 job | `/opt/poudy-monitoring/config/prometheus/prometheus.yml`에 병합 |

`configure.py apply`가 만드는 Grafana 경보 JSON은
`/opt/poudy-monitoring/config/grafana/provisioning/alerting/poudy-deployment.json`이다.
설정 변경 전 백업을 만들고 전용 UID 네 규칙만 관리한다. 기존 경보·알림 정책은 바꾸지 않는다.
설치 코드는 root 소유, 읽기 전용 파일로 두고 디렉터리는 755로 둔다.
`DynamicUser`가 기존 비공개 `/opt` 경로를 읽게 하려고 상위 디렉터리 권한을 넓히지 않는다.

자격은 root 전용 `credentials.env`(600)의 `DEPLOY_NOTIFY_TOKEN`으로 주입한다.
같은 값이 GitHub Secret과 Worker secret에 설정되어야 한다. 기존 SEO의 `NOTIFY_TOKEN`과
분리한다. 토큰을 커밋하거나 명령 이력·로그에 남기지 않는다. `configure.py credential`의
숨김 입력은 `stty -echo` 상태에서 사용하고 입력 후 반드시 `stty echo`로 복원한다.

```bash
sudo systemctl status poudy-deployment-monitor.service --no-pager
sudo journalctl -u poudy-deployment-monitor.service -n 20 --no-pager
sudo python3 /usr/local/lib/poudy-deployment-monitor/configure.py status
sudo python3 /usr/local/lib/poudy-deployment-monitor/configure.py receipts
```

지표는 Docker bridge의 `172.18.0.1:9830/metrics`에만 바인딩한다. Prometheus 외부 공개
포트를 추가하지 않는다. Compose 네트워크 gateway가 바뀌면 `config.json`과 scrape target을
함께 변경한다. `configure.py apply` 후 promtool 설정 검사와 Prometheus HUP,
`configure.py reload`로 반영한다. 이 서비스는 지표 응답과 주기 조회를 함께 제공하므로
별도 timer 없이 systemd가 상시 관리하고 재부팅 후 자동 실행한다.

문제가 있으면 새 서비스만 중지하고 추가한 scrape job과 네 경보를 제거·reload한다.
Worker를 이전 배포로 되돌리면 배포 전용 경로가 사라지므로 수집기도 함께 중지한다.
기존 GitHub·SEO·서비스 경보와 SNS 이메일 구독은 유지한다. 영속 상태 삭제는 중복 발송을
일으킬 수 있어 일반 재시작 절차에 포함하지 않는다.

합성 전달 검증은 `configure.py sample-create`로 TEST 규칙 두 개를 만든 후
`receipts`에서 확인한다. 검증 뒤 `sample-remove`로 반드시 삭제한다.
스테이징 동일 아티팩트 재배포 검증은 `redeploy-staging-frontend`가 제공하며,
최신 시도가 마지막 성공과 일치하고 공개 health가 정상일 때만 실행한다.
이 명령도 실제 스테이징 FE 서비스를 재시작하므로 운영 절차에 따라 실행한다.

참조: [#977](https://github.com/woowacourse-teams/2026-poudy/issues/977),
[CloudWatch 요금](https://aws.amazon.com/cloudwatch/pricing/),
[KV 요금](https://developers.cloudflare.com/kv/platform/pricing/).


배포 관측 회귀 검증은 `deploy/tests/deployment-monitor.test.py`(수집기 5건)와
`infra/discord-worker/test/deployment.test.ts`(Worker 6건)에 있다. 각각 Deploy scripts CI와
Discord Worker Deploy CI에서 실행한다. 기록된 응답으로 과거 기준 처리, 실패·중단,
장시간 진행, 자체 롤백 연결, 재시작, 429 재시도, 채널 간 전송 독립성, 인증, 중복,
heartbeat 중단·회복과 Grafana resolved 처리 범위를 확인한다.

2026-10-29 스테이징 FE는 마지막 정상 revision을 그대로 재배포한 `d-9783CQJML`이
Succeeded였고 수집기 기록에서도 성공 이벤트의 `sent=true`를 확인했다.
60초 조회 사이 끝난 배포여서 진행 중 상태는 관측하지 못했지만 최종 결과는 수집했다.
합성 Grafana 경보는 운영·스테이징 두 경로의 전달 오류가 없음을 확인하고 삭제했다.
