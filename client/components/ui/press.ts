/**
 * 누를 수 있는 자리의 누름·hover 표시. 같은 종류의 자리는 화면이 달라도 같은 규칙으로 반응한다.
 *
 * 누르는 순간은 100ms 로 바로 반응하고, 손을 떼거나 마우스를 올리고 뗄 때는 160ms 로 같게 둔다.
 * 들고 나는 시간이 다르면 커서로 훑을 때 색이 튀어 들어왔다 흐르게 빠진다.
 * hover 는 마우스 환경에만 건다. 손가락은 누를 때 hover 가 잘못 걸려 뗀 자리에 색이 남는다.
 * 색과 투명도만 바뀌어 자리가 움직이지 않으므로 움직임 줄이기에서도 그대로 둔다.
 */

/** 목록 행과 칩. 바탕을 옅은 회색으로 칠한다. */
export const PRESS_SURFACE =
  "transition-colors duration-control-state ease-out active:bg-[#EFF1F5] active:duration-press pointer-fine:hover:bg-[#EFF1F5]";

/**
 * 바탕이 칠해진 단추. 저장 버튼과 같이 살짝 줄었다 돌아온다.
 * 누를 때는 100ms 로 바로 줄고, 뗄 때는 다른 누름 규칙처럼 160ms 로 돌아온다. 같은 길이로 돌아오면 손을 뗀 순간이 툭 끊긴다.
 * 크기가 바뀌는 움직임이라 움직임 줄이기에서는 끈다.
 */
export const PRESS_SCALE =
  "transition-transform duration-control-state ease-out active:scale-[0.97] active:duration-press motion-reduce:transition-none motion-reduce:active:scale-100";

/**
 * 회색 카드 안이나 글자만 있는 자리. 바탕을 칠하면 경계가 어색해 글자만 옅게 한다.
 *
 * 마우스 환경의 hover 규칙은 미디어 쿼리에 싸여 누름 규칙보다 뒤에 놓인다. 그대로 두면 누르는 동안에도
 * hover 의 옅기가 이긴다. 같은 미디어 쿼리 안에 누름 규칙을 한 번 더 두어 누름이 이기게 한다.
 */
export const PRESS_TEXT =
  "transition-opacity duration-control-state ease-out active:opacity-60 active:duration-press pointer-fine:hover:opacity-80 pointer-fine:active:opacity-60";

/**
 * 배지가 든 목록 행. 행의 바탕이 배지 바탕(#EFF1F5)과 같아 배지 모양이 묻히므로, 그동안 배지를 흰색으로 바꾼다.
 * 배지 쪽 전환 시간은 Badge 가 행과 같은 160ms 로 갖고 있고, 누를 때만 행처럼 100ms 로 줄인다.
 */
export const PRESS_SURFACE_WITH_BADGE = `${PRESS_SURFACE} active:[&_[data-badge]]:bg-white active:[&_[data-badge]]:duration-press pointer-fine:hover:[&_[data-badge]]:bg-white`;

/**
 * 여백 없이 붙어 있는 카드형 행. 글자와 이미지 자리를 그대로 두고 바깥으로 8px 넓힌 둥근 바탕을 칠한다.
 * 행에 바로 칠하면 바탕이 이미지와 칩 바깥 선에 딱 붙어 각지고 답답하다. 행 사이 간격(24px) 안에서 서로 겹치지 않는다.
 */
export const PRESS_CARD_OUTSET =
  "relative isolate before:absolute before:-inset-2 before:-z-10 before:rounded-2xl before:transition-colors before:duration-control-state before:ease-out before:content-[''] active:before:bg-[#EFF1F5] active:before:duration-press pointer-fine:hover:before:bg-[#EFF1F5]";
