/**
 * 화면 아래에 붙은 영역(하단 내비, 하단 행동 영역, 제품 상세 하단 고정 바 등)이 스스로 다는 속성(FEEDBACK F04 위치, #1274).
 * 토스트는 이 속성이 달린 영역 중 지금 보이는 것을 직접 재어, 가장 높이 올라온 영역 위 12 에 뜬다(toast-raise.ts).
 * 그래서 화면은 아래에 무엇이 붙었는지 토스트에 따로 알리지 않는다.
 */
export const BOTTOM_AREA_ATTRIBUTE = "data-bottom-area";

/** 영역 요소에 펼쳐 넣는 속성. 예: `<div {...bottomAreaProps}>` */
export const bottomAreaProps = { [BOTTOM_AREA_ATTRIBUTE]: "" } as const;

const SELECTOR = `[${BOTTOM_AREA_ATTRIBUTE}]`;

/** 속성이 달린 영역 모두. 숨은 영역도 들어 있다. */
export const findBottomAreas = () => [...document.querySelectorAll<HTMLElement>(SELECTOR)];

/**
 * 영역 자신의 translate 세로 거리(px). 영역은 나타나고 사라지는 움직임을 translate 로 둔다(제품 상세 하단 고정 바).
 * 이 값을 빼면 움직이는 도중에도 다 올라온 자리를 잰다. 퍼센트는 영역 높이 기준이다. 읽지 못하는 값이면 0 으로 본다.
 */
const translateY = (area: HTMLElement) => {
  const [, y = "0px"] = (window.getComputedStyle(area).translate ?? "").split(" ");
  const value = Number.parseFloat(y);
  if (Number.isNaN(value)) return 0;
  return y.endsWith("%") ? (value / 100) * area.offsetHeight : value;
};

/**
 * 보이는 영역만 잰다. 스스로 숨은 영역(inert 인 하단 고정 바), 키보드가 열려 숨은 하단 내비(hidden), 그려지지 않은 영역은 뺀다.
 * 조상의 inert 는 보지 않는다. 시트가 본문을 inert 로 막아도 영역은 그대로 보이고, 시트가 닫히기 시작하면 토스트가 이 영역 위로
 * 내려와야 하기 때문이다. 시트가 열려 있는 동안에는 시트 위가 우선한다(toast-raise.ts).
 * 모달 대화 상자(성분 추가 화면 등)가 화면을 덮고 있으면 그 안의 영역만 잰다. 그 아래 화면의 영역은 가려져 있다.
 */
const shownAreas = () => {
  const shown = findBottomAreas().filter(
    (area) =>
      !area.hasAttribute("inert") && area.closest("[hidden]") === null && area.getBoundingClientRect().height > 0,
  );
  const inModal = shown.filter((area) => area.closest('[aria-modal="true"]') !== null);
  return inModal.length > 0 ? inModal : shown;
};

/** 보이는 영역 중 가장 높이 올라온 것의 위쪽 끝이 화면 아래에서 떨어진 거리(px). 영역이 없으면 0 이다. */
export const measureBottomAreas = () =>
  shownAreas().reduce(
    (highest, area) => Math.max(highest, window.innerHeight - (area.getBoundingClientRect().top - translateY(area))),
    0,
  );

export type AreaMotion = { readonly duration: number; readonly easing: string };

/**
 * 영역에서 지금 돌고 있는 움직임 중 가장 늦게 끝나는 것의 남은 시간(ms)과 곡선. 토스트가 이 시간·곡선으로 함께 옮겨 간다.
 * 막 숨기 시작한 영역의 움직임도 넣는다. 돌고 있는 움직임이 없으면(영역이 바로 나타나거나 높이만 바뀌면) undefined 다.
 */
export const runningAreaMotion = (): AreaMotion | undefined => {
  let found: AreaMotion | undefined;
  for (const area of findBottomAreas()) {
    for (const animation of area.getAnimations?.() ?? []) {
      if (animation.playState !== "running" || !animation.effect) continue;
      const end = Number(animation.effect.getComputedTiming().endTime);
      const duration = end - Number(animation.currentTime ?? 0);
      if (!(duration > 0) || (found && found.duration >= duration)) continue;
      found = { duration, easing: animation.effect.getTiming().easing ?? "ease" };
    }
  }
  return found;
};
