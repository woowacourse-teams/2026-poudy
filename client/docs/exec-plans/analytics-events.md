# PostHog 이벤트 정의와 관리

> 상위 문서: [MVP 화면 구현 계획](./mvp-screen-plan.md)
> 배경 문서(로컬): `experiment-analytics-guide.md` · `posthog-nextjs-integration-guide.md`

## Goal

이벤트 이름과 속성을 화면 구현 **전에** 확정한다. 나중에 붙이면 이벤트를 다시 심어야 하고, 그 전에 쌓인 데이터는 쓸 수 없다.

이름 규칙과 초기 이벤트 후보는 `experiment-analytics-guide.md` 5 장에 있다. 이 문서는 그것을 실제 화면과 대표 지표에 연결하고, 코드에서 어떻게 관리할지를 정한다.

## Decisions

### 대표 지표에서 이벤트를 역산한다

`mvp-roadmap.md` 의 대표 지표는 **유효 탐색 완료율**이고 목표는 25% 다.

```
제품 목록 방문 → 필터 또는 정렬 사용 → 제품 상세 확인 → 최소 1개 저장
```

퍼널이 4 단계이므로 각 단계에 대응하는 이벤트가 최소 집합이다. 이벤트를 늘리기 전에 이 4 개가 정확한지부터 맞춘다.

| 퍼널 단계 | 이벤트 | 화면 |
| --- | --- | --- |
| 목록 방문 | `page_viewed` (`page: product_list`) | S04 |
| 필터·정렬 사용 | `filter_applied` · `sort_applied` | S04 · 바텀시트 |
| 상세 확인 | `product_viewed` | S05 |
| 저장 | `product_saved` | 어디서나 |

보조 지표(필터 사용률 40% · 저장률 15% · 재방문 20%)도 같은 이벤트에서 계산된다.

### MVP 이벤트 목록

가이드의 후보 중 MVP 범위에 해당하는 것만 남기고, 화면에 맞춰 속성을 정했다.

| 이벤트 | 기록 시점 | 속성 |
| --- | --- | --- |
| `page_viewed` | 라우트가 표시될 때 | `page`, `surface` |
| `search_used` | 검색 실행 | `mode`(product·ingredient), `query_length`, `result_count` |
| `search_suggestion_selected` | 자동완성 항목 선택 | `mode`, `position` |
| `filter_applied` | 시트에서 조건 커밋 | `filter_type`, `filter_value_count`, `result_count` |
| `filter_reset` | 조건 초기화 | `filter_type` |
| `sort_applied` | 정렬 변경 | `sort` |
| `product_viewed` | 제품 상세 표시 | `product_id`, `category` |
| `product_saved` · `product_unsaved` | 저장·해제 | `product_id`, `save_source` |
| `ingredient_viewed` | 성분 설명 표시 | `ingredient_id`, `entry_point` |
| `error_occurred` | 사용자가 보는 오류 | `error_code`, `surface` |

**MVP 에서 제외**: `product_compared` · `review_started` · `review_submitted` (해당 기능 없음), `experiment_exposed` (A/B 테스트를 아직 하지 않음. 실험을 시작할 때 추가한다)

### 속성 값 규칙

- `page`: 라우트 기준 `home` · `search` · `product_list` · `product_detail` · `ingredient_detail` · `saved` · `category` · `brand`
- `filter_type`: `ingredient` · `category` · `brand` · `moisture_oil` · `quick_filter`
- `save_source`: 저장 버튼이 여러 화면에 있으므로 어디서 눌렀는지 남긴다. `product_list` · `product_detail` · `home` · `saved`
- `entry_point`(성분 설명): `product_detail` · `search` · `ingredient_filter`

`query_length` 는 검색어 자체가 아니라 **길이만** 보낸다. 검색어에 개인정보가 들어갈 수 있고, 가이드도 개인정보를 속성으로 보내지 말라고 정하고 있다.

### 코드에서의 관리

**이벤트 이름과 속성을 타입으로 고정한다.** 문자열을 호출부에 흩어 두면 오타가 조용히 통과하고, 나중에 이름을 바꿀 때 추적이 안 된다.

```
lib/analytics/
  events.ts     이벤트 이름과 속성 타입 정의
  track.ts      capture 래퍼. 타입에 맞지 않으면 컴파일 실패
```

- 화면 코드는 `track()` 만 호출하고 PostHog SDK 를 직접 부르지 않는다. 도구를 바꿀 때 한 곳만 고친다.
- `page_viewed` 는 App Router 에서 자동 추적이 라우트 변경을 놓치는 경우가 있다. 수동 추적으로 통일할지 확인이 필요하다(`posthog-nextjs-integration-guide.md` 참고).
- autocapture 는 끄고 정의한 이벤트만 보낸다. 자동 수집은 이름이 제각각이라 퍼널을 만들기 어렵다.

### 환경 분리

개발 환경의 이벤트가 운영 지표에 섞이면 지표를 믿을 수 없다. `client-requirements.md` 의 환경 분리 과제와도 연결된다.

- 프로젝트를 개발용과 운영용으로 나누거나, 최소한 `environment` 속성으로 구분한다
- 로컬 개발에서는 기본적으로 전송하지 않는다

### 도입 시점

이 문서의 이름 확정은 화면 작업 전에 끝낸다. **SDK 연동과 실제 호출은 화면 PR 과 함께** 넣는다. 화면이 없는 상태에서 연동만 먼저 하면 검증할 대상이 없다.

## Work

- [ ] 이벤트 이름과 속성 타입 정의(`lib/analytics/events.ts`)
- [ ] `track()` 래퍼와 PostHog 초기화
- [ ] autocapture 비활성 · 수동 `page_viewed` 결정
- [ ] 개발·운영 환경 분리
- [ ] 화면 PR 마다 해당 이벤트 호출 추가
- [ ] 퍼널 4 단계가 PostHog 에서 조회되는지 확인

## 열린 결정

- **PostHog Cloud 대 self-host**: 가이드는 Cloud 를 우선 검토한다고 적고 있다. 비용과 데이터 보관 정책을 확인한다.
- **세션 리플레이 사용 여부**: 초기 사용성 관찰에 유용하지만 개인정보 마스킹 설정이 필요하다.
- **오류 추적을 PostHog 로 할지 Sentry 를 추가할지**: `nextjs-follow-up-decisions.md` 는 초기에 PostHog Error Tracking 을 검토하고 규모가 커지면 Sentry 를 추가한다고 정리했다.
