# MVP 인프라 로그·모니터링

## 현재 적용 상태

2026-08-27 기준 production 1차 모니터링 구성이 실제 AWS 환경에 적용되어 있습니다.
이 문서의 아래 적용 절차는 재구성·검증·장애 대응을 위한 운영 기준으로 사용합니다.

### 운영 대상

- 리전: `ap-northeast-2`
- 프론트엔드 EC2: `i-0b3254c52503db10f`
  - Elastic IP: `54.116.229.77`
  - Private IP: `10.0.0.57`
- 백엔드 EC2: `i-0192ed4a2f51748fe`
  - 현재 Public IP: `16.184.16.46` (Elastic IP 아님)
  - Private IP: `10.0.3.84`
- EC2 IAM role: `ec2-project`
- Security Group: `project-public`

백엔드 `:8080` 외부 접근 차단은 현재 의도적으로 보류 중입니다. 외부 모니터링과
프론트 Nginx의 백엔드 연결은 백엔드 Public IP가 아니라 운영 도메인과 Private IP
경로를 사용합니다.

### 적용 완료 항목

- 프론트·백엔드 EC2에 CloudWatch Agent 설치 및 설정 완료
- Agent 상태: `running`, Config status: `configured`
- 지표 namespace: `Poudy/Infra`, 수집 주기: 60초
- 수집 지표: 메모리, 루트 디스크, 프로세스 생존 지표
- 프론트 로그: Nginx access/error, CodeDeploy Agent/deployment, Certbot
- 백엔드 로그: CodeDeploy Agent/deployment
- 애플리케이션 stdout/stderr journal은 중앙 수집하지 않음
- 로컬 journald 보존: 14일·200MB 상한
- CloudWatch Logs 보존: 14일
- Dashboard: `DASHBOARD-poudy-prod`
- SNS Topic: `poudy-infra-alerts`
  - ARN: `arn:aws:sns:ap-northeast-2:843255971531:poudy-infra-alerts`
- Grafana Public Probe:
  - `https://poudy.site/categories`
  - `https://poudy.site/api/categories`

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
- 중앙 로그: CloudWatch Agent로 Nginx, CodeDeploy, Certbot 로그만 수집합니다.
- 자원 지표: CloudWatch Agent로 메모리, 루트 디스크, 핵심 프로세스 생존 여부만 60초
  간격으로 수집합니다. CPU와 EC2 status check는 기본 CloudWatch 지표를 사용합니다.
- 외부 경로: Grafana Cloud Synthetic Monitoring의 Public Probe로 `/categories`와
  `/api/categories`를 각각 확인하고 Grafana 알림으로 알립니다. 이 Probe는 공개 HTTPS
  엔드포인트를 호출하므로 VPC·Subnet·Security Group을 새로 선택하지 않습니다.
- 배포 실패: 현재는 CodeDeploy 콘솔에서 확인합니다. CodeDeploy state-change 이벤트의
  SNS 연결은 팀 결정에 따라 구성하지 않습니다.

Next.js와 Spring Boot의 stdout/stderr journal은 중앙 수집하지 않습니다. 이 범위는
인프라 장애 대응에 필요한 신호만 남기고, 애플리케이션 로그의 개인정보·예외 내용이
CloudWatch로 퍼지는 것을 막기 위한 의도적인 선택입니다. PostHog는 사용자 행동 분석
범위이므로 이 구성에 포함하지 않습니다.

## 현재 로그 위치와 보존

| 대상 | 위치 | 현재 보존 | MVP 처리 |
| --- | --- | --- | --- |
| Nginx access/error | `/var/log/nginx/access.log`, `/var/log/nginx/error.log` | CloudWatch Logs 14일 | CloudWatch Logs 14일 |
| Next.js systemd | `journalctl -u poudy-frontend.service` | journald 14일·200MB | 중앙 수집하지 않음 |
| Spring Boot systemd | `journalctl -u poudy-backend.service` | journald 14일·200MB | 중앙 수집하지 않음 |
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

템플릿에는 애플리케이션 journal이 없습니다. 로그 그룹은 무기한 보존으로 만들어지지
않도록 아래의 사전 생성 명령으로 14일 보존을 먼저 설정합니다.

## 적용·재검증 순서

아래 명령은 현재 구성을 처음 적용하거나 재검증할 때 사용합니다. 모든 AWS 명령은
`ap-northeast-2`에서 실행합니다. 계정 ID와 production 인스턴스 ID는 현재 환경에
맞춰 반영되어 있습니다.

### 0. 백엔드 `:8080` 상태 확인

현재 외부 접근 차단은 보류 중이므로 이 단계에서는 상태만 기록하고 보안 그룹을
변경하지 않습니다. 차단을 진행할 때는 프론트 Private 경로 검증을 먼저 수행해야 합니다.

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
```

외부 네트워크에서 public IPv4 직접 접근을 확인합니다. 응답이 오면 public 노출이며,
timeout/refused여야 프론트 프록시 경로만 남은 상태입니다.

```bash
curl -i --connect-timeout 5 http://16.184.16.46:8080/actuator/health
```

현재는 위 상태를 알려진 보류 사항으로 관리합니다. 향후 차단할 때도 SSH `22` 규칙은
건드리지 않습니다.

```bash
curl --fail --silent --show-error \
  --resolve poudy.site:443:127.0.0.1 \
  https://poudy.site/api/categories

```

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

최소 알람은 다음 기준으로 만듭니다.

| 신호 | 지표/방법 | 시작 임계치 |
| --- | --- | --- |
| HTTPS + Next.js | Grafana Public Probe `GET /categories`, 5분·연속 3회 실패 | 체크 실패 또는 timeout, 15분 |
| HTTPS + Nginx + Spring Boot | Grafana Public Probe `GET /api/categories`, 5분·연속 3회 실패 | 체크 실패 또는 timeout, 15분 |
| 메모리 | `Poudy/Infra mem_used_percent` | 최대 `> 85%`, 1분 5회 |
| 디스크 | `Poudy/Infra disk_used_percent` | 최대 `> 80%`, 1분 3회 |
| EC2 장애 | `AWS/EC2 StatusCheckFailed` | 합계 `> 0`, 2회 |

CPU·프로세스·Nginx 5xx·CodeDeploy 실패 알람은 현재 구성하지 않았습니다. Grafana가
공개 경로의 서비스 상태를 담당하고, CodeDeploy 실패는 콘솔에서 확인합니다.

### 외부 HTTPS 체크 설정

Grafana Cloud에서 Synthetic Monitoring의 HTTP/HTTPS check를 두 개 생성합니다.

| 항목 | `/categories` | `/api/categories` |
| --- | --- | --- |
| URL | `https://poudy.site/categories` | `https://poudy.site/api/categories` |
| Method | `GET` | `GET` |
| Probe | Public Probe | Public Probe |
| 주기 | 5분 | 5분 |
| Timeout | 10초 | 10초 |
| 알람 | 3회 연속 실패 | 3회 연속 실패 |

두 엔드포인트는 인증이 필요 없는 읽기 전용 경로를 사용해야 합니다. `/categories`는
Next.js와 Nginx 경로를, `/api/categories`는 Nginx의 백엔드 프록시 경로까지 확인합니다.
백엔드의 private IP나 `:8080` 포트를 외부 체크 대상으로 등록하지 않습니다.

현재 Frontend Security Group의 443 inbound가 일반 인터넷 사용자에게 열려 있다면
추가 규칙은 필요하지 않습니다. 443을 특정 IP로 제한해야 하는 경우에만 Grafana가
공개하는 Synthetic Monitoring CIDR을 allowlist로 관리합니다. Grafana의 Probe 대역은
변경될 수 있으므로 고정 IP 하나만 등록하지 않습니다.

Grafana Cloud 체크를 사용할 수 없는 경우에는 같은 URL을 호출하는 GitHub Actions
scheduled workflow를 대체 수단으로 사용할 수 있습니다. 이 방식도 AWS IAM, VPC,
Subnet, Security Group 권한은 필요하지 않지만, 실행 지연이 있을 수 있어 전용 Public
Probe보다 알림 신뢰도는 낮습니다.

Public Probe를 Private Probe로 바꾸면 Probe 실행 환경, Grafana outbound HTTPS,
private 대상 inbound, Probe token을 별도로 관리해야 합니다. 단일 MVP에서는 private
백엔드를 직접 검사하기보다 공개 `/api/categories` 경로를 검사하는 것으로 충분하므로
Private Probe를 사용하지 않습니다.

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
- Next.js/Spring journal은 중앙 수집하지 않습니다. 현재 백엔드에는 검색의
  `brand/keyword`를 info로 남기는 코드와 예외 stack trace를 error로 남기는 코드가
  있으므로, 이 로그를 CloudWatch로 확장하기 전 별도 마스킹 정책이 필요합니다.
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
