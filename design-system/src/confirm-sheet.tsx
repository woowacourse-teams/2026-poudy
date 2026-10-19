"use client";

import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";

import { BottomSheet, useSheetParts } from "./bottom-sheet";
import type { SheetCloseReason } from "./bottom-sheet";
import { Button } from "./button";

export type ConfirmSheetProps = {
  readonly open: boolean;
  /** '무엇을 할지' 묻는 제목. 예: '리모넨을 원하는 성분에서 뺄까요?' */
  readonly title: NonNullable<ReactNode>;
  /** 이유·결과 한 줄. 결정에 필요한 정보라 빼지 않는다. */
  readonly description: NonNullable<ReactNode>;
  /** (선택) 내용 칸. 조건 충돌 요약, 만 14세 확인 체크 행처럼 화면의 도메인 컴포넌트를 넣는다. */
  readonly children?: ReactNode;
  /** 실행 버튼 글자. 예: '빼기', '로그아웃' */
  readonly confirmLabel: NonNullable<ReactNode>;
  /** 취소 버튼 글자. 기본 '취소' */
  readonly cancelLabel?: NonNullable<ReactNode>;
  /** 실행 버튼 모양. 빼기·삭제·로그아웃처럼 되돌리기 어려운 행동은 destructive */
  readonly tone?: "primary" | "destructive";
  readonly onConfirm: () => void;
  /** 취소. 하단 '취소', 딤, Esc, 끌어내리기 모두 이것을 부른다. 아무것도 바꾸지 않는다. */
  readonly onCancel: (reason: SheetCloseReason | "cancel") => void;
  /** 실행 중. 실행 버튼이 처리 중 상태가 되고 다시 누를 수 없다. */
  readonly busy?: boolean;
  /** 실행 버튼을 막고 이유를 알린다(만 14세 확인을 체크하기 전 등). 이유 문구 id 를 함께 넘긴다. */
  readonly confirmDisabledReasonId?: string;
  /** 닫은 뒤 포커스를 돌려줄 요소. 삭제처럼 연 요소가 사라지면 다음 항목을 넘긴다(A11Y D02). */
  readonly returnFocus?: () => HTMLElement | null | undefined;
};

/**
 * 행동하기 전에 한 번 묻는 시트(명세 APP · 확인 시트). 안에서 BottomSheet 를 쓰고 틀만 고정한다.
 * 제목(질문) → 이유 한 줄 → (선택) 내용 칸 → 취소 · 실행. 머리에 ✕ 를 두지 않고 하단 '취소'가 닫기다(LAYOUT L10).
 *
 * 시트·사진 뷰어 위에도 뜨는 확인 층(SHAPE E05)이다. 닫으면 아래 시트로 돌아간다. 첫 포커스는 안전한 '취소'다(A11Y D02).
 */
export function ConfirmSheet({
  open,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = "취소",
  tone = "primary",
  onConfirm,
  onCancel,
  busy = false,
  confirmDisabledReasonId,
  returnFocus,
}: ConfirmSheetProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <BottomSheet open={open} onClose={onCancel} layer="dialog" initialFocus={cancelRef} returnFocus={returnFocus}>
      <div className="flex min-h-0 flex-col gap-5 px-5 pt-2 pb-safe">
        <ConfirmHeader title={title} description={description} />
        {children ? <div className="min-h-0 overflow-y-auto overscroll-contain">{children}</div> : null}
        <div className="flex shrink-0 gap-2">
          <Button ref={cancelRef} variant="secondary" onClick={() => onCancel("cancel")} className="flex-1">
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "destructive" ? "destructive" : "primary"}
            onClick={onConfirm}
            busy={busy}
            aria-disabled={confirmDisabledReasonId ? true : undefined}
            aria-describedby={confirmDisabledReasonId}
            className="flex-1"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}

function ConfirmHeader({
  title,
  description,
}: {
  readonly title: NonNullable<ReactNode>;
  readonly description: NonNullable<ReactNode>;
}) {
  const { titleId, descriptionId, titleRef, setHasDescription } = useSheetParts();
  // 확인 시트는 설명이 늘 있다. 시트가 설명을 aria-describedby 로 잇는다.
  useLayoutEffect(() => setHasDescription(true), [setHasDescription]);

  return (
    <div data-sheet-grab="" className="flex shrink-0 touch-none flex-col gap-2">
      <h2
        ref={titleRef}
        id={titleId}
        tabIndex={-1}
        className="text-block leading-snug font-bold text-text-primary outline-none"
      >
        {title}
      </h2>
      <p id={descriptionId} className="text-body text-text-secondary">
        {description}
      </p>
    </div>
  );
}
