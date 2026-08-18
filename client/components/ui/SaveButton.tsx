"use client";

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
        <Bookmark filled={saved} />
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
      <Bookmark filled={saved} className={saved ? "text-brand" : "text-text-secondary"} />
    </button>
  );
}

function Bookmark({ filled, className }: { readonly filled: boolean; readonly className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill={filled ? "currentColor" : "none"}
      aria-hidden="true"
    >
      <path
        d="M5 3.5h10a1 1 0 0 1 1 1V17l-6-3.5L4 17V4.5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
