"use client";

type ConditionButtonProps = {
  readonly kind: "include" | "exclude";
  readonly active: boolean;
  readonly onClick: () => void;
  /** 어느 성분의 조건인지 읽히게 한다. */
  readonly ingredientName: string;
};

/**
 * 디자인의 포함·제외 버튼. 고른 쪽만 채워진다.
 * 포함은 검정, 제외는 빨강으로 서로 다른 뜻임을 색으로도 알린다.
 */
export function ConditionButton({ kind, active, onClick, ingredientName }: ConditionButtonProps) {
  const label = kind === "include" ? "포함" : "제외";
  const activeStyle = kind === "include" ? "border-[#212124] bg-[#212124]" : "border-[#D93B5C] bg-[#D93B5C]";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`${ingredientName} ${label}`}
      className={`h-8 w-12 shrink-0 rounded-2xl border text-[12px] ${
        active ? `${activeStyle} font-bold text-white` : "border-[#B9BDC5] bg-white font-semibold text-[#212124]"
      }`}
    >
      {label}
    </button>
  );
}
