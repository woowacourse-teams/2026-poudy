# Backend Architecture

## Architecture goal

Poudy 백엔드는 Spring Web MVC 기반의 모듈형 모놀리스다. 기능별 패키지가 유스케이스와
도메인을 소유하고, 전송·저장 기술은 그 바깥에 둔다.

구조와 동작의 권위 원천은 코드와 테스트다. 이 문서는 코드 탐색만으로 복구하기 어려운 책임
경계, 금지된 의존과 의도적인 제약만 기록한다. 카탈로그와 인기 검색어 사전은 PostgreSQL에서
읽으며, 이 선택이 Controller·Service·Domain의 계약이 되지 않도록 Repository 경계 안에 감춘다.

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
                         └──→ Repository → PostgreSQL · S3 · 외부 시스템
Config ─────────────────────→ 객체 조립
```

Domain은 Controller, Service, Repository와 프레임워크에 의존하지 않는다. 이 부재 형태의
불변식은 `ArchitectureTest`가 검증한다. 기능 간 조합은 Service나 `config`에서 완결하며,
도메인 규칙은 저장·전송 타입으로 확산하지 않는다. 기능·계층 패키지(`brand.domain`,
`feedback.service` 등) 사이의 순환 참조도 `ArchitectureTest`가 막는다. `exception` 패키지는 기능
패키지를 참조하지 않으며, 기능의 규칙 위반 예외는 오류 코드를 가진 `RuleViolationException`을 상속해
하나의 처리기로 응답한다. 기능 패키지 사이 순환도 같은 테스트가 막는다. 목록 기능의 의존 방향은
`tag ← ingredient ← excludecode ← product → brand → category`다. 제품 수나 성분군처럼 하위 기능이
상위 기능의 값을 보여 줘야 하면 하위 기능 Service 패키지에 필요한 조회만 담은 인터페이스
(`BrandProductCounter`, `CategoryProductCounter`, `IngredientUsage`, `IngredientGroups`)를 두고 상위
기능이 구현한다. 집계 결과 타입(`BrandProductCounts`, `CategoryProductCount`)과 성분군 코드
`ExcludeCode`는 그 값을 보여 주는 쪽 기능의 Domain이 소유한다.

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

`ingredient`는 성분, 정규화된 이름 검색 상태와 판단, 근거와 성분에 연결된 태그를 소유한다.
`IngredientCatalog`는 ID가 유일한 전체 성분 인덱스를 소유하고 여러 성분의 검색 순위를 결정한다.
제품의 `Ingredients`는 전성분 참조의 입력 순서를 보존한다. DB에서는 제품 구성 단위 안의 같은
성분을 하나로 합치고, 구성 단위가 다르면 같은 성분을 각각 보존한다. 둘은 같은 성분을 다루지만
카탈로그 유일성과 제품 배합 순서라는 서로 다른 불변식을 갖는다.

### Tag

태그는 제형에서의 역할과 피부에 기대하는 작용이라는 서로 다른 두 축을 유지한다.
`tag`는 전역 문자열 코드로 식별되는 태그 정의를, `ingredient`는 성분과 태그의 관계 및 근거를
소유한다. 태그 효과 근거는 성분 단위 `ingredient_source(type = EFFECT)`로 저장한다. 두 축의 응답
이름과 의미를 하나의 일반적인 "기능"으로 합치지 않는다.

### Product

`Product`는 브랜드, 카테고리, 순서가 보존된 전성분, 판매 옵션과 감각 값을 묶는 중심
애그리게이트이며 자신의 이름 검색과 필터 조건 판정을 수행한다. 감각 값은 서버 밖에서 계산해 제품
행에 저장한 수분감·유분감 단계를 그대로 읽으며 목록·상세·필터·개수가 같은 값을 사용한다.
서버는 감각 값을 계산하지 않는다. 지금 저장된 값을 만든 계산 근거와 한계는
[`sensory-inference-v0.md`](docs/product/sensory-inference-v0.md)가 소유한다.

### Products

`Products`는 제품 목록 전체에 대한 검색, 필터, 정렬과 집계를 소유한다. ID별 `Product` Map
하나를 권위 상태로 사용하고 목록·ID 조회·집계를 여기서 파생한다. 목록과 개수는 같은 필터
판정을 사용하고, 응답 DTO가 규칙을 다시 구현하지 않는다.

### ProductView

`productview`는 한국 시간 날짜별 제품 조회수를 카탈로그와 분리해 소유한다. Service는
제품 존재와 한국 시간 날짜를 결정하고, `ViewPeriod`는 오늘을 포함한 집계 기간을 정한다.
Repository는 조회 한 번마다 날짜·제품 행의 횟수를 DB에서 1 올리고, 기간 합산도 DB에서
계산한다. 메모리에 상태를 두지 않으므로 인스턴스가 여럿이어도 기록이 겹쳐 쓰이지 않는다.
제품 행은 지우지 않으므로 과거 날짜의 기록도 제품 FK를 유지한 채 남는다.

### ExcludeCode

`excludecode`는 빠른 제외 성분군의 식별자와 성분 매핑을 소유한다. 성분군은 서버에서 성분으로
해석하며, 데이터에 빠지거나 중복된 정의가 있으면 기동을 실패시킨다. 포함 범위는 DB 데이터의
책임이며 서버 상수나 패턴으로 추론하지 않는다.

### SkinType

`skintype`은 DB의 피부타입 코드와 표시명 정의를 공개 순서로 투영한다. 제품별 피부타입
분류와 필터 판정은 `product`의 책임이며, 표시명을 제품 데이터에 중복 저장하지 않는다.

### Curation

큐레이션 공개 조회 모델은 목록·상세가 공유하는 제목과 설명, 큐레이션 게시 상태를 소유한다.
배너는 목록 노출 여부와 썸네일을, 상세는 블록을 소유한다. 배너 노출은 게시 중인 큐레이션에
비어 있지 않은 썸네일이 있을 때만 허용한다. 목록은 게시 중이며 배너 노출이 활성화된 큐레이션만,
상세는 게시 중인 큐레이션만 조회하며 게시 상태와 배너 노출 여부는 응답하지 않는다. 배너 순서는 최상위 배열이,
블록·필터·제품 순서는 각 하위 배열이 소유한다. 공개 조회 스냅샷의 블록은 모두 공개 대상으로
간주하며 별도 게시 상태를 갖지 않는다. 블록은 이미지, 일반 제품, 필터 기준 제품 타입으로
나뉘며 각 타입이 자신의 필수 값과 공개 투영을 소유한다. 일반 제품은 제품 ID만,
필터 기준 제품은 블록 필터와 제품별 필터 매핑을 보관한다. 제품 참조는 조회 시 현재 카탈로그로
해석한다. 누락 제품과 빈 필터·제품 블록은 응답에서만 제외하며 저장 상태를 바꾸지 않는다.
관리자 저장 이력은 공개 조회 모델에 섞지 않고 Repository가 공개 투영으로 변환한다.
DB로 이전할 때 배너와 블록의 내부 순서 컬럼으로 배열 응답을 복원하며 공개 API에는 순서
필드를 추가하지 않는다.

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
하며, 이 경계는 `ArchitectureTest`로 강제한다. 예외는 JPA 매핑 어노테이션(`jakarta.persistence`)
하나다. 어노테이션은 실행에 영향을 주지 않는 메타데이터이므로 도메인은 여전히 `new`로 만들어 검증한다.
Hibernate 전용 어노테이션은 도메인에 두지 않는다.

### Repository

Repository는 DB·S3 같은 저장 표현을 도메인으로 변환하고 저장 실패를 인프라 오류로
분류한다. 저장 형식 전용 타입과 프로토콜은 구현 내부에 두고 Controller 응답을 만들지 않는다.
테이블 하나와 그대로 맞는 도메인(`Brand`, `Category`, `Tag`, `ProductVariant`, `ProductRequest`)은
JPA 매핑을 직접 갖는다. 여러 테이블을 묶거나 한 도메인이 여러 테이블로 나뉘는 경우(`Product`,
`Ingredient`, `Curation`, `Feedback` 등)는 Repository 패키지에 엔티티를 두고 도메인으로 변환한다.
DB에서 읽은 도메인은 생성자 검증을 거치지 않으므로 같은 조건을 스키마 제약이 막는다. 카탈로그는 기동 시
한 번 읽어 메모리 도메인으로 만들고, 검색·필터·집계는 기존 도메인이 계속 소유한다. 카탈로그 저장소들은
기동하는 동안 `SnapshotReader`가 연 읽기 전용 REPEATABLE READ 트랜잭션 하나를 함께 쓰고, 모든 빈이 만들어지면
그 트랜잭션을 닫는다. 기동 중에 적재가 커밋되어도 저장소마다 다른 시점을 보지 않는다.

스키마는 `db/schema.sql` 하나가 소유하고 DB에 한 트랜잭션으로 직접 적용한다. 서버는 `ddl-auto: validate`로
엔티티와 스키마가 맞는지만 확인하고 스키마를 만들거나 바꾸지 않는다. 한 행으로 표현되지 않는 규칙(제품 비삭제·ID 불변,
제품당 옵션 하나 이상, 필터형 큐레이션 블록의 필터 연결)은 트리거가 적재 커밋 시점에 막는다. 적재는 READ COMMITTED 또는
SERIALIZABLE로 하고, 옵션·큐레이션 전체 교체는 TRUNCATE가 아니라 DELETE 후 다시 넣는다.

운영 데이터는 커밋하지 않는다. 테스트와 OpenAPI 생성은 `test` 프로필로 개발 DB와 분리된
테스트 DB를 쓰며, 컨텍스트가 뜰 때마다 스키마와 테스트 데이터를 다시 넣는다. 실제 서버는 운영
DB를 사용한다.

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

서비스 의견과 제품 정보 정정 요청은 입력 계약을 나눈다. `POST /api/feedbacks`의 유형은 필드와
처리가 같고 분류만 다른 서비스 의견만 담으며, 작성 화면 경로는 클라이언트가 알 때만 받는 참고
정보다. 모르는 경로를 `/`로 채우면 홈에서 쓴 의견과 구분되지 않으므로 비워 둔다. 제품 정보
정정은 대상 제품이 필수이므로 `POST /api/products/{productId}/correction-requests`가 경로로
받고, 제품이 없으면 접수하지 않는다. 제품 등록 요청도 서비스 의견이 아니라 제품 데이터에 대한
요청이므로 `POST /api/products/registration-requests`로 제품 컬렉션 아래에 둔다. 문의하기 화면이
세 요청을 한곳에서 보내는 것은 화면 구성일 뿐 API 자원 구분의 근거가 아니다. 두 요청은 내용 검증, 요청 제한, 이미지 귀속과
Discord 알림이 같으므로 `feedback` 안에서 `FeedbackSubject`로만 구분하고 같은 저장 경계를
공유한다. 저장은 서비스 의견을 `feedback`, 제품 정보 정정 요청을 `product_correction_request`
테이블에 나눠 두고 제품 등록 요청은 `product_request`에 둔다.

첨부 이미지는 기존 2단계 API를 유지한다. `POST /api/pending-images`가 검증·정규화한
이미지를 pending으로 저장하고 일회성 `imageIds`를 반환하며, 의견 등록이나 제품 정보 정정
요청이 그 ID를 받아 접수 건에 귀속시킨다. 이미지 파일은 S3에 두고 DB에는 이미지 ID와 순서만
기록한다. 확장자는 이미지 ID에 대응하는 S3 객체 키에서 복원한다. 귀속은 outbox 방식이다. 접수 건과
이미지 행을 한 트랜잭션으로 커밋하고, 커밋 뒤 pending을
최종 경로로 복사하고 지운다. 별도 outbox 테이블은 두지 않는다. DB 이미지 행이 할 일 기록이고, 아직
남은 pending이 미처리 표시다. 요청 안에서 옮기지 못했거나 서버가 멈춘 경우는 스케줄러가 pending 목록과
DB 이미지 행을 대조해 다시 옮긴다. 옮기기는 같은 원본 ETag 조건 복사라 여러 번 실행해도 결과가 같다.
DB에 없는 pending은 만료 후 유예 시간이 지나야 지워, 만료 직전에 커밋된 접수 건의 원본을 지우지 않는다.
이미지 ID의 고유 제약은 두 이미지 테이블에 따로 걸려 있으므로, 저장 트랜잭션 안에서 이미지 ID마다
advisory lock을 잡은 뒤 두 테이블을 확인해 이미 쓰인 ID를 거절한다. 같은 ID로 동시에 들어온 요청은
앞선 요청의 커밋을 기다린 뒤 그 행을 보고 거절되므로, 한 이미지는 접수 건 하나에만 귀속된다.

업로드 입력은 파일명이나 선언된 Content-Type 대신 실제 바이트로 JPEG, PNG 또는 `heic`/`heix`
brand의 HEIC인지 판별하고 각 디코더가 실제로 읽을 수 있는지 확인한다. 크기·해상도·픽셀 상한을
적용하고 기본 프레임을 끝까지 디코딩한 뒤 메타데이터를 옮기지 않고 재인코딩한다. JPEG와
HEIC는 JPEG로, PNG는 PNG로 저장한다. JPEG/PNG의 다중 프레임 표식, reader warning이나 디코더가
무시할 수 있는 꼬리 데이터를 수동 파싱해 거절하지 않고, 허용한 기본 프레임의 픽셀만 새 이미지로
정규화한다. HEIC는 외부 디코더가 JPEG 파일을 정확히 하나 만든 경우만 다음 단계로 넘긴다.
디코딩·재인코딩 동시성 permit은 CPU와 메모리 소모 구간만 보호하며 S3 저장 대기 중에는 점유하지 않는다.

HEIC는 자원 상한과 빈 환경을 적용한 별도 `heif-convert` 프로세스로 디코딩한다. 백엔드 호스트
초기화 스크립트가 Amazon Linux의 `libheif-tools`, `libde265`, `util-linux-core` 패키지를 설치하고
필요한 실행 파일을 확인한다.

피드백과 제품 등록 요청은 영속 저장을 성공 기준으로 삼고, 이후 알림 실패가 이미 저장한 접수를
되돌리지 않는다.

공유 텍스트 식별은 제품의 공개 API이지만 해석 책임은 `share`가 소유한다. 세부 계약은
[`share-text-matching.md`](docs/product/share-text-matching.md)에서 관리한다.
