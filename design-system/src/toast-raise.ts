"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";

import { findBottomAreas, measureBottomAreas, runningAreaMotion } from "./bottom-area";
import { openLayers, subscribeLayers } from "./overlay-stack";

/** 시트(또는 시트 위 내용)와 토스트 사이, 화면 위쪽 끝과 토스트 사이 간격(FEEDBACK F04 위치) */
const GAP_PX = 12;
/** 시트 열기 전환 시간(slow). 이 안에 자리가 다시 바뀌면 올라가는 움직임으로 이어 간다. */
const OPEN_MS = 280;
/** 시트 위 내용이 시트 위쪽 끝에서 떨어진 거리(overlay.css 의 sheet-above) */
const ABOVE_GAP_PX = 24;

/**
 * 토스트 영역이 새 자리로 옮겨 갈 때의 움직임(MOTION M02 '토스트 · 시트 위로 오르내림', '제품 상세 하단 고정 바').
 * - open: 시트가 열리며 올라간다. 시트 열기와 같은 slow · drawer
 * - close: 시트가 닫히며 내려온다. 시트 닫기와 같은 base · drawer
 * - follow: 열린 시트의 높이가 바뀌어 따라간다. 시트 높이 변화와 같은 base · ease-in-out
 * - area: 화면 아래에 붙은 영역이 오르내려 따라간다. 영역에서 돌고 있는 움직임의 남은 시간·곡선을 그대로 쓴다
 *   (--toast-move-duration · --toast-move-ease). 제품 상세 하단 고정 바는 base · ease-float 다.
 * - none: 옮기지 않고 바로 놓는다. 처음 뜬 토스트는 이미 올라간 자리에서 들어오고, 영역이 움직임 없이 나타나거나 높이만 바뀌어도 바로 놓는다.
 */
type Move = "open" | "close" | "follow" | "area" | "none";

/** 열린 시트 중 맨 위 것. 닫히기 시작한 시트(data-state=closed)는 건너뛰어, 시트가 내려가는 동안 토스트도 함께 내려온다. */
const findOpenSheet = () => {
  for (const layer of [...openLayers()].reverse()) {
    const sheet = layer.querySelector<HTMLElement>(".sheet-surface");
    if (sheet?.dataset.state === "open") return { layer, sheet };
  }
  return undefined;
};

/**
 * 토스트 아래 끝을 둘 수 있는 자리(화면 위쪽 끝에서 잰 거리) 후보. 앞의 것부터 고른다.
 * 시트 위 내용(평가 결과 미리보기 등)이 보이면 그 위, 다음은 시트 바로 위다. 시트의 높이는 transform 을 뺀 레이아웃 높이로 재어,
 * 시트가 올라오는 전환 중에도 다 열린 자리를 기준으로 삼는다.
 */
const candidateTops = (layer: HTMLElement, sheet: HTMLElement) => {
  const keyboard = Number.parseFloat(sheet.style.getPropertyValue("--sheet-keyboard")) || 0;
  const sheetTop = window.innerHeight - keyboard - sheet.offsetHeight;
  const above = layer.querySelector<HTMLElement>(".sheet-above > *");
  if (!above || layer.hasAttribute("data-sheet-cramped")) return [sheetTop];
  return [sheetTop - ABOVE_GAP_PX - above.offsetHeight, sheetTop];
};

/**
 * 시트 위로 토스트 영역을 얼마나 올릴지(px). 열린 시트가 없으면 undefined 다.
 * 후보 중 토스트가 화면 위쪽(상단 안전 영역 아래 12) 안에 들어가는 첫 자리를 고르고, 하나도 없으면 화면 위쪽에 붙인다.
 */
const measureSheetRaise = (region: HTMLElement, stack: HTMLElement, safeTop: number) => {
  const found = findOpenSheet();
  if (!found) return undefined;
  const front = Number.parseFloat(stack.style.getPropertyValue("--toast-front-height")) || 0;
  const base = Number.parseFloat(window.getComputedStyle(region).bottom) || 0;
  const minTop = safeTop + GAP_PX;
  const fit = candidateTops(found.layer, found.sheet).find((top) => top - GAP_PX - front >= minTop);
  const bottom = fit === undefined ? window.innerHeight - minTop - front : window.innerHeight - fit + GAP_PX;
  return Math.max(0, bottom - base);
};

/**
 * 토스트 영역을 아래에 있는 것 위로 올린다(FEEDBACK F04 위치). 토스트가 그 위의 버튼과 글을 가리지 않게 하는 것이 목적이다.
 *
 * - 시트가 열려 있으면 시트(와 시트 위 내용) 위로 올린다(#1237). 시트가 우선한다.
 * - 시트가 없으면 화면 아래에 붙은 영역(bottom-area.ts 의 data-bottom-area) 중 보이는 것을 재어, 가장 높이 올라온 영역 위
 *   12 에 띄운다(#1274). 영역이 움직이는 도중에는 다 올라온 자리를 기준으로 삼고, 영역과 같은 시간·곡선으로 옮겨 간다.
 *
 * 올릴 거리는 --toast-raise 로, 움직임의 종류는 data-toast-move 로 넘기고, 움직임은 overlay.css 의 [data-toast-region] 이 정한다.
 */
export function useRaiseAboveSheet(
  regionRef: RefObject<HTMLElement | null>,
  stackRef: RefObject<HTMLElement | null>,
  safeTopRef: RefObject<HTMLElement | null>,
  toasts: readonly unknown[],
) {
  const raised = useRef(0);
  const shown = useRef(false);
  // 지금 자리가 시트로 정해졌는지. 시트가 열리고 닫히는 움직임과 영역을 따라가는 움직임을 가른다.
  const onSheet = useRef(false);
  const watcher = useRef<{ readonly watch: (move?: Move) => void; readonly stop: () => void } | null>(null);

  /*
   * 토스트 영역은 Portal 이라 하이드레이션이 끝난 뒤에 붙는다. 그래서 붙은 뒤 처음 그릴 때 관찰을 시작한다.
   * 층이 오르내릴 때, 시트가 열리고 닫히기 시작할 때(data-state), 시트·시트 위 내용·토스트의 크기가 바뀔 때,
   * 화면 크기가 바뀔 때 다시 잰다.
   * 화면 아래에 붙은 영역은 토스트가 떠 있는 동안에만 지켜본다. 영역이 붙고 빠질 때, 숨고 나타날 때(inert · hidden · class · style),
   * 크기가 바뀔 때 다시 잰다. 스크롤마다 재지 않는다. 토스트가 처음 뜰 때는 그 자리에서 한 번 잰다.
   */
  const start = useCallback(() => {
    const region = regionRef.current;
    const stack = stackRef.current;
    if (watcher.current || !region || !stack) return;

    let openedAt = Number.NEGATIVE_INFINITY;
    const apply = (move?: Move) => {
      const sheetRaise = measureSheetRaise(region, stack, safeTopRef.current?.offsetHeight ?? 0);
      const sheet = sheetRaise !== undefined;
      const wasSheet = onSheet.current;
      onSheet.current = sheet;
      // 토스트 영역은 화면 아래 12(system.css bottom-toast)에 있어, 영역 높이만큼 올리면 영역 위 12 에 뜬다.
      const next = sheetRaise ?? measureBottomAreas();
      const previous = raised.current;
      if (Math.abs(next - previous) < 0.5) return;

      let kind: Move;
      if (move) kind = move;
      else if (sheet && !wasSheet) kind = "open";
      else if (!sheet && wasSheet) kind = "close";
      // 올라가는 도중에 시트 위 내용이 붙어 자리가 더 올라가도, 시트가 열리는 동안에는 같은 움직임으로 이어 간다.
      else if (sheet) kind = performance.now() - openedAt < OPEN_MS ? "open" : "follow";
      else {
        const motion = runningAreaMotion();
        kind = motion ? "area" : "none";
        if (motion) {
          region.style.setProperty("--toast-move-duration", `${motion.duration}ms`);
          region.style.setProperty("--toast-move-ease", motion.easing);
        }
      }
      if (kind === "open") openedAt = performance.now();
      region.dataset.toastMove = kind;
      region.style.setProperty("--toast-raise", `${next}px`);
      raised.current = next;
    };

    const resize = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(() => apply());
    const mutation = new MutationObserver(() => apply());
    // 시트 위 내용처럼 시트가 열린 뒤에 붙는 요소도 크기를 재도록, 층 안의 요소가 붙고 빠지면 관찰을 다시 건다.
    const structure = new MutationObserver(() => watch());
    // 화면이 바뀌어 영역이 붙고 빠지면 관찰을 다시 건다. 토스트가 떠 있는 동안에만 본문을 지켜본다.
    const page = new MutationObserver(() => watch());
    const watch = (move?: Move) => {
      resize?.disconnect();
      mutation.disconnect();
      structure.disconnect();
      page.disconnect();
      if (shown.current) {
        page.observe(document.body, { childList: true, subtree: true });
        for (const area of findBottomAreas()) {
          mutation.observe(area, { attributes: true, attributeFilter: ["inert", "hidden", "class", "style"] });
          resize?.observe(area);
        }
      }
      for (const layer of openLayers()) {
        structure.observe(layer, { childList: true, subtree: true });
        mutation.observe(layer, { attributes: true, attributeFilter: ["data-sheet-cramped"] });
        const sheet = layer.querySelector(".sheet-surface");
        if (sheet) {
          mutation.observe(sheet, { attributes: true, attributeFilter: ["data-state", "style"] });
          resize?.observe(sheet);
        }
        const above = layer.querySelector(".sheet-above > *");
        if (above) resize?.observe(above);
      }
      stack.querySelectorAll("[data-toast-content]").forEach((content) => resize?.observe(content));
      apply(move);
    };

    const unsubscribe = subscribeLayers(() => watch());
    const onResize = () => apply();
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    watcher.current = {
      watch,
      stop: () => {
        unsubscribe();
        resize?.disconnect();
        mutation.disconnect();
        structure.disconnect();
        page.disconnect();
        window.removeEventListener("resize", onResize);
        window.visualViewport?.removeEventListener("resize", onResize);
      },
    };
    watch();
  }, [regionRef, stackRef, safeTopRef]);

  useEffect(() => {
    start();
    return () => {
      watcher.current?.stop();
      watcher.current = null;
    };
  }, [start]);

  // 토스트가 바뀌면 토스트 높이로 다시 잰다. 처음 뜬 토스트는 시트나 영역 위로 올라간 자리에서 바로 들어온다.
  useLayoutEffect(() => {
    start();
    const first = !shown.current && toasts.length > 0;
    shown.current = toasts.length > 0;
    if (first && regionRef.current) regionRef.current.dataset.toastMove = "none";
    watcher.current?.watch(first ? "none" : undefined);
  }, [toasts, regionRef, start]);
}
