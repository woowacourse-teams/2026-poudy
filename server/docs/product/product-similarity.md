# 성분 유사 제품 조회와 수동 계산 연결

서버는 유사도를 계산하지 않는다. 데이터 담당자가 제품 적재 후 private 저장소의
`product-similarity/calculate.py`를 수동 실행해 동일 DB에 결과를 저장한다.
서버 빌드·기동·요청 시 Python을 호출하거나 계산 작업을 예약하지 않는다.

## 저장 계약

Flyway V6가 두 테이블을 생성한다. private 스크립트의 별도 schema.sql은 실행하지 않는다.

- `product_similarity_calculation(component_id)`: 계산을 마친 구성 요소. 후보가 0개여도 기록한다.
- `product_similarity(component_id, similar_component_id, similarity_score)`: 방향이 있는
  구성 요소 간 결과. 점수는 0~1이다. 두 구성 요소 ID가 복합 PK다.
- 기준 구성 요소마다 동일 최하위 카테고리의 다른 제품을 비교한다. 제품명에서 확인된
  필수 성분군을 만족해야 한다. 한 대상 제품에서는 최고 점수 구성 요소 하나만 저장한다.
- 최종 점수 0.25 이상인 서로 다른 제품을 점수 내림차순, 제품 ID 오름차순으로 최대 10개 저장한다.
  대상 제품 내 구성 요소가 동점이면 구성 요소 ID 오름차순으로 선택한다.
- 원천 데이터는 정식 DB ID를 사용한다. 로컬 검증 보고서의 임시 ID를 적재하지 않는다.
- 계산 중 입력이 바뀌면 반영을 중단한다. 완료 행과 결과 행은 같은 트랜잭션으로 교체한다.
  중복 실행을 막고 실패하면 이전 결과를 유지한다.

## 조회 계약

`GET /api/products/{productId}/similarities?partId={componentId}`

partId는 기존 상세 API와 같은 용어다. 생략하면 표시 순서가 가장 앞선 구성품을 선택한다.
다른 제품에 속한 partId 또는 없는 partId는 PRODUCT_PART_NOT_FOUND(404)다.

응답은 `partId`, `calculated`, `items`다. 구성품이 없으면 partId는 null이고 calculated는 false다.
미계산과 후보 없음은 모두 빈 items를 반환하지만 calculated로 구분한다.
현재 판매 옵션이 하나 이상 active이고 최종 점수가 0.25 이상인 후보를 최대 3개 반환한다.
자기 제품과 다른 카테고리는 제외하고, 제품 중복 제거와 판매 상태 필터링을 3개 제한 전에 한다.
API는 DB에 저장된 후보 범위에서만 조회하므로 상위 10개 밖의 후보를 다시 계산해 채우지 않는다.

각 항목은 제품 ID·이름·브랜드·이미지, 계산 대상 구성품 partId,
containsExcludedIngredient(대상 구성품에 빠른 제외 6종 중 하나라도 포함)를 제공한다.
점수는 공개하지 않는다. 클라이언트는 items가 0개면 영역을 숨기고, 1~2개면 그만큼 표시한다.

## 배포 순서

1. Flyway V6와 조회 API를 배포한다. 최초 계산 전에도 빈 결과로 동작한다.
2. 데이터 담당자가 카탈로그와 성분군을 적재한다.
3. private 저장소 chore/db-scripts 브랜치의 `product-similarity` 운영 버전을 배치하고 미리보기를 실행한다.
   기본 policy.json은 release_ready=true, minimum_score=0.25이며 다른 노출 임계값은 null이다.
   운영 정책 변경이 포함된 `af8128b` 이후 버전을 배포한다. 과거 검토용 파일은 apply를 막는다.
4. 결과와 정식 ID를 확인한 뒤 수동으로 `--apply`를 실행한다.
5. API에서 기준 구성품, 주의 판정, 최대 3개, 미계산/후보 없음 상태를 확인한다.

DB 접속은 스크립트의 PostgreSQL 연결 환경으로 제공한다. 비밀번호를 코드나 명령 인수에 넣지 않는다.
카테고리 빈도를 사용하는 계산이므로 제품·전성분·성분군이 바뀌면 전체 재계산한다.
입력 변경과 재계산 사이에는 저장된 점수가 이전 입력 기준일 수 있다.
운영 데이터 적재와 계산 스크립트의 staging/운영 실행은 별도 수동 작업이다.
