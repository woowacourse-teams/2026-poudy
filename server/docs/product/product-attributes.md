# 제품 속성

속성 정의는 `category_attribute`로 여러 대분류에서 공유한다. 제품은 소분류에 속하고,
제품 소분류의 부모 대분류에 허용된 속성만 등록할 수 있다. 제품별 실제 값은 각각 등록한다.

| 테이블 | 키·역할 |
| --- | --- |
| attribute | id PK, code UNIQUE: 속성 정의 |
| category_attribute | (category_id, attribute_id) PK: 대분류의 허용 속성과 표시 순서 |
| attribute_value | (attribute_id, value_code) PK: 허용값·표시명·표시 순서 |
| product_attribute_value | (product_id, attribute_id) PK: 제품의 속성당 단일 값 |

제품값의 `(attribute_id, value_code)`는 허용값의 복합 FK다. 비해당·미확인은 연결 행 없음으로 표현한다.
선택값은 `UV_FILTER_TYPE=MINERAL/ORGANIC/HYBRID`, `WASHABILITY=EASY_WASH`,
`WATER_RESISTANCE=WATERPROOF`다. YES/NO 값은 없다.

## HTTP 계약

목록과 count가 같은 `attributes` 반복 쿼리를 받는다.

```http
GET /api/products?attributes=UV_FILTER_TYPE:MINERAL&attributes=WASHABILITY:EASY_WASH
GET /api/products/count?attributes=UV_FILTER_TYPE:MINERAL&attributes=WASHABILITY:EASY_WASH
```

같은 속성의 여러 값은 OR, 다른 속성과 기존 필터는 AND다. 피부 그룹 안의 타입·민감성 OR는 유지한다.
생략은 조건 없음이다. 빈 값·형식 오류·동일 쌍 중복·없는 속성/값 조합은 400 `INVALID_QUERY_PARAMETER`다.
유효한 속성과 적용되지 않는 카테고리를 함께 고르면 정상적인 0개 결과다.
`keyword`는 제품명·브랜드명에 더해 실제 연결된 속성값 표시명·마크 이름을 검색한다.
예를 들어 `다이소 무기자차 토너`는 세 조건이 같은 제품에서 모두 맞아야 한다(AND).
속성 그룹명과 내부 코드는 새 검색 대상이 아니다. 기존 이름 검색으로 맞는 결과는 유지한다.
검색어의 `무기자차 유기자차`는 AND이며, 명시적 속성 필터에서 두 값을 선택한 OR와 다르다.
정의된 속성값·마크 이름은 제품 연결이 없어도 다른 값으로 오타 교정하지 않는다.
다이소 요청 파라미터·필터 선택지는 추가하지 않는다.

첫 페이지의 `filterOptions.attributes`는 속성별 `attributeCode`, `name`, `values`를 제공한다.
각 값에는 `valueCode`, `name`, `productCount`가 있다. 각 그룹의 자기 조건만 제외한 전체 후보에서
그 값이 연결된 제품을 센다. OR 선택에 해당 값을 추가한 뒤의 전체 결과 수가 아니다.
양수 후보와 현재 선택값을 합치므로 선택값은 0개여도 유지한다. 후속 페이지에는 `filterOptions`를 생략한다.

제품 목록은 최상위 `brands` 집계를 제공하지 않는다. 제품별 브랜드는 `items[].brand`,
브랜드 필터 선택지는 `filterOptions.brands`로 제공한다. 최상위 `categories`와 `skinTypes`는 유지한다.

한 대분류로 좁힌 경우 연결의 표시 순서, 여러 대분류·전체 검색은 속성 코드순이다.
값은 `display_order`, 동률은 코드순이다. 공유 속성을 한 그룹으로 합치고 제품 수를 중복 계산하지 않는다.
제품별 응답은 [표식 계약](product-marks.md)에 따라 직접 부여한 Mark만 제공한다. 속성값은 표시하지 않는다.

## 데이터 적재

V26은 정의·허용값만 초기 등록한다. 운영 대분류 ID나 제품별 실제 값은 추정하지 않는다.
구버전 종료 후 기존 배지 코드와 선케어 대분류 ID를 확인하고 다음 스크립트의 매핑을 확정한다.

```sh
psql -v ON_ERROR_STOP=1 -v category_id=<선케어_대분류_ID> \
  -f scripts/sql/import-product-attributes.sql
```

접속 대상은 별도로 지정한다. 스크립트는 대분류에 초기 속성을 연결하고 알려진 기존 속성 배지만 제품값으로
옮긴다. 서로 다른 값의 충돌과 카테고리 적용 범위 오류는 전체 트랜잭션을 실패시킨다. 다이소와 미매핑 코드는
남기고, 미매핑 코드는 확인용으로 출력한다. 기존값과 일치하는 재적재는 중복 연결을 만들지 않는다.
실제 이름 전환보다 먼저 실행한다. 신규 제품별 값도 검증된 원천에 따라 같은 제약 아래 적재한다.
속성값·마크 표시명과 연결은 검색 시 조회하므로 변경 뒤 검색 뷰를 REFRESH하지 않아도 반영된다.
제품명·브랜드명 변경은 기존 검색 뷰 갱신 절차를 따른다.

## 직접 쓰기·동시성

제품값·허용 관계 쓰기와 제품 카테고리·카테고리 부모/깊이 변경은 `SERIALIZABLE` 트랜잭션에서 실행한다.
DB 트리거가 격리 수준을 강제하고, 지연 제약 트리거가 트랜잭션 최종 상태의 적용 범위를 검증한다.
범위를 벗어나는 값이 남는 변경은 거절한다. 값을 명시적으로 정리하고 관계를 바꾸는 작업은 같은
트랜잭션에서 할 수 있다. 직렬화 실패(SQLSTATE `40001`)는 트랜잭션 전체를 재시도한다.
카테고리 허용 관계와 제품값의 TRUNCATE는 거절한다.

새 테이블의 수정 시각은 DB 트리거가 갱신한다. 제품값·선택값 이름 변경은 제품 수정 시각도 갱신한다.
일반 API 읽기는 기존 `REPEATABLE_READ` 트랜잭션으로 여러 조회의 일관성을 유지한다.
