"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

import { Button } from "./button";
import { cn } from "./cn";
import { Icon } from "./icon";
import { useVirtualKeyboardInset } from "./use-virtual-keyboard";

export type BottomActionBarAction = {
  /** 할 일과 개수. 예: 'N개 제품 보기', 'N개 추가하기', 결과가 없으면 '0개 제품 보기' */
  readonly label: string;
  readonly onClick?: () => void;
  /** 폼을 보내는 버튼이면 submit 과 폼의 id 를 넘긴다. 바가 폼 밖에 있어도 그 폼을 보낸다. */
  readonly type?: "button" | "submit";
  readonly form?: string;
  /** 되돌릴 수 없는 삭제·탈퇴의 최종 확인이면 destructive 다. */
  readonly tone?: "primary" | "destructive";
  /**
   * 아직 누를 수 없다. 이유는 notice 로 함께 넘긴다. 포커스는 남아 이유를 읽을 수 있다(aria-disabled, STATE S06).
   */
  readonly disabled?: boolean;
  /** 확정한 뒤 응답을 기다리는 중이다. 다시 누를 수 없다. */
  readonly busy?: boolean;
};

export type BottomActionBarProps = {
  /**
   * 놓이는 자리. 하단 내비 바로 위면 above-nav(아래 여백 12), 하단 내비가 없는 화면 끝이면 screen-end
   * (아래 여백은 안전 영역, 최소 12)다.
   */
  readonly position: "above-nav" | "screen-end";
  readonly action: BottomActionBarAction;
  /**
   * 버튼 위 안내 줄(13px, ⓘ). 필요할 때만 한 줄 둔다. 고를 게 없어 버튼을 막았다면 무엇을 해야 하는지 적는다.
   * 버튼이 이 문구를 설명으로 읽는다(aria-describedby).
   */
  readonly notice?: ReactNode;
  /** 자리. 모양은 부품이 정한다. */
  readonly className?: string;
};

/**
 * 하단 행동 영역(LAYOUT L04 · L09, 명세 APP · 하단 행동 영역 · 내비 위 / 화면 끝). 위쪽 구분선 · 흰 바탕 ·
 * 좌우 거터 · 위 12 · 큰 버튼(56) 하나다. 높이는 고정하지 않고 여백과 버튼 높이로 정한다.
 *
 * 바가 버튼을 가진다. 화면은 버튼 모양을 고르지 않고 할 일(action)만 넘긴다.
 * 가상 키보드가 열리면 키보드 바로 위로 올라간다(A11Y D07).
 */
export function BottomActionBar({ position, action, notice, className }: BottomActionBarProps) {
  const noticeId = useId();
  const barRef = useRef<HTMLDivElement>(null);
  const keyboardInset = useVirtualKeyboardInset();

  // 키보드가 가린 만큼만 올린다. 값이 기기마다 달라 클래스로 둘 수 없어 요소에 직접 쓴다.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    bar.style.transform = keyboardInset > 0 ? `translateY(-${keyboardInset}px)` : "";
  }, [keyboardInset]);

  return (
    <div
      ref={barRef}
      className={cn(
        "sticky bottom-0 z-(--z-sticky) flex shrink-0 flex-col gap-2 border-t border-border bg-background px-gutter pt-3",
        position === "above-nav" ? "pb-3" : "pb-safe",
        className,
      )}
    >
      {notice ? (
        <p id={noticeId} className="flex items-center justify-center gap-1 text-body-sm text-text-secondary">
          <Icon name="info-circle" size={14} />
          <span>{notice}</span>
        </p>
      ) : null}
      <Button
        size="lg"
        variant={action.tone ?? "primary"}
        type={action.type ?? "button"}
        form={action.form}
        onClick={action.onClick}
        busy={action.busy}
        aria-disabled={action.disabled ? true : undefined}
        aria-describedby={notice ? noticeId : undefined}
        className="w-full"
      >
        {action.label}
      </Button>
    </div>
  );
}
