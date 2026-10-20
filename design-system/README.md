# @poudy/design-system

디자인 파일 `client/design/poudy-ui.pen`의 명세를 코드로 옮기는 패키지다. 명세를 단일 원천으로 두고, 코드는 이 패키지를 거쳐 명세를 따른다(#722).

## 구성

| 파일                       | 내용                                                                                                                                                 | 고치는 방법                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `tokens.json`              | `.pen` 변수를 가공하지 않고 그대로 옮긴 것                                                                                                           | 아래 절차대로 다시 내보낸다                                                     |
| `src/tokens.css`           | `tokens.json`에서 만든 Tailwind `@theme`                                                                                                             | 손으로 고치지 않는다. `pnpm --filter @poudy/design-system tokens`로 다시 만든다 |
| `src/system.css`           | 변수로 표현하지 않는 명세 값(그림자 모양, 쌓임 순서, 곡선, 거터와 시스템 유틸리티)                                                                   | 주인 보드(SHAPE E06, MOTION M04, LAYOUT L02·L09)를 고친 뒤 함께 고친다          |
| `src/interaction.css`      | 누를 수 있는 자리의 상태 모양(`fb-*`, `press-scale`, 포커스 링, 비활성, 입력칸). `usePressable`이 붙이는 `data-hovered`·`data-pressed`를 보고 칠한다 | 주인 보드(STATE S01~S11)를 고친 뒤 함께 고친다                                  |
| `scripts/build-tokens.mjs` | 변수 이름을 코드 이름으로 옮기는 규칙(MAP G03)                                                                                                       | 새 변수에 규칙이 없으면 생성이 실패한다. 규칙을 먼저 정한다                     |

client는 `app/globals.css`에서 `@import "@poudy/design-system/theme.css";`로 가져온다. `theme.css`는 패키지 소스도 Tailwind가 훑도록 `@source`를 지정하므로, 부품이 쓰는 클래스는 client가 따로 설정하지 않아도 만들어진다.

## 미리보기

부품을 앱 없이 띄워 볼 수 있다. `pnpm --filter @poudy/design-system dev`를 실행하고 `http://localhost:6006`을 연다.

`preview/`의 Vite 서버가 앱처럼 패키지의 `theme.css`만 가져와 그린다. 부품이 쓰는 클래스가 패키지 안에서 만들어지는지도 이 화면에서 함께 확인할 수 있다. 부품을 추가하면 `preview/main.tsx`에 변형과 상태를 늘어놓는다.

## 명세가 바뀌었을 때

1. 주인 보드를 고치고, 보드의 수정 기록에 날짜와 함께 남긴다(MAP G03).
2. `tokens.json`을 다시 내보낸다.
   - `.pen`은 암호화된 파일이라 직접 읽을 수 없다. pen.dev 데스크톱 앱에서 파일을 열고, 앱에 연결된 MCP(`pen-desktop`)의 `execute` 도구로 아래 코드를 실행한다.

     ```js
     const v = GetVariables().variables;
     const out = {};
     for (const k of Object.keys(v).sort()) out[k] = v[k];
     Print(JSON.stringify(out, null, 2));
     ```

   - 출력을 `tokens.json`에 그대로 붙여 넣는다. 파일 끝에는 줄바꿈 하나를 둔다.
3. `pnpm --filter @poudy/design-system tokens`로 `src/tokens.css`를 다시 만든다.
4. 코드 PR을 올리고, PR 본문에 고친 보드 섹션을 적는다(PR 템플릿의 명세 변경 항목은 #724에서 추가한다).

CI(Client CI의 Test 단계)는 `tokens:check`로 `tokens.json`에서 다시 만든 결과가 `src/tokens.css`와 같은지 확인한다. 생성한 CSS를 손으로 고치면 실패한다.

## 이름 규칙

디자인 변수는 MAP G03의 규칙대로 `ui-` 접두사를 떼고 Tailwind 이름으로 옮긴다.

| 디자인 변수                                      | 코드 이름                             | 쓰는 법                                            |
| ------------------------------------------------ | ------------------------------------- | -------------------------------------------------- |
| 색 `ui-{이름}`                                   | `--color-{이름}` (OKLCH)              | `bg-surface`, `text-text-primary`, `border-border` |
| 물방울 `droplet-*`                               | `--color-droplet-*`                   | `text-droplet-moisture-text`                       |
| 브랜드 지정 색 `brand-kakao-*`, `brand-google-*` | `--color-kakao-*`, `--color-google-*` | 로그인 버튼에만 쓴다                               |
| 글자 크기 `ui-text-{px}`                         | `--text-{px}`                         | `text-13`                                          |
| 글자 역할(TYPO T02·T11)                          | `--text-{역할}`과 역할별 행간         | `text-body`, `text-section`                        |
| 행간 `ui-leading-*`                              | `--leading-*`                         | `leading-snug`                                     |
| 반경 `ui-radius-*`                               | `--radius-*`                          | `rounded-xl`(14px)                                 |
| 시간 `ui-motion-*`                               | `--duration-*`                        | `duration-(--duration-fast)`                       |
| 상태 `ui-*-opacity`, `ui-focus-ring-*`           | `--{이름}-opacity`, `--focus-ring-*`  | `opacity-(--pressed-opacity)`                      |

내보내지 않는 변수도 있다. 이유는 `scripts/build-tokens.mjs`의 `SKIPPED`에 함께 적었다.

- 원료 색(`app-*`): 팔레트 보드에서만 쓰고, 코드에는 역할만 내보낸다.
- 간격(`ui-space-*`): Tailwind 기본 숫자 스케일과 1:1이라 `gap-2`처럼 쓴다.
- 관리자 화면(`admin-*`)과 피부 타입 테스트(`skin-test-*`): 이 패키지의 범위가 아니다.

반경과 행간은 Tailwind 기본 이름에 명세 값을 넣는다. 그래서 `rounded-xl`은 Tailwind 기본값인 12px가 아니라 명세 값인 14px다.

## 린트와 예외

`lint/`는 client와 이 패키지의 ESLint가 가져다 쓰는 디자인 토큰 린트다. [`@shadcn/lint`](https://github.com/shadcn-ui/lint)의 규칙 여섯 개를 경고로 켠다.

| 규칙                     | 잡는 것                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `no-arbitrary-values`    | `p-[13px]`, `bg-[#182132]`처럼 직접 적은 값                                        |
| `no-raw-colors`          | `bg-red-50`처럼 토큰이 아닌 Tailwind 색, SVG에 직접 적은 색                        |
| `no-inline-styles`       | `style={{ ... }}`와 `<style>`                                                      |
| `no-unknown-classes`     | Tailwind가 만들 수 없는 클래스                                                     |
| `require-static-classes` | 조건이나 변수로 이어 붙여 만든 클래스 이름                                         |
| `no-restyle`             | 부품의 `className`으로 색·크기·모양을 바꾸는 것. 자리(여백·폭·배치)만 바꿀 수 있다 |

`no-restyle`은 이 패키지의 부품(`@poudy/design-system/...`으로 가져온 것)에만 적용한다. client의 컴포넌트는 아직 디자인 시스템 부품이 아니므로 검사하지 않는다. 경고는 CI를 실패시키지 않는다. 정리를 마친 경로부터 오류로 올린다(#743).

예외는 두 가지다.

- **명세가 허용한 예외:** 명세 보드의 '남겨 둔 예외' 표와 `lint/exceptions.mjs`를 1:1로 맞춘다. 표를 고치면 이 파일도 함께 고친다. 린트는 이 파일의 `allow`를 허용한다.
- **기한이 있는 예외:** 잠시 필요한 예외는 그 줄에서 규칙을 끄고 꼬리표를 단다. CI가 `exceptions:check`로 꼬리표가 없거나 형식이 틀렸거나 만료일이 지난 곳을 찾아 실패시킨다. 오래 필요하면 꼬리표로 버티지 말고 명세의 예외 표에 올린다.

```tsx
{
  /* eslint-disable-next-line shadcn/no-arbitrary-values -- design-exception: 이유 · 만료 YYYY-MM-DD */
}
```

## 입력 검사

무엇이 오류인지는 client의 도메인이 정하고, 오류를 언제 보여 줄지는 입력 부품이 정한다. client는 칸마다 `FieldRule`을 만들어 `rule`로 넘긴다.

```ts
import type { FieldRule } from "@poudy/design-system/field-rule";

// 기본: 칸을 벗어날 때 처음 검사하고, 한 번 오류가 난 칸은 입력할 때마다 다시 검사한다(FEEDBACK F06)
export const productNameRule: FieldRule = { validate: productNameError };

// 입력이 멈춘 뒤 검사한다. 기다리는 시간의 기본값은 300ms다
export const nicknameRule: FieldRule = {
  validate: nicknameError,
  validateOn: "change",
  debounceMs: 500,
};
```

- 어느 쪽이든 손대지 않은 칸에는 오류를 띄우지 않고, 고치면 기다리지 않고 바로 지운다.
- 제출 버튼을 켤지 정할 때도 같은 `validate`를 부른다. 그러면 버튼 판단과 칸의 오류가 어긋나지 않는다.
- 제출 뒤 서버가 돌려준 오류는 `serverError`로 넘긴다. 규칙과 상관없이 바로 보여 준다.

## 컴포넌트 대응표

명세 컴포넌트와 코드 컴포넌트의 대응이다. 각 1단계 이슈가 자기 행의 코드 이름을 확정한다.

| 명세 컴포넌트                                                                                                                              | 코드 컴포넌트 (안)                                                                                                                                                                                                                                                                           | 이슈 |
| ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| BTN · Large Primary · Large Destructive · Primary · Secondary · Destructive · Compact Text (앞·뒤 아이콘, 비활성), BTN · Outline (높이 32) | `Button`                                                                                                                                                                                                                                                                                     | #725 |
| BTN · Icon · Overlay · 썸네일 삭제 · 투명(앱바 오른쪽·큰 제목 내비·시트 머리의 공유·도움말·추가·닫기)                                      | `IconButton` (변형: `overlay`, `thumbnail-remove`, `ghost`)                                                                                                                                                                                                                                  | #725 |
| APP · 입력 · 한 줄 · 여러 줄 · 선택                                                                                                        | `TextField`, `TextArea`, `Select` (검사 규칙은 `FieldRule`)                                                                                                                                                                                                                                  | #726 |
| APP · 검색 입력 (기본·입력 중)                                                                                                             | `SearchField` (입력 칸: 평소·입력 중, 지우기 ✕. 시트용 변형은 따로 두지 않고 폭을 채운다)                                                                                                                                                                                                    | #726 |
| 검색 입력 + 자동완성 목록 (A11Y D04·D06)                                                                                                   | `Combobox` + `ComboboxInput`·`ComboboxList`·`ComboboxGroup`·`ComboboxOption` (상태와 키보드 처리는 `Combobox`가 맡고, 입력과 목록의 자리와 목록 안의 행은 client가 정한다)                                                                                                                   | #726 |
| 하나만 고르기: APP · 라디오 목록 행, 선택 버튼(일반·컴팩트), 선택 카드, 선택 행                                                            | `RadioGroup` + `RadioGroupItem` (모양 변형: `list` 라디오 목록 행, `choice` 선택 버튼(크기 `md` 52·`sm` 44), `card` 선택 카드, `card-row` 선택 행. `choice`·`card`는 `columns`로 한 줄에 둘 개수를 정한다)                                                                                   | #726 |
| 여러 개 고르기: APP · 체크 목록 행, 성분 체크 행                                                                                           | `CheckboxGroup` + `CheckboxGroupItem` (모양은 체크 목록 행 하나. 오른쪽 보조 글자(`description`)와 행 사이 나눔선(`divided`)은 고를 수 있다)                                                                                                                                                 | #726 |
| APP · 라디오, APP · 체크박스 (선택 표시)                                                                                                   | 패키지 안의 `RadioIndicator`, `CheckboxIndicator` (밖으로 내보내지 않고 위 두 부품이 안에서 쓴다)                                                                                                                                                                                            | #726 |
| APP · 범위 슬라이더, 유수분 평가 슬라이더                                                                                                  | `RangeSlider` (슬라이더 부분만. 라벨과 '상관없음' 칩이 있는 머리줄은 화면이 칩 부품으로 조립한다), `Slider`                                                                                                                                                                                  | #726 |
| APP · 필터 칩 (기본·선택)                                                                                                                  | `FilterChip` (누르면 시트를 연다. 값이 적용되면 이름 자리에 값을 쓰고 선택 모양)                                                                                                                                                                                                             | #726 |
| APP · 필터 초기화 버튼                                                                                                                     | `FilterResetChip` (필터 칩 줄 맨 앞. 비울 것이 없으면 disabled 로 막는다)                                                                                                                                                                                                                    | #736 |
| APP · 빠른 필터 (기본·선택), 범위 슬라이더의 '상관없음' 칩                                                                                 | `ToggleChip` (켜고 끄기 `aria-pressed`, 크기 `md` 36 · `sm` 32) + 묶음 `ToggleGroup`                                                                                                                                                                                                         | #726 |
| APP · 선택 성분 칩, 적용 조건 칩, 효과 태그 · 주의 태그 · 기능 태그                                                                        | `Tag` (모양 변형: `item` 고르거나 담은 항목, 선택 성분 칩(`onRemove`를 주면 빼기 ✕), `summary` 걸려 있는 것의 요약, 적용 조건 칩, `label` 항목의 속성, 효과·주의·기능 태그(`tone`). 이름의 '/' 뒤는 '…'로 줄이고 길게 누르면 전체 이름 툴팁)                                                 | #726 |
| APP · AI 요약 배지, 평가 배지 (잘 맞음·안 맞음)                                                                                            | `Badge` (모양 변형: `ai`, `rating`)                                                                                                                                                                                                                                                          | #726 |
| APP · 검색 모드 탭, 카테고리·브랜드 전환                                                                                                   | `TabNav` + `TabNavItem` (다른 화면으로 가는 링크 탭, `aria-current="page"`. 링크는 client의 `Link`를 넘긴다)                                                                                                                                                                                 | #726 |
| CS · 구성품 탭(탭 안의 내용은 client), APP · 디렉터리 레일 항목                                                                            | `Tabs` + `TabList`·`Tab`·`TabPanel`·`TabLabel` (같은 화면의 패널을 바꾸는 탭. 모양 변형 `underline`·`rail`(세로), 배치 `fixed`·`scroll`, 오른쪽 고정 칸 `end`. 주소에 남길 탭은 `asChild`로 `Link`를 넘긴다. 고르지 않은 패널도 미리 그려 둘 때는 `TabPanel`에 `keepMounted`)                | #726 |
| APP · 질문 행 (접힘·펼침), 묶음 머리 행 (펼침·접힘)                                                                                        | `Disclosure` + `DisclosureTrigger`·`DisclosureContent`·`DisclosureIcon`, `DisclosureGroup`(`single`·`multiple`) (동작만 맡는다. 행 모양은 client의 도메인 컴포넌트가 `DisclosureTrigger`에 버튼으로 넘긴다)                                                                                  | #726 |
| APP · 바텀시트                                                                                                                             | `BottomSheet` + `BottomSheetHeader`·`BottomSheetBody`·`BottomSheetFooter` (그릇만 맡는다. 안의 행은 `RadioGroup`, `CheckboxGroup`, `Disclosure`를 그대로 쓴다. 하단 버튼은 `BottomSheetFooter`가 `primary`·`secondary`로 받아 틀이 그린다. 떠 있는 면은 `Portal`로 `#overlay-root`에 그린다) | #727 |
| APP · 확인 시트                                                                                                                            | `ConfirmSheet` (안에서 `BottomSheet`를 쓰고 틀만 고정한다: 제목 + 이유 + 내용 칸 + 취소·실행. 내용 칸은 client가 채운다)                                                                                                                                                                     | #727 |
| APP · 드롭다운                                                                                                                             | `Dropdown` (버튼 아래에 popover 목록을 연다. 앵커 위치로 붙이고, 바깥·Esc로 닫으면 버튼으로 포커스를 돌려준다. 폼 칸에서 시트를 여는 `Select`와 다르다)                                                                                                                                      | #736 |
| APP · 토스트                                                                                                                               | `Toast` (`ToastProvider` 하나와 `useToast().show()`. 4초 동안 하나만 보이고, 행동에 포커스·포인터가 있으면 멈추며 새 것은 하나만 대기. 띄우는 높이는 `--toast-offset`)                                                                                                                       | #728 |
| APP · 안내 줄                                                                                                                              | `Notice` (사용자가 하지 않은 변경이나 이미 적용된 상태. 본문 안에 붙어 ✕로 닫을 때까지 남고, 행동 글자 버튼은 0~2개)                                                                                                                                                                         | #728 |
| 빈 상태, 스켈레톤(S50a), 섹션·화면 오류(S51 계열)                                                                                          | `EmptyState` (제목 → 설명 → 행동, 위에 아이콘이나 그림 하나), `Skeleton`, `ErrorState` (`screen`·`section`), `useDelayedFlag`·`useSlowFlag`                                                                                                                                                  | #728 |
| APP · 목록 더 불러오기 상태 (불러오는 중·마지막·실패), APP · 이전 제품 보기                                                                | `LoadMore` (`next`·`previous`. 다음 장은 스크롤로 자동, 실패 후 재시도와 이전 장은 버튼으로만. 마지막 장에서는 아무것도 보이지 않음. 크롤러용 장 링크는 `href`)                                                                                                                                                                    | #728 |
| APP · 상단 내비 · 하위 · 큰 제목, 탐색 앱바, 하단 내비게이션(5칸), 하단 행동 영역                                                          | `TopBar`(`sub`·`explore`·`large`), `BottomNavigation`(탭 목록은 앱이 `items`로 넘기고, 링크는 `linkAs`), `BottomActionBar`, 골격 `Screen` + `ScreenBody`(`body`·`document`). 버튼은 틀이 그리고 화면은 할 일만 넘긴다                                                                        | #729 |
| 아이콘(Tabler), APP · 사진 첨부 버튼 · 첨부 사진                                                                                           | `Icon` + `IconSprite`(크기는 `IconSize` 단계만, 선 굵기 2. 앱은 `IconSprite`를 한 번 넣는다. 글자 옆 아이콘은 `scalable`로 기기 글자 크기를 따라 키운다), `ImageAttachment`(업로드와 취소·다시 시도는 쓰는 쪽이 넘긴다. 형식은 JPG·PNG·HEIC를 받는다)                                        | #729 |
