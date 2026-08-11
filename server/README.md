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
| API 타입 생성 | openapi-typescript |
| 코드 품질 | Spotless, Checkstyle (우아한테크코스 코드 스타일) |
| 자동 검증 | GitHub Actions |

## 요구 사항

JDK 21 이상, Node.js 22.

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

컨트롤러나 DTO 를 바꾸면 `pre-push` 훅이 `openapi.json` 과 `common/api.d.ts` 를 갱신해 커밋합니다. 안내가 뜨면 `git push` 를 한 번 더 실행하면 됩니다.

DTO 필드에 `@NotNull` 을 붙이면 생성되는 TypeScript 타입에서 옵셔널(`?`)이 사라집니다.

## 테스트

```bash
./gradlew test
```
