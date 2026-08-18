"use client";

import { useEffect, useId, useRef } from "react";

type BottomSheetProps = {
  readonly open: boolean;
  readonly title: string;
  readonly description?: string;
  readonly onClose: () => void;
  readonly onReset?: () => void;
  /** 적용 버튼 문구. 디자인은 `3개 제품 보기` 처럼 개수를 함께 보여 준다. */
  readonly submitLabel: string;
  readonly onSubmit: () => void;
  readonly children: React.ReactNode;
};

const FOCUSABLE = 'button:not([disabled]), input, [href], [tabindex]:not([tabindex="-1"])';

/** 디자인의 필터 바텀시트 껍데기. 내용만 바꿔 카테고리·브랜드·유수분·성분에 함께 쓴다. */
export function BottomSheet({
  open,
  title,
  description,
  onClose,
  onReset,
  submitLabel,
  onSubmit,
  children,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const sheet = sheetRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    sheet?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !sheet) return;

      // 시트가 열려 있는 동안 초점이 바깥으로 나가지 않게 한다.
      const focusable = [...sheet.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* 하단 내비게이션이 sticky 라 시트가 그 위에 오도록 z-index 를 올린다. */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden="true" />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[80vh] flex-col rounded-t-3xl bg-white"
      >
        <div className="px-5 pt-5 pb-2">
          <h2 id={titleId} className="text-[17px] font-bold text-text-primary">
            {title}
          </h2>
          {description ? <p className="mt-1 text-[13px] text-text-secondary">{description}</p> : null}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-2">{children}</div>

        <div className="flex gap-2 px-5 pt-2 pb-6">
          {onReset ? (
            <button
              type="button"
              onClick={onReset}
              className="h-13 rounded-button border border-border px-5 text-[15px] font-bold text-text-primary"
            >
              초기화
            </button>
          ) : null}
          <button
            type="button"
            onClick={onSubmit}
            className="h-13 flex-1 rounded-button bg-action text-[15px] font-bold text-action-text"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </>
  );
}
