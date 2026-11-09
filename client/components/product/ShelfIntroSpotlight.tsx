"use client";

import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { isInGuestShelf } from "@/lib/api/guest-shelf";
import { useScrollLock } from "@/lib/hooks/useScrollLock";
import { hasSeenShelfIntro, rememberShelfIntroSeen } from "@/lib/storage/shelf-intro";

type Step = "save" | "unsuitable";

type Rect = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly radius: string;
};

type Focus = { readonly step: Step; readonly rect: Rect };

const SELECTOR = {
  image: '[data-shelf-intro="image"]',
  save: '[data-shelf-intro="save"]',
  unsuitable: '[data-shelf-intro="unsuitable"]',
} as const;

const START_DELAY_MS = 400;
const PRESS_MS = 900;
const FLY_MS = 1050;
const FLY_DURATION_MS = 650;
const BUMP_MS = 1700;
const NEXT_STEP_MS = 2000;
const COMPLETE_MS = 4300;
const COMPLETE_WITHOUT_CARD_MS = 2600;

const BUBBLE_ROOM = 120;
const SEAM = 1;
const FLY_SIZE = 56;

const BOT_AGENT = /bot|crawler|spider|yeti|daumoa|\bdaum\/|lighthouse|headless/i;

const HOLE = ".spotlight-hole";

const element = (selector: string) => document.querySelector<HTMLElement>(selector) ?? undefined;

const measure = (target: HTMLElement): Rect => {
  const rect = target.getBoundingClientRect();
  return {
    left: rect.left + SEAM,
    top: rect.top + SEAM,
    width: rect.width - SEAM * 2,
    height: rect.height - SEAM * 2,
    radius: window.getComputedStyle(target).borderRadius,
  };
};

const isInViewport = (target: HTMLElement) => {
  const rect = target.getBoundingClientRect();
  return rect.top >= 0 && rect.bottom <= window.innerHeight;
};

const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

const centerOf = (rect: DOMRect) => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });

/*
 * 제품 상세 첫 방문의 파우치 소개(#1118 후속). 화면을 어둡게 덮고 [파우치에 저장]을 비춘 뒤,
 * 썸네일이 버튼으로 들어가고 "나와 안 맞는 성분" 카드로 넘어간 뒤 자동으로 닫힌다.
 * 기기마다 한 번 띄우고, 떠 있는 동안 화면의 나머지는 inert 로 막아 하단의 건너뛰기 버튼만 누를 수 있다. Esc 로도 닫는다.
 * 뜰 때 포커스를 닫기로 옮기고, 닫히면 원래 자리로 돌려준다.
 */
type ShelfIntroSpotlightProps = {
  readonly eligible: boolean;
  /** 로그인 전에 이 탭의 비로그인 파우치에 이미 담은 제품이면 띄우지 않는다. */
  readonly productId: number;
};

export function ShelfIntroSpotlight({ eligible, productId }: ShelfIntroSpotlightProps) {
  const [focus, setFocus] = useState<Focus>();
  const timers = useRef<number[]>([]);
  const flyRef = useRef<HTMLSpanElement>(null);

  const clearTimers = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  };

  const close = () => {
    clearTimers();
    setFocus(undefined);
  };

  useEffect(() => {
    if (!eligible || isInGuestShelf(productId) || BOT_AGENT.test(navigator.userAgent) || hasSeenShelfIntro()) return;

    const at = (ms: number, run: () => void) => {
      timers.current.push(window.setTimeout(run, ms));
    };
    const reduced = prefersReducedMotion();

    const focusOn = (step: Step) => {
      const target = element(SELECTOR[step]);
      if (!target) return false;
      setFocus({ step, rect: measure(target) });
      return true;
    };

    const press = () => {
      const save = element(SELECTOR.save);
      if (reduced || !save) return;
      [save, element(HOLE)].forEach((target) =>
        target?.animate([{ scale: 1 }, { scale: 0.96 }, { scale: 1 }], { duration: 300, easing: "ease-out" }),
      );
    };

    const fly = () => {
      const image = element(SELECTOR.image);
      const save = element(SELECTOR.save);
      const flyer = flyRef.current;
      if (reduced || !image || !save || !flyer) return;
      const source = image.querySelector("img")?.currentSrc;
      if (source) flyer.style.backgroundImage = `url("${source}")`;
      const from = centerOf(image.getBoundingClientRect());
      const to = centerOf(save.getBoundingClientRect());
      const half = FLY_SIZE / 2;
      flyer.animate(
        [
          { opacity: 1, transform: `translate(${from.x - half}px, ${from.y - half}px) scale(1)` },
          { opacity: 0.6, transform: `translate(${to.x - half}px, ${to.y - half}px) scale(0.4)` },
        ],
        { duration: FLY_DURATION_MS, easing: "cubic-bezier(0.5, 0, 0.3, 1)" },
      );
    };

    const bump = () => {
      const save = element(SELECTOR.save);
      if (reduced || !save) return;
      [save, element(HOLE)].forEach((target) =>
        target?.animate([{ scale: 1 }, { scale: 1.04 }, { scale: 1 }], { duration: 450, easing: "ease-out" }),
      );
    };

    const nextStep = () => {
      const card = element(SELECTOR.unsuitable);
      if (!card) return;
      focusOn("unsuitable");
    };

    at(START_DELAY_MS, () => {
      const save = element(SELECTOR.save);
      if (!save || !isInViewport(save)) return;
      rememberShelfIntroSeen();
      focusOn("save");
      at(PRESS_MS, press);
      at(FLY_MS, fly);
      at(BUMP_MS, bump);
      if (element(SELECTOR.unsuitable)) {
        at(NEXT_STEP_MS, nextStep);
        at(COMPLETE_MS, () => setFocus(undefined));
      } else {
        at(COMPLETE_WITHOUT_CARD_MS, () => setFocus(undefined));
      }
    });

    const current = timers.current;
    return () => {
      current.forEach((timer) => window.clearTimeout(timer));
    };
  }, [eligible, productId]);

  const step = focus?.step;
  const closeOnEscape = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape") close();
  });

  useEffect(() => {
    if (!step) return;
    const remeasure = () => {
      const target = element(SELECTOR[step]);
      if (target) setFocus({ step, rect: measure(target) });
    };
    const onKey = (event: KeyboardEvent) => closeOnEscape(event);
    window.addEventListener("scroll", remeasure, { passive: true });
    window.addEventListener("resize", remeasure);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", remeasure);
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("keydown", onKey);
    };
  }, [step]);

  let spotlight: React.ReactNode = null;
  if (focus) spotlight = <Spotlight focus={focus} onClose={close} />;

  return (
    <>
      <span
        ref={flyRef}
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-(--z-toast) size-14 rounded-md bg-background bg-contain bg-center bg-no-repeat opacity-0"
      />
      {spotlight}
    </>
  );
}

function Spotlight({ focus, onClose }: { readonly focus: Focus; readonly onClose: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const { pressableProps } = usePressable();

  useScrollLock(true);

  // 하단 영역 확보나 다음 설명으로 이동하기 전에 원래 위치를 한 번만 기억한다.
  useLayoutEffect(() => {
    const left = window.scrollX;
    const top = window.scrollY;
    return () => window.scrollTo({ left, top, behavior: "instant" });
  }, []);

  useLayoutEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;
    const root = document.documentElement;
    const originalPadding = root.style.scrollPaddingBottom;
    let reservedHeight = -1;
    const reserveFooter = () => {
      const height = footer.getBoundingClientRect().height;
      if (height === reservedHeight) return;
      reservedHeight = height;
      root.style.scrollPaddingBottom = `${height}px`;
      let behavior: ScrollBehavior = "instant";
      if (focus.step === "unsuitable" && !prefersReducedMotion()) behavior = "smooth";
      element(SELECTOR[focus.step])?.scrollIntoView({ block: "nearest", behavior });
    };
    reserveFooter();
    const observer = new ResizeObserver(reserveFooter);
    observer.observe(footer);
    window.visualViewport?.addEventListener("resize", reserveFooter);
    return () => {
      observer.disconnect();
      window.visualViewport?.removeEventListener("resize", reserveFooter);
      root.style.scrollPaddingBottom = originalPadding;
    };
  }, [focus.step]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const preventScroll = (event: Event) => event.preventDefault();
    root.addEventListener("touchmove", preventScroll, { passive: false });
    root.addEventListener("wheel", preventScroll, { passive: false });
    const previous = document.activeElement;
    const others = [...document.body.children].filter(
      (child): child is HTMLElement => child instanceof HTMLElement && child !== root && !child.inert,
    );
    others.forEach((child) => {
      child.inert = true;
    });
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      root.removeEventListener("touchmove", preventScroll);
      root.removeEventListener("wheel", preventScroll);
      others.forEach((child) => {
        child.inert = false;
      });
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  const { rect, step } = focus;
  let bubbleTop = `${rect.top - 12}px`;
  let arrowTop = `${rect.top - 18}px`;
  let bubbleShift = "-100%";
  if (rect.top < BUBBLE_ROOM) {
    bubbleTop = `${rect.top + rect.height + 12}px`;
    arrowTop = `${rect.top + rect.height + 6}px`;
    bubbleShift = "0%";
  }
  const position = {
    "--spot-left": `${rect.left}px`,
    "--spot-top": `${rect.top}px`,
    "--spot-width": `${rect.width}px`,
    "--spot-height": `${rect.height}px`,
    "--spot-radius": rect.radius,
    "--spot-center": `${rect.left + rect.width / 2}px`,
    "--spot-bubble-top": bubbleTop,
    "--spot-bubble-shift": bubbleShift,
    "--spot-arrow-top": arrowTop,
  } as React.CSSProperties;

  return createPortal(
    <div
      ref={rootRef}
      data-nosnippet
      role="dialog"
      aria-modal="true"
      aria-label="파우치 소개"
      style={position}
      onKeyDown={(event) => {
        if (event.key === "Tab") {
          event.preventDefault();
          closeRef.current?.focus({ preventScroll: true });
        }
      }}
      className="fixed inset-x-0 top-0 z-(--z-dialog) h-dvh touch-none overscroll-none"
    >
      <div
        aria-hidden="true"
        className="spotlight-hole pointer-events-none fixed top-0 left-0 h-(--spot-height) w-(--spot-width) rounded-(--spot-radius) spotlight-move"
      />
      <span
        aria-hidden="true"
        className="spotlight-arrow pointer-events-none fixed top-0 left-0 size-3 rotate-45 bg-background spotlight-move"
      />
      <div className="absolute inset-0 mx-auto w-full max-w-md">
        <div className="spotlight-bubble absolute top-0 left-1/2 w-max max-w-72 rounded-lg bg-background px-4 py-2.5 spotlight-move">
          <p
            aria-live="polite"
            className="text-center text-section leading-snug font-medium text-balance text-text-primary"
          >
            <BubbleText step={step} />
          </p>
        </div>
        <div ref={footerRef} className="absolute inset-x-0 bottom-0 flex justify-center px-gutter pt-6 pb-safe">
          <button
            {...pressableProps}
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="pressable press-scale fb-dim mb-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-action px-6 py-3 text-14 leading-snug font-semibold text-action-text shadow-lg"
          >
            <span>설명 건너뛰기</span>
            <Icon name="x" size={16} />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function BubbleText({ step }: { readonly step: Step }) {
  if (step === "save") {
    return (
      <>
        써 본 제품은 <b className="font-bold">파우치에 저장</b>해 두세요
      </>
    );
  }
  return (
    <>
      안 맞았던 제품이 모이면 <b className="font-bold">겹치는 성분</b>이 보여요
    </>
  );
}
