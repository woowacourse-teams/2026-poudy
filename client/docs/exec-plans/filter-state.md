# 탐색 조건 상태와 파생 표시값

> 상위 문서: [MVP 화면 구현 계획](./mvp-screen-plan.md) · PR 3 / `feat/client-filter-state`

## Goal

탐색 조건을 URL 하나로 관리하고, 화면이 쓰는 파생 표시값과 `localStorage` 레이어를 만든다. 화면보다 먼저 만들어 두는 부분이다.

## Decisions

### URL 쿼리 ↔ 조건 객체

`/api/products` 쿼리 파라미터와 1:1 로 맞춘다. 파싱과 직렬화 함수 한 쌍으로 끝난다.

| 파라미터 | 타입 | 화면 |
| --- | --- | --- |
| `keyword` | `string` | S02 |
| `categoryIds` | `number[]` | S04c |
| `brandIds` | `number[]` | S04a |
| `moistureLevel` · `oilLevel` | `number[]` (0~3) | S04b |
| `includeIngredientIds` · `excludeIngredientIds` | `number[]` | S03 · S04d |
| `excludeCodes` | 6 개 열거값 | S03 빠른 필터 |
| `sort` | `NAME_ASC` · `NAME_DESC` · `PRICE_ASC` · `PRICE_DESC` | S04 |
| `page` · `size` | `number` | S04 |

여기가 이 프로젝트에서 테스트 가치가 가장 큰 코드다. 필터 로직이 핵심 자산이고 순수 함수라 단위 테스트가 잘 맞는다.

### 조건 충돌 규칙

`excludeCodes`(성분군 통째 제외)와 `excludeIngredientIds`(개별 성분 제외)가 겹칠 수 있다. 서버도 `CONFLICTING_INGREDIENT_FILTER` 에러 코드를 갖고 있다.

향료 그룹을 제외한 상태에서 그 그룹에 속한 개별 성분을 포함 조건으로 고르는 경우가 문제다. **UI 에서 미리 막는다.** 서버 400 을 받고 나서 알리면 사용자가 원인을 알기 어렵다.

`/api/exclude-codes` 가 성분군마다 속한 성분 ID 목록(`ingredients`)을 주므로 이것으로 판정한다.

### 파생 표시값

디자인에 있으나 API 가 그대로 주지 않는 값이다.

- **단가**: `Math.round(price / volumeValue)` → `200ml · ml당 90원`. `volumeValue` 와 `volumeUnit` 은 API 에 있고 나눗셈만 하면 된다. 정렬이나 필터에 쓸 일이 생기면 서버에 `unitPrice` 를 요청한다.
- **조건 요약 문자열**: `판테놀 포함 · 리모넨 제외 · 빠른 필터 2개`(S04 적용 조건 요약)
- **유수분 레벨**: `moistureLevel` · `oilLevel` 0~3 을 채움/비움 물방울 아이콘 3 개로 렌더링

### localStorage

세 종류 모두 브라우저가 소유한다.

| 용도 | 내용 | 화면 |
| --- | --- | --- |
| 저장함 | 제품 ID 배열 | S07 · S01 · 카드 저장 버튼 |
| 최근 제품 검색 | 검색어와 제품 요약 | S02 |
| 최근 탐색 조건 | 조건 집합과 사용 시각 | S01 |

키 이름과 스키마 버전을 정한다. 스키마가 바뀔 때 기존 값을 어떻게 다룰지도 함께 정한다. 값을 읽을 때 파싱 실패를 견디게 만든다.

## Work

- [ ] 조건 객체 타입 정의
- [ ] URL 쿼리 파싱 함수와 단위 테스트
- [ ] URL 쿼리 직렬화 함수와 단위 테스트
- [ ] 조건 충돌 판정과 단위 테스트
- [ ] 단가·조건 요약·유수분 레벨 파생 함수와 단위 테스트
- [ ] `localStorage` 래퍼 3 종(저장함 · 최근 검색 · 최근 조건)
- [ ] 파싱 실패와 스키마 버전 처리

## Verification

- 조건 조합을 직렬화하고 다시 파싱했을 때 원본과 같은지 확인한다
- 빈 조건, 단일 값, 배열 다중 값, 잘못된 값을 각각 테스트한다
- `localStorage` 가 없거나 값이 깨진 환경에서 화면이 죽지 않는지 확인한다
