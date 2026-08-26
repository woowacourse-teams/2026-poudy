# Poudy Client Design System

## 1. Atmosphere & Identity

Poudy는 화장품 정보를 빠르게 비교하는 차분한 모바일 도구다. 흰 표면과 옅은 회색 층을 기본으로 두고, 핑크는 현재 선택과 핵심 행동에만 사용한다. 시그니처는 복잡한 성분 정보를 가볍게 읽히게 만드는 절제된 카드와 필터다.

## 2. Color

| Role           | Token                    | Value     | Usage                |
| -------------- | ------------------------ | --------- | -------------------- |
| Background     | `--color-background`     | `#ffffff` | 앱 본문              |
| Surface        | `--color-surface`        | `#f7f7f8` | 카드와 보조 표면     |
| Border         | `--color-border`         | `#e8e9ec` | 구분선과 컨트롤 외곽 |
| Text primary   | `--color-text-primary`   | `#202124` | 제목과 본문          |
| Text secondary | `--color-text-secondary` | `#72747a` | 설명과 보조 정보     |
| Brand          | `--color-brand`          | `#f46a8d` | 현재 선택과 강조     |
| Brand soft     | `--color-brand-soft`     | `#fff0f4` | 선택 배경            |
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

### Shared UI primitives

- `Button`: primary·secondary 변형과 disabled 상태를 가진 전체 너비 행동 버튼
- `BottomSheet`: 필터 내용을 담고 backdrop, focus trap, Escape 닫기를 제공하는 modal surface
- `BottomNavigation`: 네 개의 주요 경로와 현재 경로 상태를 보여 주는 고정 내비게이션

## 6. Motion & Interaction

| Token                                 | Duration | Easing       | Usage                   |
| ------------------------------------- | -------- | ------------ | ----------------------- |
| `--transition-duration-press`         | 100ms    | `--ease-out` | 저장 버튼 눌림 반응     |
| `--transition-duration-control-state` | 160ms    | `--ease-out` | 컨트롤 아이콘·색상 전환 |
| `--transition-duration-disclosure`    | 200ms    | `--ease-out` | 메뉴 열림·닫힘          |

- 움직이는 표면은 모두 `--ease-out`(`cubic-bezier(0.23, 1, 0.32, 1)`)을 쓴다. `--ease-standard`는 끝이 흐리게 끌려 같은 화면에서 어떤 것은 또렷하게 서고 어떤 것은 흐리게 멎었다. 토큰이 아직 없는 환경을 위해 각 선언에 같은 값을 fallback으로 둔다.
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
