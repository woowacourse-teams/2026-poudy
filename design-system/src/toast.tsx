"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { FocusEvent, PointerEvent, ReactNode, RefObject } from "react";

import { cn } from "./cn";
import { keepQuoteWithParticle } from "./keep-quote";
import { Portal } from "./portal";
import { TextButton } from "./text-button";

/** 토스트를 보여 주는 시간(FEEDBACK F04) */
export const TOAST_DURATION_MS = 4000;
/** 한 번에 쌓아 두는 개수(F04). 넘치면 가장 오래된 것을 닫는다. */
export const MAX_TOASTS = 3;
/** 사라지는 전환의 길이. --duration-fast 와 같다(MOTION M02). 이만큼 지난 뒤 화면에서 뺀다. */
const EXIT_MS = 150;
/** 펼친 묶음에서 토스트 사이 간격 */
const GAP_PX = 8;

/** 행동을 마친 뒤 포커스를 돌려줄 곳. 그 행동을 만든 원래 컨트롤이다. */
export type ReturnFocusTarget = RefObject<HTMLElement | null> | (() => HTMLElement | null | undefined);

export type ToastAction = {
  /** 버튼 글자. 예: 되돌리기, 보기 */
  readonly label: string;
  /** 이 토스트를 만든 항목에만 묶인 동작. 대상은 토스트를 만들 때 고정한다(F04 행동의 대상). */
  readonly onClick: () => void;
  /**
   * 행동을 눌러 토스트가 닫히면 포커스를 돌려줄 곳(F04). 원래 컨트롤이 사라졌으면 A11Y D10 의 대체 위치를 돌려준다.
   * 포커스가 body 로 떨어지지 않게 반드시 넘긴다.
   */
  readonly returnFocusTo: ReturnFocusTarget;
};

export type ToastOptions = {
  /** 한 문장, '~했어요'(F04) */
  readonly message: string;
  /** 행동은 하나까지. 같은 결과를 화면의 원래 컨트롤로도 할 수 있어야 한다(F04 토스트 밖의 경로). */
  readonly action?: ToastAction;
};

type ToastItem = ToastOptions & { readonly id: number; readonly closing: boolean };

type ToastApi = {
  /** 토스트를 맨 앞에 쌓는다. 이미 MAX_TOASTS 개가 있으면 가장 오래된 것을 닫는다. */
  readonly show: (options: ToastOptions) => void;
  /** 쌓인 토스트를 모두 닫는다. */
  readonly dismiss: () => void;
};

const ToastContext = createContext<ToastApi | null>(null);

/** 토스트를 띄우는 함수. ToastProvider 안에서만 쓴다. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast 는 ToastProvider 안에서 쓴다.");
  return api;
}

const resolveTarget = (target: ReturnFocusTarget) => (typeof target === "function" ? target() : target.current);

/**
 * 방금 한 행동의 결과를 짧게 알리고 스스로 사라지는 알림(명세 APP · 토스트, FEEDBACK F04). 앱에 하나만 둔다.
 *
 * - 최대 3개까지 쌓는다. 가장 최근 것이 맨 앞(아래)에 온전히 보이고, 이전 것은 뒤로 조금씩 올라가며 작아진다.
 *   그래서 결과가 연달아 와도 앞의 토스트와 그 [되돌리기]가 사라지지 않는다.
 * - 포인터를 올리거나, 포커스가 들어가거나, 터치로 누르면 묶음을 펼쳐 모든 문구와 행동을 보인다. 펼친 동안과
 *   브라우저 탭이 백그라운드에 있는 동안에는 모든 토스트의 시간이 멈춘다. 토스트마다 4초를 따로 잰다.
 * - 토스트마다 새 id 로 그려, 이전 항목의 [되돌리기]가 새 항목에 실행되지 않게 한다.
 * - 자리는 #overlay-root 의 맨 위층(z-toast)이다. 시트가 열려 있어도 그 위에 뜬다(SHAPE E05).
 *   아래로 띄우는 거리는 앱이 --toast-offset 에 하단 고정 영역·하단 내비의 높이를 넣어 정한다(system.css bottom-toast).
 * - 쌓인 자리와 움직임은 overlay.css 의 [data-toast] 가 정한다. 높이는 여기서 재어 CSS 변수로 넘긴다.
 * - 문구는 polite 라이브 영역으로 알린다. 영역은 늘 그려 두고 토스트만 더하고 뺀다(A11Y D06).
 */
export function ToastProvider({ children }: { readonly children: ReactNode }) {
  const [toasts, setToasts] = useState<readonly ToastItem[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(false);
  const seq = useRef(0);
  // 멈췄다 다시 갈 때 남은 시간부터 잰다. 토스트마다 따로 둔다.
  const remaining = useRef(new Map<number, number>());
  const stackRef = useRef<HTMLDivElement>(null);

  const close = useCallback((id: number) => {
    setToasts((current) => current.map((toast) => (toast.id === id ? { ...toast, closing: true } : toast)));
  }, []);

  const show = useCallback((options: ToastOptions) => {
    seq.current += 1;
    const item: ToastItem = { ...options, id: seq.current, closing: false };
    remaining.current.set(item.id, TOAST_DURATION_MS);
    setToasts((current) => {
      const open = current.filter((toast) => !toast.closing);
      const dropped = new Set(open.slice(0, Math.max(0, open.length + 1 - MAX_TOASTS)).map((toast) => toast.id));
      return [...current.map((toast) => (dropped.has(toast.id) ? { ...toast, closing: true } : toast)), item];
    });
  }, []);

  const dismiss = useCallback(() => {
    setToasts((current) => current.map((toast) => ({ ...toast, closing: true })));
  }, []);

  // 토스트마다 4초가 지나면 닫는다. 멈춘 동안에는 시계를 세우고, 다시 가면 남은 시간만 기다린다.
  const paused = expanded || hidden;
  useEffect(() => {
    if (paused) return;
    const times = remaining.current;
    const open = toasts.filter((toast) => !toast.closing);
    const startedAt = Date.now();
    const timers = open.map((toast) => setTimeout(() => close(toast.id), times.get(toast.id) ?? TOAST_DURATION_MS));
    return () => {
      timers.forEach(clearTimeout);
      const elapsed = Date.now() - startedAt;
      for (const toast of open) {
        const left = times.get(toast.id);
        if (left !== undefined) times.set(toast.id, left - elapsed);
      }
    };
  }, [toasts, paused, close]);

  // 사라지는 전환이 끝나면 화면에서 뺀다. 다 빠지면 펼친 묶음도 접는다.
  useEffect(() => {
    const closing = toasts.filter((toast) => toast.closing).map((toast) => toast.id);
    if (closing.length === 0) return;
    const timer = setTimeout(() => {
      closing.forEach((id) => remaining.current.delete(id));
      setToasts((current) => current.filter((toast) => !closing.includes(toast.id)));
      if (closing.length === toasts.length) setExpanded(false);
    }, EXIT_MS);
    return () => clearTimeout(timer);
  }, [toasts]);

  // 브라우저 탭이 백그라운드에 있는 동안에는 보지 못하므로 시간을 세운다.
  useEffect(() => {
    const onChange = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  // 터치로 펼친 묶음은 묶음 밖을 누르면 접는다. 마우스는 포인터가 떠날 때 접는다.
  useEffect(() => {
    if (!expanded) return;
    const onPointerDown = (event: globalThis.PointerEvent) => {
      if (!stackRef.current?.contains(event.target as Node)) setExpanded(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [expanded]);

  /*
   * 토스트마다 자리를 CSS 변수로 넘긴다. --toast-index 는 맨 앞에서 몇 번째인지, --toast-lift 는 펼쳤을 때 올라갈 거리,
   * --toast-height 는 내용의 높이다. 접힌 동안 뒤의 토스트는 맨 앞 토스트의 높이(--toast-front-height)로 맞춘다.
   * 글자 크기나 화면 폭이 바뀌어 내용 높이가 바뀌면 다시 잰다.
   */
  useLayoutEffect(() => {
    const stack = stackRef.current;
    if (!stack) return;
    const layout = () => {
      const items = [...stack.querySelectorAll<HTMLElement>(":scope > [data-toast]")].reverse();
      let lift = 0;
      items.forEach((item, index) => {
        const height = item.querySelector<HTMLElement>("[data-toast-content]")?.offsetHeight ?? 0;
        item.style.setProperty("--toast-index", String(index));
        item.style.setProperty("--toast-lift", `${lift}px`);
        item.style.setProperty("--toast-height", `${height}px`);
        if (index === 0) stack.style.setProperty("--toast-front-height", `${height}px`);
        lift += height + GAP_PX;
      });
    };
    layout();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(layout);
    stack.querySelectorAll("[data-toast-content]").forEach((content) => observer.observe(content));
    return () => observer.disconnect();
  }, [toasts]);

  const onPointerEnter = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse") setExpanded(true);
  };

  const onPointerLeave = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse" && !event.currentTarget.contains(document.activeElement)) setExpanded(false);
  };

  // 터치에는 hover 가 없다. 묶음을 누르면 펼친다. 접힌 동안 뒤 토스트의 내용은 눌리지 않는다(overlay.css).
  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse") setExpanded(true);
  };

  const onBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setExpanded(false);
  };

  const runAction = (toast: ToastItem, action: ToastAction) => {
    action.onClick();
    close(toast.id);
    // 다른 토스트의 버튼으로 옮기지 않고 원래 컨트롤로 돌려준다(F04).
    resolveTarget(action.returnFocusTo)?.focus();
  };

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext value={api}>
      {children}
      <Portal>
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-gutter bottom-toast z-(--z-toast)"
        >
          <div
            ref={stackRef}
            data-toaster=""
            data-expanded={expanded ? "" : undefined}
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
            onPointerDown={onPointerDown}
            onFocus={() => setExpanded(true)}
            onBlur={onBlur}
            className="relative mx-auto w-full max-w-120"
          >
            {toasts.map((toast, position) => (
              <div
                key={toast.id}
                data-toast=""
                data-behind={position < toasts.length - 1 ? "" : undefined}
                data-state={toast.closing ? "closed" : "open"}
                className="pointer-events-auto rounded-lg bg-action"
              >
                <div
                  data-toast-content=""
                  className={cn(
                    "flex items-center gap-1 py-3 pl-4",
                    // 행동 버튼은 안쪽 여백 8 을 가져, 글자까지의 거리가 어느 쪽이든 16 이 된다.
                    toast.action ? "pr-2" : "pr-4",
                  )}
                >
                  <p className="min-w-0 flex-1 text-body-sm leading-normal wrap-anywhere text-action-text">
                    {keepQuoteWithParticle(toast.message)}
                  </p>
                  {toast.action ? (
                    <TextButton tone="on-dark" onClick={() => runAction(toast, toast.action!)}>
                      {toast.action.label}
                    </TextButton>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Portal>
    </ToastContext>
  );
}
