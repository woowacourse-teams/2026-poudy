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
 *
 * 제외의 빨강은 `ConditionButton` 과 같은 Tailwind red 계열을 쓴다. 자동완성에서 누른
 * 버튼과 아래에 쌓이는 이 칩이 같은 뜻이라 색이 갈리면 안 된다.
 *
 * 다만 배지는 옅은 바탕에 10px 글자를 얹어, 채움에 쓰는 red-600 을 글자로 그대로
 * 가져오면 4.36:1 로 4.5:1 에 못 미친다. 같은 계열에서 더 진한 red-700(5.87:1) 을 글자에 쓴다.
 */
export function SelectedIngredientChip({ kind, name, onRemove }: SelectedIngredientChipProps) {
  const label = kind === "include" ? "포함" : "제외";
  const badge = kind === "include" ? "bg-[#F2F3F5] text-[#212124]" : "bg-red-50 text-red-700";

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
