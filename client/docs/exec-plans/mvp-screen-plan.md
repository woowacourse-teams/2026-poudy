# 클라이언트 MVP 화면 구현 계획

## Goal

`client/design/v1.pen` 의 화면을 Next.js 로 구현한다. API 는 `common/api.zod.ts` 의 GET 11 개를 사용한다.

이 문서는 화면과 라우트, 렌더링 방식, PR 순서를 정한다. 개별 PR 의 상세 작업은 같은 폴더의 문서로 나눈다.

## Decisions

### 라우트

디자인 프레임 17 개는 라우트 10 개로 접힌다. 자동완성과 바텀시트 열림은 별도 화면이 아니라 같은 라우트의 상태다.

| 라우트 | 프레임 | 렌더링 |
| --- | --- | --- |
| `/` | S01 | SSG 셸 + 개인 영역만 클라이언트 |
| `/search` | S02 · S02a · S03 · S03a | CSR |
| `/products` | S04 · S04a~d | CSR |
| `/products/[productId]` | S05 | ISR |
| `/ingredients/[ingredientId]` | S06 | ISR |
| `/saved` | S07 | CSR |
| `/categories` | S08 | ISR |
| `/categories/[categoryId]` | S09 · S09a~c | CSR |
| `/brands` | S10 | ISR |
| `/brands/[brandId]` | S11 · S11a | ISR |

### 렌더링 방식을 나눈 기준

- **ISR**: 고정 URL 이고 검색 노출 대상인 페이지. 제품·성분·브랜드 상세가 해당한다. `productCount` 처럼 데이터가 늘면 값이 변하는 목록도 포함한다.
- **CSR**: 조건 조합이 무한하거나 입력이 중심인 페이지. `/products` 는 무한 스크롤이 들어가 첫 페이지만 서버에서 그리면 목록 렌더링 코드가 서버와 클라이언트에 중복된다. 조건 조합 URL 은 색인 가치도 없다.
- **SSG**: 홈. 정적 문구와 카드뿐이고 개인 데이터는 `localStorage` 에서 온다. 서버가 채울 동적 데이터가 없다.

ISR 은 Node 서버를 전제한다. 정적 호스팅만 쓰기로 하면 ISR 대상은 SSG 로 내리고 재배포로 갱신한다. 배포 구성이 정해질 때 확인한다.

### 탐색 조건은 URL 이 유일한 그릇

조건은 컴포넌트 상태로 들지 않고 URL 쿼리에만 둔다. `/api/products` 의 쿼리 파라미터와 1:1 로 맞춘다.

```
keyword, categoryIds, brandIds, moistureLevel, oilLevel,
includeIngredientIds, excludeIngredientIds, excludeCodes, sort, page, size
```

이렇게 두면 화면 간 조건 동기화, 공유, 뒤로가기가 따로 구현할 것 없이 따라온다.

### `/search` 는 단일 라우트 + `mode` 쿼리

`/search?mode=product` 와 `/search?mode=ingredient` 로 나눈다. 본문 DOM 은 완전히 교체되지만 두 탭 모두 "탐색 조건을 만든다" 는 성격이 같고, 조건 쿼리를 공유한다. 라우트를 나누면 탭 이동마다 쿼리를 넘겨야 하고 빠뜨리면 조건이 새는 버그가 된다.

`/categories` 와 `/brands` 는 반대로 라우트를 나눈다. 카테고리 화면 안의 탭으로 오가지만 목록의 성격이 서로 다르다.

### 바텀시트

시트 안의 선택은 로컬 상태로 두고 `/api/products/count` 만 debounce 로 호출한다. "N 개 제품 보기" 를 눌렀을 때 URL 에 커밋한다. 취소하면 URL 은 그대로다. 적용 전 미리보기다.

`/products` 의 필터 칩은 4 개(성분·카테고리·브랜드·유수분)다. 성분 시트는 S09a 에만 있던 것을 S04d 로 옮겼다.

### 저장함

저장 목록은 브라우저가 소유한다. `/api/storage` 는 ID 배열을 받아 표시 정보를 채워주는 API 라서, 목록 자체는 `localStorage` 에 둔다. 최근 제품 검색(S02)과 최근 탐색 조건(S01)도 같다.

## 디자인과 API 의 차이

디자인에 있으나 API 에 없는 값이다.

| 요소 | 화면 | 처리 |
| --- | --- | --- |
| `ml당 90원` | S01 · S04 · S05 | `price / volumeValue` 로 계산한다. `volumeValue` 와 `volumeUnit` 은 API 에 있다. |
| 최근 검색 · 최근 탐색 조건 | S01 · S02 | `localStorage` |
| 비슷한 제품 | S05 | **보류.** 서버 확장 여부를 정하지 않았다. |

일치도(`96% 조건 일치`)와 전성분 신뢰도(`높음 94%`)는 비활성 잔재 노드에만 있던 값이라 화면에서 제거했다. 성분 기준 정렬을 MVP 에서 빼기로 한 결정과 일관된다.

정렬은 `제품명 오름/내림 · 가격 높은/낮은순` 4 종이고 API `sort` 와 일치한다.

## PR 순서

Stacked PR 로 올린다. 각 PR 은 앞 PR 을 베이스로 한다.

| # | 브랜치 | 내용 | 문서 |
| --- | --- | --- | --- |
| 1 | `docs/client-mvp-plan` | 이 계획 문서 | — |
| 2 | `feat/client-foundation` | `common` 연결 · 디자인 토큰 · MSW | [foundation.md](./foundation.md) |
| 3 | `feat/client-filter-state` | URL 파싱·직렬화 · 파생 표시값 · localStorage | [filter-state.md](./filter-state.md) |
| 4 | `feat/client-ui-components` | 공통 컴포넌트 | [ui-components.md](./ui-components.md) |
| 5 | `feat/client-product-detail` | S05 · S06 | — |
| 6 | `feat/client-product-list` | S04 + 시트 4 종 | — |
| 7 | `feat/client-search` | S02 · S03 + 자동완성 | — |
| 8 | `feat/client-saved` | S07 | — |
| 9 | `feat/client-category-brand` | S08 · S09 · S10 · S11 | — |
| 10 | `feat/client-home` | S01 | — |

화면은 S05(제품 상세)부터 만든다. 단일 API 를 쓰고 의존성이 없어서 토큰·컴포넌트·API 래퍼가 한 화면에서 모두 검증된다. S01(홈)은 다른 화면의 컴포넌트를 모아 쓰는 조립 화면이라 마지막에 둔다.

## 열린 결정

- **비슷한 제품**(S05): 서버 확장 · 클라이언트 계산 · 제외 중 미정
- **ISR 대상**: 배포가 정적 호스팅이면 SSG 로 내린다
- **테스트 전략**: 별도 문서로 정한다
