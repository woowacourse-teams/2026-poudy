# PostgreSQL EC2 운영

## 현재 구성

| 항목 | 값 |
| --- | --- |
| AWS 네트워크 | `ap-northeast-2`, VPC `vpc-004e154d9f1f3f5cd`, `project-storage-a` 서브넷 |
| DB EC2 | 사설 IP `10.0.100.69`, 외부 직접 접속 없이 내부 백엔드 EC2를 경유해 SSH 접속 |
| PostgreSQL | `18.6`, UTF8 / `C.UTF-8`, `postgresql.service`로 실행 |
| 데이터베이스 | `poudy_prod`, `poudy_staging` (소유자 `poudy_user`) |
| 접속 | 운영 백엔드 `10.0.3.84` → `poudy_prod`, 스테이징 백엔드 `10.0.0.185` → `poudy_staging` |

PostgreSQL은 5432 포트에서 수신하고, 접속 가능한 출발지는 보안 그룹과 `pg_hba.conf`에서 제한합니다. 스테이징 백엔드의 허용된 DB 접속과 운영 백엔드의 스테이징 DB 접속 거부를 확인했습니다. 보안 그룹의 실제 규칙은 변경 전 AWS 콘솔에서 재확인해야 합니다.

각 백엔드 EC2의 `/etc/poudy/backend.env`에 환경별 `POUDY_DB_URL`, 공통 `POUDY_DB_USERNAME=poudy_user`, 비밀번호를 설정했습니다. URL은 각각 `jdbc:postgresql://10.0.100.69:5432/poudy_prod`, `jdbc:postgresql://10.0.100.69:5432/poudy_staging`입니다. 두 EC2에서 해당 env를 읽어 DB에 접속하는 것까지 확인했습니다. 비밀번호는 문서에 기록하지 않습니다.

| DB EC2의 설정 위치 | 역할 |
| --- | --- |
| `/var/lib/pgsql/data/` | PostgreSQL 데이터 디렉터리. DB 파일과 설정 파일이 위치하는 곳 |
| `postgresql.conf` | 서버 설정. `listen_addresses` 등 수신 설정을 확인하는 파일 |
| `pg_hba.conf` | 출발지·DB·사용자별 접속 허용 설정 파일 |

두 설정 파일의 **실제 경로**는 DB에서 `SHOW config_file;`, `SHOW hba_file;`로 확인합니다. SSH 키는 문서에 기록하지 않습니다.

## 초기 데이터 적재

적재 도구는 별도 저장소 `poudy-private/db-load/`에 있습니다. 최신 Excel을 변환한 `poudy-private/output/*.json`과 `db-load/sensory.csv`로 `output/load.sql`을 생성했습니다. 오래된 `db-load/source/`와 `output.zip`을 적재 원본으로 사용하지 않았습니다. `db-load/schema.sql`, `db-load/search.sql`은 DB 전환 브랜치의 SQL과 동일한 파일임을 해시로 확인했습니다.

두 DB 모두 빈 상태에서 `schema.sql` → `search.sql`을 한 트랜잭션으로 적용한 뒤 `load.sql`을 적용했습니다. 적재 SQL도 자체 트랜잭션으로 커밋됐습니다.

| DB | 브랜드 | 제품 | 성분 | 검색어 | 제품 검색 문서 |
| --- | ---: | ---: | ---: | ---: | ---: |
| `poudy_prod` | 23 | 472 | 22,013 | 599 | 472 |
| `poudy_staging` | 23 | 472 | 22,013 | 599 | 472 |

적재 SQL 세 파일은 임시 전달용 `s3://techcourse-project-2026/poudy/db-load/`에 있고, 운영·스테이징 백엔드 EC2의 `/var/tmp/poudy-db-load/`에도 내려받았습니다. `poudy/data/`와는 별도 경로입니다. 적재와 백업은 끝났지만 이 임시 파일은 아직 정리하지 않았습니다.

## 백업 구성과 파일 위치

아래 파일은 **DB EC2에 있으며, 이 저장소에는 포함되어 있지 않습니다.**

| 위치 | 역할 |
| --- | --- |
| `/usr/local/sbin/poudy-db-backup.sh` | 두 DB를 순서대로 `pg_dump -Fc`로 덤프하고 `pg_restore --list` 검사 후 S3에 업로드. 업로드 성공 시에만 해당 로컬 덤프 삭제. `root:root`, `0700` |
| `/etc/systemd/system/poudy-db-backup.service` | PostgreSQL·네트워크 시작 후 위 스크립트를 실행하는 oneshot 서비스 |
| `/etc/systemd/system/poudy-db-backup.timer` | 매일 `20:00 UTC`(다음 날 `05:00 KST`)에 서비스를 실행하는 타이머. 활성화됨. `Persistent=true` 미설정 |
| `/var/backups/poudy/` | 업로드 전 임시 덤프 디렉터리. `postgres:postgres`, `0700` |
| `s3://techcourse-project-2026/poudy/backup/` | 완료된 백업 파일 보관 위치 |

스크립트는 실행 시각을 UTC 타임스탬프로 파일명에 붙입니다. 업로드 전 실패하면 서비스가 실패로 끝나고 로컬 덤프가 남을 수 있습니다. `pg_restore --list`는 아카이브 목록 검사이지 실제 복원 검증은 아닙니다. `Persistent=true`가 없어 예약 시각에 EC2가 꺼져 있었다면 놓친 백업을 자동 실행하지 않습니다.

S3 수명 주기 정책은 **EC2의 파일이 아니라 공유 버킷 설정**입니다. 규칙 `poudy-db-backup-expire-30d`는 `poudy/backup/` 접두사의 객체만 생성 후 30일에 만료시킵니다. 기존 공통 규칙은 유지했고, 버킷 버전 관리는 비활성화되어 있습니다. 현재 방식은 일별 `pg_dump`이며 EBS 스냅샷이나 시점 복구는 구성하지 않았습니다.

2026-09-23 실제 데이터 적재 후 백업 서비스를 수동 실행해 두 DB의 S3 덤프 생성과 서비스 성공 상태를 확인했습니다. 매일 05:00 KST 타이머도 활성화되어 있습니다.

## 운영 확인

DB EC2에서 실행합니다. 아래 명령은 모두 조회용입니다.

```bash
sudo -u postgres psql -d postgres -c 'SHOW config_file' -c 'SHOW hba_file'
sudo systemctl status postgresql --no-pager
sudo systemctl cat poudy-db-backup.service poudy-db-backup.timer
sudo sed -n '1,100p' /usr/local/sbin/poudy-db-backup.sh
systemctl list-timers --all poudy-db-backup.timer --no-pager
sudo systemctl show -p Result -p ExecMainStatus poudy-db-backup.service
sudo journalctl -u poudy-db-backup.service -n 100 --no-pager
df -h /var/backups/poudy
aws s3 ls s3://techcourse-project-2026/poudy/backup/ --recursive --region ap-northeast-2
aws s3api get-bucket-lifecycle-configuration --bucket techcourse-project-2026 --region ap-northeast-2
aws s3api get-bucket-versioning --bucket techcourse-project-2026 --region ap-northeast-2
```

각 백엔드 EC2에서는 비밀번호를 출력하지 않고 접속 대상을 확인합니다.

```bash
sudo grep -E '^POUDY_DB_(URL|USERNAME)=' /etc/poudy/backend.env
```

타이머 상태, 마지막 서비스 결과·로그, S3에 생성된 파일을 함께 확인합니다. `get-bucket-versioning` 결과가 비어 있으면 버전 관리가 활성화되지 않은 상태입니다. 임시 덤프는 DB EC2의 로컬 디스크에 만들어지므로 실제 데이터 적재 후 디스크 여유 공간도 확인해야 합니다.

## 남은 작업

2026-09-23에 S3 덤프를 별도 DB에 복원해 테스트 데이터가 조회되는 것을 확인했고, 테스트 자원은 정리했습니다. **실제 적재 데이터의 덤프 복원**과 새 EC2에서의 전체 복구는 아직 시험하지 않았습니다. 개별 DB 덤프에는 역할 같은 클러스터 전역 객체가 포함되지 않습니다.

- 임시 적재 SQL 세 파일을 S3 `poudy/db-load/`와 두 백엔드 EC2의 `/var/tmp/poudy-db-load/`에서 정확한 대상 확인 후 삭제합니다.
- [#539](https://github.com/woowacourse-teams/2026-poudy/issues/539)의 공유 S3 pending 이미지 정리 문제를 DB 전환 배포 전에 해결합니다.
- 현재 원격 `dev`와 스테이징 서비스는 JSON 기반입니다. DB 전환 브랜치를 `dev`에 머지해 스테이징에 배포한 후 실제 API와 로그를 확인하고, 그다음 운영에 배포합니다. 현재 백엔드 서비스는 DB 적재 후 재시작하지 않았습니다.
