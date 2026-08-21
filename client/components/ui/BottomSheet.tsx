"use client";

import { useEffect, useId, useRef } from "react";

import { Icon } from "./icons/Icon";

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
        className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl bg-white"
      >
        <div className="flex h-5 shrink-0 items-center justify-center">
          <span className="h-1 w-9 rounded-sm bg-[#C9CDD2]" aria-hidden="true" />
        </div>

        <div className="flex items-start justify-between px-5 pt-3 pb-5">
          <span className="flex flex-col gap-1">
            <h2 id={titleId} className="text-[18px] font-bold text-[#212124]">
              {title}
            </h2>
            {description ? <p className="text-[12px] text-[#868B94]">{description}</p> : null}
          </span>

          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex size-8 shrink-0 items-center justify-center rounded-full"
          >
            <Icon name="x" size={18} className="text-[#555D68]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5">{children}</div>

        <div className="flex gap-2 px-4 pt-3 pb-4">
          {onReset ? (
            <button
              type="button"
              onClick={onReset}
              className="h-12 w-[72px] shrink-0 rounded-[10px] bg-[#F3F4F5] text-[14px] font-bold text-[#4D5159]"
            >
              초기화
            </button>
          ) : null}
          <button
            type="button"
            onClick={onSubmit}
            className="h-12 flex-1 rounded-[10px] bg-[#212124] text-[14px] font-bold text-white"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </>
  );
}
