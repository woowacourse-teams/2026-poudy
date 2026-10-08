"use client";

import type { CurationSummaryResponse } from "@poudy/api/api.zod";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { track } from "@/lib/analytics/track";
import { imageDeliveryUrl } from "@/lib/domain/image-delivery-url";
import { useHomeSectionView } from "@/lib/hooks/useHomeSectionView";

type CurationCarouselProps = {
  readonly items: readonly CurationSummaryResponse[];
};

/**
 * 지금 가운데 선 칸의 번호.
 *
 * 카드 폭에 소수점이 섞여 있어 `너비 + 간격` 으로 셈하면 칸마다 1px 씩 어긋난다.
 * 각 칸이 실제로 놓인 자리를 견주어 가장 가까운 것을 고른다.
 */
const slideAt = (track: HTMLElement): number => {
  /* 지금 뷰포트의 가운데가 목록 어디쯤인지. 칸도 가운데끼리 견준다. */
  const center = track.scrollLeft + track.clientWidth / 2;
  let nearest = 0;
  let best = Infinity;

  for (const [slot, child] of [...track.children].entries()) {
    if (!(child instanceof HTMLElement)) continue;
    const gap = Math.abs(child.offsetLeft + child.offsetWidth / 2 - center);
    if (gap < best) {
      best = gap;
      nearest = slot;
    }
  }

  return nearest;
};

/**
 * 한 칸에서 다음 칸까지의 거리.
 *
 * 카드 폭에 소수점이 섞여 있어 `너비 + 간격` 으로 셈하면 어긋난다. 실제 두 칸이 놓인
 * 자리의 차이에서 얻는다. 칸이 하나뿐이면 그 칸의 너비를 쓴다.
 */
const slideStep = (track: HTMLElement): number => {
  const first = track.children[0];
  const second = track.children[1];
  if (!(first instanceof HTMLElement)) return 0;
  if (!(second instanceof HTMLElement)) return first.offsetWidth;

  return second.offsetLeft - first.offsetLeft;
};

/**
 * 한 칸을 가운데로 보내는 스크롤 값.
 *
 * 좌우 여백이 고정 px 이라 칸의 자리도 딱 떨어진다. 칸의 자리에서 여백을 빼면 그 값이 나온다.
 *
 * 다만 끝 여백을 스크롤 범위에 넣지 않는 브라우저가 있어, 마지막 칸은 그 값까지 가지 못할
 * 수 있다. 갈 수 있는 끝으로 묶어 두지 않으면 `settle` 이 아직 덜 왔다고 보아 붙이기를
 * 끝없이 되풀이한다. 범위를 잴 수 없을 때(그리기 전)는 그대로 둔다.
 */
const scrollOf = (track: HTMLElement, slide: HTMLElement): number => {
  const to = slide.offsetLeft - SIDE_PADDING;
  const max = track.scrollWidth - track.clientWidth;

  return max > 0 ? Math.min(to, max) : to;
};

/** 스스로 다음 카드로 넘어가는 간격. */
const AUTOPLAY_INTERVAL = 5000;

/**
 * 한 칸을 미끄러져 가는 데 걸리는 시간.
 *
 * 카드가 화면 폭만큼 먼 거리를 지나므로 넉넉히 둔다. 짧으면 지나가는 것이 아니라
 * 갈아 끼워진 것처럼 보인다. 스스로 넘어가는 자리라 재촉할 이유도 없다.
 */
const GLIDE_DURATION = 1500;

/**
 * 스크롤이 멎었다고 볼 때까지 기다리는 시간.
 *
 * `scrollend` 를 모르는 브라우저(사파리)를 위한 대비책이다. 한 번 미끄러지는 데
 * `GLIDE_DURATION` 이 걸리므로 그보다 넉넉히 두어, 가는 도중에 자리를 옮기지 않게 한다.
 */
const SETTLE_DELAY = GLIDE_DURATION + 250;

/**
 * 손을 뗀 뒤 가까운 카드로 붙거나, 옆 카드를 눌러 데려오는 데 걸리는 시간.
 *
 * `GLIDE_DURATION` 은 스스로 넘어가는 자리의 값이라 재촉할 이유가 없어 길게 두었다.
 * 사람이 조작한 자리는 다르다. 놓자마자 결과가 보여야 끌어서 옮긴 것으로 느껴지고,
 * 길게 끌면 손을 뗀 뒤에도 화면이 한참 미끄러져 조작이 무겁게 느껴진다. 사람의 조작에
 * 답하는 움직임이라 300ms 안에 끝낸다.
 */
const DROP_DURATION = 250;

/**
 * 시작과 끝이 모두 느리고 가운데가 빠른 커브. 스스로 넘어가는 움직임에 쓴다.
 *
 * 끝만 느린 커브를 쓰면 처음 10분의 1 만에 거리의 3분의 1 을 가버리고 뒷부분은 멈춘 듯
 * 기어가, 앞은 튀고 끝은 끊긴 것처럼 보인다. 긴 시간을 들일수록 그 치우침이 눈에 띈다.
 * 양끝을 고르게 두어야 한 번의 움직임으로 읽힌다.
 */
const easeInOut = (ratio: number): number => (ratio < 0.5 ? 4 * ratio ** 3 : 1 - Math.pow(-2 * ratio + 2, 3) / 2);

/**
 * 빠르게 출발해 천천히 멎는 커브. 사람의 조작에 답하는 움직임에 쓴다.
 *
 * 손을 떼거나 누른 직후가 사람이 가장 눈여겨보는 순간이다. 시작이 느린 커브를 쓰면 그
 * 순간 화면이 멈췄다가 움직이는 것처럼 보이고, 끌던 속도도 이어지지 않는다.
 * `cubic-bezier(0.23, 1, 0.32, 1)` 에 가까운 5차 커브다.
 */
const easeOut = (ratio: number): number => 1 - (1 - ratio) ** 5;

/** `easeOut` 과 같은 커브를 CSS 로 적은 것. 웹 애니메이션 API 에 넘긴다. */
const EASE_OUT_CSS = "cubic-bezier(0.23, 1, 0.32, 1)";

/**
 * 마지막 카드에서 첫 카드로 되감을 때 흐려지고 다시 나타나는 시간.
 *
 * 여러 칸을 미끄러져 되돌아가면 지나가는 카드들이 한꺼번에 커졌다 줄며 스쳐 화면이
 * 어수선하다. 되감기는 사람이 따라가야 할 이동이 아니므로, 잠깐 흐려진 사이에 옮긴다.
 */
const REWIND_FADE = 150;

/** 가운데에서 한 칸 벗어난 카드가 줄어드는 정도. 가운데는 1, 옆은 0.7 이다. */
const MIN_SCALE = 0.7;

/**
 * 목록 좌우 여백(px). 이만큼이 앞뒤 카드가 걸치는 자리다. 줄일수록 가운데 카드가 넓어진다.
 *
 * `%` 로 두면 화면 폭에 따라 소수점이 생기고, 칸의 자리도 딱 떨어지지 않는다. 그러면
 * 스크롤 값이 스냅 지점에서 몇 px 어긋나고, 브라우저는 이미 다 왔다고 보아 미끄러지기를
 * 건너뛴다. 고정 px 이면 그런 어긋남이 없다.
 */
const SIDE_PADDING = 16;

/**
 * 끌기로 받아들이는 최소 이동 거리(px).
 *
 * 마우스를 누르는 순간 손이 미세하게 흔들린다. 그 흔들림까지 끌기로 받으면 카드를 눌러
 * 상세 화면으로 갈 때마다 목록이 조금씩 밀린다. 이만큼 넘어야 끌기로 본다.
 */
const DRAG_THRESHOLD = 5;

/**
 * 다음 카드로 넘길지 판정하는 비율. 한 칸 간격에 대한 값이다.
 *
 * 놓은 자리에서 가장 가까운 칸을 고르면 한 칸의 절반을 넘겨야 넘어간다. 카드가 화면 폭에
 * 가까워서 그 절반은 200px 안팎이고, 넘기는 데 힘이 많이 든다. 시작한 칸을 기준으로 이
 * 비율만 넘기면 넘어가도록 해 조작을 가볍게 한다.
 */
const DRAG_SWITCH_RATIO = 0.2;

/**
 * 짧게 튕겨도 넘기는 속도(px/ms).
 *
 * 빠르게 튕기는 동작은 움직인 거리가 짧아 `DRAG_SWITCH_RATIO` 에 못 미친다. 거리만 보면
 * 넘기려던 카드가 제자리로 돌아오므로, 이 속도를 넘으면 거리와 상관없이 넘긴다.
 */
const FLICK_VELOCITY = 0.11;

/**
 * 처음과 끝 밖으로 끌 때 목록이 따라오는 최대 거리(px).
 *
 * 끝에서 딱 멈추면 보이지 않는 벽에 부딪힌 것 같다. 더 끌수록 덜 따라오게 해 끝에 닿았음을
 * 알리고, 손을 떼면 제자리로 돌아온다. 손가락은 브라우저의 오버스크롤이 같은 일을 한다.
 */
const EDGE_PULL = 40;

/**
 * 디자인 S01 의 큐레이션 캐러셀.
 *
 * 카드를 받은 순서대로 한 번씩만 그린다. 끝에서 처음으로 이어 돌지 않고, 스스로 넘기다
 * 마지막 카드에 닿으면 첫 카드로 되감는다.
 *
 * 끝없이 도는 것처럼 보이려고 카드를 복제해 두고 스크롤이 멎을 때마다 순서를 돌렸던 적이
 * 있다. 그 되돌림이 스크롤 위치를 순간 이동시키고, 멎었는지 판정하는 시점이 브라우저마다
 * 달라 손가락으로 밀 때 카드가 튀었다. 카드가 몇 장 되지 않아 되감기로도 충분하다.
 *
 * 자리 이동은 스크롤로 한다. 손가락과 휠, 키보드가 모두 브라우저의 기본 동작을 쓴다.
 */
export function CurationCarousel({ items }: CurationCarouselProps) {
  const sectionRef = useHomeSectionView("curation", 1);
  const trackRef = useRef<HTMLUListElement>(null);
  const [current, setCurrent] = useState(0);
  const lastSettledItem = useRef(0);
  /* 손을 대고 있는 동안에는 스스로 넘기지 않는다. */
  const held = useRef(false);
  const reduced = useRef(false);
  const autoplay = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  /* 스스로 넘기는 동안의 스크롤과 사람이 넘긴 스크롤을 가른다. */
  const selfScrolling = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const frame = useRef<number | undefined>(undefined);
  /* 미끄러지는 움직임을 그리는 자리. 새로 출발할 때 가던 것을 멈춘다. */
  const glide = useRef<number | undefined>(undefined);
  /*
   * 마우스로 끄는 동안의 상태.
   *
   * 누른 자리와 그때의 스크롤 값을 담아 두고, 포인터가 움직인 만큼을 그 값에서 덜어 낸다.
   * 프레임마다의 이동량을 더해 나가면 오차가 쌓이므로 누른 순간을 기준으로 삼는다.
   * `pointerId` 는 끌기를 시작한 포인터만 따라가려고 담아 둔다.
   */
  const drag = useRef<
    | {
        pointerId: number;
        startX: number;
        startScroll: number;
        startSlide: number;
        startedAt: number;
        moved: boolean;
      }
    | undefined
  >(undefined);
  /*
   * 방금 끝난 동작이 끌기였는지.
   *
   * 브라우저는 끌기가 끝난 자리에서도 클릭을 한 번 보낸다. 카드가 상세로 가는 링크라,
   * 이것을 가리지 않으면 목록을 밀 때마다 상세 화면이 열린다. 클릭은 `pointerup` 바로
   * 뒤에 오므로 그때 켜 두었다가 클릭이 지나가면 끈다.
   */
  const dragged = useRef(false);
  /*
   * 멎었을 때 할 일을 담아 둔다. 이벤트를 한 번만 달아 두고 그때그때 최신 것을 부르려면
   * 함수를 그대로 넘길 수 없다. 넘기면 처음 그릴 때의 낡은 값을 계속 붙들고 있는다.
   */
  const settleRef = useRef<() => void>(() => {});
  /* 시계 안에서 부르는 함수. 그릴 때마다 새로 만들어지므로 ref 로 최신 것을 붙든다. */
  const scrollToSlideRef = useRef<(slideIndex: number, smooth: boolean) => void>(() => {});
  const rewindRef = useRef<() => void>(() => {});

  /**
   * 카드가 가운데에서 얼마나 떨어져 있는지에 따라 크기를 정한다.
   *
   * 자리마다 정해진 크기를 주면 스냅이 끝난 뒤에야 한 번에 커져 툭 튄다. 스크롤 위치를
   * 그대로 읽어 사이값을 주면 미는 만큼 자란다.
   *
   * 크기는 `transform` 으로만 바꾸고 React 를 거치지 않는다. 레이아웃과 페인트를 다시
   * 하지 않아 합성 단계에서만 처리되고, 프레임마다 트리를 다시 그리지도 않는다.
   */
  const paintScales = useCallback(() => {
    const track = trackRef.current;
    const first = track?.children[0];
    if (!track || !(first instanceof HTMLElement)) return;

    const step = slideStep(track);
    if (step === 0) return;

    /* 뷰포트의 가운데. 칸도 가운데끼리 견주어야 여백이 있어도 어긋나지 않는다. */
    const center = track.scrollLeft + track.clientWidth / 2;

    for (const child of track.children) {
      const box = child.firstElementChild;
      if (!(child instanceof HTMLElement) || !(box instanceof HTMLElement)) continue;

      /* 0 이면 가운데, 1 이면 한 칸 옆이다. 그 사이는 민 만큼의 사이값이 된다. */
      const distance = Math.min(1, Math.abs((child.offsetLeft + child.offsetWidth / 2 - center) / step));
      /*
       * 크기를 3D 변환으로 적는다. `scale()` 만 쓰면 브라우저가 2D 행렬로 눌러 담아
       * 층이 풀리고, 크기가 바뀔 때마다 글자를 다시 그려 획이 떨린다. `scale3d` 는
       * 3D 맥락을 지켜 층 위에서 늘였다 줄였다만 한다.
       */
      /*
       * 글자도 카드와 함께 커지고 작아진다. 그림만 자라고 글자가 제 크기로 남으면 카드와
       * 글자의 비율이 미는 동안 계속 바뀌어 어색하다. 글자는 제 층에 올려 두었으므로
       * (globals.css) 한 번 그린 획을 늘였다 줄일 뿐 떨리지 않는다.
       */
      const size = 1 - (1 - MIN_SCALE) * distance;
      /*
       * 값이 그대로면 다시 적지 않는다. 같은 값이라도 적을 때마다 속성이 바뀐 것으로 잡혀,
       * 세션 리플레이가 너무 잦은 변경으로 보고 기록을 건너뛴다. 멈춰 있는 카드는 대부분
       * 값이 같으므로 이것만으로 적는 횟수가 크게 준다.
       */
      const transform = `scale3d(${size}, ${size}, 1)`;
      if (box.style.transform !== transform) box.style.transform = transform;
      /*
       * 줄어드는 쪽이 가운데를 마주 보는 가장자리를 붙들어야 그 사이 간격이 변하지 않는다.
       * 가운데를 지나는 순간 기준이 뒤집히는데, 그 자리에서는 이미 제 크기라 튀지 않는다.
       */
      const origin = child.offsetLeft + child.offsetWidth / 2 < center ? "right center" : "left center";
      if (box.style.transformOrigin !== origin) box.style.transformOrigin = origin;
    }
  }, []);

  /* 스크롤은 한 프레임에 여러 번 올 수 있다. 그릴 때마다 한 번만 손댄다. */
  const scheduleScales = useCallback(() => {
    if (frame.current !== undefined) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = undefined;
      paintScales();
    });
  }, [paintScales]);

  /* 한 장뿐이면 넘길 곳이 없다. 스스로 넘기지도, 자리 표시를 띄우지도 않는다. */
  const multiple = items.length > 1;

  const scrollToSlide = (
    slideIndex: number,
    smooth: boolean,
    { duration = GLIDE_DURATION, ease = easeInOut }: { duration?: number; ease?: (ratio: number) => number } = {},
  ) => {
    const track = trackRef.current;
    const target = track?.children[slideIndex];
    if (!track || !(target instanceof HTMLElement)) return;

    const to = scrollOf(track, target);

    // 가던 움직임이 있으면 멈추고 새로 출발한다.
    if (glide.current !== undefined) cancelAnimationFrame(glide.current);
    glide.current = undefined;

    if (!smooth || reduced.current) {
      track.scrollLeft = to;
      return;
    }

    /*
     * 미끄러지는 동작을 직접 그린다.
     *
     * `behavior: "smooth"` 는 브라우저가 무시하는 경우가 있다. 설정이나 확장에 따라
     * 갈리고 같은 크로미움 계열에서도 다르다. 직접 그리면 어디서나 똑같이 움직인다.
     */
    const from = track.scrollLeft;
    if (from === to) return;

    /* 첫 프레임의 시각을 출발 시각으로 삼는다. 프레임이 넘겨주는 시각과 같은 시계로 잰다. */
    let startedAt: number | undefined;
    /*
     * 그리는 동안에는 스냅을 끈다.
     *
     * 켜 두면 프레임마다 적어 넣은 자리를 스냅이 곧바로 가까운 칸으로 튕겨내, 중간 값이
     * 전부 무시되고 몇 단계만 건너뛴 것처럼 보인다. `proximity` 로 낮춰도 마찬가지다.
     * 다 그린 뒤에 돌려 놓는다.
     */
    track.style.scrollSnapType = "none";

    const step = (now: number) => {
      startedAt ??= now;
      const ratio = Math.min(1, (now - startedAt) / duration);
      track.scrollLeft = from + (to - from) * ease(ratio);

      if (ratio < 1) {
        glide.current = requestAnimationFrame(step);
        return;
      }

      glide.current = undefined;
      /*
       * 멎었다고 알린 뒤에 스냅을 켠다. 도착한 자리가 스냅 지점에서 조금 벗어나 있으면
       * `settle` 이 짧게 붙이는데, 그 전에 켜면 브라우저가 먼저 끌어당겨 둘이 다툰다.
       */
      track.dispatchEvent(new Event("scrollend"));
      track.style.scrollSnapType = "";
    };

    glide.current = requestAnimationFrame(step);
  };

  /** 사람의 조작에 답해 한 칸으로 붙인다. 빠르게 출발해 `DROP_DURATION` 안에 멎는다. */
  const dropToSlide = (slideIndex: number) =>
    scrollToSlide(slideIndex, true, { duration: DROP_DURATION, ease: easeOut });

  /**
   * 마지막 카드에서 첫 카드로 되감는다.
   *
   * 목록을 잠깐 흐렸다가, 보이지 않는 사이에 첫 카드로 옮기고 다시 나타낸다. `opacity` 만
   * 바꾸므로 합성 단계에서 처리된다. 웹 애니메이션 API 가 없으면 곧바로 옮긴다.
   *
   * 흐려지는 도중에 손을 대면 `onPointerDown` 이 애니메이션을 지워 목록이 곧바로
   * 돌아오고, 옮기기 전이었다면 그 자리에 남는다.
   */
  const rewind = () => {
    const track = trackRef.current;
    if (!track) return;
    if (typeof track.animate !== "function") {
      scrollToSlide(0, false);
      return;
    }

    const fadeOut = track.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: REWIND_FADE,
      easing: EASE_OUT_CSS,
      fill: "forwards",
    });
    fadeOut.finished.then(
      () => {
        scrollToSlide(0, false);
        paintScales();
        track.animate([{ opacity: 0 }, { opacity: 1 }], { duration: REWIND_FADE, easing: EASE_OUT_CSS });
        // 나타나는 애니메이션이 덮으므로 흐려진 채로 붙들던 값을 지워도 깜빡이지 않는다.
        fadeOut.cancel();
      },
      // 손을 대 지운 경우다. 옮기지 않고 그 자리에 둔다.
      () => {},
    );
  };

  /**
   * 끝 밖으로 끌려 나간 목록을 제자리로 돌려놓는다.
   *
   * 끄는 동안 적어 둔 `transform` 을 지우고, 그 자리에서 제자리까지 빠르게 출발해 멎도록
   * 그린다. 웹 애니메이션 API 가 없으면 곧바로 돌아온다.
   */
  const releaseEdgePull = (track: HTMLElement) => {
    const pulled = track.style.transform;
    if (!pulled) return;

    track.style.transform = "";
    track.animate?.([{ transform: pulled }, { transform: "translate3d(0, 0, 0)" }], {
      duration: DROP_DURATION,
      easing: EASE_OUT_CSS,
    });
  };

  useEffect(() => {
    reduced.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    // 첫 화면에도 가운데 카드가 제 크기로 서 있어야 한다.
    paintScales();

    return () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
      if (glide.current !== undefined) cancelAnimationFrame(glide.current);
    };
  }, [paintScales]);

  /* 화면 폭이 바뀌면 한 칸의 너비도 바뀐다. 크기를 다시 셈한다. */
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const observer = new ResizeObserver(() => scheduleScales());
    observer.observe(track);
    return () => observer.disconnect();
  }, [scheduleScales]);

  /*
   * 스크롤이 멎는 순간을 브라우저에게 직접 듣는다. 시간을 재어 짐작하면 부드러운 스크롤이
   * 아직 미끄러지는 중에 자리를 옮겨, 들어오던 카드가 중간에서 끊긴다.
   *
   * React 에는 이 이벤트를 붙이는 속성이 없어 직접 단다. 이 이벤트를 모르는 브라우저는
   * `SETTLE_DELAY` 시계가 대신 맡는다.
   */
  useEffect(() => {
    const track = trackRef.current;
    if (!track || !("onscrollend" in window)) return;

    /*
     * 그리는 동안에는 흘려보낸다. 프레임마다 `scrollLeft` 를 적으면 브라우저가 그 사이사이
     * 멎었다고 보아 이 이벤트를 던지는데, 그때 가운데로 붙이면 가던 카드가 끌려 돌아온다.
     * 다 그리고 나서 스스로 한 번 던지는 것만 받는다.
     */
    const onScrollEnd = () => {
      if (glide.current !== undefined) return;
      /*
       * 끄는 도중에 손을 잠깐 멈추면 브라우저가 스크롤이 멎었다고 보아 이 이벤트를 던진다.
       * 그때 가운데로 붙이면 붙잡고 있던 카드가 손을 떠난다. 손을 뗄 때 처리한다.
       */
      if (drag.current !== undefined) return;
      settleRef.current();
    };
    track.addEventListener("scrollend", onScrollEnd);
    return () => track.removeEventListener("scrollend", onScrollEnd);
  }, [settleRef]);

  /*
   * 스스로 넘기는 시계. 사람이 넘긴 직후에는 처음부터 다시 센다.
   *
   * 다시 세지 않으면 손으로 넘기자마자 시계가 차서 한 장을 더 넘겨 버린다. 넘긴 카드를
   * 보려는 참에 화면이 또 움직이므로, 사람이 넘긴 쪽이 늘 이기게 둔다.
   */
  const restartAutoplay = useCallback(() => {
    clearInterval(autoplay.current);
    if (!multiple || reduced.current) return;

    autoplay.current = setInterval(() => {
      const track = trackRef.current;
      const card = track?.firstElementChild;
      if (!track || !(card instanceof HTMLElement)) return;
      /*
       * 손을 대고 있거나 아직 미끄러지는 중이면 건너뛴다. 움직이는 도중에 새 목적지를
       * 주면 브라우저가 가던 길을 버리고 새로 출발해, 카드가 중간에서 덜컥 끊긴다.
       */
      if (held.current || selfScrolling.current) return;

      /*
       * 다음 칸의 실제 자리로 보낸다. 폭에 소수점이 섞여 있어 `너비 + 간격` 으로 셈하면
       * 한 칸마다 1px 씩 어긋나고, 그 자리는 스냅 지점이 아니라서 브라우저가 멈춘 뒤
       * 다시 끌어당긴다. 그 보정이 이동 애니메이션을 잡아먹는다.
       */
      const slide = slideAt(track);
      const following = slide + 1;

      // 이 스크롤은 사람이 넘긴 것이 아니므로 시계를 다시 세지 않는다.
      selfScrolling.current = true;

      if (following < track.children.length) {
        scrollToSlideRef.current(following, true);
        return;
      }

      /*
       * 마지막 카드에서는 첫 카드로 되감는다. 한 칸 거리(카드 두 장)면 그대로 미끄러지고,
       * 그보다 멀면 흐렸다가 옮긴다.
       */
      if (slide <= 1) scrollToSlideRef.current(0, true);
      else rewindRef.current();
    }, AUTOPLAY_INTERVAL);
  }, [multiple]);

  useEffect(() => {
    restartAutoplay();
    return () => clearInterval(autoplay.current);
  }, [restartAutoplay]);

  /* 어느 카드가 가운데 왔는지는 스크롤 위치에서 읽는다. */
  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;

    // 미는 동안 계속 크기를 고쳐 그린다. 자리가 정해지기를 기다리지 않는다.
    scheduleScales();

    setCurrent(slideAt(track));

    /*
     * 멎은 뒤의 정리는 스크롤이 완전히 멎은 뒤에 한다. 직접 그리는 동안에는 끝나는 때를
     * 알고 있으니 시계를 걸지 않는다.
     *
     * 마우스로 끌거나 손가락이 화면에 닿아 있는 동안에도 걸지 않는다. 손이 잠깐 멈춘 사이에
     * 시계가 차면 `settle` 이 카드를 가운데로 끌어당겨, 붙잡고 있던 카드가 손을 떠난다.
     * 마우스는 `onPointerUp` 이, 손가락은 손을 뗀 뒤 붙는 동안의 스크롤이 다시 건다.
     */
    clearTimeout(settleTimer.current);
    if (glide.current === undefined && drag.current === undefined && !held.current) {
      settleTimer.current = setTimeout(settle, SETTLE_DELAY);
    }
  };

  /** 스크롤이 멎었다. 본 카드를 남기고 시계를 다시 센다. */
  const settle = () => {
    clearTimeout(settleTimer.current);

    const carouselTrack = trackRef.current;
    if (carouselTrack && !reduced.current) {
      const slide = slideAt(carouselTrack);
      const selected = carouselTrack.children[slide];
      if (
        selected instanceof HTMLElement &&
        Math.abs(carouselTrack.scrollLeft - scrollOf(carouselTrack, selected)) > 1
      ) {
        // 브라우저가 스냅 지점 밖에서 멈췄다면 짧게 가운데로 붙인다.
        dropToSlide(slide);
        return;
      }
    }

    const wasSelf = selfScrolling.current;
    selfScrolling.current = false;

    const trackElement = trackRef.current;
    if (trackElement) {
      const itemIndex = slideAt(trackElement);
      if (itemIndex !== lastSettledItem.current) {
        const item = items[itemIndex];
        if (item) {
          track("curation_slide_viewed", {
            curation_id: item.id,
            position: itemIndex + 1,
            transition: wasSelf ? "autoplay" : "manual",
          });
        }
      }
      lastSettledItem.current = itemIndex;
    }

    // 사람이 넘긴 것이다. 넘긴 카드를 볼 시간을 주도록 시계를 처음부터 다시 센다.
    if (!wasSelf) restartAutoplay();
  };

  /**
   * 마우스로 카드를 붙잡는다.
   *
   * 손가락과 펜은 브라우저가 미는 동작을 그대로 가로 스크롤로 바꿔 주므로 여기서 손대지
   * 않는다. 가로채면 이미 잘 동작하는 관성과 스냅을 직접 흉내내야 한다. 마우스만 그 동작이
   * 없어서 끌어도 아무 일이 일어나지 않으므로, 마우스일 때만 직접 옮긴다.
   */
  const onPointerDown = (event: React.PointerEvent<HTMLUListElement>) => {
    held.current = true;

    const track = trackRef.current;
    if (!track) return;

    /*
     * 사람이 붙잡았으므로 스스로 가던 움직임을 멈춘다. 손가락도 마찬가지다.
     *
     * 그대로 두면 미끄러지는 동작이 프레임마다 `scrollLeft` 를 적어, 손가락이 민 자리를
     * 덮어쓴다. 스스로 넘기는 데 1.5초가 걸리므로 그 사이에 손을 대는 일이 흔하다.
     * 그리는 동안 꺼 둔 스냅도 돌려 놓아야 손가락으로 민 뒤 브라우저가 카드를 붙인다.
     */
    if (glide.current !== undefined) {
      cancelAnimationFrame(glide.current);
      glide.current = undefined;
      track.style.scrollSnapType = "";
    }
    /* 되감느라 흐려지던 중이거나 끝에서 돌아오던 중이면 그 자리에서 멈춘다. */
    for (const animation of track.getAnimations?.() ?? []) animation.cancel();
    selfScrolling.current = false;

    if (event.pointerType !== "mouse" || event.button !== 0) return;

    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScroll: track.scrollLeft,
      startSlide: slideAt(track),
      startedAt: event.timeStamp,
      moved: false,
    };

    /*
     * 끄는 동안에는 스냅을 끈다. 켜 두면 옮겨 적은 자리를 스냅이 곧바로 가까운 칸으로
     * 끌어당겨, 끈 만큼 따라오지 않고 칸에서 칸으로 튄다.
     */
    track.style.scrollSnapType = "none";
  };

  /** 끈 거리만큼 목록을 옮긴다. */
  const onPointerMove = (event: React.PointerEvent<HTMLUListElement>) => {
    const track = trackRef.current;
    const active = drag.current;
    if (!track || !active || active.pointerId !== event.pointerId) return;

    const moved = event.clientX - active.startX;
    /*
     * 몇 px 안쪽의 움직임은 누름으로 본다. 누를 때 손이 미세하게 흔들리는 것까지 끌기로
     * 받으면, 카드를 눌러 상세 화면으로 갈 때마다 목록이 조금씩 밀린다.
     */
    if (!active.moved && Math.abs(moved) < DRAG_THRESHOLD) return;

    if (!active.moved) {
      active.moved = true;
      /*
       * 이 시점에 포인터를 붙들어 둔다. 목록 밖으로 나가도 끌기가 이어지고, 브라우저가
       * 카드의 그림을 집어 드는 기본 동작도 함께 막힌다.
       */
      track.setPointerCapture(event.pointerId);
    }

    /* 끈 방향과 반대로 목록이 흘러야 붙잡은 카드가 손을 따라온다. */
    const wanted = active.startScroll - moved;
    const max = track.scrollWidth - track.clientWidth;
    /* 범위를 잴 수 없으면(그리기 전) 끝을 따지지 않는다. */
    if (max <= 0) {
      track.scrollLeft = wanted;
      return;
    }

    /*
     * 처음과 끝 밖으로 끈 만큼은 스크롤 대신 목록을 옮겨 보인다. 더 끌수록 덜 따라오고
     * `EDGE_PULL` 에 다가가기만 한다. 스크롤 값은 끝에 묶어 둔다.
     */
    const over = wanted < 0 ? wanted : Math.max(0, wanted - max);
    track.scrollLeft = wanted - over;
    const pull = -Math.sign(over) * EDGE_PULL * (1 - Math.exp(-Math.abs(over) / EDGE_PULL));
    const pulled = over === 0 ? "" : `translate3d(${pull}px, 0, 0)`;
    if (track.style.transform !== pulled) track.style.transform = pulled;
  };

  /** 손을 뗐다. 가장 가까운 칸으로 붙여 준다. */
  const onPointerUp = (event: React.PointerEvent<HTMLUListElement>) => {
    held.current = false;

    const track = trackRef.current;
    const finished = drag.current;
    drag.current = undefined;
    if (!track || !finished || finished.pointerId !== event.pointerId) return;

    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
    releaseEdgePull(track);

    /* 끌지 않고 누르기만 했다면 자리를 건드리지 않는다. 껐던 스냅만 돌려 놓는다. */
    if (!finished.moved) {
      track.style.scrollSnapType = "";
      return;
    }

    /*
     * 끌었다. 뒤따라오는 클릭 한 번을 링크가 무시하게 표시해 둔다.
     * 그 클릭이 지나간 뒤에 스스로 풀어, 다음 누름은 정상으로 받는다.
     */
    dragged.current = true;
    setTimeout(() => {
      dragged.current = false;
    }, 0);

    /*
     * 스냅은 여기서 돌려 놓지 않는다. 이어지는 `scrollToSlide` 가 프레임마다 스크롤을 적는
     * 동안 스냅이 켜져 있으면 그 자리를 곧바로 가까운 칸으로 끌어당겨, 붙는 움직임이
     * 무효가 된다. 그 함수가 다 그린 뒤에 스스로 돌려 놓는다.
     */

    /*
     * 넘길지 제자리로 돌아갈지 정한다.
     *
     * 가장 가까운 칸을 고르면 한 칸의 절반을 넘겨야 넘어가는데, 카드가 화면 폭에 가까워서
     * 그 절반이 멀다. 끌기 시작한 칸에서 한 칸 간격의 `DRAG_SWITCH_RATIO` 만큼만 움직였으면
     * 넘긴 것으로 본다. 그만큼 움직이지 않았어도 빠르게 튕겼으면 넘긴다. 둘 다 아니면
     * 시작한 칸으로 되돌린다.
     *
     * `scrollToSlide` 는 끝에서 `scrollend` 를 스스로 던지므로 `settle` 까지 이어진다.
     */
    const step = slideStep(track);
    /* 끈 거리는 스크롤이 움직인 값으로 읽는다. 포인터 좌표는 붙들기 전후로 기준이 다르다. */
    const shifted = track.scrollLeft - finished.startScroll;
    const from = finished.startSlide;

    /* 짧게 튕긴 동작은 거리가 아니라 속도로 본다. 누른 순간부터 뗀 순간까지의 평균이다. */
    const velocity = Math.abs(shifted) / Math.max(1, event.timeStamp - finished.startedAt);
    const far = step > 0 && Math.abs(shifted) >= step * DRAG_SWITCH_RATIO;
    const flicked = Math.abs(shifted) >= DRAG_THRESHOLD && velocity > FLICK_VELOCITY;

    let target = from;
    if (far || flicked) target = from + (shifted > 0 ? 1 : -1);

    /* 처음과 끝 밖으로는 나가지 않는다. 그 바깥은 카드가 없다. */
    const last = track.children.length - 1;
    dropToSlide(Math.min(last, Math.max(0, target)));
  };

  /** 끌기가 중간에 끊겼다. 잡고 있던 것을 놓고 스냅을 되돌린다. */
  const onPointerCancel = (event: React.PointerEvent<HTMLUListElement>) => {
    /*
     * 손가락으로 밀기 시작하면 브라우저가 가로 스크롤을 넘겨받으며 이 이벤트를 보낸다.
     * 손은 아직 화면에 있으므로 붙잡은 상태를 풀지 않는다. 손을 떼는 것은 `onTouchEnd` 가 안다.
     */
    if (event.pointerType !== "touch") held.current = false;

    const track = trackRef.current;
    const stopped = drag.current;
    drag.current = undefined;
    if (!track || !stopped) return;

    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
    releaseEdgePull(track);
    track.style.scrollSnapType = "";
  };

  /**
   * 손가락을 뗐다.
   *
   * 손가락으로 밀면 `pointerup` 대신 `pointercancel` 이 오고, 그때는 아직 손이 화면에 있다.
   * 손이 실제로 떨어지는 때는 이 이벤트만 알려 준다. 가운데로 붙이는 일은 뒤이어 오는
   * `scrollend` 가 맡는다.
   */
  const onTouchEnd = (event: React.TouchEvent<HTMLUListElement>) => {
    if (event.touches.length === 0) held.current = false;
  };

  /* 붙여 둔 이벤트가 늘 최신 것을 부르도록 그린 뒤에 담아 둔다. */
  useEffect(() => {
    settleRef.current = settle;
    scrollToSlideRef.current = scrollToSlide;
    rewindRef.current = rewind;
  });

  /*
   * 큐레이션이 하나도 없으면 빈 카드 한 장으로 자리를 지킨다.
   *
   * 통째로 비우면 아래의 인기 검색어부터가 위로 올라붙어, 큐레이션이 들어오는 순간 화면이
   * 한 번 밀린다. 자리를 미리 잡아 두면 그 밀림이 없다.
   *
   * 여기는 아직 받아 오는 중인지 정말 하나도 없는지를 가리지 않는다. 어느 쪽이든 사람이
   * 할 일이 없는 자리라 읽어 줄 것도 없으므로, 낭독기에서는 통째로 숨긴다.
   */
  if (items.length === 0) {
    return (
      <section aria-label="큐레이션" aria-hidden="true">
        <div className="relative -mx-4">
          {/* 칸과 카드의 크기는 아래 목록과 같게 두어 자리가 어긋나지 않게 한다. */}
          <div className="px-4">
            <div className="bg-surface aspect-[15/8] w-full animate-pulse rounded-[18px]" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} aria-label="큐레이션">
      {/*
        카드를 본문 폭의 90% 로 두고 남은 10% 를 좌우로 나눠, 앞뒤 카드가 양쪽에 똑같이 걸친다.
        상대 크기라 화면이 좁아져도 걸치는 비율이 그대로 유지된다.

        `vw` 가 아니라 이 자리의 폭을 기준으로 삼는다. 본문은 넓은 화면에서 28rem 으로
        묶이므로, `vw` 를 쓰면 그보다 넓어졌을 때 카드가 본문 밖으로 자란다.

        자리 표시를 카드 기준으로 놓으려면 목록과 같은 상자를 재야 한다. 목록은 좌우로
        삐져나와 있어(-mx-4) 섹션과 폭이 다르므로, 한 겹 감싸 그 상자를 기준으로 삼는다.
      */}
      <div className="relative -mx-4">
        <ul
          ref={trackRef}
          onScroll={onScroll}
          /*
           * 끌고 있는 동안에만 멈춘다. 손이 얹혀 있다고 멈추면 마우스를 캐러셀 위에 둔 채
           * 다른 일을 하는 사람에게는 영영 넘어가지 않는다.
           *
           * 마우스로 끄는 자리도 이 이벤트들이 함께 맡는다. 손가락과 펜은 브라우저의 기본
           * 동작을 그대로 쓴다.
           */
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
          /*
           * 직접 그리는 동안에는 스냅을 끈다. 손가락으로 넘길 때는 브라우저가 카드를 가운데에 붙인다.
           *
           * 칸의 높이는 가장 높은 카드에 맞춘다. 글자 크기 설정을 키우면 글자가 긴 카드만
           * 세로로 자라는데, 그대로 두면 카드마다 높이가 달라 넘길 때마다 들쭉날쭉해진다.
           */
          className="curation-track scrollbar-none flex snap-x snap-mandatory items-stretch gap-2 overflow-x-auto px-4"
        >
          {items.map((curation, slideIndex) => {
            return (
              /*
                칸의 폭은 목록의 안쪽 폭을 그대로 쓴다. 안쪽 폭은 이미 좌우 여백을 뺀 값이라
                여기서 또 빼면 두 번 빠진다. 여백이 고정이라 칸의 자리도 딱 떨어진다.
              */
              <li key={curation.id} className="w-full shrink-0 snap-center">
                {/*
                  가운데 카드를 키우는 대신 옆 카드를 줄인다.

                  키우면 자란 만큼 양옆으로 번져 나가 카드 사이의 8px 이 먹힌다. 줄이는 쪽은
                  자리를 그대로 두고 물러나므로 간격이 먹히지 않는다.

                  크기와 줄어드는 방향은 스크롤 위치를 보고 `paintScales` 가 직접 적는다.
                  미는 만큼 조금씩 자라야 해서 자리마다 정해진 값을 줄 수 없다.
                */}
                {/*
                  카드 전체가 상세로 가는 링크다. 그림과 글자 어디를 눌러도 같은 곳으로 간다.

                  끌어서 목록을 넘긴 뒤에는 이동하지 않는다. 브라우저는 끌기가 끝난 자리에서도
                  클릭을 한 번 보내는데, 그대로 두면 카드를 밀 때마다 상세 화면이 열린다.

                  옆에 걸친 카드를 누르면 상세로 가지 않고 그 카드를 가운데로 데려온다. 걸친
                  카드는 대개 넘기려고 누른 것이라, 곧바로 상세가 열리면 뜻밖이다. 키보드로
                  옆 카드에 초점을 옮기면 브라우저가 그 카드를 화면 안으로 스크롤하므로,
                  가운데 온 뒤에 누르면 상세로 간다.
                */}
                <Link
                  href={`/curations/${curation.id}`}
                  onClick={(event) => {
                    if (dragged.current) {
                      event.preventDefault();
                      return;
                    }
                    /* 자리 표시(`current`)는 다시 그린 뒤에야 바뀌므로 스크롤 위치를 직접 읽는다. */
                    const carouselTrack = trackRef.current;
                    if (carouselTrack && slideAt(carouselTrack) !== slideIndex) {
                      event.preventDefault();
                      // 사람이 넘긴 것이다. 멎으면 `settle` 이 시계를 처음부터 다시 센다.
                      selfScrolling.current = false;
                      dropToSlide(slideIndex);
                      return;
                    }
                    track("curation_opened", { curation_id: curation.id, position: slideIndex + 1, surface: "home" });
                  }}
                  /*
                    카드를 칸의 높이까지 늘인다. 옆 카드가 더 높으면 그 높이에 맞춘다.

                    카드에 `h-full` 을 직접 주면 그 높이가 비율보다 앞서서, 아래에 적은 최소 높이
                    동작이 꺼진다. 링크를 칸 높이의 flex 상자로 두고 카드는 그 안에서 늘어나게 해야
                    카드의 최소 높이를 비율과 글자가 그대로 정한다.
                  */
                  className="flex h-full"
                  /*
                    링크는 브라우저가 기본으로 끌어 옮길 수 있는 요소다. 그대로 두면 마우스로 카드를
                    끄는 순간 링크 끌기가 시작되고 `pointercancel` 이 와서, 목록을 미는 동작이
                    몇 px 만에 끊긴다. 그림에 준 것과 같은 까닭이다.
                  */
                  draggable={false}
                >
                  {/*
                    비율은 최소 높이로만 쓴다. 글자가 카드에 다 들어가지 않으면 그만큼 세로로 자란다.

                    `aspect-ratio` 는 본래 내용이 넘치면 그만큼 높아지는데, `overflow-hidden` 이면
                    이 동작이 꺼져 높이가 고정되고 넘친 제목이 위로 잘린다. 기기의 글자 크기 설정을
                    키우면 1.9배쯤부터 그렇게 된다. `overflow-clip` 은 둥근 모서리 밖을 똑같이
                    잘라 내면서도 이 동작을 지킨다.
                  */}
                  <article className="curation-card relative flex aspect-[15/8] w-full flex-col justify-end overflow-clip rounded-[18px] px-5 py-4">
                    {/*
                      그림을 끌어도 브라우저가 그것을 집어 들지 않게 한다. 그대로 두면 마우스로
                      카드를 끄는 순간 그림 옮기기가 시작되어, 목록을 미는 동작이 끊긴다.
                    */}
                    <Image
                      src={imageDeliveryUrl(curation.thumbnailImageUrl)}
                      alt=""
                      fill
                      sizes="(max-width: 480px) 90vw, 420px"
                      {...(slideIndex === 0 ? { priority: true } : { loading: "eager" as const })}
                      draggable={false}
                      className="object-cover select-none"
                    />

                    {/*
                      그림 위에 덮는 막을 두지 않아 썸네일이 그대로 보인다. 그래서 글자는 흰색이
                      아니라 짙은 색을 쓴다. 밝은 톤의 그림을 전제로 고른 색이다.
                    */}
                    <div className="relative flex flex-col gap-1.5">
                      <h3 className="text-[18px] leading-[1.28] font-bold whitespace-pre-line text-[#522B45]">
                        {curation.title}
                      </h3>
                      {/*
                        제목과 마찬가지로 문구에 넣어 둔 줄바꿈을 그대로 살린다.

                        오른쪽은 자리 표시(`n / N`)가 놓이는 자리라 비워 둔다. 문구와 자리 표시는
                        같은 줄 높이에 놓이므로, 비워 두지 않으면 긴 문구의 끝이 자리 표시 밑으로
                        들어간다. 비우는 폭은 자리 표시의 폭(글자 `10 / 10` 이 들어가는 3.5em,
                        좌우 안쪽 여백 16px, 테두리 2px)에 사이 간격 8px 을 더한 값이다. 둘 다
                        11px 글자라 `em` 으로 잡으면 글자 크기 설정을 키워도 함께 넓어진다.
                      */}
                      <p className="pr-[calc(3.5em+26px)] text-[11px] whitespace-pre-line text-[#624255]">
                        {curation.description}
                      </p>
                    </div>
                  </article>
                </Link>
              </li>
            );
          })}
        </ul>

        {/*
          자리 표시는 카드와 함께 흐르지 않고 제자리에 머문다. 카드 안에 두면 넘길 때
          그림·제목과 같이 밀려 나가 숫자가 둘로 보인다.

          가운데 카드는 줄지 않아 제 크기 그대로다. 오른쪽 가장자리는 이 자리의 오른쪽에서
          좌우 여백(16px)만큼 들어온 곳이고, 거기서 카드 좌우 안쪽 여백(20px)만큼 더 들인다.
        */}
        {items.length > 1 ? (
          /*
            숫자를 그림 위에 바로 얹으면 그림의 밝기에 따라 읽히는 정도가 달라진다. 반투명한
            판을 깔아 어떤 그림 위에서도 같은 또렷함을 유지한다.

            판을 옅게 두는 대신 뒤를 더 흐리게 한다. 농도만으로 글자를 받치면 판이 그림 위에
            짙은 덩어리로 얹혀 혼자 튀어 보인다. 흐림은 뒤의 무늬만 지우고 밝기는 그대로
            두므로, 판이 그림에 묻히면서도 글자가 놓인 자리는 차분해진다.

            글자에 옅은 그림자를 함께 둔다. 판이 옅어진 만큼 밝은 그림 위에서 흰 글자의
            대비가 얕아지는데, 그림자가 획의 경계를 잡아 준다. 테두리는 판의 경계를 알린다.
          */
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-9 bottom-4 rounded-full border border-white/25 bg-black/35 px-2 py-0.5 text-[11px] font-bold tracking-[0.2px] text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.55)] backdrop-blur-md"
          >
            {current + 1} / {items.length}
          </span>
        ) : null}
      </div>

      {/* 어느 자리에 있는지 글자로도 전한다. 위 표시는 그림과 겹쳐 있어 낭독기에서 감춘다. */}
      <p aria-live="polite" className="sr-only">
        큐레이션 {current + 1} / {items.length}
      </p>
    </section>
  );
}
