"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { FocusEvent, ReactNode, RefObject } from "react";

import { cn } from "./cn";
import { keepQuoteWithParticle } from "./keep-quote";
import { Portal } from "./portal";
import { TextButton } from "./text-button";

/** 토스트를 보여 주는 시간(FEEDBACK F04) */
export const TOAST_DURATION_MS = 4000;
/** 사라지는 전환의 길이. --duration-fast 와 같다(MOTION M02). 이만큼 지난 뒤 화면에서 뺀다. */
const EXIT_MS = 150;

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
  /** 토스트를 띄운다. 지금 토스트를 바로 바꾸고, 행동 버튼에 포커스나 포인터가 있으면 대기시킨다. */
  readonly show: (options: ToastOptions) => void;
  /** 지금 토스트를 닫는다. */
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
 * - 한 번에 하나, 4초. 새 토스트가 오면 이전 것을 바로 바꾼다(쌓지 않는다).
 * - 행동이 있는 토스트는 포인터가 올라가 있거나 포커스가 있는 동안 멈춘다. 그동안 온 새 토스트는 하나만 대기시키고
 *   (더 오면 가장 최근 것으로 덮는다), 포인터·포커스가 떠나거나 행동을 마치면 띄운다.
 * - 토스트마다 새 id 로 다시 그려, 이전 항목의 [되돌리기]가 새 항목에 실행되지 않게 한다.
 * - 자리는 #overlay-root 의 맨 위층(z-toast)이다. 시트가 열려 있어도 그 위에 뜬다(SHAPE E05).
 *   아래로 띄우는 거리는 앱이 --toast-offset 에 하단 고정 영역·하단 내비의 높이를 넣어 정한다(system.css bottom-toast).
 * - 문구는 polite 라이브 영역으로 알린다. 영역은 늘 그려 두고 내용만 바꾼다(A11Y D06).
 */
export function ToastProvider({ children }: { readonly children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const [held, setHeld] = useState(false);
  const heldRef = useRef(false);
  const queued = useRef<ToastItem | null>(null);
  const seq = useRef(0);
  // 멈췄다 다시 갈 때 남은 시간부터 잰다. 다른 토스트의 시간과 섞이지 않게 id 와 함께 둔다.
  const remaining = useRef({ id: -1, ms: TOAST_DURATION_MS });

  const present = useCallback((item: ToastItem | null) => {
    heldRef.current = false;
    setHeld(false);
    if (item) remaining.current = { id: item.id, ms: TOAST_DURATION_MS };
    setToast(item);
  }, []);

  const show = useCallback(
    (options: ToastOptions) => {
      seq.current += 1;
      const item: ToastItem = { ...options, id: seq.current, closing: false };
      if (heldRef.current) {
        queued.current = item;
        return;
      }
      present(item);
    },
    [present],
  );

  const dismiss = useCallback(() => {
    queued.current = null;
    heldRef.current = false;
    setHeld(false);
    setToast((current) => (current ? { ...current, closing: true } : current));
  }, []);

  // 4초가 지나면 닫는다. 멈춘 동안에는 시계를 세우고, 다시 가면 남은 시간만 기다린다.
  useEffect(() => {
    if (!toast || toast.closing || held) return;
    const startedAt = Date.now();
    const timer = setTimeout(() => {
      setToast((current) => (current?.id === toast.id ? { ...current, closing: true } : current));
    }, remaining.current.ms);
    return () => {
      clearTimeout(timer);
      if (remaining.current.id === toast.id) remaining.current.ms -= Date.now() - startedAt;
    };
  }, [toast, held]);

  // 사라지는 전환이 끝나면 화면에서 뺀다.
  useEffect(() => {
    if (!toast?.closing) return;
    const timer = setTimeout(() => {
      setToast((current) => (current?.id === toast.id ? null : current));
    }, EXIT_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const hold = () => {
    if (!toast?.action || toast.closing) return;
    heldRef.current = true;
    setHeld(true);
  };

  const release = () => {
    if (!heldRef.current) return;
    const next = queued.current;
    queued.current = null;
    if (next) {
      present(next);
      return;
    }
    heldRef.current = false;
    setHeld(false);
  };

  const onBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) release();
  };

  const runAction = (action: ToastAction) => {
    // 포커스를 옮기면 blur 가 먼저 돌아 release 를 부르므로, 멈춤과 대기를 먼저 거둔다.
    const next = queued.current;
    queued.current = null;
    heldRef.current = false;
    action.onClick();
    // 새 토스트의 버튼으로 옮기지 않고 원래 컨트롤로 돌려준다. 대기한 토스트는 그다음에 띄운다(F04).
    resolveTarget(action.returnFocusTo)?.focus();
    present(next);
  };

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext value={api}>
      {children}
      <Portal>
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-gutter bottom-toast z-(--z-toast) flex justify-center"
        >
          {toast ? (
            <div
              key={toast.id}
              data-state={toast.closing ? "closed" : "open"}
              onPointerEnter={hold}
              onPointerLeave={release}
              onFocus={hold}
              onBlur={onBlur}
              className={cn(
                "pointer-events-auto flex w-full max-w-120 items-center gap-1 rounded-lg bg-action py-3 pl-4",
                // 행동 버튼은 안쪽 여백 8 을 가져, 글자까지의 거리가 어느 쪽이든 16 이 된다.
                toast.action ? "pr-2" : "pr-4",
                // 들어올 때 8 아래에서 올라오며 나타나고, 사라질 때는 불투명도만 바뀐다. 동작 줄이기에서는 불투명도만(M02).
                "transition duration-(--duration-base) ease-out starting:translate-y-2 starting:opacity-0",
                "data-[state=closed]:opacity-0 data-[state=closed]:duration-(--duration-fast)",
                "motion-reduce:duration-(--duration-fast) motion-reduce:starting:translate-y-0",
              )}
            >
              <p className="min-w-0 flex-1 text-body-sm leading-normal wrap-anywhere text-action-text">
                {keepQuoteWithParticle(toast.message)}
              </p>
              {toast.action ? (
                <TextButton tone="on-dark" onClick={() => runAction(toast.action!)}>
                  {toast.action.label}
                </TextButton>
              ) : null}
            </div>
          ) : null}
        </div>
      </Portal>
    </ToastContext>
  );
}
