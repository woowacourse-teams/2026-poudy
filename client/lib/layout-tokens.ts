/**
 * 페이지 거터와 본문 최대 폭(명세 LAYOUT L02). 값의 주인은 명세이고, CSS 의 --gutter 는
 * 디자인 시스템 패키지의 system.css 에 있다.
 *
 * 이미지 sizes 처럼 CSS 변수를 쓸 수 없는 곳에서만 이 상수를 쓴다. 두 값이 같은지는
 * layout-tokens.test.ts 가 확인한다.
 */
export const GUTTER_NARROW = 12;
export const GUTTER = 16;
/** 이 폭부터 거터가 GUTTER_NARROW 에서 GUTTER 로 넓어진다. */
export const GUTTER_BREAKPOINT = 360;
export const CONTENT_MAX = 480;

/**
 * 지금 본문(body)의 최대 폭. app/globals.css 가 `--container-md`(28rem = 448px)로 묶는다.
 * 명세의 CONTENT_MAX(480)로 옮기기 전까지 이미지 sizes 는 실제로 그려지는 이 폭을 쓴다(명세 IMAGE P05).
 */
export const FRAME_MAX = 448;

/** 홈 인기 제품과 큐레이션의 제품 격자. 좌우 여백은 px-4(GUTTER), 열 사이는 gap-x-2.5(10px)다. */
const HOME_GRID_COLUMNS = 3;
const HOME_GRID_GAP = 10;
const HOME_GRID_SPACE = GUTTER * 2 + HOME_GRID_GAP * (HOME_GRID_COLUMNS - 1);

/** 홈 제품 카드의 사진이 가장 넓을 때의 한 변(본문 최대 폭에서). */
export const HOME_CARD_MAX = (FRAME_MAX - HOME_GRID_SPACE) / HOME_GRID_COLUMNS;

/**
 * 홈 제품 카드 사진의 sizes(명세 IMAGE P05·P06). 사진이 카드 폭을 채우므로 칸의 폭이 화면 폭을 따라 변한다.
 * sizes 는 HTML 속성이라 var(--gutter) 를 쓰지 못해 상수로 숫자 문자열을 만든다.
 */
export const HOME_CARD_SIZES = [
  `(min-width: ${FRAME_MAX}px) ${HOME_CARD_MAX}px`,
  `calc((100vw - ${HOME_GRID_SPACE}px) / ${HOME_GRID_COLUMNS})`,
].join(", ");
