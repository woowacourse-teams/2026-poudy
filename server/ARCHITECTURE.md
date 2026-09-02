# Backend Architecture

## Architecture goal

Poudy 백엔드는 Spring Web MVC 기반의 모듈형 모놀리스다. 기능별 패키지가 유스케이스와
도메인을 소유하고, 전송·저장 기술은 그 바깥에 둔다.

구조와 동작의 권위 원천은 코드와 테스트다. 이 문서는 코드 탐색만으로 복구하기 어려운 책임
경계, 금지된 의존과 의도적인 제약만 기록한다. 카탈로그 저장 방식은 현재 JSON이지만, 이 선택이
Controller·Service·Domain의 계약이 되지 않도록 Repository 경계 안에 감춘다.

## Package structure

실제 패키지와 클래스는 `src/main/java/com/poudy`에서 확인한다.

```bash
rg --files src/main/java/com/poudy
```

```text
com.poudy
├── <feature>
│   └── <role>            controller, service, domain, repository와 기능 전용 역할
├── search                기능 사이에서 공유하는 검색 언어
├── common                도메인 의미가 없는 횡단 기술
├── config                객체 조립과 프레임워크 설정
└── exception             공통 오류 응답 경계
```

기능 패키지는 필요한 역할만 만든다. `storage`는 브라우저 상태의 조회 투영이므로 Domain과
Repository가 없고, `share`는 제품·브랜드 모델을 사용하는 별도 해석 경계이므로 Repository가
없다. `common`은 횡단 API 계약과 기술 코드만 소유하며 기능 규칙을 가져가지 않는다.

## Dependency direction

기본 흐름은 다음과 같다.

```text
HTTP → Controller → Service → Domain
                         └──→ Repository → JSON · S3 · 외부 시스템
Config ─────────────────────→ 객체 조립
```

Domain은 Controller, Service, Repository와 프레임워크에 의존하지 않는다. 이 부재 형태의
불변식은 `ArchitectureTest`가 검증한다. 기능 간 조합은 Service나 `config`에서 완결하며,
도메인 규칙은 저장·전송 타입으로 확산하지 않는다.

새 저장 구현이 실제로 필요해질 때 Service와 Repository 사이의 포트를 함께 결정한다. 교체
가능성만으로 인터페이스나 빈 계층을 미리 만들지 않는다.

## Domain model

### Search

`search.domain`은 이름 정규화, 초성·라틴 읽기, 일치 등급과 원문 범위를 표현하는 공통 검색
언어다. 검색 대상 필드, 결과 크기와 동점 정책은 각 기능이 소유한다. 알고리즘의 현재 동작과
경계값은 검색 도메인 테스트가 권위 원천이다.

### Brand

`brand`는 브랜드의 정체성과 이름 검색을 소유한다. 브랜드별 제품 수와 카테고리 집계는 제품
목록에서 계산되므로 `product`가 소유한다.

### Category

`category`는 카테고리 계층과 부모 관계의 정합성을 소유한다. 카테고리별 제품 수와 빈
카테고리 포함 여부는 제품 집계의 책임이다.

### Ingredient

`ingredient`는 성분, 이름 검색, 근거와 성분에 연결된 태그를 소유한다. 제품 전성분도 같은
일급 컬렉션을 사용해 검색과 순서 규칙을 중복 구현하지 않는다.

### Tag

태그는 제형에서의 역할과 피부에 기대하는 작용이라는 서로 다른 두 축을 유지한다.
`tag`는 태그 정의를, `ingredient`는 성분과 태그의 관계 및 근거를 소유한다. 두 축의 응답
이름과 의미를 하나의 일반적인 "기능"으로 합치지 않는다.

### Product

`Product`는 브랜드, 카테고리, 순서가 보존된 전성분, 판매 옵션과 감각 값을 묶는 중심
애그리게이트다. 감각 값은 원천 JSON의 완성 값이 아니라 기동 시 계산한 값이며 목록·상세·필터·
개수가 같은 결과를 사용한다. 계산 근거와 한계는
[`sensory-inference-v0.md`](docs/product/sensory-inference-v0.md)가 소유한다.

### Products

`Products`는 제품 목록 전체에 대한 검색, 필터, 정렬과 집계를 소유한다. 목록과 개수는 같은
필터 판정을 사용하고, 응답 DTO가 규칙을 다시 구현하지 않는다.

### ExcludeCode

`excludecode`는 빠른 제외 성분군의 식별자와 성분 매핑을 소유한다. 성분군은 서버에서 성분으로
해석하며, 데이터에 빠지거나 중복된 정의가 있으면 기동을 실패시킨다. 포함 범위는 JSON 데이터의
책임이며 서버 상수나 패턴으로 추론하지 않는다.

### Storage

보관 목록과 정렬은 브라우저 상태다. 서버의 `storage`는 전달받은 제품 ID를 제품 목록 표현으로
투영할 뿐 별도 저장 상태를 만들지 않는다.

### Share

`share`는 외부 공유 텍스트를 제품 후보로 해석하는 경계다. 제품·브랜드 조회 결과를 사용하지만
카탈로그 저장소를 새로 소유하지 않는다. 처리 규칙과 평가 근거는
[`share-text-matching.md`](docs/product/share-text-matching.md)가 소유한다.

## Layer responsibilities

### Controller

Controller는 HTTP 경로, 입력 검증과 응답 변환을 소유한다. 도메인 검색·필터 규칙을 구현하지
않으며, 전송 DTO를 기능의 공개 도메인 모델로 만들지 않는다.

### Service

Service는 유스케이스를 완결하기 위해 Repository와 Domain을 조합한다. 여러 기능의 데이터가
필요한 경우에도 Controller끼리 연결하지 않고 Service 한 곳에서 결과를 완성한다.

### Domain

Domain은 상태와 그 상태에 관한 판단을 함께 소유한다. 저장소와 프레임워크 없이 실행할 수 있어야
하며, 이 경계는 `ArchitectureTest`로 강제한다.

### Repository

Repository는 JSON·S3 같은 저장 표현을 도메인으로 변환하고 저장 실패를 인프라 오류로
분류한다. 저장 형식 전용 타입과 프로토콜은 구현 내부에 두고 Controller 응답을 만들지 않는다.

운영 카탈로그 JSON은 커밋하지 않는다. OpenAPI 생성은 테스트 fixture를 사용하는 test runtime
classpath에서 재현하고, 실제 서버는 main resources의 운영 데이터를 사용한다.

### Exception handling

도메인 규칙 위반은 도메인 예외로 표현하며 HTTP 상태를 알지 않는다. `GlobalExceptionHandler`가
도메인·요청·인프라 오류를 RFC 9457 `ProblemDetail` 계약으로 변환한다. 인프라 원인 메시지는
로그에만 남기고 응답에 노출하지 않는다.

### CORS

CORS는 `/api/**`에만 적용하며 허용 오리진은 `CLIENT_DOMAIN`이 소유한다. 값이 없으면 열지 않는
것이 기본값이다. 운영은 같은 오리진 nginx 프록시를 사용하므로 자격 증명과 불필요한 오리진을
허용하지 않는다.

## API decisions

엔드포인트와 스키마의 권위 원천은 Controller, DTO와 OpenAPI 설정 코드다. `openapi.json`과
`common/api.zod.*`는 검증·소비용 생성물이므로 직접 수정하지 않는다. 이 문서에는 엔드포인트
목록을 복제하지 않는다.

제품 검색과 필터는 같은 제품 컬렉션을 좁히는 조건이므로 `/api/products`에서 결합한다. 검색
제안은 표시용 일치 정보라는 다른 표현을 반환하므로 별도 경계를 사용한다. 목록과 count는 같은
요청 해석과 필터 규칙을 공유해야 한다.

피드백 이미지는 검증·저장 실패 경계를 분리하기 위해 본문 접수 전에 임시 업로드한다. 이미지
목록을 포함한 피드백 JSON 저장이 commit point다. 저장 결과가 불명확하면 claim과 최종 이미지를
보존하고, 조정기가 정확한 JSON 키와 내용 hash를 확인한 뒤 commit 또는 rollback한다. 추측으로
보상 삭제하지 않는다. 현재 동작은 구현과 테스트가 권위 원천이며 활성 실행 계획은 남은 운영
검증만 추적한다.

피드백과 제품 등록 요청은 영속 저장을 성공 기준으로 삼고, 이후 알림 실패가 이미 저장한 접수를
되돌리지 않는다.

공유 텍스트 식별은 제품의 공개 API이지만 해석 책임은 `share`가 소유한다. 세부 계약은
[`share-text-matching.md`](docs/product/share-text-matching.md)에서 관리한다.
