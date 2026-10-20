# 성분·성분군 설명 옮기기 계획

- 이슈: [#732 \[FEAT\] 성분·성분군 설명에 디자인 시스템을 적용한다](https://github.com/woowacourse-teams/2026-poudy/issues/732)
- 상위 이슈: #722 (단계 2-2, 옮기기)
- 브랜치: `feat/732-ingredient-ds`
- 명세: `client/design/poudy-ui.pen`의 S25, S25a, S25b, S51h 프레임

성분 설명과 성분군 설명은 #642에서 이미 화면 구성을 바꿨습니다. 이번 작업에서는 구성을 그대로 두고, 직접 쓴 값과 자체 부품을 디자인 시스템의 토큰과 부품으로 바꿉니다. `components/ingredient`에 있는 성분 시트와 성분군 시트(`IngredientSheet`, `IngredientGroupSheet`, `SheetParts`, 명세 S24a·S24b)는 제품 상세에서 여는 화면이라 #731이 옮깁니다. 이 작업에서는 그 세 파일을 옮기지 않고, 시트도 함께 쓰는 `EffectTag`, `CautionStatusIcon`, `AiSummaryBadge`만 토큰으로 바꿉니다. 시트 두 파일(`SheetParts`, `IngredientGroupSheet`)에는 영문명을 같은 규칙으로 쓰도록 `formatEnglishName` 한 줄씩만 더했습니다.

## 명세 프레임

| 프레임 id | 화면                                         | 비고                                                                                                                               |
| --------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `IPV5H`   | S25 성분 설명 `/ingredients/[ingredientId]`  | 이름 20/700 · 영문명 13 muted · 효과 태그 · 역할 설명 · 포함 제품 버튼                                                             |
| `pLM7A`   | S25b 성분 설명 · 참고자료 펼침               | 참고자료 머리 44, 항목은 자료명 13/500과 반영 위치 12                                                                              |
| `P50wdZ`  | S25a 성분군 설명 `/ingredient-groups/[code]` | 포함 성분 머리 옆에 개수(16/600 secondary), 성분은 2열 타일(surface · 반경 12 · 안쪽 12 · 사이 8, 한글명 13/600 · 영문명 12 muted) |
| `OVnvA`   | S51h 없는 성분                               | 상단 내비는 남기고 본문 가운데에 아이콘(flask-conical 28) · 제목 · 설명 · [성분 검색하기]                                          |
| `ZdlT8`   | APP · 상단 내비 · 하위                       | 뒤로가기 · 가운데 제목 17/700 · 오른쪽 공유                                                                                        |
| `wAQQY`   | APP · 효과 태그                              | 높이 24, 아이콘 14, 글자 11/700                                                                                                    |
| `G7AYpI`  | APP · AI 요약 배지                           | `Badge`의 `ai` 변형. 명세의 아이콘은 선 그림이지만 요청에 따라 채운 sparkles로 그린다                                              |
| `zW0iS`   | BTN · Primary · 뒤 아이콘                    | 높이 48, 글자 14/600, 꺾쇠 16                                                                                                      |
| `qRcfV`   | APP · 참고자료 항목                          | 위아래 12, 줄 사이 4                                                                                                               |

명세의 S25에는 `함께 살펴볼 성분`과 `판테놀이 든 인기 제품` 섹션이 있고, S25a에는 성분군의 효과 태그가 있습니다. 지금 API(`IngredientDetailResponse`, `IngredientGroupResponse`)는 이 데이터를 주지 않으므로 이번 작업에서는 그리지 않습니다. 참고자료 항목의 저자·연도 줄도 응답에 없어 자료명과 반영 위치만 보여 줍니다.

## 요구사항

### 성분 설명(S25, S25b)

| 상태     | 동작                                                                                                                                                                                                                                          |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 기본     | 이름, 영문명, 피부 작용 태그, `무슨 역할을 하나요?`와 AI 요약 배지, 설명, 배합 목적 태그, [○○ 포함 제품 N개 모두 보기], 참고자료를 차례로 보여 줍니다.                                                                                        |
| 긴 이름  | 이름과 영문명은 각각 두 줄까지 보이고, 넘치면 [전체 이름 보기]로 펼칩니다.                                                                                                                                                                    |
| 참고자료 | 처음에는 `참고자료 N건 · YYYY.MM.DD 업데이트`만 보이고, 누르면 그 자리에서 목록을 펼칩니다. 자료가 없으면 영역을 두지 않습니다. 날짜는 `formatDate`로 씁니다.                                                                                 |
| 로딩     | 하루에 한 번 다시 만드는 정적 페이지라 따로 로딩 화면을 두지 않습니다.                                                                                                                                                                        |
| 없음     | 없는 성분이면 경로 옆 `not-found.tsx`가 S51h를 그립니다. 디자인 시스템 `Icon`의 `flask-conical`(28), 제목 `찾을 수 없는 성분이에요`, 설명 `정리 중이거나 주소가 바뀐 성분이에요. / 성분 이름으로 다시 찾아보세요.`, [성분 검색하기]를 둡니다. |
| 오류     | 서버 오류는 앱 공통 오류 경계(`app/error.tsx`)가 맡습니다.                                                                                                                                                                                    |

### 성분군 설명(S25a)

| 상태      | 동작                                                                                                                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 기본      | 이름, 영문명, 역할 설명, [○○ 성분군 포함 제품 보기], `이 성분군에 포함된 성분 N종`을 2열 타일로 보여 줍니다(2026-10-21 명세, S24a 시트와 같은 타일). 타일을 누르면 그 성분 설명으로 갑니다. |
| 빈 목록   | 포함된 성분이 없으면 목록 섹션을 두지 않습니다.                                                                                                                                             |
| 없음·오류 | 없는 성분군은 앱 공통 `not-found.tsx`가, 서버 오류는 `app/error.tsx`가 맡습니다. 성분군의 없음 화면은 명세에 없어 따로 만들지 않습니다.                                                     |

### 공통 동작

- 상단 내비는 다른 하위 화면과 같은 `SubTopBar`에 공유 행동을 더한 `IngredientTopBar`입니다. 뒤로가기는 `useSubScreenBack`이 맡아, 방문 기록이 있으면 뒤로 가고 없으면 `홈으로` 링크가 그 자리에 섭니다. 오른쪽 공유 버튼의 이름은 `{이름} 공유`입니다.
- 영문명은 한 성분에 이름이 여럿이면 API가 쉼표로만 이어 줍니다. `formatEnglishName`으로 쉼표 뒤를 한 칸 띄우고, `1,2-Hexanediol`처럼 숫자 사이의 쉼표는 그대로 둡니다. 성분 설명·성분군 설명·성분군의 성분 목록·성분 검색 결과·제품 상세의 성분 시트·LLM용 마크다운(`lib/seo/markdown.ts`)이 모두 이 함수를 써서 같은 규칙을 따릅니다.
- AI 요약 배지의 아이콘은 채운 sparkles(Tabler sparkles-2 filled)입니다.
- 공유가 주소 복사로 끝나면 `Toast`로 `주소를 복사했어요`를 띄웁니다. 앱(WebView)과 Web Share API에서는 띄우지 않습니다.
- 누를 수 있는 곳은 `usePressable`과 `fb-*`로 hover와 눌림을 그립니다. 포함 제품 버튼은 `fb-dim`과 `press-scale`, 성분 타일은 회색 면 위라 `fb-border`, 참고자료 머리는 `fb-surface`입니다.
- 참고자료 펼침은 `Disclosure`입니다. 펼치면 꺾쇠가 150ms 동안 180° 돌고, 목록은 높이를 바로 바꾼 채 4 위에서 내려오며 나타납니다. 접으면 바로 숨습니다(MOTION 펼치기·접기).

### 접근성과 반응형

- 본문의 성분 이름이 진짜 제목이라 상단 내비 제목은 `p`로 내리고 성분 이름을 `h1`로 둡니다.
- 아이콘은 보조 기술에서 감추고, 뜻은 옆 글자와 버튼 이름이 전합니다. 피부 작용과 배합 목적 목록에는 `aria-label`을 붙입니다.
- 참고자료 머리는 `aria-expanded`와 `aria-controls`를 가집니다. 접힌 목록은 `hidden`으로 감추지만 첫 HTML에는 남아 검색 로봇이 읽습니다.
- 320·360·390 폭에서 가로로 넘치지 않아야 하고, 글자를 200%로 키워도 잘리는 곳이 없어야 합니다. 포함 제품 버튼은 글자가 길어지면 이름만 줄이고 뒤 문구는 다음 줄로 넘깁니다. 성분군 설명의 버튼도 같습니다. 성분 타일은 글자를 키워 두 칸에 이름이 들지 않으면 한 줄에 하나씩 놓고, 긴 이름은 칸 안에서 줄을 바꿉니다.

## 라우팅

| 경로                                 | 화면      | 파일                                           |
| ------------------------------------ | --------- | ---------------------------------------------- |
| `/ingredients/[ingredientId]`        | S25, S25b | `app/ingredients/[ingredientId]/page.tsx`      |
| `/ingredients/[ingredientId]` (없음) | S51h      | `app/ingredients/[ingredientId]/not-found.tsx` |
| `/ingredient-groups/[groupCode]`     | S25a      | `app/ingredient-groups/[groupCode]/page.tsx`   |

두 화면은 `revalidate = 86400`으로 미리 만들어 두고, 서버에서 `searchParams`를 읽지 않습니다. 유입 경로 `from`은 브라우저의 `TrackIngredientView`·`TrackIngredientGroupView`가 읽습니다.

## 부품 교체

| 옛 부품                                                 | 디자인 시스템 부품                                                                       |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `components/ui/TopBar`(`sub`) + `ShareButton`           | `SubTopBar`(`action`에 공유 아이콘, `IngredientTopBar`) + `Toast`                        |
| `components/ui/Badge`(`effect`, `ai`, `role`, `count`)  | `Tag`(`label`, `neutral`), `Badge`(`ai`), 배합 목적 태그는 토큰으로 그린 client 컴포넌트 |
| `components/ui/icons/Icon`                              | `Icon`                                                                                   |
| `press.ts`의 `PRESS_SCALE`·`PRESS_SURFACE`·`PRESS_TEXT` | `usePressable` + `fb-dim`·`fb-surface`·`fb-border` + `press-scale`                       |
| `IngredientReferences`의 높이 전환 펼침                 | `Disclosure` + `DisclosureTrigger`·`DisclosureContent`·`DisclosureIcon`                  |
| 전역 `not-found.tsx`                                    | 경로별 `not-found.tsx` + `ErrorState`(`screen`)                                          |

`EffectIcon`과 `CautionStatusIcon`은 제품 상세와 피부 필터도 쓰므로 자리는 그대로 두고 인라인 스타일과 직접 쓴 색만 토큰으로 바꿉니다. 옛 `TopBar`, `ShareButton`, `Badge`, `BottomSheet`는 다른 화면이 아직 쓰므로 지우지 않습니다(#743). `AiSummaryBadge`는 옛 시트 머리가 아직 부르므로 `Badge`(`ai`)를 감싸는 얇은 컴포넌트로 남기고, #731이 시트를 옮긴 뒤 지웁니다. 대상 경로는 `eslint.config.mjs`의 `tokenStrictFiles`에 넣어 디자인 토큰 린트를 오류로 올립니다. `components/ingredient`는 #731의 시트 세 파일을 빼고 파일 이름으로 고릅니다.

## PostHog 이벤트

지금 화면이 보내는 이벤트입니다. 이번 작업에서 새로 만들거나 이름·속성을 바꾸는 이벤트는 없습니다.

| 이벤트                        | 보내는 때                                                   | 속성                                                                               |
| ----------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `page_viewed`                 | 두 화면에 들어올 때(`AnalyticsProvider`)                    | `page: "ingredient_detail"` 또는 `page: "ingredient_group_detail"`                 |
| `ingredient_viewed`           | 성분 설명을 열 때(`TrackIngredientView`)                    | `ingredient_id`, `entry_point`(`from` 쿼리. 없거나 모르는 값이면 `product_detail`) |
| `ingredient_group_viewed`     | 성분군 설명을 열 때(`TrackIngredientGroupView`)             | `group_code`, `entry_point`(`from` 쿼리. 없거나 모르는 값이면 `direct`)            |
| `detail_active_time_recorded` | 30초마다, 탭이 가려지거나 화면을 옮길 때(`TrackActiveTime`) | `page_type`, `entity_id` 또는 `entity_code`, 활성 시간과 스크롤 깊이               |

성분군 설명의 성분 타일은 `from=ingredient_group_detail`을 붙입니다. 시트 열기·닫기 이벤트(`ingredient_sheet_opened`·`ingredient_sheet_closed`)는 제품 상세(#731) 몫입니다. 선반 성분 칩에서 들어오는 `from=shelf`는 #738이 더합니다. 공유 버튼과 포함 제품 버튼은 지금처럼 이벤트를 보내지 않습니다.
