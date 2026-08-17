# server

Spring Boot 백엔드.

## 기술 스택

| 구분 | 선택 기술 |
| --- | --- |
| 개발 언어 | Java 21 LTS |
| 프레임워크 | Spring Boot 4.1 |
| 빌드 도구 | Gradle 9.2.1 (Wrapper) |
| 단위 테스트 | JUnit 6, Mockito 5 |
| 통합 테스트 | Spring Boot Test |
| API 문서 | OpenAPI / springdoc 3.1 (Swagger UI) |
| API 타입 생성 | typed-openapi (zod) |
| 코드 품질 | Spotless, Checkstyle (우아한테크코스 코드 스타일) |
| 자동 검증 | GitHub Actions |

## 요구 사항

JDK 21 이상, Node.js 22, POSIX `sh` (Windows는 Git Bash).

## 데이터 파일

MVP 의 데이터는 `src/main/resources` 의 JSON 에서 읽습니다. 오프라인에서 변환한 산출물이고
용량이 커 저장소에 두지 않으므로, 클론한 뒤 파일을 따로 받아 그 아래에 둡니다.

파일이 없으면 기동 시점에 `데이터 파일을 읽지 못했습니다: <파일명>` 으로 실패합니다. 조회
시점이 아니라 기동 시점에 실패시켜 준비되지 않은 환경을 바로 알 수 있게 한 것입니다.

### 카탈로그 감각 준비도 감사

실제 카탈로그를 저장소나 런타임 classpath에 복사하지 않고 외부 디렉터리에서 읽어 감각
추론 준비 상태를 감사할 수 있습니다.

```bash
./gradlew catalogSensoryReadinessReport \
  -PcatalogDir=/absolute/path/to/catalog
```

입력 디렉터리에는 `products.json`, `ingredients.json`, `categories.json`이 있어야 합니다.
기본 출력은 `build/reports/catalog-sensory-readiness/`의 JSON과 Markdown 두 파일입니다.
검수 후 저장소 문서 위치에 재현하려면 출력 디렉터리를 명시합니다.

```bash
./gradlew catalogSensoryReadinessReport \
  -PcatalogDir=/absolute/path/to/catalog \
  -PcatalogReportDir=docs/product
```

보고서는 입력 파일명·크기·SHA-256, 집계 결과와 결함 검수에 필요한 레코드 식별자만 남기고
절대 경로와 실행 시각은 남기지 않습니다. 누락 파일, JSON 파싱 실패와 잘못된 최상위 구조는
작업을 실패시키고 기존 보고서 쌍을 보존합니다. 중복 성분, 미해결 참조와 낮은 태그
커버리지는 숨기지 않고 정상 보고서의 품질 발견 사항으로 남깁니다.

외부 데이터가 없는 CI에서 이 보고서 생성을 강제하지는 않습니다. 대신 보고서 도구의
컴파일, fixture 테스트, Spotless와 Checkstyle은 일반 `build`가 검증합니다.

현재 검수한 snapshot의 결과는
[카탈로그 감각 준비도 보고서](docs/product/catalog-sensory-readiness-report.md)에 있습니다.

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
