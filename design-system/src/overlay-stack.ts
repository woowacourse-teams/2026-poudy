import { getOverlayRoot } from "./portal";

type Layer = {
  /** 이 층을 감싼 요소. #overlay-root 의 자식이다. */
  readonly element: HTMLElement;
  readonly onEscape: () => void;
};

const stack: Layer[] = [];
const inerted = new Set<Element>();
let lockedOverflow: string | undefined;

const onKeyDown = (event: KeyboardEvent) => {
  if (event.key !== "Escape" || event.defaultPrevented) return;
  const top = stack[stack.length - 1];
  if (!top) return;
  event.preventDefault();
  top.onEscape();
};

/** 층이 막지 않는 #overlay-root 의 자식에 다는 표식. 토스트 영역이 단다. */
export const OVERLAY_LIVE_ATTRIBUTE = "data-overlay-live";

const listeners = new Set<() => void>();

/**
 * 맨 위 층만 살려 둔다. 본문과 그 아래 층은 inert 로 막아 포커스·클릭·낭독이 닿지 않게 한다(A11Y D02).
 * 우리가 막은 요소만 기억했다가 푼다. 다른 곳에서 이미 막아 둔 요소는 건드리지 않는다.
 * 토스트 영역(data-overlay-live)은 막지 않는다. 시트 위로 올라간 토스트의 행동을 누를 수 있고, 시트가 열린 동안 뜬
 * 토스트도 낭독된다(FEEDBACK F04 위치, #1237).
 */
const apply = () => {
  for (const element of inerted) element.removeAttribute("inert");
  inerted.clear();

  const html = document.documentElement;
  const top = stack[stack.length - 1];
  if (!top) {
    if (lockedOverflow !== undefined) html.style.overflow = lockedOverflow;
    lockedOverflow = undefined;
    document.removeEventListener("keydown", onKeyDown);
    return;
  }

  // 시트 뒤의 본문이 함께 스크롤되지 않게 잠근다.
  if (lockedOverflow === undefined) {
    lockedOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
  }

  const root = getOverlayRoot();
  const block = (element: Element) => {
    if (element.hasAttribute("inert")) return;
    element.setAttribute("inert", "");
    inerted.add(element);
  };
  for (const child of document.body.children) if (child !== root) block(child);
  for (const child of root.children)
    if (child !== top.element && !child.hasAttribute(OVERLAY_LIVE_ATTRIBUTE)) block(child);
};

/** 열린 층의 요소. 아래 층부터 맨 위 층 순서다. */
export const openLayers = (): readonly HTMLElement[] => stack.map((layer) => layer.element);

/** 층이 오르내릴 때 부를 함수를 등록한다. 돌려받은 함수로 지운다. 토스트가 시트 위로 올라갈 자리를 다시 잴 때 쓴다. */
export const subscribeLayers = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const notify = () => {
  for (const listener of listeners) listener();
};

/** 층을 올린다. 같은 층 안에서는 나중에 연 것이 위다. 돌려받은 함수로 내린다. */
export const pushLayer = (layer: Layer) => {
  stack.push(layer);
  apply();
  notify();
  return () => {
    const index = stack.indexOf(layer);
    if (index >= 0) stack.splice(index, 1);
    apply();
    notify();
  };
};
