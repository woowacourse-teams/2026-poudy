"use client";

import type { ExcludeCodeResponse, IngredientResponse } from "@poudy/api/api.zod";
import { useState } from "react";

import { ConditionButton } from "@/components/ui/ConditionButton";
import { Icon } from "@/components/ui/icons/Icon";
import { SearchField } from "@/components/ui/SearchField";
import { fetchIngredients } from "@/lib/api/products";
import type { ExcludeCode, Filter } from "@/lib/domain/filter";
import { useSuggestions } from "@/lib/hooks/useSuggestions";

const fetcher = async (keyword: string): Promise<readonly IngredientResponse[]> => {
  const response = await fetchIngredients(keyword);
  return response.items;
};

type IngredientOptionsProps = {
  readonly draft: Filter;
  readonly setDraft: (filter: Filter) => void;
  readonly excludeCodes: readonly ExcludeCodeResponse[];
  readonly names: ReadonlyMap<number, string>;
  readonly onLearnNames: (ingredients: readonly IngredientResponse[]) => void;
};

/** 디자인의 성분 시트. 검색하면 자동완성이 선택 목록 자리를 대신한다. */
export function IngredientOptions({ draft, setDraft, excludeCodes, names, onLearnNames }: IngredientOptionsProps) {
  const [keyword, setKeyword] = useState("");
  const { items } = useSuggestions(keyword, fetcher);
  const typing = keyword.trim().length > 0;

  const selectedCount = draft.includeIngredientIds.length + draft.excludeIngredientIds.length;

  /** 포함과 제외는 한쪽만 걸린다. */
  const toggleIngredient = (key: "includeIngredientIds" | "excludeIngredientIds", item: IngredientResponse) => {
    onLearnNames([item]);
    const other = key === "includeIngredientIds" ? "excludeIngredientIds" : "includeIngredientIds";

    setDraft({
      ...draft,
      [key]: draft[key].includes(item.id) ? draft[key].filter((id) => id !== item.id) : [...draft[key], item.id],
      [other]: draft[other].filter((id) => id !== item.id),
    });
  };

  const removeIngredient = (key: "includeIngredientIds" | "excludeIngredientIds", id: number) =>
    setDraft({ ...draft, [key]: draft[key].filter((value) => value !== id) });

  const toggleCode = (code: ExcludeCode) =>
    setDraft({
      ...draft,
      excludeCodes: draft.excludeCodes.includes(code)
        ? draft.excludeCodes.filter((item) => item !== code)
        : [...draft.excludeCodes, code],
    });

  return (
    <>
      <SearchField value={keyword} onChange={setKeyword} placeholder="성분명 검색" label="성분명 검색" />

      {typing ? (
        <section className="pt-3">
          <h3 className="flex h-10 items-center gap-1.5">
            <span className="text-[14px] font-bold text-[#212124]">‘{keyword.trim()}’이 포함된 성분</span>
            <span className="text-[12px] font-medium text-[#868B94]">{items.length}개</span>
          </h3>

          <ul aria-label="성분 검색 결과">
            {items.map((item) => {
              const included = draft.includeIngredientIds.includes(item.id);
              const excluded = draft.excludeIngredientIds.includes(item.id);

              return (
                <li key={item.id} className="flex h-[58px] items-center gap-1.5 border-b border-[#EEF0F3]">
                  <span className="flex flex-1 flex-col gap-[3px]">
                    <span className="text-[12px] font-semibold text-[#212124]">{item.koreanName}</span>
                    <span className="text-[10px] text-[#868B94]">
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
      ) : (
        <>
          {selectedCount > 0 ? (
            <section className="pt-4">
              <h3 className="flex h-6 items-center gap-1.5">
                <span className="text-[15px] font-bold text-[#212124]">선택한 성분</span>
                <span className="text-[12px] font-medium text-[#868B94]">{selectedCount}개</span>
              </h3>

              <ul className="grid grid-cols-2 gap-2 pt-2">
                {draft.includeIngredientIds.map((id) => (
                  <li key={`in-${id}`}>
                    <SelectedChip
                      kind="포함"
                      name={names.get(id) ?? `성분 ${id}`}
                      onRemove={() => removeIngredient("includeIngredientIds", id)}
                    />
                  </li>
                ))}
                {draft.excludeIngredientIds.map((id) => (
                  <li key={`ex-${id}`}>
                    <SelectedChip
                      kind="제외"
                      name={names.get(id) ?? `성분 ${id}`}
                      onRemove={() => removeIngredient("excludeIngredientIds", id)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

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
        </>
      )}
    </>
  );
}

function SelectedChip({
  kind,
  name,
  onRemove,
}: {
  readonly kind: "포함" | "제외";
  readonly name: string;
  readonly onRemove: () => void;
}) {
  return (
    <span className="flex h-10 items-center gap-[7px] rounded-[20px] border border-border bg-white px-3">
      <span className="text-[10px] font-bold text-[#868B94]">{kind}</span>
      <span className="flex-1 truncate text-[12px] font-semibold text-[#212124]">{name}</span>
      <button type="button" onClick={onRemove} aria-label={`${name} ${kind} 조건 삭제`} className="shrink-0">
        <Icon name="x" size={16} className="text-[#868B94]" />
      </button>
    </span>
  );
}
