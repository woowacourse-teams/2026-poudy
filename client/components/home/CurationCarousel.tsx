"use client";

import type { CurationSummaryResponse } from "@poudy/api/api.zod";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

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

/** 가운데에서 한 칸 벗어난 카드가 줄어드는 정도. 가운데는 1, 옆은 0.95 다. */
const MIN_SCALE = 0.95;

/**
 * 목록 좌우 여백(px). 이만큼이 앞뒤 카드가 걸치는 자리다.
 *
 * `%` 로 두면 화면 폭에 따라 소수점이 생기고, 칸의 자리도 딱 떨어지지 않는다. 그러면
 * 스크롤 값이 스냅 지점에서 몇 px 어긋나고, 브라우저는 이미 다 왔다고 보아 미끄러지기를
 * 건너뛴다. 고정 px 이면 그런 어긋남이 없다.
 */
const SIDE_PADDING = 32;

/**
 * 가운데 칸 양옆에 두는 여유분 수.
 *
 * 순서를 돌리는 일은 스크롤이 멎은 뒤에만 한다. 손가락으로 빠르게 여러 칸을 밀면 멎기
 * 전에 여러 칸을 지나므로, 한 장만 두면 끝에 닿는다. 두 장씩 두어 미끄러지는 동안에도
 * 갈 곳이 남게 한다.
 */
const SPARE = 2;

/**
 * 가운데 칸이 첫 카드를 가리키도록 세운 처음 순서.
 *
 * 카드가 여유분보다 적으면 같은 카드가 여러 자리에 선다. 나머지 연산으로 돌려 담아
 * 개수와 상관없이 자리가 비지 않게 한다.
 */
const initialOrder = (count: number): readonly number[] => {
  if (count === 0) return [];
  if (count === 1) return [0];

  return Array.from({ length: SPARE * 2 + 1 }, (_, slot) => (slot - SPARE + count * SPARE) % count);
};

/**
 * 디자인 S01 의 큐레이션 캐러셀.
 *
 * 처음과 끝이 이어지도록 앞뒤에 카드를 한 장씩 복제해 둔다. 복제한 자리에 닿으면
 * 애니메이션 없이 같은 그림의 진짜 자리로 옮겨, 사용자에게는 끝없이 도는 것으로 보인다.
 *
 * 자리 이동은 스크롤로 한다. 손가락과 휠, 키보드가 모두 브라우저의 기본 동작을 쓴다.
 *
 * 상세 화면(#451)이 아직 없다. 생기기 전까지는 카드를 눌러도 이동하지 않는다.
 */
export function CurationCarousel({ items }: CurationCarouselProps) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [current, setCurrent] = useState(0);
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
  /* 되돌리느라 옮긴 스크롤인지. 그 한 번은 자리 표시를 다시 세지 않는다. */
  const recentering = useRef(false);
  /*
   * 멎었을 때 할 일을 담아 둔다. 이벤트를 한 번만 달아 두고 그때그때 최신 것을 부르려면
   * 함수를 그대로 넘길 수 없다. 넘기면 처음 그릴 때의 낡은 값을 계속 붙들고 있는다.
   */
  const settleRef = useRef<() => void>(() => {});
  /* 시계 안에서 부르는 함수. 그릴 때마다 새로 만들어지므로 ref 로 최신 것을 붙든다. */
  const scrollToSlideRef = useRef<(slideIndex: number, smooth: boolean) => void>(() => {});

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
    const second = track?.children[1];
    if (!track || !(first instanceof HTMLElement)) return;

    /* 한 칸의 너비도 셈하지 않고 실제 두 칸의 거리에서 얻는다. */
    const step = second instanceof HTMLElement ? second.offsetLeft - first.offsetLeft : first.offsetWidth;
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
      const size = 1 - (1 - MIN_SCALE) * distance;
      box.style.transform = `scale3d(${size}, ${size}, 1)`;

      /*
       * 글자에는 거꾸로 되돌리는 크기를 걸어 실제 크기를 늘 1 로 둔다.
       *
       * 카드가 조금씩 커지고 작아지는 동안 글자도 따라 크기가 바뀌면, 브라우저가 그때마다
       * 획을 새로 그린다. 획이 픽셀 경계에 걸치는 방식이 달라져 글자가 떨려 보인다.
       * 자리와 크기를 재 보면 어긋남이 없는데도 눈에는 띈다.
       *
       * 그림과 배경만 커지고 글자는 제 크기를 지킨다. 카드가 커 보이는 효과는 그대로다.
       */
      const text = box.querySelector<HTMLElement>("[data-curation-text]");
      if (text) text.style.transform = `scale3d(${1 / size}, ${1 / size}, 1)`;
      /*
       * 줄어드는 쪽이 가운데를 마주 보는 가장자리를 붙들어야 그 사이 간격이 변하지 않는다.
       * 가운데를 지나는 순간 기준이 뒤집히는데, 그 자리에서는 이미 제 크기라 튀지 않는다.
       */
      box.style.transformOrigin = child.offsetLeft + child.offsetWidth / 2 < center ? "right center" : "left center";
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

  const loop = items.length > 1;

  /*
   * 보이는 카드의 순서. 끝에 닿아 되감는 대신 이 순서를 돌려 원통처럼 이어 간다.
   *
   * 맨 앞 카드를 떼어 뒤에 붙이면 카드가 한 칸 왼쪽으로 밀린다. 그만큼 스크롤도 뒤로
   * 당기면 둘이 상쇄되어 가운데 카드가 화면에서 제자리에 남는다. 스크롤이 완전히 멎은
   * 뒤에만 하므로 눈에는 아무 변화가 없다.
   */
  const [order, setOrder] = useState<readonly number[]>(() => initialOrder(items.length));
  /*
   * 지금 순서를 곧바로 읽을 자리. `setOrder` 는 다시 그린 뒤에야 반영되는데, 되돌린 직후의
   * 스크롤은 그 전에 온다. 그때 낡은 순서를 보면 자리 표시가 한 칸 어긋난다.
   */
  const orderRef = useRef(order);

  /* 자리마다 고른 카드. 여유분이 있어 양 끝에서도 이웃이 보인다. */
  const slides = order.map((itemIndex) => items[itemIndex]);

  const scrollToSlide = (slideIndex: number, smooth: boolean) => {
    const track = trackRef.current;
    const target = track?.children[slideIndex];
    if (!track || !(target instanceof HTMLElement)) return;

    /*
     * 좌우 여백이 고정 px 이라 칸의 자리도 딱 떨어진다. 첫 칸의 자리를 빼면 그 칸을
     * 가운데로 보내는 스크롤 값이 그대로 나온다.
     */
    const to = target.offsetLeft - SIDE_PADDING;

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

    const startedAt = performance.now();
    /*
     * 그리는 동안에는 스냅을 끈다.
     *
     * 켜 두면 프레임마다 적어 넣은 자리를 스냅이 곧바로 가까운 칸으로 튕겨내, 중간 값이
     * 전부 무시되고 몇 단계만 건너뛴 것처럼 보인다. `proximity` 로 낮춰도 마찬가지다.
     * 다 그린 뒤에 돌려 놓는다.
     */
    track.style.scrollSnapType = "none";

    const step = (now: number) => {
      const ratio = Math.min(1, (now - startedAt) / GLIDE_DURATION);
      /*
       * 시작과 끝이 모두 느리고 가운데가 빠른 커브다.
       *
       * 끝만 느린 커브를 쓰면 처음 10분의 1 만에 거리의 3분의 1 을 가버리고 뒷부분은
       * 멈춘 듯 기어가, 앞은 튀고 끝은 끊긴 것처럼 보인다. 긴 시간을 들일수록 그 치우침이
       * 눈에 띈다. 양끝을 고르게 두어야 한 번의 움직임으로 읽힌다.
       */
      const eased = ratio < 0.5 ? 4 * ratio ** 3 : 1 - Math.pow(-2 * ratio + 2, 3) / 2;
      track.scrollLeft = from + (to - from) * eased;

      if (ratio < 1) {
        glide.current = requestAnimationFrame(step);
        return;
      }

      glide.current = undefined;
      /*
       * 스냅은 자리를 되돌린 뒤에 켠다. 여기서 켜면 방금 도착한 자리가 스냅 지점이 아니라
       * 브라우저가 가까운 칸으로 끌어당겨, 가던 카드가 도로 밀려난다.
       */
      track.dispatchEvent(new Event("scrollend"));
      track.style.scrollSnapType = "";
    };

    glide.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    reduced.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    // 여유분을 앞에 둔 만큼 들어가 가운데 칸에서 시작한다.
    if (loop) scrollToSlide(SPARE, false);
    // 첫 화면에도 가운데 카드가 제 크기로 서 있어야 한다.
    paintScales();

    return () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
      if (glide.current !== undefined) cancelAnimationFrame(glide.current);
    };
  }, [loop, paintScales]);

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
     * 멎었다고 보아 이 이벤트를 던지는데, 그때 자리를 되돌리면 가던 카드가 끌려 돌아온다.
     * 다 그리고 나서 스스로 한 번 던지는 것만 받는다.
     */
    const onScrollEnd = () => {
      if (glide.current !== undefined) return;
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
    if (!loop || reduced.current) return;

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
      const next = slideAt(track) + 1;
      if (next >= track.children.length) return;

      // 이 스크롤은 사람이 넘긴 것이 아니므로 시계를 다시 세지 않는다.
      selfScrolling.current = true;
      scrollToSlideRef.current(next, true);
    }, AUTOPLAY_INTERVAL);
  }, [loop]);

  useEffect(() => {
    restartAutoplay();
    return () => clearInterval(autoplay.current);
  }, [restartAutoplay]);

  /**
   * 가운데 칸으로 되돌리면서 카드 순서를 그만큼 돌린다.
   *
   * 밀려난 칸 수만큼 순서를 돌리고 스크롤도 같은 만큼 되돌린다. 둘이 상쇄되어 가운데
   * 카드는 화면에서 제자리에 남고, 스크롤 위치는 늘 가운데 칸 언저리에 머문다.
   * 끝에 닿는 일이 없으므로 되감기도 없다.
   *
   * 크기는 React 가 다시 그리기를 기다리지 않고 곧바로 고쳐 적는다. 한 프레임이라도
   * 어긋나면 카드 크기가 순간 뒤바뀐 것으로 보인다.
   */
  const recenter = () => {
    const track = trackRef.current;
    if (!track) return;

    const slide = slideAt(track);
    if (slide === SPARE) return;

    /*
     * 가운데 설 카드를 기준으로 순서를 새로 세운다. 자리 수가 카드 수의 배수가 아니어서
     * 배열을 통째로 돌리면 같은 카드가 두 자리에 겹쳐 한 장이 건너뛰어진다.
     */
    const previous = orderRef.current;
    const center = previous[Math.min(previous.length - 1, Math.max(0, slide))];
    const next = previous.map((_, slot) => (center + slot - SPARE + items.length * SPARE) % items.length);

    /* 뒤따라오는 스크롤이 곧바로 읽도록 먼저 담아 둔다. */
    orderRef.current = next;

    /*
     * 순서를 화면에 먼저 그려 놓고 스크롤을 옮긴다.
     *
     * 그냥 두면 `setOrder` 는 다음 그림에 반영되는데 스크롤은 그 자리에서 옮겨진다.
     * 그 한 프레임 동안 자리는 새 자리인데 카드는 옛 순서라, 그림과 글자가 서로 다른
     * 큐레이션을 가리키는 것이 눈에 스친다.
     */
    flushSync(() => {
      setOrder(next);
      /* 순서가 돌아도 가운데 카드는 그대로다. 자리 표시도 그 카드를 가리키게 맞춘다. */
      setCurrent(center);
    });

    /* 이 스크롤이 깨우는 `onScroll` 은 자리 표시를 건드리지 않게 표시해 둔다. */
    recentering.current = true;
    scrollToSlide(SPARE, false);
    paintScales();
  };

  /* 어느 카드가 가운데 왔는지는 스크롤 위치에서 읽는다. */
  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;

    // 미는 동안 계속 크기를 고쳐 그린다. 자리가 정해지기를 기다리지 않는다.
    scheduleScales();

    /*
     * 되돌리느라 옮긴 스크롤이면 자리 표시를 건드리지 않는다.
     *
     * 되돌릴 때 이미 가운데 카드를 정해 표시까지 맞춰 두었다. 그 스크롤이 이 자리를 다시
     * 깨우는데, 그때 위치로 다시 세면 한 프레임 동안 옆 카드를 가리켜 글자가 스쳐 보인다.
     */
    if (recentering.current) {
      recentering.current = false;
    } else {
      const slide = slideAt(track);
      /* 순서는 방금 바뀌었을 수 있어 ref 에서 읽는다. 그리기 전의 값을 쓰면 한 칸 어긋난다. */
      const live = orderRef.current;
      setCurrent(live[Math.min(live.length - 1, Math.max(0, slide))] ?? 0);
    }

    /*
     * 순서를 돌리는 일은 스크롤이 완전히 멎은 뒤에 한다. 가는 도중에 손대면 카드가
     * 되돌아온다. 직접 그리는 동안에는 끝나는 때를 알고 있으니 시계를 걸지 않는다.
     */
    clearTimeout(settleTimer.current);
    if (glide.current === undefined) settleTimer.current = setTimeout(settle, SETTLE_DELAY);
  };

  /** 스크롤이 멎었다. 자리를 되돌리고 시계를 다시 센다. */
  const settle = () => {
    clearTimeout(settleTimer.current);

    const wasSelf = selfScrolling.current;
    selfScrolling.current = false;

    if (loop) recenter();

    // 사람이 넘긴 것이다. 넘긴 카드를 볼 시간을 주도록 시계를 처음부터 다시 센다.
    if (!wasSelf) restartAutoplay();
  };

  /* 붙여 둔 이벤트가 늘 최신 것을 부르도록 그린 뒤에 담아 둔다. */
  useEffect(() => {
    settleRef.current = settle;
    scrollToSlideRef.current = scrollToSlide;
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
          <div className="px-8">
            <div className="bg-surface h-52 w-full animate-pulse rounded-[18px]" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="큐레이션">
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
           */
          onPointerDown={() => (held.current = true)}
          onPointerUp={() => (held.current = false)}
          onPointerCancel={() => (held.current = false)}
          /*
            스냅은 `mandatory` 가 아니라 `proximity` 로 둔다. `mandatory` 는 프레임마다
            옮겨 놓은 자리를 곧바로 제 자리로 끌어당겨, 직접 그리는 움직임을 무효로 만든다.
            `proximity` 는 손가락으로 훑다 놓았을 때만 가까운 칸에 붙여 준다.
          */
          className="curation-track scrollbar-none flex snap-x snap-proximity items-center gap-2 overflow-x-auto px-8"
        >
          {slides.map((curation, slideIndex) => {
            return (
              /*
                자리를 key 로 쓴다. 순서가 돌아도 자리는 그대로이므로 React 가 요소를
                새로 만들지 않는다. 카드 ID 를 key 로 두면 돌 때마다 요소가 다시 생겨
                그림을 처음부터 다시 받고, 받는 동안 카드가 한 번 비어 보인다.

                칸의 폭은 목록의 안쪽 폭을 그대로 쓴다. 안쪽 폭은 이미 좌우 여백을 뺀 값이라
                여기서 또 빼면 두 번 빠진다. 여백이 고정이라 칸의 자리도 딱 떨어진다.
              */
              <li key={slideIndex} className="w-full shrink-0 snap-center">
                {/*
                  가운데 카드를 키우는 대신 옆 카드를 줄인다.

                  키우면 자란 만큼 양옆으로 번져 나가 카드 사이의 8px 이 먹힌다. 줄이는 쪽은
                  자리를 그대로 두고 물러나므로 간격이 먹히지 않는다.

                  크기와 줄어드는 방향은 스크롤 위치를 보고 `paintScales` 가 직접 적는다.
                  미는 만큼 조금씩 자라야 해서 자리마다 정해진 값을 줄 수 없다.
                */}
                <article className="curation-card relative flex h-52 flex-col justify-end overflow-hidden rounded-[18px] p-5">
                  <Image
                    src={curation.thumbnailImageUrl}
                    alt=""
                    fill
                    sizes="(max-width: 480px) 90vw, 420px"
                    {...(slideIndex === SPARE ? { priority: true } : { loading: "eager" as const })}
                    className="object-cover"
                  />

                  {/*
                    카드가 커지는 만큼 이 덩어리는 거꾸로 줄어 실제 크기가 1 로 유지된다.
                    `paintScales` 가 그 값을 적는다. 왼쪽 아래를 붙들어 두어야 글자가
                    제자리에 남는다.

                    그림 위에 덮는 막을 두지 않아 썸네일이 그대로 보인다. 그래서 글자는 흰색이
                    아니라 짙은 색을 쓴다. 밝은 톤의 그림을 전제로 고른 색이다.
                  */}
                  <div data-curation-text className="relative flex origin-bottom-left flex-col gap-1.5">
                    <h3 className="text-[18px] leading-[1.28] font-bold whitespace-pre-line text-[#522B45]">
                      {curation.title}
                    </h3>
                    <p className="text-[11px] text-[#624255]">{curation.description}</p>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>

        {/*
          자리 표시는 카드와 함께 흐르지 않고 제자리에 머문다. 카드 안에 두면 넘길 때
          그림·제목과 같이 밀려 나가 숫자가 둘로 보인다.

          가운데 카드는 줄지 않아 제 크기 그대로다. 오른쪽 가장자리는 이 자리의 오른쪽에서
          `9.5%`(좌우 여백과 이웃이 걸친 만큼) 들어온 곳이고, 거기서 카드 안쪽 여백만큼 더 들인다.
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
            className="pointer-events-none absolute right-[calc(9.5%+20px)] bottom-5 rounded-full border border-white/25 bg-black/35 px-2 py-0.5 text-[11px] font-bold tracking-[0.2px] text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.55)] backdrop-blur-md"
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
