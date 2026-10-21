# server

Spring Boot 백엔드.

## 기술 스택

| 구분 | 선택 기술 |
| --- | --- |
| 개발 언어 | Java 21 LTS |
| 프레임워크 | Spring Boot 4.1 |
| 빌드 도구 | Gradle 9.2.1 (Wrapper) |
| 데이터베이스 | PostgreSQL 15 이상, Spring Data JPA |
| 단위 테스트 | JUnit 6, Mockito 5 |
| 통합 테스트 | Spring Boot Test |
| API 문서 | OpenAPI / springdoc 3.1 (Swagger UI) |
| API 타입 생성 | typed-openapi (zod) |
| 코드 품질 | Spotless, Checkstyle (우아한테크코스 코드 스타일) |
| 자동 검증 | GitHub Actions |

## 요구 사항

JDK 21 이상, Node.js 22, POSIX `sh` (Windows는 Git Bash).

## 데이터베이스

카탈로그(브랜드, 카테고리, 태그, 성분, 제외 성분군, 제품, 큐레이션)와 인기 검색어 사전은
PostgreSQL에서 읽습니다. 카탈로그는 요청에 필요한 데이터를 조회하며, 검색용 뷰는 적재 후 갱신합니다.
인기 검색어 사전과 순위는 10분마다 함께 갱신하며, 갱신 실패 시 이전 결과를 유지합니다.

PostgreSQL 15 이상이 필요합니다. UTF-8 및 한글·자모를 인식하는 로케일로 DB를 만들고,
서버·테스트 계정에 테이블 생성과 `pg_trgm` 확장 생성 권한을 부여합니다. DB는 다음처럼 만듭니다.

```bash
createdb -T template0 -E UTF8 --locale=ko_KR.UTF-8 poudy
createdb -T template0 -E UTF8 --locale=ko_KR.UTF-8 poudy_test
```

스키마는 서버가 기동할 때 Flyway가 `src/main/resources/db/migration`의 파일을 버전 순서로
적용합니다. 빈 DB에는 `V1`부터 적용하고, Flyway 도입 전부터 쓰던 DB는 첫 기동에 `V2`까지 적용된
것으로 등록합니다. 이 등록은 스키마를 검사하지 않으므로, 이력 없는 DB에 처음 배포하기 전에는
스키마가 `V2`와 같은지 확인합니다.

스키마를 바꿀 때는 적용된 파일을 고치지 않고 `V3__설명.sql`처럼 다음 버전 파일을 추가합니다.
배포 중에는 기존 서버와 새 서버가 같은 DB를 함께 쓰므로, 테이블·컬럼 삭제와 이름 변경은 새
구조를 추가하는 배포와 옛 구조를 지우는 배포로 나눕니다. 마이그레이션이 포함된 배포 전에는
`pg_dump`로 백업합니다.

| DB | 쓰는 곳 | 스키마·데이터 |
| --- | --- | --- |
| `poudy` | `bootRun` (`dev`), 운영 (`prod`) | 서버가 마이그레이션을 적용하고 데이터는 따로 적재한다 |
| `poudy_test` | 테스트, OpenAPI 생성 (`test`) | 컨텍스트마다 스키마를 비우고 마이그레이션과 테스트 데이터를 다시 넣는다 |

접속 정보는 `POUDY_DB_URL`, `POUDY_DB_USERNAME`, `POUDY_DB_PASSWORD` 로 바꿉니다. 사용자명 기본값은
OS 사용자명이고 비밀번호는 비어 있습니다. 테스트 DB 주소는 `POUDY_TEST_DB_URL` 로 바꿉니다.
테스트, `verify.sh`, `pre-push` 훅은 PostgreSQL 이 떠 있어야 통과합니다.

### 운영·스테이징 쿼리 실행 상한

`prod` 프로필은 `POUDY_DB_STATEMENT_TIMEOUT_MS`를 필수로 받습니다. 운영·스테이징 각각
배포 전에 `/etc/poudy/backend.env`에 설정합니다. CodeDeploy는 이 파일을 자동 갱신하지 않습니다.

```dotenv
POUDY_DB_STATEMENT_TIMEOUT_MS=1000
```

- API·배치의 SQL 한 건에 실행·잠금 대기 상한을 적용합니다. Flyway는 별도 연결을 사용합니다.
- 설정 변경은 새 연결부터 반영되므로 배포 또는 재시작이 필요합니다.
- 적용 후 실제 앱 연결의 `SHOW statement_timeout`과 정상 요청·배치, 오류율을 확인합니다.
  관리자 psql 연결의 설정값은 앱 연결의 적용값과 다를 수 있습니다.
- 원복은 이전 값으로 되돌린 뒤 재시작합니다. 임시로 해제하려면 `0`을 설정합니다.
  코드 버전을 원복하면 외부 `config/application-prod.yml`도 해당 버전에 맞춰 복원합니다.

1초 선정 근거와 검증 결과는 [#584 코멘트](https://github.com/woowacourse-teams/2026-poudy/issues/584#issuecomment-5904967372)에 기록했습니다.

## 실행

```bash
./gradlew bootRun
```

프로필을 지정하지 않으면 `dev` 로 뜹니다.

| 주소 | 용도 |
| --- | --- |
| `/swagger-ui.html` | API 문서 화면 |
| `/v3/api-docs` | OpenAPI 문서 (JSON) |
| `/actuator/health` | 헬스 체크 |

운영·스테이징(`prod` 프로필)의 API 문서는 관리자 로그인 후 같은 도메인의
`/api/admin/swagger-ui.html`에서 엽니다. 로그인하지 않고 문서 진입 화면을 열면
관리자 로그인으로 이동하고, 로그인 완료 후 Swagger로 돌아옵니다. 명세·설정·정적 자원 요청은
관리자 세션이 없으면 401을 반환합니다. 명세는 `/api/admin/v3/api-docs`와
`/api/admin/v3/api-docs.yaml`로 제공하며, UI·설정·정적 자원과 함께 관리자 인증을 요구합니다.
기존 공개 문서 경로와 기본 WebJar 정적 경로는 배포 환경에서 제공하지 않습니다.

문서 상단의 카카오·구글 로그인 링크는 새 탭에서 기존 소셜 로그인을 진행합니다.
가입까지 완료한 뒤 Swagger 탭으로 돌아오면 회원 API를 사용자 세션으로 실행할 수 있습니다.
관리자 세션은 유지되므로 사용자 로그인·로그아웃 후에도 문서를 새로고침할 수 있습니다.
API 요청은 Swagger를 연 현재 도메인으로 전송됩니다.

## 관리자·사용자 동시 로그인

같은 브라우저에서 두 로그인을 함께 유지할 수 있습니다. 사용자 인증은 기존 `JSESSIONID`를,
관리자 인증은 `/api/admin` 전용 `POUDY_ADMIN_SESSION` 쿠키를 사용합니다.
로그인·로그아웃·만료는 각 세션에만 적용됩니다. 관리자 로그인 화면과 API 주소는 그대로입니다.

관리자 세션은 서버 메모리에만 저장하며 비활동 1시간·로그인 후 12시간에 만료합니다.
서버 재시작과 최초 분리 배포 후에는 관리자로 다시 로그인해야 합니다. 사용자 세션의 기존
정상 종료 시 파일 저장·복원과 SSR 쿠키 전달 방식은 유지합니다. DB 마이그레이션은 없습니다.
서버를 여러 대로 늘리면 관리자 세션의 공유 저장소 또는 세션 고정 구성이 필요합니다.
Swagger 문서도 같은 관리자 세션으로 접근합니다.

## API 타입 생성

컨트롤러나 DTO 를 바꾸면 `pre-push` 훅이 아래 생성물을 갱신해 커밋합니다. 안내가 뜨면 `git push` 를 한 번 더 실행하면 됩니다.

| 파일 | 내용 |
| --- | --- |
| `server/openapi.json` | OpenAPI 문서 |
| `common/api.zod.ts` | zod 스키마와 타입 |
| `common/api.zod.types.d.ts` | 위 파일이 참조하는 타입 선언 |

직접 갱신하려면 `./gradlew generateApiArtifacts` 를 실행합니다.

DTO 필드의 Bean Validation 애노테이션이 그대로 내려갑니다.

| 애노테이션 | 생성 결과 |
| --- | --- |
| `@NotNull` | 타입에서 옵셔널(`?`)이 사라지고 zod 에서 `.optional()` 이 빠짐 |
| `@Size(min, max)` | `z.string().min().max()` |

**응답 DTO 에도 `@NotNull` 을 붙입니다.** 서버 검증이 아니라 프론트 타입 품질 때문입니다. 빠뜨리면 항상 채워 보내는 필드도 프론트에서 옵셔널이 됩니다.

**DTO 클래스명은 전역에서 고유해야 합니다.** 스키마 키가 패키지 없는 단순명이라, 다른 패키지에 같은 이름이 있으면 경고 없이 하나가 덮어씁니다.

## 테스트

```bash
./gradlew test
```

### CI 빌드 캐시

Server CI는 `--build-cache`로 컴파일과 정적 검사 결과를 재사용한다. dev/main은 다음 PR용
캐시를 저장하고, 팀 PR은 같은 PR의 후속 실행용 캐시를 저장한다. fork PR은 읽기 전용이다.

DB 상태는 Gradle 입력에 포함되지 않으므로 테스트 결과는 캐시하지 않고 매번 실행한다.
OpenAPI 생성과 생성물 드리프트 검사도 유지한다. 태스크별 시간은 CI의 `gradle-profiles`
아티팩트에서 확인하며 14일간 보관한다. 캐시 복원과 저장 비용은 Job 전체 시간에 포함해 비교한다.

`resources-*.txt`는 PostgreSQL을 포함한 CI 러너 VM의 1초 간격 `vmstat` 기록이다.
Java 프로세스만의 CPU나 최대 RSS가 아니므로 태스크 프로파일과 구분해서 읽는다.

캐시 적용 조건과 전후 측정값은 [#777 결과](https://github.com/woowacourse-teams/2026-poudy/issues/777#issuecomment-6207553716)에 기록했다.
새 PR에서 재사용되는 캐시는 dev의 Server CI가 먼저 생성해야 한다.
