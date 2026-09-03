# Poudy Client Design System

## 1. Atmosphere & Identity

Poudy는 화장품 정보를 빠르게 비교하는 차분한 모바일 도구다. 흰 표면과 옅은 회색 층을 기본으로 두고, 핑크는 현재 선택과 핵심 행동에만 사용한다. 시그니처는 복잡한 성분 정보를 가볍게 읽히게 만드는 절제된 카드와 필터다.

## 2. Color

| Role           | Token                    | Value     | Usage                |
| -------------- | ------------------------ | --------- | -------------------- |
| Background     | `--color-background`     | `#ffffff` | 앱 본문              |
| Surface        | `--color-surface`        | `#f7f7f8` | 카드와 보조 표면     |
| Surface subtle | `--color-surface-subtle` | `#fafafb` | 꼬리말과 출처 안내   |
| Border         | `--color-border`         | `#e8e9ec` | 구분선과 컨트롤 외곽 |
| Text primary   | `--color-text-primary`   | `#202124` | 제목과 본문          |
| Text secondary | `--color-text-secondary` | `#72747a` | 설명과 보조 정보     |
| Brand          | `--color-brand`          | `#f46a8d` | 현재 선택과 강조     |
| Brand soft     | `--color-brand-soft`     | `#fff0f4` | 브랜드 색 알림 배경  |
| Action         | `--color-action`         | `#202124` | 주요 버튼            |
| Action text    | `--color-action-text`    | `#ffffff` | 주요 버튼 글자       |
| Info           | `--color-info`           | `#38a6dd` | 정보 상태            |
| Success        | `--color-success`        | `#17a47a` | 성공 상태            |

새 색은 `app/globals.css`의 `@theme`와 이 표에 먼저 역할을 정의한 뒤 사용한다.

## 3. Typography

- 본문: Noto Sans KR, `--font-sans`
- 데이터: Geist Mono, `--font-data`
- 브랜드 이름: Foldit, `--font-brand`
- 현재 화면은 11, 12, 14, 15, 18px 단계와 400, 500, 600, 700 굵기를 사용한다.
- 본문 정보는 14px 아래로 내리지 않고, 11~12px는 내비게이션·컨트롤 라벨에만 쓴다.

## 4. Spacing & Layout

- 기본 단위는 4px다. 간격과 패딩은 가능한 한 4px 배수를 사용한다.
- 모바일 본문은 `--container-md`를 최댓값으로 삼고 넓은 화면에서 가운데 정렬한다.
- 주요 화면은 한 열 흐름을 유지하며, 375px에서 가로 스크롤 없이 읽혀야 한다.

## 5. Components

### SortDropdown

- **Structure**: listbox 트리거, 항상 마운트된 옵션 목록, 단일 선택 옵션 4개
- **States**: 닫힘, 열림, hover, 선택됨, 키보드 포커스
- **Accessibility**: 트리거의 `aria-expanded`·`aria-controls`, 목록의 `aria-hidden`·`inert`, 옵션의 `aria-selected`, Escape와 바깥 클릭 닫기, `--color-action`을 쓰는 3:1 이상 키보드 포커스 표시
- **Motion**: 목록은 트리거 쪽인 아래에서 4px 자라 나오며 opacity와 scale만 전환하고, 화살표는 180도 회전한다. fine pointer hover는 진입과 이탈 모두 `--transition-duration-control-state` 동안 표면색을 바꾼다. 눌림에는 크기를 줄이지 않는다. 고르면 배경색이 크게 바뀌어 눌린 것이 이미 보이고, 필터 칩도 같은 이유로 색만 쓴다. 실제 값이 바뀌는 옵션 선택에는 선택 햅틱을 함께 쓴다.
- **Layout**: 트리거 오른쪽 아래에 붙는 절대 위치 popover. 필터 selector와 같은 조밀한 인상을 유지하도록 메뉴는 156px 폭, 옵션은 36px 높이·12px 글자를 사용한다. 메뉴에는 위아래 여백을 두지 않는다. 여백이 있으면 hover 배경이 옵션에만 깔리고 그 바깥으로 흰 띠가 남는다. 대신 넘치는 부분을 잘라 첫 옵션과 마지막 옵션이 둥근 모서리를 넘지 않게 한다.

### ProductDetailHeader

- **Structure**: `TopBar variant="sub"` 와 가로 축약형을 한 덩어리로 묶어 화면 위에 붙이는 머리. 축약형은 40px 썸네일, 브랜드·제품명 한 줄, 가장 싼 용량의 가격, 유수분 태그, 저장 버튼으로 이뤄진다.
- **States**: 떨어짐(원래 배치가 화면에 있음), 붙음(원래 배치가 머리 아래를 지나감)
- **Accessibility**: 뒤로가기는 두 상태 모두에서 화면에 남는다. 떨어져 있는 축약형은 `inert` 로 초점과 손을 함께 막아 저장 버튼이 둘로 읽히지 않게 한다. 제품명은 한 줄로 줄이되 저장 버튼의 접근 가능한 이름에는 전체 이름을 쓴다.
- **Motion**: 축약형은 머리 밑에서 8px 미끄러져 내려오며 짙어진다(`--transition-duration-disclosure`). `prefers-reduced-motion: reduce` 에서는 제자리에서 짙어지기만 한다. 머리 높이는 두 상태에서 같다. 높이를 늘렸다 줄이면 아래 본문이 그만큼 튄다.
- **Layout**: `fixed` 가 아니라 `sticky` 로 붙인다. 본문이 `--container-md` 로 가운데 놓인 카드라 `fixed` 는 폭이 화면 전체로 벌어진다. 축약형은 머리 아래에 겹쳐 두고 본문이 그 밑으로 지나간다. `z-30` 이라 바텀시트의 딤(`z-40`)과 시트(`z-50`) 아래에 온다.

### Shared UI primitives

- `Button`: primary·secondary 변형과 disabled 상태를 가진 전체 너비 행동 버튼
- `BottomSheet`: 필터 내용을 담고 backdrop, focus trap, Escape 닫기를 제공하는 modal surface
- `BottomNavigation`: 네 개의 주요 경로와 현재 경로 상태를 보여 주는 고정 내비게이션

### BottomNavigation

- **Structure**: 네 개의 경로 링크로 구성하고, 각 링크는 아이콘과 라벨을 세로로 쌓는다. 링크마다 뒤에 상호작용 배경을 하나씩 깔아 둔다.
- **States**: 기본, hover, 눌림, 선택됨, 키보드 포커스 상태를 제공한다.
- **Selected**: 선택된 탭은 배경을 깔지 않고 `--color-brand` 색상과 채워진 아이콘, 굵은 라벨로 구분한다. 색 하나에만 기대지 않아야 색각 이상이 있어도 아이콘과 굵기로 읽힌다.
- **Interaction background**: hover 와 눌림에서만 `--color-surface` 회색 배경이 `--transition-duration-control-state` 동안 나타난다. 선택 여부와 상관없이 네 탭이 똑같이 반응한다. 선택된 탭만 커서에 반응하지 않으면 오히려 어색하다. hover 는 `hover: hover` 와 `pointer: fine` 을 함께 만족하는 환경에만 적용해서, 손가락으로 누른 자리에 배경이 남지 않도록 한다. 터치 기기에서는 누름 배경만 나타난다. 배경은 링크의 형제 요소라서 `:has()` 로 부모에서 `:active` 를 받아 켠다.
- **Motion**: 링크를 누르면 전체 항목이 100ms 동안 `scale(0.97)`로 줄어든다. 손을 떼면 200ms 동안 `1.008 → 0.998 → 1` 순서로 한 번만 작게 울렁이며 돌아온다. 선택된 자리를 따라 배경이 이동하는 연출은 쓰지 않는다.
- **Icon motion**: 비활성 탭을 선택하면 아이콘 전체에 색이 즉시 채워지고 `0deg → -8deg → 6deg → 0deg`로 한 번만 흔들린다. 아이콘을 여러 조각으로 복제하거나 순차적으로 합치는 효과는 사용하지 않는다.
- **Accessibility**: 실제 경로와 일치하는 링크에만 `aria-current="page"`를 적용한다. 경로가 도착하기 전에도 선택 표시를 먼저 옮겨 반응을 보여 주되 접근성 상태를 미리 바꾸지 않는다. 경로가 실제로 바뀌면 앞당겨 둔 표시를 버린다. 눌렀던 경로로 되돌아올 때 지나간 선택이 되살아나기 때문이다. `prefers-reduced-motion: reduce`에서는 크기 변화와 흔들림을 제거하고 색상과 opacity 전환만 유지한다.

## 6. Motion & Interaction

| Token                                 | Duration | Easing       | Usage                   |
| ------------------------------------- | -------- | ------------ | ----------------------- |
| `--transition-duration-press`         | 100ms    | `--ease-out` | 저장 버튼 눌림 반응     |
| `--transition-duration-release`       | 200ms    | 감쇠 반동    | 하단 메뉴 손 뗌 반응    |
| `--transition-duration-control-state` | 160ms    | `--ease-out` | 컨트롤 아이콘·색상 전환 |
| `--transition-duration-disclosure`    | 200ms    | `--ease-out` | 메뉴 열림·닫힘          |
| `--transition-duration-celebration`   | 520ms    | `--ease-out` | 저장 불꽃               |

- 저장 불꽃만 300ms 를 넘는다. 담기는 순간에만 터지는 드문 축하라 예산을 따로 쓴다. 나머지 전환은 모두 300ms 안에 든다.
- 움직이는 표면은 기본적으로 `--ease-out`(`cubic-bezier(0.23, 1, 0.32, 1)`)을 쓴다. 하단 메뉴에서 손을 뗄 때만 `--ease-release`로 한 번의 약한 감쇠 반동을 만든다. `--ease-standard`는 끝이 흐리게 끌려 같은 화면에서 어떤 것은 또렷하게 서고 어떤 것은 흐리게 멎었다. 토큰이 아직 없는 환경을 위해 각 선언에 같은 값을 fallback으로 둔다.
- hover는 진입과 이탈의 시간을 같게 둔다. 한쪽만 즉시 바뀌면 커서로 훑을 때 색이 튀어 들어왔다 흐르게 빠져 잔상처럼 보인다.
- 메뉴가 열리고 닫히는 공간 모션은 transform과 opacity만 애니메이션하고, 컨트롤의 상태 색상은 레이아웃에 영향을 주지 않는 color 전환만 사용한다.
- 공간 이동은 즉시 다시 열거나 닫아도 현재 상태에서 새 상태로 이어져야 한다.
- `prefers-reduced-motion: reduce`에서는 자리를 옮기는 움직임만 걷어내고 색이 바뀌는 전환은 남긴다. 아주 없애면 열리고 닫히는 것이 읽히지 않는다.
- 선택 햅틱은 실제 값이 바뀔 때 네이티브 WebView 브리지로만 요청한다. 브리지가 없는 일반 브라우저에서는 아무 작업도 하지 않는다.

## 7. Depth & Surface

기본 전략은 옅은 tonal shift와 border이며, 떠 있는 메뉴와 앱 프레임에만 shadow를 사용한다. 드롭다운은 흰 배경, `--color-border`, 기존 `shadow-lg`로 주변 목록과 분리한다.

## 8. Accessibility Constraints & Accepted Debt

- 목표는 WCAG 2.2 AA다.
- 모든 조작 요소는 키보드로 도달 가능하고 명확한 focus-visible 표시가 있어야 한다.
- 모션 감소 설정, Escape 닫기, 바깥 클릭 닫기, 햅틱 미지원 환경을 기능 손실 없이 지원한다.

| Item                                            | Location      | Why accepted                                                      | Owner / Exit                   |
| ----------------------------------------------- | ------------- | ----------------------------------------------------------------- | ------------------------------ |
| 기존 UI의 일부 raw color와 arbitrary type scale | `components/` | 현재 디자인 파일을 직접 옮긴 기존 값이며 이번 이슈 범위를 넘는다. | 디자인 토큰 정리 이슈에서 통합 |
