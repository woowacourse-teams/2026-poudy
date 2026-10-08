"use client";

import { createContext, useCallback, useContext, useId, useRef } from "react";

import { useDragToDismiss } from "@/lib/hooks/useDragToDismiss";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { usePresence } from "@/lib/hooks/usePresence";
import { useScrollEdges } from "@/lib/hooks/useScrollEdges";
import { useScrollLock } from "@/lib/hooks/useScrollLock";

type SheetContext = {
  readonly titleId: string;
  /** 머리를 잡아 끌 때 쓰는 손잡이. Header 가 받아 붙인다. */
  readonly handleProps: React.HTMLAttributes<HTMLElement>;
};

const Context = createContext<SheetContext | undefined>(undefined);

const useSheet = (part: string): SheetContext => {
  const value = useContext(Context);
  if (!value) throw new Error(`BottomSheet.${part} 는 BottomSheet 안에서만 쓴다.`);
  return value;
};

/** 시트 껍데기가 닫은 방법. 머리의 닫기 단추처럼 안쪽에서 닫는 길은 쓰는 쪽이 직접 안다. */
export type SheetCloseReason = "backdrop" | "drag" | "escape";

type BottomSheetProps = {
  readonly open: boolean;
  /** 어떻게 닫혔는지 넘긴다. 분석이 필요 없는 쪽은 받지 않아도 된다. */
  readonly onClose: (reason: SheetCloseReason) => void;
  readonly children: React.ReactNode;
};

/**
 * 디자인의 필터 바텀시트.
 *
 * 껍데기는 전환·끌어 닫기·초점 가둠·바깥 스크롤 잠금만 맡고, 안에 무엇을 담을지는
 * 쓰는 쪽이 정한다. `Header` · `Body` · `Footer` 를 골라 쌓는다. 머리가 없는 시트나
 * 발에 버튼이 셋인 시트가 나와도 껍데기를 고치지 않는다.
 */
export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  const { present, shown, done } = usePresence(open);

  useScrollLock(present);

  if (!present) return null;

  return (
    <Shell shown={shown} onClose={onClose} onExited={done}>
      {children}
    </Shell>
  );
}

type ShellProps = {
  readonly shown: boolean;
  readonly onClose: (reason: SheetCloseReason) => void;
  readonly onExited: () => void;
  readonly children: React.ReactNode;
};

function Shell({ shown, onClose, onExited, children }: ShellProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeByDrag = useCallback(() => onClose("drag"), [onClose]);
  const closeByEscape = useCallback(() => onClose("escape"), [onClose]);
  const { offset, dragging, handleProps } = useDragToDismiss(closeByDrag);

  /*
   * 붙는 즉시 가둔다. 올라오는 전환이 시작되기를 기다리면 그 사이에 누른 Escape 가
   * 먹지 않고 초점도 바깥에 남는다.
   */
  useFocusTrap(sheetRef, true, closeByEscape);

  /** 끄는 동안에는 손가락을 그대로 따라오게 한다. 놓은 뒤에는 전환이 그린다. */
  const style = offset > 0 ? { transform: `translateY(${offset}px)` } : undefined;

  return (
    <Context.Provider value={{ titleId, handleProps }}>
      {/* 하단 내비게이션이 sticky 라 시트가 그 위에 오도록 z-index 를 올린다. */}
      <div
        className="bottom-sheet-dim fixed inset-0 z-40 bg-black/40"
        data-open={shown}
        onClick={() => onClose("backdrop")}
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
        {children}
      </div>
    </Context.Provider>
  );
}

/**
 * 시트의 머리. 잡아 끌어내리면 닫힌다.
 *
 * 핸들이 4px 로 얇아 그것만 잡게 하면 손가락으로 놓치기 쉬워 제목 줄까지 함께 잡게 한다.
 * touch-action 을 꺼 두어야 브라우저가 세로 스크롤로 가로챈다.
 */
function Header({ title, description }: { readonly title: string; readonly description?: string }) {
  const { titleId, handleProps } = useSheet("Header");

  return (
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
  );
}

/**
 * 제목 줄을 쓰는 쪽이 꾸미는 머리. `Header` 처럼 잡아 끌면 닫히고, 제목은 `Title` 로 단다.
 * 성분 설명처럼 이름 아래에 영문명과 태그가 붙는 시트가 쓴다.
 */
function CustomHeader({ children }: { readonly children: React.ReactNode }) {
  const { handleProps } = useSheet("CustomHeader");

  return (
    <div {...handleProps} className="shrink-0 cursor-grab touch-none active:cursor-grabbing">
      <div className="flex h-5 items-center justify-center">
        <span className="h-1 w-9 rounded-sm bg-[#B0BAC7]" aria-hidden="true" />
      </div>
      {children}
    </div>
  );
}

/** 시트의 이름이 되는 제목. 시트가 이 글로 불린다. */
function Title({ children, className }: { readonly children: React.ReactNode; readonly className?: string }) {
  const { titleId } = useSheet("Title");

  return (
    <h2 id={titleId} className={className}>
      {children}
    </h2>
  );
}

/**
 * 시트의 몸통. 길면 스스로 스크롤한다.
 *
 * 내용이 넘치면 위아래를 흐려 더 있다는 것을 알린다. 층을 겹치면 그 아래를 누를 수 없어
 * 칠하는 대신 가장자리를 지운다. 끝에 닿은 쪽은 지우지 않아 마지막 줄이 흐려지지 않는다.
 */
function Body({ children }: { readonly children: React.ReactNode }) {
  const { ref, edges, onScroll } = useScrollEdges();

  return (
    <div
      ref={ref}
      onScroll={onScroll}
      data-start={edges.start}
      data-end={edges.end}
      className="edge-fade flex-1 overflow-y-auto px-5"
    >
      {children}
    </div>
  );
}

/**
 * 시트의 발. 담긴 버튼을 가로로 늘어놓는다. 몸통이 스크롤되어도 제자리에 남는다.
 * 시트가 화면 바닥에 붙으므로 아래로 기기의 안전 영역(홈 표시줄 자리)만큼 더 띄운다.
 */
function Footer({ children }: { readonly children: React.ReactNode }) {
  return <div className="flex shrink-0 gap-2 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">{children}</div>;
}

/** 발에 두는 되돌리기 버튼. 적용보다 좁게 둔다. */
function ResetButton({ onClick }: { readonly onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-12 flex-1 rounded-[10px] bg-[#F3F4F5] text-[14px] font-bold text-[#4D5159]"
    >
      초기화
    </button>
  );
}

type SubmitButtonProps = {
  readonly children: React.ReactNode;
  readonly onClick: () => void;
  /** 눌러도 볼 것이 없을 때 막는다. 조건에 걸린 제품이 없는 경우가 그렇다. */
  readonly disabled?: boolean;
};

/** 발에 두는 적용 버튼. 되돌리는 일보다 적용하는 일이 잦아 두 배 자리를 차지한다. */
function SubmitButton({ children, onClick, disabled }: SubmitButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-12 flex-2 rounded-[10px] bg-[#212124] text-[14px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

BottomSheet.Header = Header;
BottomSheet.CustomHeader = CustomHeader;
BottomSheet.Title = Title;
BottomSheet.Body = Body;
BottomSheet.Footer = Footer;
BottomSheet.ResetButton = ResetButton;
BottomSheet.SubmitButton = SubmitButton;
