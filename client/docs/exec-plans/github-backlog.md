# GitHub 이슈·PR 작성 대기 목록

> GitHub 장애로 올리지 못한 이슈와 PR 을 기록해 둔다. 복구되면 이 문서 순서대로 올린다.

## 올리는 순서

1. 이슈를 먼저 만들어 번호를 받는다
2. 브랜치를 push 한다
3. PR 을 stacked 로 만든다. 각 PR 의 base 는 앞 PR 의 브랜치다
4. PR 본문의 `Close #N` 에 1 번에서 받은 번호를 넣는다

앞 PR 이 머지되면 뒤 PR 의 base 를 `dev` 로 바꾼다.

## 이슈

이슈 템플릿은 `.github/ISSUE_TEMPLATE/feature.yml` 을 쓰고 영역은 모두 `client` 다.

### 1. `[FEAT] 클라이언트 기반 설정`

**작업 내용**

- `common/api.zod.ts` 를 tsconfig path 로 연결한다
- `v1.pen` 디자인 토큰 34 개를 Tailwind `@theme` 로 옮긴다
- 폰트를 Noto Sans KR 로 교체한다
- MSW 로 API 목 서버를 만든다

**체크리스트**

- [x] `@poudy/api/*` path 와 `outputFileTracingRoot` 설정
- [x] 디자인 토큰 이식과 폰트 교체
- [x] MSW 브라우저 worker · Node server · 핸들러 11 개
- [x] 프로덕션 번들에 MSW 가 포함되지 않음

### 2. `[FEAT] 탐색 조건 URL 상태와 파생 표시값`

**작업 내용**

- 탐색 조건을 URL 쿼리 하나로 관리한다
- `/api/products` 파라미터와 1:1 로 파싱·직렬화한다
- 단가·조건 요약·유수분 레벨 파생 함수를 만든다
- `localStorage` 레이어 3 종을 만든다
- 단위 테스트 환경(Vitest)을 구성한다

**체크리스트**

- [x] 파싱·직렬화 함수와 단위 테스트
- [x] 성분군·개별 성분 조건 충돌 판정
- [x] 저장함 · 최근 검색 · 최근 조건 저장소
- [x] Vitest 도입과 CI 연결

### 3. `[FEAT] 공통 UI 컴포넌트`

**작업 내용**

- 상단 영역 2 종과 하단 내비게이션을 만든다
- 제품 카드 · 검색 필드 · 정렬 드롭다운 · 바텀시트 셸을 만든다

**체크리스트**

- [ ] 컴포넌트 구현과 디자인 대조
- [ ] 키보드 조작과 스크린리더 확인

### 4. `[FEAT] 제품 성분 상세와 성분 설명 화면`

**작업 내용**

- `/products/[productId]` (S05) 를 만든다
- `/ingredients/[ingredientId]` (S06) 를 만든다

**체크리스트**

- [ ] 카테고리 경로 · 용량별 가격 · 전성분 목록 · 무첨가 태그
- [ ] 성분 설명 본문과 출처 표기

### 5. `[FEAT] 조건 일치 제품 목록`

**작업 내용**

- `/products` (S04) 와 필터 바텀시트 4 종을 만든다
- 무한 스크롤과 정렬을 붙인다

**체크리스트**

- [ ] 필터 칩 4 개와 시트 4 종
- [ ] 시트 안 조건 변경 시 `/api/products/count` debounce 호출
- [ ] 정렬 4 종

### 6. `[FEAT] 탐색 조건 설정 화면`

**작업 내용**

- `/search` (S02 · S03) 와 자동완성을 만든다

**체크리스트**

- [ ] 제품명 · 성분 탭 전환
- [ ] 자동완성 debounce 와 요청 취소
- [ ] 최근 검색 저장과 삭제

### 7. `[FEAT] 저장함 화면`

**작업 내용**

- `/saved` (S07) 를 만든다

**체크리스트**

- [ ] `localStorage` ID 로 `/api/storage` 조회
- [ ] 저장 해제와 빈 상태

### 8. `[FEAT] 카테고리와 브랜드 화면`

**작업 내용**

- `/categories` · `/categories/[categoryId]` (S08 · S09) 를 만든다
- `/brands` · `/brands/[brandId]` (S10 · S11) 를 만든다

**체크리스트**

- [ ] 카테고리·브랜드 탭 전환
- [ ] 브랜드 디렉터리 초성 색인

### 9. `[FEAT] 홈 화면`

**작업 내용**

- `/` (S01) 을 만든다

**체크리스트**

- [ ] 정적 셸과 개인 영역 분리
- [ ] 최근 탐색 조건 · 저장 제품 표시

### 10. `[FEAT] PostHog 이벤트 연동`

**작업 내용**

- `analytics-events.md` 의 이벤트를 연동한다

**체크리스트**

- [ ] 이벤트 타입 정의와 `track()` 래퍼
- [ ] 개발·운영 환경 분리
- [ ] 퍼널 4 단계 조회 확인

## PR

제목은 `타입 : 제목` 형식을 지킨다. `.github/workflows/pr-automation.yml` 이 제목에서 타입 레이블을 읽는다.

| # | 브랜치 | base | 제목 | 이슈 |
| --- | --- | --- | --- | --- |
| 1 | `docs/client-mvp-plan` | `dev` | `docs : 클라이언트 MVP 구현 계획 정리` | — |
| 2 | `feat/client-foundation` | 1 | `feat : 클라이언트 기반 설정` | 1 |
| 3 | `feat/client-filter-state` | 2 | `feat : 탐색 조건 URL 상태와 파생 표시값` | 2 |
| 4 | `feat/client-ui-components` | 3 | `feat : 공통 UI 컴포넌트` | 3 |
| 5 | `feat/client-product-detail` | 4 | `feat : 제품 성분 상세와 성분 설명 화면` | 4 |
| 6 | `feat/client-product-list` | 5 | `feat : 조건 일치 제품 목록` | 5 |
| 7 | `feat/client-search` | 6 | `feat : 탐색 조건 설정 화면` | 6 |
| 8 | `feat/client-saved` | 7 | `feat : 저장함 화면` | 7 |
| 9 | `feat/client-category-brand` | 8 | `feat : 카테고리와 브랜드 화면` | 8 |
| 10 | `feat/client-home` | 9 | `feat : 홈 화면` | 9 |
| 11 | `feat/client-analytics` | 10 | `feat : PostHog 이벤트 연동` | 10 |

### PR 1 본문

```markdown
## 작업 내용

- `client/design/v1.pen` 을 읽고 MVP 화면과 라우트를 정리했습니다.
- 라우트별 렌더링 방식과 그 근거를 적었습니다.
- 기반 설정 · 탐색 조건 상태 · 공통 컴포넌트 · 분석 이벤트를 문서로 나눴습니다.
- `client/docs/exec-plans/` 만 추적하도록 `.gitignore` 를 고쳤습니다.

## 리뷰 포인트

- 라우트 10 개 구성과 화면 대응이 디자인과 맞는지 봐주세요.
- `/search` 를 단일 라우트 + `mode` 쿼리로 둔 판단을 봐주세요.
- 비슷한 제품(S05)은 API 가 없어 보류로 뒀습니다. 방향을 정해주세요.
```

## 참고

- 커밋에 `Co-authored-by` 와 도구 서명을 넣지 않는다 (`CONTRIBUTING.md`)
- 커밋은 타입을 섞지 않고 기능 단위로 나눈다
- 꼬릿말은 `Ref: #7` 또는 `Close: #7` 만 쓴다
