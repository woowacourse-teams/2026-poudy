"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";

declare global {
  interface Window {
    __POUDY_WEB_SCROLL_INDICATOR__?: unknown;
  }
}

/** 스크롤이 멎은 뒤 막대가 사라지기까지의 시간. */
const HIDE_DELAY = 800;

/** 긴 화면에서도 손가락으로 알아볼 만큼은 남긴다. */
const MIN_THUMB_HEIGHT = 32;

/* 앱이 알려 오는 값은 문서가 만들어질 때 한 번 정해진다. 그릴 때마다 그때의 값을 읽는다. */
const subscribe = () => () => {};

const readEnabled = () => window.__POUDY_WEB_SCROLL_INDICATOR__ === true;

/* 서버는 앱 안인지 모른다. 미리 만든 화면은 그리지 않는 쪽으로 둔다. */
const serverDisabled = () => false;

const supportsScrollEnd = () => "onscrollend" in window;

/**
 * 앱 WebView 의 세로 스크롤 막대.
 *
 * 네이티브 막대는 WebView 전체 높이를 기준으로 그려져 상단바와 하단 내비게이션 뒤까지
 * 내려간다. 네이티브에서는 그 구간을 좁힐 방법이 플랫폼마다 달라(Android 는 없다), 앱이
 * 네이티브 막대를 끄고 웹이 두 바 사이에 직접 그린다.
 *
 * 앱이 네이티브 막대를 껐다고 알려 올 때만 그린다. 이 값을 모르는 예전 앱에서 그리면
 * 막대가 둘이 된다. 브라우저에서는 브라우저의 막대를 그대로 쓴다.
 */
export function AppScrollIndicator() {
  const enabled = useSyncExternalStore(subscribe, readEnabled, serverDisabled);

  if (!enabled) return null;
  return <ScrollThumb />;
}

type StickyCap = { readonly element: HTMLElement; readonly style: CSSStyleDeclaration };

/** 위에 붙는 줄. 아래에 붙는 버튼 줄처럼 `top` 이 없는 것은 뺀다. */
const collectCaps = (): readonly StickyCap[] =>
  [...document.querySelectorAll<HTMLElement>(".sticky")]
    .map((element) => ({ element, style: getComputedStyle(element) }))
    .filter(({ style }) => style.top !== "auto");

/** 머리 묶음으로 이어 붙었다고 보는 줄 사이의 간격(px). 줄마다 위아래 여백이 조금씩 있다. */
const STACK_GAP = 16;

/**
 * 화면 위에 쌓인 머리 줄들의 가장 아래 끝.
 *
 * 붙은 줄과, 아직 흐름 안에 있어도 위의 줄 바로 아래에 이어진 줄을 머리로 본다. 맨 위에서는
 * 칩 줄이 카테고리 줄 아래 흐름 안에 있어 붙은 것은 아니지만 머리의 일부로 보여야 한다. 브랜드
 * 소개처럼 사이에 본문이 끼어 떨어져 있는 줄은 넣지 않는다.
 *
 * 줄마다 붙는 높이(`top`)가 스크롤 방향에 따라 바뀌어(탐색 조건·카테고리 줄이 숨으면 칩 줄이
 * 올라간다) 그때그때 읽는다. 상품 축약형처럼 붙기 전에도 투명하게 자리에 있는 줄은 뺀다.
 * `data-stuck` 은 아래 선을 그을지 정하는 값이라 쓰지 않는다. 상단바는 맨 위에서도 붙어
 * 있지만 이 값은 거짓이다.
 */
const capBottomOf = (caps: readonly StickyCap[]): number =>
  caps
    .filter(({ style }) => style.opacity !== "0")
    .map(({ element, style }) => ({ rect: element.getBoundingClientRect(), stuckAt: parseFloat(style.top) }))
    .filter(({ rect }) => rect.height > 0)
    .sort((a, b) => a.rect.top - b.rect.top)
    .reduce((bottom, { rect, stuckAt }) => {
      const stuck = rect.top <= stuckAt + 1;
      const stacked = rect.top <= bottom + STACK_GAP;
      if (!stuck && !stacked) return bottom;

      return Math.max(bottom, rect.bottom);
    }, 0);

/**
 * 막대는 화면 위에 붙은 줄들 아래부터 하단 내비게이션 위까지를 오간다. 붙은 줄은 화면마다,
 * 스크롤 위치마다 달라 위치를 옮길 때 함께 다시 잰다.
 *
 * 위치는 스크롤마다 한 프레임에 한 번 옮긴다. CSS 스크롤 타임라인(`animation-timeline: scroll()`)
 * 으로 옮기면 Android WebView 에서 문서 스크롤 자체가 버벅였다. 같은 기기의 삼성 인터넷과 이
 * 막대를 그리지 않는 앱은 매끄러웠고, 이동 거리를 변수 대신 px 로 넣거나 `will-change` 를
 * 주어도 그대로였다.
 */
function ScrollThumb() {
  const pathname = usePathname();
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return;

    const endsWithScrollEnd = supportsScrollEnd();
    const state = {
      frame: 0,
      timer: 0,
      top: -1,
      bottom: 0,
      travel: 0,
      scrollable: false,
      moving: 0,
      caps: collectCaps(),
    };
    // 감싸는 칸은 display: contents 라 상자가 없다. 높이는 안의 nav 에서 잰다.
    const navigation = document.querySelector<HTMLElement>("[data-bottom-navigation] > nav");

    /** 붙은 줄 아래부터 하단 내비게이션 위까지의 트랙과 그 안의 막대 길이를 잡는다. */
    const layout = (top: number) => {
      const root = document.documentElement;
      const trackLength = Math.max(window.innerHeight - top - state.bottom, 0);
      const height = Math.min(
        Math.max((trackLength * root.clientHeight) / root.scrollHeight, MIN_THUMB_HEIGHT),
        trackLength,
      );

      track.style.top = `${top}px`;
      thumb.style.height = `${height}px`;
      state.top = top;
      state.travel = trackLength - height;
    };

    const place = () => {
      state.frame = 0;
      if (!state.scrollable) return;

      /*
       * 위로 올리면 숨었던 줄이 내려오며 칩 줄을 밀어내는데, 이 움직임은 스크롤이 멎은 다음
       * 프레임부터 CSS 전환으로 이어진다. 머리 줄이 움직이는 동안과 끝이 바뀐 직후에는 다음
       * 프레임에도 다시 잰다.
       */
      const top = capBottomOf(state.caps);
      const moved = top !== state.top;
      if (moved) layout(top);
      if (state.moving > 0 || moved) state.frame = requestAnimationFrame(place);

      const root = document.documentElement;
      const progress = Math.min(Math.max(window.scrollY / (root.scrollHeight - root.clientHeight), 0), 1);
      thumb.style.transform = `translateY(${state.travel * progress}px)`;
    };

    /** 문서나 화면 크기가 바뀌면 붙는 줄을 다시 모으고 트랙을 다시 잡는다. */
    const measure = () => {
      const root = document.documentElement;
      state.caps = collectCaps();
      // 키보드가 열려 내비가 숨으면(hidden) 상자가 없어 top 이 0 으로 잡힌다. 그때는 아래를 비우지 않는다.
      const navigationBox = navigation?.getBoundingClientRect();
      state.bottom =
        navigationBox && navigationBox.height > 0 ? Math.max(window.innerHeight - navigationBox.top, 0) : 0;
      state.scrollable = root.scrollHeight > root.clientHeight;
      track.style.bottom = `${state.bottom}px`;
      layout(capBottomOf(state.caps));

      if (!state.scrollable) thumb.dataset.visible = "false";
      place();
    };

    const hideLater = () => {
      window.clearTimeout(state.timer);
      state.timer = window.setTimeout(() => {
        thumb.dataset.visible = "false";
      }, HIDE_DELAY);
    };

    const isCap = (target: EventTarget | null) => state.caps.some(({ element }) => element === target);

    /* 머리 줄이 전환으로 움직이는 동안에는 스크롤이 없어도 트랙을 따라 옮긴다. */
    const startMoving = (event: TransitionEvent) => {
      if (!isCap(event.target)) return;
      state.moving += 1;
      if (!state.frame) state.frame = requestAnimationFrame(place);
    };

    const stopMoving = (event: TransitionEvent) => {
      if (!isCap(event.target)) return;
      state.moving = Math.max(state.moving - 1, 0);
      if (!state.frame) state.frame = requestAnimationFrame(place);
    };

    const handleScroll = () => {
      if (!state.frame) state.frame = requestAnimationFrame(place);
      if (!state.scrollable) return;

      if (thumb.dataset.visible !== "true") thumb.dataset.visible = "true";
      if (endsWithScrollEnd) {
        window.clearTimeout(state.timer);
        return;
      }
      hideLater();
    };

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(document.body);
    if (navigation) resizeObserver.observe(navigation);

    window.addEventListener("scroll", handleScroll, { passive: true });
    if (endsWithScrollEnd) window.addEventListener("scrollend", hideLater);
    window.addEventListener("resize", measure);
    document.addEventListener("transitionrun", startMoving);
    document.addEventListener("transitionend", stopMoving);
    document.addEventListener("transitioncancel", stopMoving);

    return () => {
      document.removeEventListener("transitionrun", startMoving);
      document.removeEventListener("transitionend", stopMoving);
      document.removeEventListener("transitioncancel", stopMoving);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("scrollend", hideLater);
      window.removeEventListener("resize", measure);
      resizeObserver.disconnect();
      cancelAnimationFrame(state.frame);
      window.clearTimeout(state.timer);
    };
  }, [pathname]);

  return (
    <div ref={trackRef} aria-hidden="true" className="app-scroll-track">
      <div ref={thumbRef} data-visible="false" className="app-scroll-thumb" />
    </div>
  );
}
