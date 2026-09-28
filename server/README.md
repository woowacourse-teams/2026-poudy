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
스키마가 `V2`와 같은지 확인합니다. 서버가 뜨려면 `ingredient_group` 정의와 성분 매핑 데이터가
있어야 합니다.

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

앞의 두 주소는 `prod` 프로필에서 꺼집니다.

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
