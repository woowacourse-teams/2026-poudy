"use client";

import type { ExcludeCodeResponse, IngredientResponse } from "@poudy/api/api.zod";
import { useEffect, useRef, useState } from "react";

import { IngredientSuggestions } from "./IngredientSuggestions";

import { ChipSearchField, type SearchChip } from "@/components/ui/ChipSearchField";
import { Icon } from "@/components/ui/icons/Icon";
import { track } from "@/lib/analytics/track";
import { fetchIngredients } from "@/lib/api/products";
import { type ExcludeCodeIngredients, findConflicts } from "@/lib/domain/conflict";
import type { ExcludeCode, Filter } from "@/lib/domain/filter";
import { useSuggestions } from "@/lib/hooks/useSuggestions";

type ConditionKey = "includeIngredientIds" | "excludeIngredientIds";

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
  const { items, loading } = useSuggestions(keyword, fetcher, "ingredient");
  const typing = keyword.trim().length > 0;

  // 바깥을 누르면 자동완성을 닫는다. 입력과 목록을 함께 감싼 자리를 기준으로 삼는다.
  const searchRef = useRef<HTMLDivElement>(null);

  /** 목록에서 빠져나갈 길을 열어 둔다. 바깥을 누르거나 Esc 를 누르면 검색어를 비운다. */
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) setKeyword("");
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setKeyword("");
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

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

  const remove = (key: ConditionKey, id: number) => {
    onChange({ [key]: filter[key].filter((value) => value !== id) });
  };

  /**
   * 같은 성분을 포함과 제외에 함께 넣으면 결과가 반드시 비므로 한쪽만 남긴다.
   * 이미 눌린 것을 다시 누르면 조건에서 뺀다.
   */
  const toggleIngredient = (key: ConditionKey, item: IngredientResponse) => {
    const other: ConditionKey = key === "includeIngredientIds" ? "excludeIngredientIds" : "includeIngredientIds";
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

  // 담은 순서대로 입력 안에 늘어놓는다.
  const chips: readonly SearchChip[] = [
    ...filter.includeIngredientIds.map((id) => ({
      key: `in-${id}`,
      kind: "include" as const,
      name: names.get(id) ?? `성분 ${id}`,
      onRemove: () => remove("includeIngredientIds", id),
    })),
    ...filter.excludeIngredientIds.map((id) => ({
      key: `ex-${id}`,
      kind: "exclude" as const,
      name: names.get(id) ?? `성분 ${id}`,
      onRemove: () => remove("excludeIngredientIds", id),
    })),
  ];

  const toggleCode = (code: ExcludeCode) =>
    onChange({
      excludeCodes: filter.excludeCodes.includes(code)
        ? filter.excludeCodes.filter((item) => item !== code)
        : [...filter.excludeCodes, code],
    });

  return (
    <div className="flex flex-col px-4 pt-3 pb-5">
      <section className="flex flex-col gap-2 pb-4">
        {/* 자동완성이 입력에 붙어 뜨도록 둘을 같은 자리에 담는다. */}
        <div ref={searchRef} className="relative">
          <ChipSearchField
            value={keyword}
            onChange={setKeyword}
            placeholder="성분명을 입력해 주세요"
            label="성분 검색"
            chips={chips}
            onBackspaceEmpty={() => chips.at(-1)?.onRemove()}
          />

          {typing ? (
            <IngredientSuggestions
              keyword={keyword.trim()}
              items={items}
              loading={loading}
              includedIds={filter.includeIngredientIds}
              excludedIds={filter.excludeIngredientIds}
              onToggle={toggleIngredient}
            />
          ) : null}
        </div>

        <p className="text-[12px] text-[#72747A]">검색한 성분을 포함 또는 제외 조건으로 추가할 수 있어요.</p>
      </section>

      {conflicts.length > 0 ? (
        <p role="alert" className="mb-4 rounded-lg bg-brand-soft px-3 py-2 text-[12px] text-brand">
          제외한 성분군에 속한 성분을 포함 조건으로 골랐어요. 조건을 다시 확인해 주세요.
        </p>
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
