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

const supportsScrollTimeline = () =>
  typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("animation-timeline", "scroll()");

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

/**
 * 막대의 위치는 CSS 스크롤 타임라인이 옮긴다(`.app-scroll-thumb`). JS 는 막대 길이와 이동
 * 거리를 크기가 바뀔 때만 다시 재고, 스크롤 중에는 보이고 숨기는 것만 정한다.
 * 스크롤 타임라인이 없는 WebView(iOS 26 미만)에서만 스크롤마다 위치를 직접 옮긴다.
 */
function ScrollThumb() {
  const pathname = usePathname();
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return;

    const followsTimeline = supportsScrollTimeline();
    const endsWithScrollEnd = supportsScrollEnd();
    const state = { frame: 0, timer: 0, travel: 0, scrollable: false };
    const topBar = document.querySelector<HTMLElement>("[data-top-bar]");
    const navigation = document.querySelector<HTMLElement>("[data-bottom-navigation]");

    const place = () => {
      state.frame = 0;
      if (!state.scrollable) return;

      const root = document.documentElement;
      const progress = Math.min(Math.max(window.scrollY / (root.scrollHeight - root.clientHeight), 0), 1);
      thumb.style.transform = `translateY(${state.travel * progress}px)`;
    };

    /** 상단바 아래부터 하단 내비게이션 위까지의 트랙과 그 안의 막대 길이를 잡는다. 둘이 없으면 화면 끝을 쓴다. */
    const measure = () => {
      const root = document.documentElement;
      const top = topBar ? Math.max(topBar.getBoundingClientRect().bottom, 0) : 0;
      const bottom = navigation ? Math.max(window.innerHeight - navigation.getBoundingClientRect().top, 0) : 0;
      const trackLength = Math.max(window.innerHeight - top - bottom, 0);
      const height = Math.min(
        Math.max((trackLength * root.clientHeight) / root.scrollHeight, MIN_THUMB_HEIGHT),
        trackLength,
      );

      track.style.top = `${top}px`;
      track.style.bottom = `${bottom}px`;
      thumb.style.height = `${height}px`;
      thumb.style.setProperty("--app-scroll-travel", `${trackLength - height}px`);

      state.travel = trackLength - height;
      state.scrollable = root.scrollHeight > root.clientHeight;
      if (!state.scrollable) thumb.dataset.visible = "false";
      if (!followsTimeline) place();
    };

    const hideLater = () => {
      window.clearTimeout(state.timer);
      state.timer = window.setTimeout(() => {
        thumb.dataset.visible = "false";
      }, HIDE_DELAY);
    };

    const handleScroll = () => {
      if (!followsTimeline && !state.frame) state.frame = requestAnimationFrame(place);
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
    if (topBar) resizeObserver.observe(topBar);
    if (navigation) resizeObserver.observe(navigation);

    window.addEventListener("scroll", handleScroll, { passive: true });
    if (endsWithScrollEnd) window.addEventListener("scrollend", hideLater);
    window.addEventListener("resize", measure);

    return () => {
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
