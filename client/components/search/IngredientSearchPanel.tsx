"use client";

import type { ExcludeCodeResponse, IngredientResponse } from "@poudy/api/api.zod";
import { useEffect, useState } from "react";

import { ConditionButton } from "@/components/ui/ConditionButton";
import { Icon } from "@/components/ui/icons/Icon";
import { SearchField } from "@/components/ui/SearchField";
import { SelectedIngredientChip } from "@/components/ui/SelectedIngredientChip";
import { track } from "@/lib/analytics/track";
import { fetchIngredients } from "@/lib/api/products";
import { type ExcludeCodeIngredients, findConflicts } from "@/lib/domain/conflict";
import type { ExcludeCode, Filter } from "@/lib/domain/filter";
import { useSuggestions } from "@/lib/hooks/useSuggestions";

const fetcher = async (keyword: string): Promise<readonly IngredientResponse[]> => {
  const response = await fetchIngredients({ keyword });
  return response.items;
};

type IngredientSearchPanelProps = {
  readonly filter: Filter;
  readonly onChange: (changed: Partial<Filter>) => void;
  readonly excludeCodes: readonly ExcludeCodeResponse[];
  /** 화면에 이름을 보여 주기 위해 검색으로 만난 성분을 기억한다. */
  readonly names: ReadonlyMap<number, string>;
};

/** S03 성분 필터링 탭. 문구와 생김새는 design/v1.pen 을 따른다. */
export function IngredientSearchPanel({ filter, onChange, excludeCodes, names }: IngredientSearchPanelProps) {
  const [keyword, setKeyword] = useState("");
  const { items } = useSuggestions(keyword, fetcher, "ingredient");
  const typing = keyword.trim().length > 0;

  const codeIngredients: ExcludeCodeIngredients = new Map(
    excludeCodes.map((code) => [code.code, code.ingredients.map((item) => item.id)]),
  );
  const conflicts = findConflicts(filter, codeIngredients);

  const selectedCount = filter.includeIngredientIds.length + filter.excludeIngredientIds.length;

  // 경고가 떠 있는 동안 다시 그려도 한 번만 남도록 걸린 성분으로 묶는다.
  const conflictKey = conflicts.flatMap((conflict) => conflict.ingredientIds).join(",");

  useEffect(() => {
    if (!conflictKey) return;
    track("filter_conflict_shown", {
      conflict_count: conflicts.length,
      ingredient_count: conflictKey.split(",").length,
    });
    // conflicts 는 렌더링마다 새로 만들어진다. 걸린 성분이 같으면 다시 보내지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conflictKey]);

  /**
   * 같은 성분을 포함과 제외에 함께 넣으면 결과가 반드시 비므로 한쪽만 남긴다.
   * 이미 눌린 것을 다시 누르면 조건에서 뺀다.
   */
  const toggleIngredient = (key: "includeIngredientIds" | "excludeIngredientIds", item: IngredientResponse) => {
    const other = key === "includeIngredientIds" ? "excludeIngredientIds" : "includeIngredientIds";
    const had = filter[key].includes(item.id);

    track("ingredient_condition_toggled", {
      ingredient_id: item.id,
      condition: key === "includeIngredientIds" ? "include" : "exclude",
      action: had ? "remove" : "add",
      surface: "ingredient_search",
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

    onChange({
      [key]: had ? filter[key].filter((id) => id !== item.id) : [...filter[key], item.id],
      [other]: filter[other].filter((id) => id !== item.id),
    });
  };

  const remove = (key: "includeIngredientIds" | "excludeIngredientIds", id: number) => {
    onChange({ [key]: filter[key].filter((value) => value !== id) });
  };

  const toggleCode = (code: ExcludeCode) =>
    onChange({
      excludeCodes: filter.excludeCodes.includes(code)
        ? filter.excludeCodes.filter((item) => item !== code)
        : [...filter.excludeCodes, code],
    });

  return (
    <div className="flex flex-col px-4 pt-3 pb-5">
      <section className="flex flex-col gap-2 pb-4">
        <SearchField value={keyword} onChange={setKeyword} placeholder="성분명을 입력해 주세요" label="성분 검색" />
        <p className="text-[12px] text-[#72747A]">검색한 성분을 포함 또는 제외 조건으로 추가할 수 있어요.</p>
      </section>

      {conflicts.length > 0 ? (
        <p role="alert" className="mb-4 rounded-lg bg-brand-soft px-3 py-2 text-[12px] text-brand">
          제외한 성분군에 속한 성분을 포함 조건으로 골랐어요. 조건을 다시 확인해 주세요.
        </p>
      ) : null}

      {typing ? (
        <section className="pb-5">
          <h2 className="flex items-center gap-1.5 pb-2">
            <span className="text-[14px] font-bold text-[#212124]">‘{keyword.trim()}’이 포함된 성분</span>
            <span className="text-[12px] font-medium text-[#868B94]">{items.length}개</span>
          </h2>

          <ul aria-label="성분 검색 결과">
            {items.map((item) => {
              const included = filter.includeIngredientIds.includes(item.id);
              const excluded = filter.excludeIngredientIds.includes(item.id);

              return (
                <li key={item.id} className="flex h-[58px] items-center gap-1.5 border-b border-[#EEF0F3]">
                  <span className="flex flex-1 flex-col gap-[3px]">
                    <span className="text-[12px] font-semibold text-text-primary">{item.koreanName}</span>
                    <span className="text-[10px] text-text-secondary">
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
        </section>
      ) : null}

      {selectedCount > 0 ? (
        <>
          <section className="flex flex-col gap-2.5 py-5">
            <div className="flex items-center gap-1.5 px-0.5">
              <h2 className="text-[15px] font-bold text-[#212124]">선택한 성분</h2>
              <span className="text-[12px] font-medium text-[#868B94]">{selectedCount}개</span>
            </div>

            <ul className="grid grid-cols-2 gap-2">
              {filter.includeIngredientIds.map((id) => (
                <li key={`in-${id}`}>
                  <SelectedIngredientChip
                    kind="include"
                    name={names.get(id) ?? `성분 ${id}`}
                    onRemove={() => remove("includeIngredientIds", id)}
                  />
                </li>
              ))}
              {filter.excludeIngredientIds.map((id) => (
                <li key={`ex-${id}`}>
                  <SelectedIngredientChip
                    kind="exclude"
                    name={names.get(id) ?? `성분 ${id}`}
                    onRemove={() => remove("excludeIngredientIds", id)}
                  />
                </li>
              ))}
            </ul>
          </section>

          <hr className="border-0 border-t border-[#F2F3F6]" />
        </>
      ) : null}

      <section className="flex flex-col gap-2.5 py-5">
        <div className="flex items-center gap-1.5 px-0.5">
          <h2 className="text-[15px] font-bold text-[#212124]">빠른 필터</h2>
          {filter.excludeCodes.length > 0 ? (
            <span className="text-[12px] font-medium text-[#868B94]">{filter.excludeCodes.length}개 선택</span>
          ) : null}
        </div>

        <ul className="grid grid-cols-2 gap-2">
          {excludeCodes.map((code) => {
            const checked = filter.excludeCodes.includes(code.code);
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
                  <span
                    className={`flex size-[18px] shrink-0 items-center justify-center rounded border ${
                      checked ? "border-[#212124] bg-[#212124]" : "border-[#B9BDC5] bg-white"
                    }`}
                  >
                    {checked ? <Icon name="check" size={12} className="text-white" /> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <hr className="border-0 border-t border-[#F2F3F6]" />

      <p className="flex items-center gap-2 pt-3 text-[11px] text-[#868B94]">
        <Icon name="info" size={16} />
        성분 {selectedCount}개 · 빠른 필터 {filter.excludeCodes.length}개 적용
      </p>
    </div>
  );
}

/** 디자인의 포함·제외 버튼. 고른 쪽만 채워진다. */
