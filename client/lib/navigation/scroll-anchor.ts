/** 목록 항목에 붙여 두는 표식. 되돌아왔을 때 같은 항목을 다시 찾는 데 쓴다. */
export const ANCHOR_ATTRIBUTE = "data-scroll-anchor";

export type ScrollAnchor = {
  /** 화면 맨 위에 걸려 있던 항목. */
  readonly id: number;
  /** 그 항목의 위쪽을 얼마나 지나쳐 있었는지. 없으면 항목 머리로 튀어 오른다. */
  readonly offset: number;
};

export type ScrollPosition = {
  /** 항목을 찾지 못했을 때 쓸 값. 목록보다 위에 있으면 항목이 걸리지 않는다. */
  readonly scrollY: number;
  readonly anchor?: ScrollAnchor;
};

/** 문서 기준 항목의 윗변. 화면 기준 값에 지금 스크롤을 더해 얻는다. */
const documentTopOf = (element: HTMLElement): number => element.getBoundingClientRect().top + window.scrollY;

/**
 * 화면 맨 위에 걸린 항목을 찾는다.
 *
 * 목록 전체를 훑지 않고 점 하나를 맞혀 본다. 목록이 수백 건까지 자라는데 스크롤마다
 * 전부 재면 그 비용이 사용자가 손가락을 대고 있는 동안 쌓인다.
 */
const anchorAtTop = (): ScrollAnchor | undefined => {
  const hit = document.elementFromPoint(Math.floor(window.innerWidth / 2), 0);
  const found = hit?.closest(`[${ANCHOR_ATTRIBUTE}]`);
  if (!(found instanceof HTMLElement)) return undefined;

  const id = Number(found.getAttribute(ANCHOR_ATTRIBUTE));
  if (!Number.isInteger(id)) return undefined;

  return { id, offset: -found.getBoundingClientRect().top };
};

export const readScrollPosition = (): ScrollPosition => ({ scrollY: window.scrollY, anchor: anchorAtTop() });

/**
 * 떠날 때 보던 자리로 되돌린다.
 *
 * 항목을 먼저 찾는다. 다시 받아 온 목록이 달라졌으면 위쪽 항목의 높이가 바뀌어
 * 픽셀값이 다른 제품을 가리키지만, 항목을 기준으로 잡으면 같은 제품으로 간다.
 */
export const applyScrollPosition = (position: ScrollPosition): void => {
  const anchor = position.anchor;
  const element = anchor && document.querySelector(`[${ANCHOR_ATTRIBUTE}="${anchor.id}"]`);

  if (anchor && element instanceof HTMLElement) {
    // 폭이 달라져 항목이 낮아졌으면 offset 이 다음 항목까지 넘어간다.
    const offset = Math.min(anchor.offset, element.getBoundingClientRect().height);
    window.scrollTo(0, documentTopOf(element) + offset);
    return;
  }

  if (position.scrollY > 0) window.scrollTo(0, position.scrollY);
};
