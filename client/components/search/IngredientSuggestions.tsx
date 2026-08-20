"use client";

import type { IngredientResponse } from "@poudy/api/api.zod";

import { ConditionButton } from "@/components/ui/ConditionButton";
import { ingredientCountLabel } from "@/lib/domain/ingredient-search";

type IngredientSuggestionsProps = {
  readonly keyword: string;
  readonly items: readonly IngredientResponse[];
  readonly includedIds: readonly number[];
  readonly excludedIds: readonly number[];
  readonly onToggle: (key: "includeIngredientIds" | "excludeIngredientIds", item: IngredientResponse) => void;
};

export function IngredientSuggestions({
  keyword,
  items,
  includedIds,
  excludedIds,
  onToggle,
}: IngredientSuggestionsProps) {
  return (
    <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-[#E8E9EC] bg-white shadow-lg">
      <h3 className="flex items-center gap-1.5 border-b border-[#F2F3F6] px-3.5 py-2.5">
        <span className="text-[12px] font-bold text-[#212124]">‘{keyword}’이 포함된 성분</span>
        <span className="text-[12px] font-medium text-[#868B94]">{ingredientCountLabel(items.length)}</span>
      </h3>

      {items.length === 0 ? (
        <p className="px-3.5 py-8 text-center text-[13px] text-text-secondary">찾는 성분이 없어요</p>
      ) : (
        <ul aria-label="성분 검색 결과">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex h-[58px] items-center gap-1.5 border-b border-[#EEF0F3] px-3.5 last:border-b-0"
            >
              <span className="flex flex-1 flex-col gap-[3px]">
                <span className="text-[12px] font-semibold text-text-primary">{item.koreanName}</span>
                <span className="text-[10px] text-text-secondary">
                  {item.skinEffects.map((effect) => effect.name).join(" · ")}
                </span>
              </span>

              <span className="flex shrink-0 gap-1.5">
                <ConditionButton
                  kind="include"
                  active={includedIds.includes(item.id)}
                  ingredientName={item.koreanName}
                  onClick={() => onToggle("includeIngredientIds", item)}
                />
                <ConditionButton
                  kind="exclude"
                  active={excludedIds.includes(item.id)}
                  ingredientName={item.koreanName}
                  onClick={() => onToggle("excludeIngredientIds", item)}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
