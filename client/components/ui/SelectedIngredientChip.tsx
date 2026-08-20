"use client";

import { Icon } from "./icons/Icon";

type SelectedIngredientChipProps = {
  readonly kind: "include" | "exclude";
  readonly name: string;
  readonly onRemove: () => void;
};

/**
 * 조건에 담은 성분 하나. 포함과 제외를 배지 색으로 구분한다.
 * 색만으로는 알 수 없으므로 배지에 글자를 함께 둔다.
 */
export function SelectedIngredientChip({ kind, name, onRemove }: SelectedIngredientChipProps) {
  const label = kind === "include" ? "포함" : "제외";
  const badge = kind === "include" ? "bg-[#F2F3F5] text-[#212124]" : "bg-[#FFF0F4] text-[#D93B5C]";

  return (
    <span className="flex h-10 items-center gap-[7px] rounded-[20px] border border-[#E8E9EC] bg-white px-3">
      <span className={`flex h-5 shrink-0 items-center rounded-[10px] px-[7px] text-[10px] font-bold ${badge}`}>
        {label}
      </span>

      <span className="flex-1 truncate text-[12px] font-semibold text-[#212124]">{name}</span>

      <button type="button" onClick={onRemove} aria-label={`${name} ${label} 조건 삭제`} className="shrink-0">
        <Icon name="x" size={16} className="text-[#868B94]" />
      </button>
    </span>
  );
}
