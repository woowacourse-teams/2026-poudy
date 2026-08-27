"use client";

import type { ExcludeCodeResponse, IngredientSuggestionResponse } from "@poudy/api/api.zod";
import { useState } from "react";

import { CheckMark } from "@/components/ui/CheckMark";
import { ConditionButton } from "@/components/ui/ConditionButton";
import { EmptyNotice } from "@/components/ui/EmptyNotice";
import { MatchedText } from "@/components/ui/MatchedText";
import { SearchField } from "@/components/ui/SearchField";
import { SelectedIngredientChip } from "@/components/ui/SelectedIngredientChip";
import { track } from "@/lib/analytics/track";
import { fetchIngredientSuggestions } from "@/lib/api/products";
import type { ExcludeCode, Filter } from "@/lib/domain/filter";
import { splitByRange } from "@/lib/domain/highlight";
import { ingredientCountLabel } from "@/lib/domain/ingredient-search";
import { effectColor } from "@/lib/domain/skin-effect-colors";
import { useSuggestions } from "@/lib/hooks/useSuggestions";

/** 한 줄에 담기는 만큼만 보인다. 나머지는 개수로 알린다. */
const VISIBLE_EFFECTS = 3;

const fetcher = async (keyword: string): Promise<readonly IngredientSuggestionResponse[]> => {
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
  const toggleIngredient = (
    key: "includeIngredientIds" | "excludeIngredientIds",
    item: IngredientSuggestionResponse,
  ) => {
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
                  <li key={item.id} className="flex min-h-[58px] items-center gap-1.5 border-b border-[#EEF0F3] py-2">
                    <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                      {/* 자동완성과 같다. 긴 이름은 두 줄까지 보이고 거기서 줄인다. */}
                      <IngredientName item={item} />
                      <EffectTags effects={item.skinEffects} />
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
              <EmptyNotice icon="search" title="선택한 성분 없음" detail="성분을 검색해 담으면 여기에 쌓여요" />
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
                      className={`quick-filter-toggle flex min-h-13 w-full items-center gap-2 rounded-[10px] border px-2.5 py-1.5 text-left ${
                        checked ? "border-red-200 bg-red-50" : "border-[#DDE0E4] bg-[#F7F7F8]"
                      }`}
                    >
                      <span
                        className={`flex-1 text-[13px] ${checked ? "font-bold text-red-700" : "font-semibold text-[#4D5159]"}`}
                      >
                        {code.name}
                      </span>
                      <CheckMark checked={checked} tone="exclude" />
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

/** 자동완성과 같다. 서버가 짚어 준 자리만 진하게 두고, 그런 자리가 없으면 흐리게 하지 않는다. */
function IngredientName({ item }: { readonly item: IngredientSuggestionResponse }) {
  const { koreanName, match } = item;

  /* 짚어 준 자리가 없으면 대표 이름을 평소대로 둔다. */
  if (!match) {
    return <span className="line-clamp-2 text-[14px] font-semibold text-[#212124]">{koreanName}</span>;
  }

  /* 한글 이름에서 걸린 줄만 그 이름 위에 토막을 낸다. 나머지는 평소대로 둔다. */
  const parts = match.field === "KOREAN_NAME" ? splitByRange(match) : [{ text: koreanName, matched: false }];

  return (
    <span className="line-clamp-2">
      <MatchedText
        label={koreanName}
        parts={parts}
        plainClassName="text-[14px] font-semibold text-[#212124]"
        dimmedClassName="text-[14px] font-semibold text-[#212124]"
        matchedClassName="text-brand-strong"
      />

      {/* 한글 이름 밖에서 걸린 줄은 맞은 원문을 뒤에 덧붙여 왜 떴는지 알린다. */}
      {match.field === "KOREAN_NAME" ? null : (
        <>
          <span className="text-[14px] text-[#72747A]"> · </span>
          <MatchedText
            label={match.text}
            parts={splitByRange(match)}
            plainClassName="text-[14px] text-[#72747A]"
            dimmedClassName="text-[14px] text-[#72747A]"
            matchedClassName="text-brand-strong"
          />
        </>
      )}
    </span>
  );
}

/** 자동완성과 같다. 성분이 하는 일을 이름과 다른 생김새의 배지로 가른다. */
function EffectTags({ effects }: { readonly effects: IngredientSuggestionResponse["skinEffects"] }) {
  if (effects.length === 0) return null;

  const shown = effects.slice(0, VISIBLE_EFFECTS);
  const rest = effects.length - shown.length;

  return (
    <span className="flex items-center gap-1 overflow-hidden">
      {shown.map((effect) => {
        const color = effectColor(effect.code);

        return (
          <span
            key={effect.code}
            className={`flex h-[18px] shrink-0 items-center rounded-[9px] px-1.5 text-[10px] font-semibold ${color.bg} ${color.text}`}
          >
            {effect.name}
          </span>
        );
      })}

      {rest > 0 ? (
        <span className="shrink-0 text-[10px] font-semibold text-text-secondary">
          <span aria-hidden="true">+{rest}</span>
          <span className="sr-only">외 {rest}개</span>
        </span>
      ) : null}
    </span>
  );
}
