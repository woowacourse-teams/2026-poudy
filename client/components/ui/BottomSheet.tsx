"use client";

import { useId, useRef } from "react";

import { useDragToDismiss } from "@/lib/hooks/useDragToDismiss";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { usePresence } from "@/lib/hooks/usePresence";
import { useScrollEdges } from "@/lib/hooks/useScrollEdges";
import { useScrollLock } from "@/lib/hooks/useScrollLock";

type BottomSheetProps = {
  readonly open: boolean;
  readonly title: string;
  readonly description?: string;
  readonly onClose: () => void;
  readonly onReset?: () => void;
  /** 적용 버튼 문구. 디자인은 `3개 제품 보기` 처럼 개수를 함께 보여 준다. */
  readonly submitLabel: string;
  /** 눌러도 볼 것이 없을 때 막는다. 조건에 걸린 제품이 없는 경우가 그렇다. */
  readonly submitDisabled?: boolean;
  readonly onSubmit: () => void;
  readonly children: React.ReactNode;
};

/** 디자인의 필터 바텀시트 껍데기. 내용만 바꿔 카테고리·브랜드·유수분·성분에 함께 쓴다. */
export function BottomSheet({ open, onClose, ...rest }: BottomSheetProps) {
  const { present, shown, done } = usePresence(open);

  useScrollLock(present);

  if (!present) return null;

  return <SheetBody {...rest} shown={shown} onClose={onClose} onExited={done} />;
}

type SheetBodyProps = Omit<BottomSheetProps, "open"> & {
  readonly shown: boolean;
  readonly onExited: () => void;
};

function SheetBody({
  title,
  description,
  onClose,
  onReset,
  submitLabel,
  submitDisabled,
  onSubmit,
  children,
  shown,
  onExited,
}: SheetBodyProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { offset, dragging, handleProps } = useDragToDismiss(onClose);
  const { ref: bodyRef, edges, onScroll: onBodyScroll } = useScrollEdges();

  /*
   * 붙는 즉시 가둔다. 올라오는 전환이 시작되기를 기다리면 그 사이에 누른 Escape 가
   * 먹지 않고 초점도 바깥에 남는다.
   */
  useFocusTrap(sheetRef, true, onClose);

  /** 끄는 동안에는 손가락을 그대로 따라오게 한다. 놓은 뒤에는 전환이 그린다. */
  const style = offset > 0 ? { transform: `translateY(${offset}px)` } : undefined;

  return (
    <>
      {/* 하단 내비게이션이 sticky 라 시트가 그 위에 오도록 z-index 를 올린다. */}
      <div
        className="bottom-sheet-dim fixed inset-0 z-40 bg-black/40"
        data-open={shown}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-open={shown}
        data-dragging={dragging}
        style={style}
        // 나가는 전환이 끝나야 지운다. 안쪽 요소의 전환은 세지 않는다.
        onTransitionEnd={(event) => {
          if (event.target === event.currentTarget && !shown) onExited();
        }}
        className="bottom-sheet fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[70vh] w-full max-w-md flex-col rounded-t-3xl bg-white"
      >
        {/*
          머리 부분을 잡아 끌어내리면 닫힌다. 핸들이 4px 로 얇아 그것만 잡게 하면
          손가락으로 놓치기 쉬워 제목 줄까지 함께 잡게 한다.

          touch-action 을 꺼 두어야 브라우저가 세로 스크롤로 가로채지 않는다.
        */}
        <div {...handleProps} className="shrink-0 cursor-grab touch-none active:cursor-grabbing">
          <div className="flex h-5 items-center justify-center">
            <span className="h-1 w-9 rounded-sm bg-[#C9CDD2]" aria-hidden="true" />
          </div>

          <div className="flex flex-col gap-1 px-5 pt-3 pb-5">
            <h2 id={titleId} className="text-[18px] font-bold text-[#212124]">
              {title}
            </h2>
            {description ? <p className="text-[12px] text-[#868B94]">{description}</p> : null}
          </div>
        </div>

        {/*
          내용이 길면 위아래로 흐려 더 있다는 것을 알린다. 딤 위에 겹치는 층을 따로 두면
          시트 안쪽을 가려 누르지 못하게 되므로, 칠하는 대신 가장자리를 지우는 mask 를 쓴다.
          끝에 닿은 쪽은 지우지 않아 마지막 줄이 흐려지지 않는다.
        */}
        <div
          ref={bodyRef}
          onScroll={onBodyScroll}
          data-start={edges.start}
          data-end={edges.end}
          className="edge-fade flex-1 overflow-y-auto px-5"
        >
          {children}
        </div>

        <div className="flex gap-2 px-4 pt-3 pb-4">
          {/* 초기화가 1, 적용이 2 를 차지한다. 되돌리는 일보다 적용하는 일이 잦다. */}
          {onReset ? (
            <button
              type="button"
              onClick={onReset}
              className="h-12 flex-1 rounded-[10px] bg-[#F3F4F5] text-[14px] font-bold text-[#4D5159]"
            >
              초기화
            </button>
          ) : null}
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitDisabled}
            className="h-12 flex-2 rounded-[10px] bg-[#212124] text-[14px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </>
  );
}
