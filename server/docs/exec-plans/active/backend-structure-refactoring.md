# 백엔드 책임 응집도 개선 계획

## 상태

- 상태: 진행 중
- 시작일: 2026-08-25
- 관련 이슈: #233
- 대상 영역: 검색, 제품 집계 조회, 요청 입력, 요청 제한, Discord, S3

## 목표

여러 기능에 흩어졌거나 표현 계층과 기술 구현에 섞인 책임을 변경 이유가 같은 단위로 모은다.
외부 API와 운영 정책은 유지하고, 도메인 규칙과 공통 기술 메커니즘의 소유 위치만 바꾼다.

## 유지할 동작

- 검색 결과, 정렬 순서, 성분 검색 5건 상한과 제품 검색 페이지 계약을 유지한다.
- 브랜드와 카테고리의 제품 수, 계층 순서와 빈 집계 포함 여부를 유지한다.
- 요청·응답 JSON, 상태 코드, 오류 코드와 OpenAPI 계약을 유지한다.
- 요청 제한 횟수, 시간 창, 추적 용량, 만료 정리와 `Retry-After`를 유지한다.
- Discord 메시지, 멘션 차단, 피드백의 2,000 code point 상한과 웹훅 쿼리를 유지한다.
- S3 버킷 설정, 객체 키, content type, JSON 문서와 timeout을 유지한다.
- S3 저장 뒤 Discord 알림만 실패하면 접수 성공을 유지하고 재시도하지 않는다.

## 결정

### 검색

- 정규화, 초성 변환, 일치 등급과 공통 이름 순위는 `search.domain`이 소유한다.
- 검색 대상 필드, 이름과 별칭의 우선순위, 동점 정렬, 상한, 페이지와 공유 제품 확정은 각 기능 도메인에 남긴다.
- HTTP 요청 DTO는 검색어를 변경하지 않는다. 검색 도메인이 비교 직전에 한 번 정규화한다.
- HTTP 경계는 정규화하면 비는 검색어를 기존 오류 코드로 거절한다.

### 제품 집계 조회

- 제품 목록에서 계산한 브랜드별·카테고리별 집계 결과는 `product.domain`이 소유한다.
- `BrandSummary`, `CountedCategory`, `BrandDetail`은 각각 제품 집계라는 뜻이 드러나는 이름으로 옮긴다.
- 브랜드와 카테고리 Service가 자기 조회 유스케이스의 완성된 결과를 반환한다.
- Controller는 여러 Service의 값을 조립하지 않는다.
- `brand.domain`과 `category.domain`에는 브랜드와 카테고리 참조 축을 남긴다.

### 요청 입력

- Controller DTO는 HTTP 바인딩과 Bean Validation을 담당한다.
- Service는 Controller DTO를 받지 않고 유스케이스 입력이나 도메인 값을 받는다.
- 제품 필터는 한 경로에서 제외 성분군을 해석하고 충돌을 판정한다.
- 제품 등록 요청 이름의 정규화와 길이 규칙은 `ProductRequest` 생성 경로가 보장한다.

### 공통 기술 책임

- `ratelimit.FixedWindowRateLimiter`는 상태를 공유하지 않는 고정 시간 창 알고리즘만 제공한다.
- 기능별 제한기는 각자 설정과 `Clock`을 소유하고 초과 결과를 `TooManyRequestsException`으로 바꾼다.
- `infrastructure.discord.DiscordWebhookClient`는 JSON 직렬화와 HTTP 전송만 담당한다.
- Discord 메시지, 웹훅 주소, 성공 상태 기준과 알림 실패 후 처리는 각 기능이 소유한다.
- `infrastructure.s3.S3JsonObjectWriter`는 UTF-8 JSON 객체 전송만 담당한다.
- S3 객체 키, 문서 형태, content type과 실패 문맥은 각 저장소가 소유한다.
- `infrastructure.s3.S3ClientFactory`는 두 기능이 공유하는 15초 전체 호출 및 5초 개별 시도 timeout을 적용한다.
- 코드 모양만 같고 변경 이유가 다른 정책은 공통화하지 않는다.

## 작업

- [ ] 검색 공통 타입과 테스트를 `search.domain`으로 옮긴다.
- [ ] 검색 요청 검증과 기능별 검색 회귀 동작을 보존한다.
- [ ] 제품 집계 산출 타입을 `product.domain`으로 옮기고 이름을 정리한다.
- [ ] 브랜드·카테고리 조회 조립을 각 Service의 유스케이스로 옮긴다.
- [ ] 성분·제품·제품 등록 요청 Service의 Controller DTO 의존을 제거한다.
- [ ] 제품 필터 생성과 충돌 판정을 한 경로로 모은다.
- [ ] 제품 등록 요청의 정규화와 검증을 도메인 생성 경로로 옮긴다.
- [ ] 고정 시간 창 알고리즘을 추출하고 기능별 상태를 분리한다.
- [ ] Discord 웹훅 전송을 추출하고 기능별 메시지와 실패 정책을 유지한다.
- [ ] S3 JSON 전송과 공통 client timeout 구성을 추출한다.
- [ ] `ARCHITECTURE.md`에 변경된 패키지와 책임 경계를 반영한다.
- [ ] `sh ./scripts/verify.sh`를 통과한다.

## 검증

- 검색 도메인 단위 테스트와 브랜드·성분·제품·공유 검색 회귀 테스트를 실행한다.
- 브랜드·카테고리 집계 도메인, Service와 HTTP 조회 테스트를 실행한다.
- 서비스가 `controller.dto`를 import하지 않는지 정적 검색으로 확인한다.
- 요청 제한의 시간 창, 추적 용량, 동시성 및 429 응답 테스트를 실행한다.
- Discord 공통 전송과 기능별 메시지·부분 실패 테스트를 실행한다.
- S3 공통 전송과 기능별 객체 키·문서·실패 변환 테스트를 실행한다.
- 전체 검증으로 OpenAPI와 TypeScript 생성물 드리프트가 없는지 확인한다.

## 완료 조건

- `common.domain`이 비고 검색 공통 값은 `search.domain`에만 있다.
- `brand.domain`과 `category.domain`이 제품 집계 결과 타입을 소유하지 않는다.
- Service가 Controller DTO를 참조하지 않는다.
- 피드백과 제품 등록 요청이 요청 제한·Discord·S3의 같은 기술 알고리즘을 복제하지 않는다.
- 외부 계약과 운영 정책이 바뀌지 않고 전체 검증이 통과한다.
