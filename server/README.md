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
PostgreSQL 에서 읽습니다. 기동 시 한 번 전부 읽어 메모리에 올리므로, 데이터를 바꾸면 서버를 다시
띄워야 반영됩니다.

PostgreSQL 15 이상과 `psql`이 필요합니다. UTF-8 및 한글·자모를 인식하는 로케일로 DB를 만들고,
초기화·테스트 계정에 `pg_trgm` 확장 생성 권한을 부여합니다. 빈 DB의 최초 초기화는 다음과 같습니다.

```bash
createdb -T template0 -E UTF8 --locale=ko_KR.UTF-8 poudy
sh ./scripts/init-db.sh -d poudy
createdb -T template0 -E UTF8 --locale=ko_KR.UTF-8 poudy_test
```

| DB | 쓰는 곳 | 스키마·데이터 |
| --- | --- | --- |
| `poudy` | `bootRun` (`dev`), 운영 (`prod`) | 직접 적용하고 데이터를 적재한다 |
| `poudy_test` | 테스트, OpenAPI 생성 (`test`) | 스키마와 테스트 데이터를 자동으로 초기화한다 |

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
