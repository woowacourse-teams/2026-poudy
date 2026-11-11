"use client";

import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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

type Focus = { readonly step: Step; readonly rect: Rect; readonly follow: boolean };

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
const SETTLE_LIMIT_MS = 1500;
const MOVE_MS = 450;

const BOT_AGENT = /bot|crawler|spider|yeti|daumoa|\bdaum\/|lighthouse|headless/i;

const HOLE = ".spotlight-hole";

const element = (selector: string) => document.querySelector<HTMLElement>(selector) ?? undefined;

const measure = (target: HTMLElement): Rect => {
  const rect = target.getBoundingClientRect();
  const width = target.offsetWidth || rect.width;
  const height = target.offsetHeight || rect.height;
  return {
    left: rect.left + (rect.width - width) / 2 + SEAM,
    top: rect.top + (rect.height - height) / 2 + SEAM,
    width: width - SEAM * 2,
    height: height - SEAM * 2,
    radius: window.getComputedStyle(target).borderRadius,
  };
};

const near = (a: number, b: number) => Math.abs(a - b) < 0.5;

const isSameRect = (a: Rect, b: Rect) =>
  near(a.left, b.left) &&
  near(a.top, b.top) &&
  near(a.width, b.width) &&
  near(a.height, b.height) &&
  a.radius === b.radius;

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
export function ShelfIntroSpotlight({ eligible }: { readonly eligible: boolean }) {
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
    if (!eligible || BOT_AGENT.test(navigator.userAgent) || hasSeenShelfIntro()) return;

    const at = (ms: number, run: () => void) => {
      timers.current.push(window.setTimeout(run, ms));
    };
    const reduced = prefersReducedMotion();

    const focusOn = (step: Step) => {
      const target = element(SELECTOR[step]);
      if (!target) return false;
      setFocus({ step, rect: measure(target), follow: false });
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
  }, [eligible]);

  const step = focus?.step;
  const closeOnEscape = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape") close();
  });

  useEffect(() => {
    if (!step) return;
    const onKey = (event: KeyboardEvent) => closeOnEscape(event);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  const place = (step: Step, rect: Rect, follow: boolean) => {
    setFocus((current) => {
      if (!current || current.step !== step) return current;
      if (isSameRect(current.rect, rect)) return current;
      return { step, rect, follow };
    });
  };

  let spotlight: React.ReactNode = null;
  if (focus) spotlight = <Spotlight focus={focus} onClose={close} onPlace={place} />;

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

function Spotlight({
  focus,
  onClose,
  onPlace,
}: {
  readonly focus: Focus;
  readonly onClose: () => void;
  readonly onPlace: (step: Step, rect: Rect, follow: boolean) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const settleRef = useRef<{ readonly left: number; readonly top: number }>(undefined);
  const movedAtRef = useRef(0);
  const place = useEffectEvent((step: Step, rect: Rect, follow: boolean) => onPlace(step, rect, follow));
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
      const target = element(SELECTOR[focus.step]);
      if (!target) return;
      const start = { left: window.scrollX, top: window.scrollY };
      target.scrollIntoView({ block: "nearest", behavior: "instant" });
      const end = { left: window.scrollX, top: window.scrollY };
      movedAtRef.current = performance.now();
      place(focus.step, measure(target), false);
      const moved = end.left !== start.left || end.top !== start.top;
      if (!moved || focus.step !== "unsuitable" || prefersReducedMotion()) return;
      window.scrollTo({ ...start, behavior: "instant" });
      settleRef.current = end;
      window.scrollTo({ ...end, behavior: "smooth" });
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
    const step = focus.step;
    let frame = 0;
    const settled = () => {
      const end = settleRef.current;
      if (!end) return true;
      if (Math.abs(window.scrollX - end.left) > 1 || Math.abs(window.scrollY - end.top) > 1) return false;
      settleRef.current = undefined;
      return true;
    };
    const remeasure = () => {
      frame = 0;
      const target = element(SELECTOR[step]);
      if (!target || !settled()) return;
      place(step, measure(target), performance.now() - movedAtRef.current >= MOVE_MS);
    };
    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(remeasure);
    };
    const giveUp = window.setTimeout(() => {
      settleRef.current = undefined;
      schedule();
    }, SETTLE_LIMIT_MS);
    const observer = new ResizeObserver(schedule);
    const target = element(SELECTOR[step]);
    if (target) observer.observe(target);
    observer.observe(document.body);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(giveUp);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
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

  const { rect, step, follow } = focus;
  let move = "spotlight-move";
  if (follow) move = "";
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
        className={`spotlight-hole pointer-events-none fixed top-0 left-0 h-(--spot-height) w-(--spot-width) rounded-(--spot-radius) ${move}`}
      />
      <span
        aria-hidden="true"
        className={`spotlight-arrow pointer-events-none fixed top-0 left-0 size-3 rotate-45 bg-background ${move}`}
      />
      <div className="absolute inset-0 mx-auto w-full max-w-md">
        <div
          className={`spotlight-bubble absolute top-0 left-1/2 w-max max-w-72 rounded-lg bg-background px-4 py-2.5 ${move}`}
        >
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
