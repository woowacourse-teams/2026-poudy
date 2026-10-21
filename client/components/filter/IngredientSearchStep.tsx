"use client";

import type { IngredientGroupResponse, IngredientSuggestionResponse } from "@poudy/api/api.zod";
import { BottomSheetBody, BottomSheetFooter, BottomSheetHeader } from "@poudy/design-system/bottom-sheet";
import { EmptyState } from "@poudy/design-system/empty-state";
import { SearchField } from "@poudy/design-system/search-field";
import { useState } from "react";

import { ConditionNotice, useConditionNotice } from "./ConditionNotice";
import { IngredientResultGroup } from "./IngredientResultGroup";
import { IngredientResultRow, type ResultRowState } from "./IngredientResultRow";

import { track } from "@/lib/analytics/track";
import type { Filter } from "@/lib/domain/filter";
import { formatCount, josaOf } from "@/lib/domain/format";
import {
  addedCount,
  addGroup,
  addIngredient,
  type ConditionResolution,
  groupKeyOf,
  ingredientConditionChanged,
  ingredientKeyOf,
  resolutionMessage,
  toggleGroupCondition,
  toggleIngredient,
} from "@/lib/domain/ingredient-condition";
import {
  excludedGroupIngredients,
  groupDisplayName,
  groupSizeLabel,
  type IngredientGroup,
  type IngredientGroups,
  selectedGroupCodes,
} from "@/lib/domain/ingredient-groups";
import { useIngredientGroups } from "@/lib/hooks/useIngredientGroups";
import { useIngredientSearch } from "@/lib/hooks/useIngredientSearch";

export type SearchPurpose = "include" | "exclude";

const TITLE: Record<SearchPurpose, string> = {
  include: "원하는 성분 추가",
  exclude: "피하고 싶은 성분 추가",
};

type IngredientSearchStepProps = {
  readonly purpose: SearchPurpose;
  readonly draft: Filter;
  readonly excludeCodes: readonly IngredientGroupResponse[];
  /** 이미 담은 성분군. 성분군으로 담긴 성분은 다시 담지 않는다. */
  readonly groups: IngredientGroups;
  /** 성분 ID 로 찾은 이름. 옮겨 온 성분을 안내 줄에 적는 데 쓴다. */
  readonly names: ReadonlyMap<number, string>;
  readonly onBack: () => void;
  readonly onApply: (next: Filter) => void;
};

/**
 * 성분 시트 안 검색 화면(명세 S28c · S33a, APP · 성분 검색 결과 행). [+ 추가]로 들어온 쪽(원하는 성분 · 피하고 싶은 성분)에
 * 담을 성분과 성분군을 고른다. 고른 것은 [N개 추가하기]를 눌러야 편집 화면에 반영한다. 검색어를 지우면 결과가 비워진다.
 *
 * 결과가 반드시 비는 조합은 막지 않고 바로 정리한 뒤 검색 입력 아래 안내 줄로 알린다(S33a). 반대쪽에 있던 것은 옮겨 오고,
 * 원하는 성분으로 담는 성분이 피하는 성분군에 들어 있으면 그 성분군 피하기를 푼다. [되돌리기]는 정리하기 전으로 돌린다.
 */
export function IngredientSearchStep({
  purpose,
  draft,
  excludeCodes,
  groups,
  names,
  onBack,
  onApply,
}: IngredientSearchStepProps) {
  const [keyword, setKeyword] = useState("");
  const [local, setLocal] = useState(draft);
  const conflict = useConditionNotice<Filter>();
  const { items, groups: foundGroups, loading } = useIngredientSearch(keyword);
  const query = keyword.trim();

  // 고른 성분군의 성분은 이미 담긴 것으로 본다. 검색 결과에 온 성분군과 이미 받아 둔 성분군을 함께 본다.
  const fetchedGroups = useIngredientGroups(selectedGroupCodes(local), foundGroups);
  const knownGroups: IngredientGroups = new Map([...groups, ...fetchedGroups]);
  const groupKey = groupKeyOf(purpose);
  const coveredIds = new Set(local[groupKey].flatMap((code) => knownGroups.get(code)?.ingredientIds ?? []));

  // 피하고 있는 자주 피하는 성분·성분군에 든 성분. 원하는 성분으로 담으면 그 성분군 피하기를 푼다.
  const excluded = new Map<string, readonly number[]>([
    ...excludeCodes.map((code): [string, readonly number[]] => [
      code.code,
      code.ingredients.map((ingredient) => ingredient.id),
    ]),
    ...excludedGroupIngredients(local, knownGroups),
  ]);

  const added = addedCount(draft, local, purpose);
  const changed = ingredientConditionChanged(draft, local);

  const groupName = (code: string) =>
    excludeCodes.find((found) => found.code === code)?.name ?? groupDisplayName(knownGroups.get(code)?.name ?? code);
  const ingredientName = (id: number) =>
    items.find((found) => found.id === id)?.koreanName ?? names.get(id) ?? `성분 ${id}`;

  const edit = (next: Filter) => {
    conflict.clear();
    setLocal(next);
  };

  const resolve = (resolved: ConditionResolution, target: string) => {
    setLocal(resolved.filter);
    conflict.show(
      resolutionMessage(resolved, purpose, { target, ingredient: ingredientName, group: groupName }),
      resolved,
      local,
    );
  };

  const toggleItem = (item: IngredientSuggestionResponse, position: number) => {
    const had = local[ingredientKeyOf(purpose)].includes(item.id);
    track("ingredient_condition_toggled", {
      target_type: "ingredient",
      ingredient_id: item.id,
      condition: purpose,
      action: had ? "remove" : "add",
      surface: "filter_sheet",
    });
    if (had) {
      edit(toggleIngredient(local, purpose, item.id));
      return;
    }
    track("search_suggestion_selected", { mode: "ingredient", query, position, ingredient_id: item.id });
    resolve(addIngredient(local, { condition: purpose, id: item.id }, excluded), item.koreanName);
  };

  const toggleGroupRow = (group: IngredientGroup) => {
    const had = local[groupKey].includes(group.code);
    track("ingredient_condition_toggled", {
      target_type: "ingredient_group",
      group_code: group.code,
      condition: purpose,
      action: had ? "remove" : "add",
      surface: "filter_sheet",
    });
    if (had) {
      edit(toggleGroupCondition(local, purpose, group).filter);
      return;
    }
    // 같은 쪽에 따로 담아 둔 성분은 성분군 하나로 묶는다(S34). 묶인 성분은 결과 행에서 회색 ✓로 바뀐다.
    resolve(addGroup(local, purpose, group), groupDisplayName(group.name));
  };

  const ingredientState = (item: IngredientSuggestionResponse): ResultRowState => {
    if (coveredIds.has(item.id)) return "covered";
    return local[ingredientKeyOf(purpose)].includes(item.id) ? "added" : "idle";
  };

  return (
    <>
      <BottomSheetHeader title={TITLE[purpose]} onBack={onBack} />
      {/* 결과가 올 때마다 시트가 늘었다 줄었다 하지 않게, 검색 화면은 시트 최대 높이로 연다. */}
      <BottomSheetBody className="h-dvh basis-auto">
        <div className="flex flex-col gap-2 pb-4">
          <div className="flex flex-col gap-3">
            <SearchField
              value={keyword}
              onChange={setKeyword}
              placeholder="성분명 검색"
              label="성분명 검색"
              // 검색하러 들어온 화면이라 입력칸에서 바로 시작한다.
              autoFocus
            />
            <ConditionNotice notice={conflict.notice} onUndo={setLocal} onClose={conflict.clear} />
          </div>

          {query && !loading && foundGroups.length === 0 && items.length === 0 ? (
            <EmptyState
              title={`‘${query}’${josaOf(query, "과/와")} 맞는 성분이 없어요`}
              description="성분명 철자를 확인해 보세요."
            />
          ) : null}

          {query && foundGroups.length + items.length > 0 ? (
            <div aria-busy={loading || undefined} className="flex flex-col">
              {foundGroups.length > 0 ? (
                <IngredientResultGroup title="성분군" count={foundGroups.length}>
                  {foundGroups.map((group) => (
                    <li key={`group-${group.code}`}>
                      <IngredientResultRow
                        name={group.name}
                        badge={groupSizeLabel(group)}
                        state={local[groupKey].includes(group.code) ? "added" : "idle"}
                        tone={purpose}
                        onToggle={() => toggleGroupRow(group)}
                      />
                    </li>
                  ))}
                </IngredientResultGroup>
              ) : null}
              {items.length > 0 ? (
                <IngredientResultGroup title="성분" count={items.length}>
                  {items.map((item, index) => (
                    <li key={item.id}>
                      <IngredientResultRow
                        name={item.koreanName}
                        cautions={item.excludeGroups}
                        effects={item.skinEffects}
                        formulationRoles={item.formulationRoles}
                        state={ingredientState(item)}
                        tone={purpose}
                        onToggle={() => toggleItem(item, index)}
                      />
                    </li>
                  ))}
                </IngredientResultGroup>
              ) : null}
            </div>
          ) : null}
        </div>
      </BottomSheetBody>
      {changed ? (
        // 다음 단계로 넘어와 행동이 하나뿐인 자리라 큰 버튼을 쓴다(명세 '추가 단계 하단 행동 영역').
        <BottomSheetFooter
          size="lg"
          primary={{
            label: added > 0 ? `${formatCount(added)} 추가하기` : "적용하기",
            onClick: () => onApply(local),
          }}
        />
      ) : null}
    </>
  );
}
