# 운영 백엔드 외부 설정 충돌과 롤백 배포 실패

2026년 10월 22일 운영 배포에서 최신 JAR가 시작되지 않았고 이어진 롤백과 재시도도 실패했다.
첫 실패의 원인은 최신 JAR의 설정을 덮어쓴 외부 설정이었다.
이후 롤백에서는 현재 DB와 호환되지 않는 옛 산출물을 사용했다.
두 오류는 연달아 발생했지만 해결 방법은 달랐다.

## 배포 환경

운영 파이프라인 `poudy-pipeline`은 `main` 소스를 받아 백엔드를 빌드하고 배포한 뒤
프론트엔드 빌드와 배포를 진행한다. 백엔드는 CodeDeploy로
`/opt/poudy/backend/app.jar`를 교체하고 `poudy-backend.service`로 실행한다.

배포한 JAR의 커밋은 `3257f41c35262f0740844dfe953788547169b1a3`이었다.
서버에는 최신 JAR가 있었지만 실행할 때는 이전 설정을 읽었다.

## 첫 번째 실패는 최신 JAR의 기동 오류

배포 `d-30SC8SXHL`은 DB 사전 검사를 통과했으며
Flyway 로그에서도 DB 버전 V43과 마이그레이션 검증 성공을 확인했다.
하지만 애플리케이션 시작 중 Spring 컨텍스트를 초기화하다가 다음 오류가 발생했다.

```text
Parameter 0 of constructor in com.poudy.openapi.AdminSwaggerIndexTransformer
required a bean of type 'org.springdoc.core.properties.SwaggerUiConfigProperties'
that could not be found.
```

프로세스가 종료되면서 `ValidateService`의 헬스체크도 실패했다.
systemd도 재시도를 반복하다 시작 횟수 제한에 도달해 서비스를 `failed` 상태로 처리했다.

### 서버에 남은 외부 설정이 원인

최신 JAR의 `application-prod.yml`은 관리자 경로에서 Swagger를 활성화한다.
하지만 서버에는 9월 26일 모니터링 작업 때 설치한 다음 파일이 남아 있었다.

```text
/opt/poudy/backend/config/application-prod.yml
```

이 파일에는 당시의 Swagger 비활성화 설정이 들어 있었다.

```yaml
springdoc:
  api-docs:
    enabled: false
  swagger-ui:
    enabled: false
```

Spring Boot는 기본 검색 경로에서 JAR 내부 설정보다 실행 디렉터리의 외부 설정을 우선한다.
그런데 이후 배포에서는 JAR만 교체하고 외부 파일은 갱신하거나 제거하지 않았다.
그래서 서버에 남은 파일이 계속 최신 설정을 덮어썼다.

그 결과 Spring Boot는 Swagger 자동 설정을 비활성화했지만
`prod` 프로필의 `AdminSwaggerIndexTransformer`는 여전히 생성하려 했다.
그러나 생성자가 요구하는 Swagger 설정 빈이 없어 애플리케이션 전체 기동에 실패했다.

## 두 번째 실패는 옛 롤백 산출물과 현재 DB의 불일치

후속 배포 `d-TBXSD6XHL`과 재시도 `d-A2QA0LYHL`은 애플리케이션 시작 전
`BeforeInstall` 단계에서 실패했다.

```text
[poudy-database] ERROR: 필수 테이블이 없습니다: feedback_image
[poudy-deploy] ERROR: DB 및 환경 설정 검증 실패. 기존 서비스를 유지합니다.
```

새 버전 배포와 재시도는 서로 다른 S3 산출물을 사용했다.

| 배포 | 백엔드 산출물 키의 마지막 부분 | 실패 원인 |
| --- | --- | --- |
| `d-30SC8SXHL` | `1SMTb4H` | 최신 JAR의 Swagger 빈 생성 실패 |
| `d-TBXSD6XHL` | `Zj2N4HW` | 옛 검사 스크립트가 `feedback_image` 요구 |
| `d-A2QA0LYHL` | `Zj2N4HW` | 같은 옛 산출물을 재실행해 동일하게 실패 |

[V35 마이그레이션](../../server/src/main/resources/db/migration/V35__merge_inquiry_images.sql)은
이미지를 `inquiry_image`로 통합한 뒤 `feedback_image`와
`product_correction_request_image`를 삭제한다. 운영 DB는 이미 V43이었다.
그런데 옛 산출물의 검사 스크립트는 여전히 V35 이전 구조를 요구했다.

CodeDeploy가 옛 애플리케이션을 배포해도 DB 마이그레이션이 자동으로 되돌아가지는 않는다.
`BeforeInstall` 검사에서 실패하면 Spring Boot와 Flyway를 실행하기 전에 배포를 중단한다.

로그의 “기존 서비스를 유지합니다”는 사전 검사에 실패해 서비스 변경을 중단했다는 뜻이다.
당시 서비스는 앞선 기동 오류로 이미 내려가 있었으므로 이 로그만으로 복구 여부를 판단할 수 없다.

## 운영 복구

낡은 외부 파일의 이름을 `application-prod.yml.disabled-20261022`로 바꿔 보존한 뒤
같은 최신 JAR를 재시작했다. JAR를 이전 버전으로 교체하거나 DB 테이블을 다시 만들지는 않았다.

복구 후 다음 응답을 확인했다.

| 확인 항목 | 결과 |
| --- | --- |
| `poudy-backend.service` | `active` |
| 로컬 `/actuator/health` | `UP` |
| 공개 `/api/categories` | 200 |
| 비로그인 GET `/api/admin/swagger-ui.html` | 302 |
| 비로그인 GET `/api/admin/v3/api-docs` | 401 |
| 기존 공개 문서 경로 `/swagger-ui.html`, `/v3/api-docs` | 404 |

새 버전은 관리자 경로의 문서에 관리자 인증을 요구한다.
따라서 외부 설정을 제거한 뒤에도
기존 공개 문서 경로의 차단과 관리자 인증 제한을 확인했다.

## 외부 설정 충돌 재발 방지

외부 파일만 치우면 같은 파일을 다시 만들었을 때 문제가 재발할 수 있다.
이를 막으려고 운영 실행 명령에 다음 옵션을 지정해 설정 파일의 검색 위치를 제한했다.

```text
--spring.config.location=classpath:/ --spring.config.import=
```

`spring.config.location`은 기본 외부 파일 검색 경로를 JAR의 클래스패스로 대체한다.
`spring.config.import`는 빈 값으로 지정해 공통 설정에서 로컬 개발용 `.env`를 읽지 않도록 했다.
서버별 DB 주소와 비밀값은 기존 `/etc/poudy/backend.env`의 환경변수로 받는다.

새 배포에서 `app.jar`를 교체하면 **그 새 JAR에 포함된 최신 설정**을 읽는다.
특정 JAR 버전을 고정하지는 않는다.

실행 옵션은 [20-config-source.conf](../systemd/poudy-backend.service.d/20-config-source.conf)에
작성해 운영 서버에 적용했다. 이 파일을 운영 CodeBuild 산출물에도 포함하고
`AfterInstall`과 서버 초기화 과정에서 설치하도록 수정했다.
또한 CodeDeploy의 파일 복사 목록에서 제외하고 훅이 직접 설치하도록 했다.
이렇게 설치한 호스트 파일은 옛 산출물로 롤백해도 CodeDeploy가 제거하지 않는다.

실제 Spring Boot 설정 로더로 외부 YAML이 최신 설정을 덮어쓰는 상황을 재현했다.
변경한 옵션으로 실행하자 외부 YAML과 `.env`를 무시하면서
JAR 설정과 DB 환경변수는 정상적으로 읽었다.
배포 테스트 5개 파일과 셸 문법 검사도 통과했으며
임시 디렉터리에서 `AfterInstall`의 파일 설치 동작을 검증했다.
운영 서버에 옵션을 적용하고 재시작한 뒤 서비스 `active`와 헬스체크 `UP`을 확인했다.

수정 내용은 [PR 933](https://github.com/woowacourse-teams/2026-poudy/pull/933)에 정리했다.

## 재배포와 롤백에서 구분할 점

외부 설정 충돌을 해결해도 옛 산출물은 현재 DB와 호환되지 않는다.
실제로 이번 재시도는 `Zj2N4HW`를 다시 사용해 같은 테이블 검사에서 실패했다.

최신 소스를 다시 빌드하려면 CodePipeline의 `poudy-pipeline` 상세 화면에서
**변경 사항 릴리스 또는 Release change**로 새 실행을 시작한다.
실패한 롤백 단계를 재시도하면 해당 실행의 옛 산출물을 다시 사용할 수 있다.
따라서 실행할 소스 커밋과 배포 산출물을 먼저 확인해야 한다.

서비스 복구와 파이프라인 전체 성공 여부는 따로 확인한다.
이번에는 운영 백엔드 복구와 설정 옵션 적용까지 확인했으며
새 파이프라인의 백엔드 및 프론트엔드 전체 성공 여부는 아직 확인하지 못했다.

테이블 삭제와 같은 변경을 배포할 때는 롤백 대상 애플리케이션과 검사 스크립트가
변경 후 DB에서도 동작하는지 확인해야 한다.
과거에 배포를 성공했더라도 현재 DB와 호환되는지 확인하기 전에는
안전한 롤백 대상이라고 판단할 수 없다.
