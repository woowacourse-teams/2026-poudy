"use client";

import { Icon } from "./icons/Icon";

type SaveButtonProps = {
  readonly productName: string;
  readonly saved: boolean;
  readonly onToggle: () => void;
  /** 와이드는 제품 상세에서 쓰는 글자 있는 형태다(디자인 C05). */
  readonly variant?: "icon" | "wide";
};

/**
 * 저장 버튼. 아이콘만 있는 형태는 이름을 읽을 수 없으므로 접근 가능한 이름을 붙인다.
 * 저장 전과 저장됨의 생김새가 다르다.
 */
export function SaveButton({ productName, saved, onToggle, variant = "icon" }: SaveButtonProps) {
  const label = `${productName} ${saved ? "저장 해제" : "저장"}`;

  if (variant === "wide") {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={saved}
        aria-label={label}
        className={`flex h-13 w-full items-center justify-center gap-2 rounded-[10px] text-[14px] font-bold ${
          saved ? "border border-[#F5CBD4] bg-[#FFF1F3] text-[#D93B5C]" : "bg-action text-[15px] text-action-text"
        }`}
      >
        {saved ? "저장됨" : "제품 저장"}
        <Icon name="bookmark" size={18} filled={saved} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={saved}
      aria-label={label}
      className="flex size-11 items-center justify-center rounded-[10px]"
    >
      <Icon name="bookmark" size={20} filled={saved} className={saved ? "text-[#F04465]" : "text-text-secondary"} />
    </button>
  );
}
