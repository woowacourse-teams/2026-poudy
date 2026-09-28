# ERDCloud 전체 스키마 정합화 계획

## 상태

- 상태: 완료
- 시작일: 2026-09-22
- 기준: ERDCloud `Poudy New`의 PostgreSQL SQL Preview
- 대상: DB 스키마, JPA 매핑·저장소, 테스트 데이터, 로컬 Docker PostgreSQL

## 목표

큐레이션만 반영된 현재 상태에서 벗어나 ERDCloud의 모든 테이블 정의를 서버의 단일 스키마
원천인 `db/schema.sql`에 반영한다. 식별자와 관계가 바뀐 제품·성분·태그 모델은 저장 표현만
맞추지 않고 Repository의 조립 경계까지 함께 변경한다. 공개 HTTP API의 의미는 유지하되 태그의
식별자 타입과 시각 오프셋은 새 ERD의 식별자·한국 시간 계약을 따른다.

## 주요 변경

- 모든 ERD 테이블에 정의된 한국 시간 `created_at`·`updated_at` 컬럼과 타입을 맞춘다.
- `tag`의 식별자를 숫자 ID에서 전역 문자열 `code`로 바꾸고 `ingredient_tag`가 이를 참조한다.
- `ingredient_alias`와 `ingredient_source`에 DB 생성 ID를 도입하고, 태그 근거를
  `ingredient_source(type = EFFECT)`로 통합한다.
- `product_component`에 DB 생성 ID를 도입하고 `product_ingredient`가 `component_id`를 참조한다.
- `skin_type` 정의 테이블을 추가하고 `product_skin_type.skin_type_code`가 참조하게 한다.
- ERD에서 제거된 중복·이력 컬럼을 제거하고 상태 변경 시각·생성 시각 명칭을 맞춘다.
- ERD 주석에 기록된 유일성·체크·삭제 정책과 기존의 더 강한 데이터 무결성 트리거를 보존한다.

## 유지할 동작

- 제품·성분·태그·카테고리·피부타입·검색·피드백·요청·큐레이션 공개 API의 필드 의미를 유지한다.
- 태그 응답의 `id`는 숫자 대리키 대신 ERD의 문자열 `code`를 반환하고, DB 시각은 한국 시간
  오프셋으로 반환한다.
- 카탈로그 검색, 필터, 정렬과 제품당 옵션 하나 이상 등 기존 도메인 불변식을 유지한다.
- 이미지 확장자는 DB에서 제거하되 저장 경로를 복원할 수 있는 현재 애플리케이션 계약은
  저장 객체 키 규칙으로 유지한다.
- 로컬 Docker의 기존 데이터는 가능한 한 변환하며, 비어 있음을 확인하지 않은 테이블을
  삭제 후 재생성하지 않는다.

## 작업

- [x] ERD와 현재 스키마·매핑·fixture의 전체 차이를 확정한다.
- [x] `schema.sql`과 JPA/Repository 매핑을 ERD에 맞춘다.
- [x] 테스트 fixture와 스키마 회귀 테스트를 갱신한다.
- [x] 관련 기능 테스트와 `sh ./scripts/verify.sh`를 통과한다.
- [x] Docker `poudy` 데이터베이스를 데이터 보존 방식으로 변환하고 스키마·행 수를 검증한다.

## 결과

- `public`의 28개 테이블·컬럼·복합 PK와 모든 시각 컬럼 타입을 ERD SQL과 대조했다.
- 태그 코드, 성분 근거, 제품 구성 단위, 피부타입 정의와 요청·피드백 시각 매핑을 새 관계로
  조립한다.
- Docker 데이터는 새 스키마에 복사한 뒤 스키마를 원자적으로 교체했다. 중복을 허용하지 않는
  새 키에 맞춰 성분 근거를 72,657행으로 합치고 제품 성분 중복 6행을 정규화했다.
- 실제 Docker DB로 개발 서버를 기동해 Hibernate 검증과 카탈로그 스냅샷 로딩을 확인했다.
- `sh ./scripts/test.sh`와 환경을 전달한 `sh ./scripts/verify.sh`가 통과했다.

## 완료 조건

- ERD의 모든 테이블·컬럼·PK·FK가 서버 스키마와 일치한다.
- 저장소가 새 식별자와 관계로 기존 도메인 객체를 같은 의미로 조립한다.
- 테스트 DB와 Docker 개발 DB가 같은 스키마를 사용한다.
- 전체 서버 검증이 통과한다.
