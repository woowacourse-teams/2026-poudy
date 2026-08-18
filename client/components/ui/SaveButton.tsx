"use client";

import { Icon } from "./icons/Icon";

type SaveButtonProps = {
  readonly productName: string;
  readonly saved: boolean;
  readonly onToggle: () => void;
  /** 와이드는 제품 상세(S05)에서 쓰는 글자 있는 형태다. */
  readonly variant?: "icon" | "wide";
};

/** 저장 버튼. 아이콘만 있는 형태는 이름을 읽을 수 없으므로 접근 가능한 이름을 붙인다. */
export function SaveButton({ productName, saved, onToggle, variant = "icon" }: SaveButtonProps) {
  const label = `${productName} ${saved ? "저장 해제" : "저장"}`;

  if (variant === "wide") {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={saved}
        className="flex h-13 w-full items-center justify-center gap-2 rounded-button bg-action text-[15px] font-bold text-action-text"
      >
        {saved ? "저장됨" : "제품 저장"}
        <Icon name="bookmark" size={20} filled={saved} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={saved}
      aria-label={label}
      className="flex size-11 items-center justify-center rounded-full"
    >
      <Icon name="bookmark" size={20} filled={saved} className={saved ? "text-brand" : "text-text-secondary"} />
    </button>
  );
}
