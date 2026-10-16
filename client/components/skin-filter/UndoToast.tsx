"use client";

import { usePressable } from "@poudy/design-system/use-pressable";
import { useEffect } from "react";

import type { SkinFilterToast } from "./useSkinFilterEditor";

/** 토스트가 떠 있는 시간(명세 APP · 토스트: 4초). */
const VISIBLE_MS = 4000;

type UndoToastProps = {
  readonly toast: SkinFilterToast | undefined;
  readonly onDismiss: () => void;
};

/**
 * 방금 한 일을 한 문장으로 알리는 토스트(명세 APP · 토스트). 화면 아래에 붙어 4초 뒤 사라진다.
 * 알림 자리(role="status")는 늘 두어, 문구가 바뀔 때 화면 낭독기가 읽게 한다.
 * 떠 있는 문의하기 버튼(z-30)이 같은 자리에 있어 그 위에 띄운다. 가리면 [되돌리기]를 누를 수 없다.
 *
 * TODO(#728): 디자인 시스템 Toast 가 들어오면 바꾼다. 지금은 이 화면 안에서만 띄운다.
 */
export function UndoToast({ toast, onDismiss }: UndoToastProps) {
  const { pressableProps } = usePressable();

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onDismiss, VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <div role="status" className="sticky bottom-0 z-40 px-gutter pb-safe empty:pb-0">
      {toast ? (
        <div
          key={toast.id}
          className="flex items-center gap-3 rounded-lg bg-action px-4 py-3 transition duration-200 ease-out starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none"
        >
          <p className="min-w-0 flex-1 text-body-sm text-action-text">{toast.message}</p>
          {toast.onUndo ? (
            <button
              type="button"
              onClick={toast.onUndo}
              {...pressableProps}
              className="pressable fb-dim -my-3 -mr-4 min-h-11 shrink-0 px-4 text-body-sm font-semibold text-action-accent"
            >
              되돌리기
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
