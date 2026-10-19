"use client";

import type { IngredientGroupResponse, IngredientSuggestionResponse } from "@poudy/api/api.zod";
import { BottomSheetBody, BottomSheetFooter, BottomSheetHeader } from "@poudy/design-system/bottom-sheet";
import { EmptyState } from "@poudy/design-system/empty-state";
import { SearchField } from "@poudy/design-system/search-field";
import { useState } from "react";

import { IngredientResultRow, type ResultRowState } from "./IngredientResultRow";

import { EffectIcon } from "@/components/ingredient/EffectTag";
import { track } from "@/lib/analytics/track";
import type { Filter } from "@/lib/domain/filter";
import { formatCount, josaOf } from "@/lib/domain/format";
import { groupLabel, type IngredientGroup, type IngredientGroups } from "@/lib/domain/ingredient-groups";
import { useIngredientGroups } from "@/lib/hooks/useIngredientGroups";
import { useIngredientSearch } from "@/lib/hooks/useIngredientSearch";

export type SearchPurpose = "include" | "exclude";

/** 효과 아이콘은 최대 3개까지 둔다(명세 APP · 성분 검색 결과 행). */
const VISIBLE_EFFECTS = 3;

const PURPOSE = {
  include: {
    title: "원하는 성분 추가",
    idsKey: "includeIngredientIds",
    groupKey: "includeGroupCodes",
    otherIdsKey: "excludeIngredientIds",
    otherGroupKey: "excludeGroupCodes",
    otherLabel: "피하는 성분에 있음",
  },
  exclude: {
    title: "피하고 싶은 성분 추가",
    idsKey: "excludeIngredientIds",
    groupKey: "excludeGroupCodes",
    otherIdsKey: "includeIngredientIds",
    otherGroupKey: "includeGroupCodes",
    otherLabel: "원하는 성분에 있음",
  },
} as const;

type IngredientSearchStepProps = {
  readonly purpose: SearchPurpose;
  readonly draft: Filter;
  readonly excludeCodes: readonly IngredientGroupResponse[];
  /** 이미 담은 성분군. 성분군으로 담긴 성분은 다시 담지 않는다. */
  readonly groups: IngredientGroups;
  readonly onBack: () => void;
  readonly onApply: (changed: Partial<Filter>) => void;
};

/**
 * 성분 시트 안 검색 화면(명세 S28c, APP · 성분 검색 결과 행). [+ 추가]로 들어온 쪽(원하는 성분 · 피하고 싶은 성분)에
 * 담을 성분과 성분군을 고른다. 고른 것은 [N개 추가하기]를 눌러야 편집 화면에 반영한다. 검색어를 지우면 결과가 비워진다.
 *
 * 반대쪽에 이미 있는 성분은 담을 수 없다고 표시하고 막는다. 원하는 성분을 고를 때는 피하고 있는 성분군에 든 성분도 막는다.
 * 결과가 반드시 비는 조합이라서다.
 */
export function IngredientSearchStep({
  purpose,
  draft,
  excludeCodes,
  groups,
  onBack,
  onApply,
}: IngredientSearchStepProps) {
  const config = PURPOSE[purpose];
  const [keyword, setKeyword] = useState("");
  const [ids, setIds] = useState<readonly number[]>(draft[config.idsKey]);
  const [codes, setCodes] = useState<readonly string[]>(draft[config.groupKey]);
  const { items, groups: foundGroups, loading } = useIngredientSearch(keyword);
  const query = keyword.trim();

  // 고른 성분군의 성분은 이미 담긴 것으로 본다. 검색 결과에 온 성분군과 이미 받아 둔 성분군을 함께 본다.
  const knownGroups = useIngredientGroups(codes, foundGroups);
  const coveredIds = new Set(codes.flatMap((code) => (knownGroups.get(code) ?? groups.get(code))?.ingredientIds ?? []));

  // 원하는 성분을 고를 때 막을 성분. 피하고 있는 자주 피하는 성분·성분군에 든 성분이다.
  const avoidedIds = new Set(
    purpose === "include"
      ? [
          ...excludeCodes
            .filter((code) => draft.excludeCodes.some((item) => item === code.code))
            .flatMap((code) => code.ingredients.map((ingredient) => ingredient.id)),
          ...draft.excludeGroupCodes.flatMap((code) => groups.get(code)?.ingredientIds ?? []),
        ]
      : [],
  );

  const added =
    ids.filter((id) => !draft[config.idsKey].includes(id)).length +
    codes.filter((code) => !draft[config.groupKey].includes(code)).length;
  const changed =
    added > 0 || ids.length !== draft[config.idsKey].length || codes.length !== draft[config.groupKey].length;

  const toggleIngredient = (item: IngredientSuggestionResponse, position: number) => {
    const had = ids.includes(item.id);
    track("ingredient_condition_toggled", {
      target_type: "ingredient",
      ingredient_id: item.id,
      condition: purpose,
      action: had ? "remove" : "add",
      surface: "filter_sheet",
    });
    if (!had) {
      track("search_suggestion_selected", { mode: "ingredient", query, position, ingredient_id: item.id });
    }
    setIds(had ? ids.filter((id) => id !== item.id) : [...ids, item.id]);
  };

  const toggleGroup = (group: IngredientGroup) => {
    const had = codes.includes(group.code);
    track("ingredient_condition_toggled", {
      target_type: "ingredient_group",
      group_code: group.code,
      condition: purpose,
      action: had ? "remove" : "add",
      surface: "filter_sheet",
    });
    setCodes(had ? codes.filter((code) => code !== group.code) : [...codes, group.code]);
  };

  const ingredientState = (item: IngredientSuggestionResponse): ResultRowState => {
    if (draft[config.otherIdsKey].includes(item.id)) return "blocked";
    if (avoidedIds.has(item.id)) return "blocked";
    if (coveredIds.has(item.id)) return "covered";
    return ids.includes(item.id) ? "added" : "idle";
  };

  const groupState = (group: IngredientGroup): ResultRowState => {
    if (draft[config.otherGroupKey].includes(group.code)) return "blocked";
    return codes.includes(group.code) ? "added" : "idle";
  };

  return (
    <>
      <BottomSheetHeader title={config.title} onBack={onBack} />
      {/* 결과가 올 때마다 시트가 늘었다 줄었다 하지 않게, 검색 화면은 시트 최대 높이로 연다. */}
      <BottomSheetBody className="h-dvh basis-auto">
        <div className="flex flex-col gap-2 pb-4">
          <SearchField
            value={keyword}
            onChange={setKeyword}
            placeholder="성분명 검색"
            label="성분명 검색"
            // 검색하러 들어온 화면이라 입력칸에서 바로 시작한다.
            autoFocus
          />

          {query && !loading && foundGroups.length === 0 && items.length === 0 ? (
            <EmptyState
              title={`‘${query}’${josaOf(query, "과/와")} 맞는 성분이 없어요`}
              description="성분명 철자를 확인해 보세요."
            />
          ) : null}

          {query ? (
            <ul aria-label="성분 검색 결과" aria-busy={loading || undefined}>
              {foundGroups.map((group) => (
                <li key={`group-${group.code}`}>
                  <IngredientResultRow
                    name={groupLabel(group)}
                    badge="성분군"
                    state={groupState(group)}
                    tone={purpose}
                    blockedLabel={config.otherLabel}
                    onToggle={() => toggleGroup(group)}
                  />
                </li>
              ))}
              {items.map((item, index) => (
                <li key={item.id}>
                  <IngredientResultRow
                    name={item.koreanName}
                    description={item.englishName}
                    icons={item.skinEffects.slice(0, VISIBLE_EFFECTS).map((effect) => (
                      <EffectIcon key={effect.code} code={effect.code} size={14} className="text-text-secondary" />
                    ))}
                    state={ingredientState(item)}
                    tone={purpose}
                    blockedLabel={config.otherLabel}
                    onToggle={() => toggleIngredient(item, index)}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </BottomSheetBody>
      {changed ? (
        <BottomSheetFooter
          primary={{
            label: added > 0 ? `${formatCount(added)} 추가하기` : "적용하기",
            onClick: () => onApply({ [config.idsKey]: ids, [config.groupKey]: codes }),
          }}
        />
      ) : null}
    </>
  );
}
