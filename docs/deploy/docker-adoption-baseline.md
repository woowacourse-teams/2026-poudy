# Docker 도입 전 기준선

측정일: 2026-10-01 (KST)

이 문서는 Docker 도입 전 저장소, AWS CodeBuild 콘솔, Grafana/SSM에 이미 남아 있는
자료를 비교 기준으로 모은다. 같은 조건으로 측정하지 않은 항목은 인과관계나 개선율을
주장하는 데 사용하지 않는다.

## 현재 배포 흐름

- Production: `main` → `poudy-pipeline` → `poudy-codebuild` → S3 artifacts →
  CodeDeploy → FE/BE EC2의 파일 교체와 systemd 재시작
- Staging Backend: `dev` → `poudy-staging-pipeline` → `poudy-staging-codebuild` →
  S3 artifact → CodeDeploy → Backend EC2의 JAR 교체와 systemd 재시작
- Staging Frontend: Vercel. Staging FE EC2는 현재 배포 대상이 아니므로 Production FE
  EC2와 동일 조건의 FE 컨테이너 전후 비교 환경은 없다.
- 앱 Dockerfile은 아직 없고, Docker 도입 전 앱은 EC2 호스트 프로세스다.

## CodeBuild 콘솔 기준선

2026-10-01 서울 리전 AWS 콘솔에서 확인했다.

| 프로젝트 | 소스 | 이미지/컴퓨팅 | VPC | Privileged mode | 최근 성공 빌드 |
| --- | --- | --- | --- | --- | --- |
| `poudy-codebuild` | GitHub `main` | ARM64, 2 vCPU, 4 GB; Amazon Linux 2023 host kernel | 미사용 | false | 빌드 #41, 약 3분 (화면 시작/종료 분 단위) |
| `poudy-staging-codebuild` | GitHub `dev` | ARM64, 2 vCPU, 4 GB; `amazonlinux-aarch64-standard:2.0`, Amazon Linux 2 host | 미사용 | false | 빌드 #165, 2분 2초; 직전 #164는 4분 12초 |

두 프로젝트 모두 기존 서비스 역할 `codebuild-project`와 안내된 S3 artifacts 버킷을
사용한다. CodeBuild 설정을 바꾸지 않고 빌드 명세서에서 Docker image archive를 만들 수
있는 구성이다. AWS 문서는 Docker daemon이 비-VPC 빌드에서 기본 활성화되고, VPC 빌드에서
Docker를 사용하려면 privileged mode가 필요하다고 설명한다. 따라서 현재 확인된 설정에는
privileged mode 변경이 필요하지 않다.

Production CodeBuild는 `buildspec.yml`, staging은 `buildspec-staging-backend.yml`을
사용한다. Production 빌드는 `backend`와 `frontend` 보조 아티팩트를 만들며, staging은
백엔드 단일 아티팩트를 만든다. 두 CodeBuild 프로젝트 모두 S3 캐시는 사용하지 않는다.

## 성능·자원 기준선

### Staging Backend API

2026-09-29, Monitoring EC2 k6에서 staging API에 읽기 전용 혼합 트래픽을 보냈다.
staging DB는 production DB와 같은 PostgreSQL EC2 호스트에 있었지만, `poudy_staging`과
`poudy_prod`는 분리된 데이터베이스였다. 엔드포인트 비율은 실제 사용자 관측값이 아니라
시험 가정이다.

| 목표 처리율 / 시간 | 완료 요청 | 평균 | p95 | p99 | 최대 | HTTP 실패 | 누락 iteration |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 16 req/s / 10분 | 9,601 | 32.71 ms | 60.91 ms | 68.47 ms | 297.17 ms | 0 | 0 |

시험 중 PostgreSQL EC2 CPU 5분 평균은 1.55~20.66%, 가용 메모리는 1,171~1,206 MiB,
root 디스크 사용률은 15.5%, prod/staging DB 연결은 각각 11개였다. 이 시험은 Docker
도입 전 API 기준선이지 Docker의 개선 결과가 아니다. DB 호스트 자원은 두 환경이 공유하므로
같은 시험을 반복할 때 기존 stop 조건을 유지한다.

### Production Frontend EC2

2026-10-01 17:58 KST, 기존 SSM 세션에서 기록된 HTTP/2 변경 전 호스트 스냅샷이다.
재확인 시 세션은 비활성으로 종료되어 있었다. 비교 전 현재 설정에서 다시 측정해야 한다.

| 측정 항목 | 기존 스냅샷 |
| --- | ---: |
| 인스턴스 메모리 | 550 / 910 MiB 사용, 279 MiB 가용 |
| swap | 248 / 511 MiB 사용 |
| Next.js RSS | 284,224 KiB (약 277.6 MiB) |
| Next.js CPU | 0.1% 표본 |
| root 디스크 | 39% (6.1 / 16 GiB) |
| `poudy-frontend.service` 재시작 | 0회 |

이 스냅샷은 Docker의 자원 오버헤드를 비교하는 참고값일 뿐 지속 부하에서의 기준은 아니다.
현재 운영 FE는 HTTP/2를 사용하므로 네트워크 응답 시간 비교는 같은 프로토콜과 같은 요청
조건으로 다시 측정해야 한다. Staging FE는 Vercel에 있어 staging 전후 FE 비교 수치는 없다.

### Staging Backend EC2

2026-10-01 약 21:27 KST, Grafana `Poudy Backend - Staging` 대시보드의 지난 1시간 그래프를
읽었다. 그래프의 눈금으로 읽은 근사치이며 Prometheus 원시 샘플을 export한 값은 아니다.
이 구간에는 약 20:57 KST에 CodeBuild #165를 통한 staging 배포가 있었으므로 빌드/기동
직후의 짧은 변동이 포함된다.

| 측정 항목 | staging Backend 기준선 |
| --- | ---: |
| EC2 유형 | `t4g.small` |
| CPU 사용률 | 대부분 0~2%, 배포 직후 짧게 약 6% |
| 메모리 사용률 | 대부분 약 50%, 배포 구간에 잠시 약 34%로 하락 |
| root 디스크 사용률 | 약 23% |
| Backend systemd 상태 | RUNNING |
| Backend 프로세스 수 | 1 |
| Actuator health | UP |
| 24시간 systemd 재시작 수 | 0 |

이 스냅샷은 기존 systemd/JAR의 staging host 자원 기준으로 운영 FE 스냅샷보다 직접적인
Docker 전 비교 자료다. 정확한 전후 차이는 다음 staging 배포 직전과 기동 안정화 이후에
Prometheus 원시값 또는 같은 대시보드 시점의 수치를 저장해 비교한다.

### 배포 시간·가용성

Staging CodeBuild 실행 시간은 위 표에 기록했지만, CodeDeploy 총 소요 시간, 배포 구간 probe
실패/중단 시간, 롤백 시간의 같은 기준 측정치는 아직 없다. Blackbox 외부 경로 probe는
60초 간격이므로 짧은 배포 중단을 정밀하게 재기 어렵다.
CodeDeploy staging 배포 그룹의 자동 롤백 설정도 이번 확인에서는 검증하지 못했다. 첫 적용은
staging에만 제한하고, 실제 배포 전 배포 그룹 롤백 설정과 실패 시 수동 복구 경로를 확인해야 한다.

Docker 배포 비교에서는 같은 commit과 테스트 환경에서 다음을 기록한다.

- CodeBuild 총 시간과 S3 배포 아티팩트 압축 크기
- CodeDeploy 시작부터 health 회복까지 걸린 시간
- 독립 probe 실패 횟수와 연속 실패 구간
- 실패 배포에서 이전 이미지 참조로 health가 회복될 때까지의 롤백 시간
- 인스턴스 가용 메모리, swap, CPU, 디스크와 앱/컨테이너 메모리·CPU
- Docker image 압축 크기와 배포 후 보존된 이전 이미지 수
- container 재시작, OOMKilled 여부

컨테이너별 CPU/memory/OOM 메트릭은 현재 Alloy/Prometheus 구성에 없다. 첫 staging 배포
전후에는 `docker stats`, `docker inspect`, systemd/journal, 기존 process/host 대시보드와
독립 API probe를 함께 기록한다. 장기 대시보드는 컨테이너 메트릭 수집 방식을 별도 검토한다.

## 시스템 제한과 적용 범위

현 Backend systemd 서비스는 Java heap `-Xms128m -Xmx768m`, `MemoryMax=1G`,
`CPUQuota=100%`, `TasksMax=256`을 사용한다. FE는 `MemoryMax=768M`,
`CPUQuota=100%`를 사용한다. 컨테이너 제한은 현 Backend 상한을 넘지 않도록 설정하고,
기존 process/systemd 관측과 journal 수집이 유지되는지 staging에서 확인한다.

1차 실험은 Staging Backend EC2 한 대로 한정한다. Production Backend, Production FE,
Staging Vercel FE, PostgreSQL은 변경하지 않는다. 현재 working tree에는 이 작업 외의 미커밋
변경이 있으므로, 기존 변경을 포함해 하나의 커밋으로 섞지 않는다.

## 1차 staging 적용 초안

- `dev` staging Backend에만 ARM64 Spring Boot image를 만든다. CodeDeploy는 기존
  CodePipeline artifact 및 S3를 그대로 사용하고, 컨테이너는 host의 systemd 서비스가 관리한다.
- 이미지 로드와 참조 검증이 끝난 다음 기존 서비스를 정지하고, health 검증이 성공하면 중복
  압축 이미지 아카이브를 제거한다. 롤백 시에는 CodeDeploy가 S3의 이전 revision을 다시 가져온다.
- Host networking으로 기존 API `:8080`, loopback-only Actuator `:8081`, EC2 instance role의
  IMDS 접근을 보존한다. DB와 S3가 현재 영속 데이터 저장소이므로 호스트 JSON data/state
  mount는 추가하지 않는다. 환경별 비밀 값은 기존 `/etc/poudy/backend.env`에서 주입하고,
  비밀이 없는 `application-prod.yml`은 이미지에 포함한다.
- 현재 애플리케이션이 HEIC 처리에 host의 `prlimit`과 `heif-convert`를 사용하므로 이
  프로그램을 image 안에 포함한다. Docker container logs는 journald로 보내 기존 Alloy/Loki
  수집 경로를 유지한다.
- 이미지 메모리 1 GiB, CPU 1개, PID 256개 제한을 사용한다. 기존 Spring heap 768 MiB와
  Backend systemd CPU/메모리 상한을 넘기지 않는 설정이다.
- 코드 변경은 작업 브랜치에서 준비 중이며 staging CodePipeline에 반영·배포하지 않았다.
  CodeDeploy 배포 그룹의 자동 롤백 설정과 수동 복구 경로를 확인하고, CodeBuild·CodeDeploy
  배포·health 검증을 실제로 통과한 뒤에만 적용 상태로 승격해 기록한다.
