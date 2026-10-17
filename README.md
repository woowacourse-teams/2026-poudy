# poudy

| 디렉터리         | 내용                                    |
| ---------------- | --------------------------------------- |
| [server](server) | Spring Boot 백엔드                      |
| [client](client) | Next.js 프론트엔드                      |
| [mobile](mobile) | Expo React Native WebView 앱            |
| common           | 백엔드에서 생성한 API 타입과 zod 스키마 |

Client 개발 환경과 실행 방법은 [client/README.md](client/README.md)를 참고하세요.

모바일 개발 환경과 공유 링크 연동 방법은 [mobile/README.md](mobile/README.md)를 참고하세요.

## 클론 후 1회

```bash
./setup-git.sh
```

Git 훅과 커밋 메시지 템플릿을 등록합니다. 모든 팀원이 실행합니다.

Windows 는 Git Bash 에서 실행합니다. cmd 와 PowerShell 은 `.sh` 를 실행하지 못하고 오류도 남기지 않습니다.

## 커밋 규칙

[CONTRIBUTING.md](CONTRIBUTING.md)의 커밋 메시지 규칙을 따릅니다.

## API 타입

`common/api.zod.ts` 는 백엔드에서 생성합니다. 프론트엔드는 그대로 import 합니다. 생성 방법은 [server/README.md](server/README.md) 를 참고하세요.

## 팀 문서

현재 절차·계약과 과거 실험 기록을 구분합니다. 완료 기록은 삭제하지 않고 Git과
`completed/`에 보존하며, 새 작업의 미완료 목록으로 사용하지 않습니다.

| 목적 | 먼저 볼 문서 |
|---|---|
| 개발과 기여 | [기여 규칙](CONTRIBUTING.md), [서버](server/README.md), [웹](client/README.md), [모바일](mobile/README.md) |
| 서비스와 도메인 | [백엔드 구조](server/ARCHITECTURE.md), [제품 맥락](server/docs/product/overview.md), [기능 계약](server/docs/product/), [DB 검색 결정](server/docs/adr/postgresql-catalog-search.md) |
| 화면과 API 사용 | [디자인 시스템](design-system/README.md), [필터 계약](client/FILTER_OPTIONS.md), [문의 화면 설계](client/app/inquiry/SPEC.md), [모바일 결정](mobile/docs/TECHNICAL_DECISIONS.md) |
| 인프라와 배포 | [전체 구조](docs/deploy/architecture.md), [실행 구성](deploy/README.md), [CI/CD](deploy/codedeploy/README.md), [호스트 초기화](deploy/scripts/README.md) |
| DB와 복구 | [PostgreSQL 운영](deploy/postgresql-ec2.md), [프론트 메모리·swap 복구](deploy/frontend-memory.md) |
| 관측과 보안 | [모니터링](deploy/monitoring/README.md), [DB 지표 해석](docs/performance/postgres-load-test-observation.md), [공개 데이터 보호](docs/security/public-data-protection.md), [Discord 알림](infra/discord-worker/README.md) |
| 검증 방법 | [부하 시험](load-tests/README.md) |
| 진행 중 작업 | [활성 계획](server/docs/exec-plans/active/) |
| 과거 근거 | [완료 계획](server/docs/exec-plans/completed/), [Docker 도입 전 기준선](docs/deploy/docker-adoption-baseline.md), [캐시 시험 #288](load-tests/issue-288-report.md) |

성능 기록과 재현 코드는 [PR #774](https://github.com/woowacourse-teams/2026-poudy/pull/774),
HTTP/2·DB 관측 보완은 [PR #772](https://github.com/woowacourse-teams/2026-poudy/pull/772)로
dev에 반영됐습니다. 저장소 반영과 라이브 서버 반영 여부는 구분합니다.
