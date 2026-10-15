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
