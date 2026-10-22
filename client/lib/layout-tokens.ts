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

/**
 * 홈 제품 카드 격자(명세 A11Y D08 · IMAGE P06). 열 사이는 8 이고, 거터가 12 로 좁아지는 360 미만에서는 2열이다.
 * 격자는 components/product/ProductGridCard 의 `ProductGrid` 가 같은 값으로 그린다.
 */
const HOME_GRID_GAP = 8;
const HOME_GRID_NARROW_SPACE = GUTTER_NARROW * 2 + HOME_GRID_GAP;
const HOME_GRID_SPACE = GUTTER * 2 + HOME_GRID_GAP * 2;

/**
 * 홈 제품 카드에서 사진이 차지하는 폭의 비율. 사진 칸은 카드 폭의 정사각 그대로이고, 사진만 그 70% 로 가운데에 둔다(10/22 결정).
 * ProductGridCard 의 `w-7/10` 과 같은 값이다.
 */
export const HOME_CARD_IMAGE_RATIO = 0.7;

/** 홈 제품 카드의 사진이 가장 넓을 때의 한 변(본문 최대 폭에서). 소수점은 올려 작은 원본을 고르지 않게 한다. */
export const HOME_CARD_MAX = Math.ceil(((FRAME_MAX - HOME_GRID_SPACE) / 3) * HOME_CARD_IMAGE_RATIO);

/**
 * 홈 제품 카드 사진의 sizes(명세 IMAGE P05·P06). 사진은 칸 폭의 70% 이고, 칸의 폭이 화면 폭을 따라 변한다.
 * sizes 는 HTML 속성이라 var(--gutter) 를 쓰지 못해 상수로 숫자 문자열을 만든다.
 */
export const HOME_CARD_SIZES = [
  `(max-width: ${GUTTER_BREAKPOINT - 1}px) calc((100vw - ${HOME_GRID_NARROW_SPACE}px) * ${HOME_CARD_IMAGE_RATIO} / 2)`,
  `(min-width: ${FRAME_MAX}px) ${HOME_CARD_MAX}px`,
  `calc((100vw - ${HOME_GRID_SPACE}px) * ${HOME_CARD_IMAGE_RATIO} / 3)`,
].join(", ");

/** 거터 안쪽 폭을 채우는 그림(다른 큐레이션 카드)의 sizes. */
export const GUTTERED_FULL_SIZES = [
  `(max-width: ${GUTTER_BREAKPOINT - 1}px) calc(100vw - ${GUTTER_NARROW * 2}px)`,
  `(min-width: ${FRAME_MAX}px) ${FRAME_MAX - GUTTER * 2}px`,
  `calc(100vw - ${GUTTER * 2}px)`,
].join(", ");

/** 본문 폭을 꽉 채우는 그림(큐레이션 이미지 블록)의 sizes. */
export const FRAME_FULL_SIZES = `(min-width: ${FRAME_MAX}px) ${FRAME_MAX}px, 100vw`;
