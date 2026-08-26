"use client";

import type { ExcludeCodeResponse, IngredientResponse } from "@poudy/api/api.zod";
import { useState } from "react";

import { CheckMark } from "@/components/ui/CheckMark";
import { ConditionButton } from "@/components/ui/ConditionButton";
import { SearchField } from "@/components/ui/SearchField";
import { SelectedIngredientChip } from "@/components/ui/SelectedIngredientChip";
import { track } from "@/lib/analytics/track";
import { fetchIngredientSuggestions } from "@/lib/api/products";
import type { ExcludeCode, Filter } from "@/lib/domain/filter";
import { ingredientCountLabel } from "@/lib/domain/ingredient-search";
import { useSuggestions } from "@/lib/hooks/useSuggestions";

const fetcher = async (keyword: string): Promise<readonly IngredientResponse[]> => {
  const response = await fetchIngredientSuggestions(keyword);
  return response.items;
};

type IngredientOptionsProps = {
  readonly draft: Filter;
  readonly setDraft: (filter: Filter) => void;
  readonly excludeCodes: readonly ExcludeCodeResponse[];
  readonly names: ReadonlyMap<number, string>;
};

/** 디자인의 성분 시트. 검색하면 자동완성이 선택 목록 자리를 대신한다. */
export function IngredientOptions({ draft, setDraft, excludeCodes, names }: IngredientOptionsProps) {
  const [keyword, setKeyword] = useState("");
  const { items, loading } = useSuggestions(keyword, fetcher, "ingredient");
  const typing = keyword.trim().length > 0;

  const selectedCount = draft.includeIngredientIds.length + draft.excludeIngredientIds.length;

  /** 포함과 제외는 한쪽만 걸린다. */
  const toggleIngredient = (key: "includeIngredientIds" | "excludeIngredientIds", item: IngredientResponse) => {
    const other = key === "includeIngredientIds" ? "excludeIngredientIds" : "includeIngredientIds";
    const had = draft[key].includes(item.id);

    track("ingredient_condition_toggled", {
      target_type: "ingredient",
      ingredient_id: item.id,
      condition: key === "includeIngredientIds" ? "include" : "exclude",
      action: had ? "remove" : "add",
      surface: "filter_sheet",
    });

    // 새로 담는 경우만 자동완성에서 고른 것으로 본다. 빼는 동작은 검색 결과 선택이 아니다.
    if (!had && typing) {
      track("search_suggestion_selected", {
        mode: "ingredient",
        query: keyword.trim(),
        position: items.findIndex((found) => found.id === item.id),
        ingredient_id: item.id,
      });
    }

    setDraft({
      ...draft,
      [key]: had ? draft[key].filter((id) => id !== item.id) : [...draft[key], item.id],
      [other]: draft[other].filter((id) => id !== item.id),
    });
  };

  const removeIngredient = (key: "includeIngredientIds" | "excludeIngredientIds", id: number) => {
    track("ingredient_condition_toggled", {
      target_type: "ingredient",
      ingredient_id: id,
      condition: key === "includeIngredientIds" ? "include" : "exclude",
      action: "remove",
      surface: "filter_sheet",
    });
    setDraft({ ...draft, [key]: draft[key].filter((value) => value !== id) });
  };

  const toggleCode = (code: ExcludeCode) => {
    const had = draft.excludeCodes.includes(code);
    track("ingredient_condition_toggled", {
      target_type: "exclude_group",
      exclude_code: code,
      condition: "exclude",
      action: had ? "remove" : "add",
      surface: "filter_sheet",
    });
    setDraft({
      ...draft,
      excludeCodes: had ? draft.excludeCodes.filter((item) => item !== code) : [...draft.excludeCodes, code],
    });
  };

  return (
    <>
      <SearchField value={keyword} onChange={setKeyword} placeholder="성분명 검색" label="성분명 검색" />

      {typing ? (
        <section className="pt-3">
          <h3 className="flex h-10 items-center gap-1.5">
            <span className="truncate text-[14px] font-bold text-[#212124]">‘{keyword.trim()}’이 포함된 성분</span>
            {loading ? null : (
              <span className="shrink-0 text-[12px] font-medium text-[#868B94]">
                {ingredientCountLabel(items.length)}
              </span>
            )}
          </h3>

          {loading ? (
            <p className="flex min-h-50 items-center justify-center text-[13px] text-[#868B94]">검색하는 중…</p>
          ) : (
            <ul aria-label="성분 검색 결과">
              {items.map((item) => {
                const included = draft.includeIngredientIds.includes(item.id);
                const excluded = draft.excludeIngredientIds.includes(item.id);

                return (
                  <li key={item.id} className="flex h-[58px] items-center gap-1.5 border-b border-[#EEF0F3]">
                    <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                      <span className="truncate text-[12px] font-semibold text-[#212124]">{item.koreanName}</span>
                      <span className="truncate text-[10px] text-[#868B94]">
                        {item.skinEffects.map((effect) => effect.name).join(" · ")}
                      </span>
                    </span>

                    <span className="flex shrink-0 gap-1.5">
                      <ConditionButton
                        kind="include"
                        active={included}
                        ingredientName={item.koreanName}
                        onClick={() => toggleIngredient("includeIngredientIds", item)}
                      />
                      <ConditionButton
                        kind="exclude"
                        active={excluded}
                        ingredientName={item.koreanName}
                        onClick={() => toggleIngredient("excludeIngredientIds", item)}
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : (
        <>
          <section className="pt-4">
            <h3 className="flex h-6 items-center gap-1.5">
              <span className="text-[15px] font-bold text-[#212124]">선택한 성분</span>
              {selectedCount > 0 ? (
                <span className="text-[12px] font-medium text-[#868B94]">{selectedCount}개</span>
              ) : null}
            </h3>

            {selectedCount === 0 ? (
              <p className="flex min-h-25 items-center justify-center text-[13px] text-text-secondary">
                선택한 성분 없음
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-2 pt-2">
                {draft.includeIngredientIds.map((id) => (
                  <li key={`in-${id}`}>
                    <SelectedIngredientChip
                      kind="include"
                      name={names.get(id) ?? `성분 ${id}`}
                      onRemove={() => removeIngredient("includeIngredientIds", id)}
                    />
                  </li>
                ))}
                {draft.excludeIngredientIds.map((id) => (
                  <li key={`ex-${id}`}>
                    <SelectedIngredientChip
                      kind="exclude"
                      name={names.get(id) ?? `성분 ${id}`}
                      onRemove={() => removeIngredient("excludeIngredientIds", id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="pt-4">
            <h3 className="flex h-6 items-center gap-1.5">
              <span className="text-[15px] font-bold text-[#212124]">빠른 필터</span>
              {draft.excludeCodes.length > 0 ? (
                <span className="text-[12px] font-medium text-[#868B94]">{draft.excludeCodes.length}개 선택</span>
              ) : null}
            </h3>

            <ul className="grid grid-cols-2 gap-2 pt-2">
              {excludeCodes.map((code) => {
                const checked = draft.excludeCodes.includes(code.code);

                return (
                  <li key={code.code}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      onClick={() => toggleCode(code.code)}
                      className={`flex h-13 w-full items-center gap-2 rounded-[10px] border px-2.5 text-left ${
                        checked ? "border-transparent bg-[#F2F3F5]" : "border-[#DDE0E4] bg-[#F7F7F8]"
                      }`}
                    >
                      <span className={`flex-1 text-[11px] text-[#4D5159] ${checked ? "font-bold" : "font-semibold"}`}>
                        {code.name}
                      </span>
                      <CheckMark checked={checked} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </>
  );
}
