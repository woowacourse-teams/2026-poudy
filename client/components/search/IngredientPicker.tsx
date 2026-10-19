"use client";

import type { IngredientSuggestionResponse } from "@poudy/api/api.zod";
import { BottomActionBar } from "@poudy/design-system/bottom-action-bar";
import { EmptyState } from "@poudy/design-system/empty-state";
import { Icon } from "@poudy/design-system/icon";
import { Portal } from "@poudy/design-system/portal";
import { Screen, ScreenBody } from "@poudy/design-system/screen";
import { SearchField } from "@poudy/design-system/search-field";
import { useToast } from "@poudy/design-system/toast";
import { TopBar } from "@poudy/design-system/top-bar";
import { type KeyboardEvent, type RefObject, useState } from "react";

import { ConditionNotice, useConditionNotice } from "@/components/filter/ConditionNotice";
import { IngredientResultGroup } from "@/components/filter/IngredientResultGroup";
import { IngredientResultRow, type ResultRowState } from "@/components/filter/IngredientResultRow";
import { EffectIcon } from "@/components/ingredient/EffectTag";
import { track } from "@/lib/analytics/track";
import type { KnownExcludeCodeResponse } from "@/lib/domain/exclude-codes";
import type { Filter } from "@/lib/domain/filter";
import { josaOf, withJosa } from "@/lib/domain/format";
import {
  addedCount,
  addGroup,
  addIngredient,
  type ConditionResolution,
  groupKeyOf,
  type IngredientCondition,
  ingredientConditionChanged,
  ingredientKeyOf,
  resolutionMessage,
  toggleGroupCondition,
  toggleIngredient,
} from "@/lib/domain/ingredient-condition";
import {
  excludedGroupIngredients,
  groupDisplayName,
  groupLabel,
  type IngredientGroup,
  type IngredientGroups,
  selectedGroupCodes,
} from "@/lib/domain/ingredient-groups";
import { useIngredientGroups } from "@/lib/hooks/useIngredientGroups";
import { useIngredientSearch } from "@/lib/hooks/useIngredientSearch";
import { useScrollLock } from "@/lib/hooks/useScrollLock";

/** 효과 아이콘은 최대 3개까지 둔다(명세 APP · 성분 검색 결과 행). */
const VISIBLE_EFFECTS = 3;

const TITLE: Record<IngredientCondition, string> = {
  include: "원하는 성분 추가",
  exclude: "피하고 싶은 성분 추가",
};

const FOCUSABLE = 'button:not([disabled]), input, [href], [tabindex]:not([tabindex="-1"])';

export type IngredientPickerProps = {
  readonly condition: IngredientCondition;
  /** 화면에 걸려 있는 조건. 고른 것은 '추가하기'를 누를 때까지 이 조건에 반영하지 않는다. */
  readonly filter: Filter;
  readonly quickFilters: readonly KnownExcludeCodeResponse[];
  /** 이미 아는 성분 이름. 성분군으로 묶은 성분의 이름을 알리는 데 쓴다. */
  readonly names: ReadonlyMap<number, string>;
  readonly onApply: (next: Filter) => void;
  readonly onBack: () => void;
  /** 닫힌 뒤 포커스를 돌려줄 요소. 이 화면을 연 버튼이다(A11Y D02). */
  readonly returnFocus: RefObject<HTMLElement | null>;
};

/**
 * 성분 추가 화면(명세 S22a · S32 · S32a · S33 · S34). 성분 탭 위를 덮는 화면이다.
 *
 * 고른 것은 '추가하기'를 눌러야 반영한다. 뒤로 가면 고른 것을 버린다. 결과가 반드시 비는 조합은 묻지 않고 바로 정리한 뒤
 * 검색 입력 아래 안내 줄과 [되돌리기]로 알린다(S33 · S33a). 성분군을 담을 때 그 안의 성분을 따로 담아 두었으면
 * 하나로 묶고 토스트로 알린다(S34).
 */
export function IngredientPicker({
  condition,
  filter,
  quickFilters,
  names,
  onApply,
  onBack,
  returnFocus,
}: IngredientPickerProps) {
  // 닫히면 연 버튼으로 포커스를 돌려준다. 붙고 떨어지는 순간에만 하는 일이라 ref 정리 함수로 둔다.
  // 콜백을 고정해야 한다. 렌더마다 새 콜백을 넘기면 React 가 그때마다 정리 함수를 불러 포커스가 뒤 화면으로 갔다 오고,
  // 그 사이 한글 조합이 끊겨 'ㅅㅔㄹㅏ'처럼 자소가 하나씩 확정된다.
  // 한 번만 만든다. returnFocus 는 ref 객체라 바뀌지 않는다.
  const [restoreFocus] = useState(() => () => () => returnFocus.current?.focus({ preventScroll: true }));
  const [draft, setDraft] = useState(filter);
  const [keyword, setKeyword] = useState("");
  const conflict = useConditionNotice<Filter>();
  const toast = useToast();
  useScrollLock(true);

  const trimmed = keyword.trim();
  const { items, groups: groupItems, loading } = useIngredientSearch(keyword);
  const groups = useIngredientGroups(selectedGroupCodes(draft), groupItems);

  const excluded = new Map<string, readonly number[]>([
    ...quickFilters.map((code): [string, readonly number[]] => [code.code, code.ingredients.map((item) => item.id)]),
    ...excludedGroupIngredients(draft, groups),
  ]);
  const coveredIds = new Set(draft[groupKeyOf(condition)].flatMap((code) => groups.get(code)?.ingredientIds ?? []));

  const ingredientState = (id: number): ResultRowState => {
    if (coveredIds.has(id)) return "covered";
    return draft[ingredientKeyOf(condition)].includes(id) ? "added" : "idle";
  };

  const groupName = (code: string) =>
    quickFilters.find((found) => found.code === code)?.name ?? groupDisplayName(groups.get(code)?.name ?? code);

  const nameOf = (id: number) => items.find((found) => found.id === id)?.koreanName ?? names.get(id) ?? `성분 ${id}`;
  const subjectOf = (ids: readonly number[]) => {
    const first = nameOf(ids[0]);
    return ids.length > 1 ? `${first} 외 ${ids.length - 1}개` : first;
  };

  const edit = (next: Filter) => {
    conflict.clear();
    setDraft(next);
  };

  const resolve = (resolved: ConditionResolution, target: string) => {
    setDraft(resolved.filter);
    conflict.show(
      resolutionMessage(resolved, condition, { target, ingredient: nameOf, group: groupName }),
      resolved,
      draft,
    );
  };

  const toggleItem = (item: IngredientSuggestionResponse) => {
    if (draft[ingredientKeyOf(condition)].includes(item.id)) {
      edit(toggleIngredient(draft, condition, item.id));
      return;
    }
    track("search_suggestion_selected", {
      mode: "ingredient",
      query: trimmed,
      position: items.findIndex((found) => found.id === item.id),
      ingredient_id: item.id,
    });
    resolve(addIngredient(draft, { condition, id: item.id }, excluded), item.koreanName);
  };

  const toggleGroupRow = (group: IngredientGroup) => {
    if (draft[groupKeyOf(condition)].includes(group.code)) {
      edit(toggleGroupCondition(draft, condition, group).filter);
      return;
    }
    const resolved = addGroup(draft, condition, group);
    resolve(resolved, groupDisplayName(group.name));
    if (resolved.absorbedIds.length === 0) return;

    toast.show({
      message: `${withJosa(subjectOf(resolved.absorbedIds), "은/는")} ‘${groupDisplayName(group.name)}’에 들어 있어서 하나로 묶었어요`,
    });
  };

  const added = addedCount(filter, draft, condition);
  const changed = ingredientConditionChanged(filter, draft);
  const label = added > 0 ? `${added}개 추가하기` : changed ? "적용하기" : "추가하기";

  const results = groupItems.length + items.length;
  const notice = (() => {
    if (groupItems.length === 0) return undefined;
    return condition === "include"
      ? "성분군을 담으면 그중 하나라도 든 제품을 찾아요."
      : "성분군을 피하면 그중 하나라도 든 제품은 모두 빠져요.";
  })();

  /** 화면 밖으로 Tab 이 나가지 않게 처음과 끝을 잇는다. 덮인 성분 탭은 보이지 않는 자리다. */
  const keepFocusInside = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <Portal>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={TITLE[condition]}
        data-ingredient-picker=""
        onKeyDown={keepFocusInside}
        ref={restoreFocus}
        className="fixed inset-0 z-(--z-sheet) flex justify-center"
      >
        <div className="w-full max-w-md bg-background">
          <Screen scroll="body">
            <TopBar variant="sub" title={TITLE[condition]} titleAs="p" back={{ onClick: onBack }} />
            <ScreenBody>
              <div className="flex flex-col gap-4 px-gutter pt-3 pb-6">
                <div className="flex flex-col gap-3">
                  <SearchField
                    value={keyword}
                    onChange={setKeyword}
                    label="성분 검색"
                    placeholder="성분명을 입력해 주세요"
                    // 이 화면은 검색하러 들어오는 곳이라 바로 칠 수 있게 입력에 포커스를 둔다.
                    autoFocus
                  />
                  <ConditionNotice notice={conflict.notice} onUndo={setDraft} onClose={conflict.clear} />
                </div>

                {/* 결과 수는 늘 그려 둔 라이브 영역 하나로 알린다(A11Y D06). 목록 자체는 읽지 않는다. */}
                <p role="status" className="sr-only">
                  {trimmed && !loading ? `‘${trimmed}’ 결과 ${results}개` : ""}
                </p>

                <Results
                  condition={condition}
                  keyword={trimmed}
                  loading={loading}
                  total={results}
                  groupItems={groupItems}
                  items={items}
                  draft={draft}
                  groups={groups}
                  ingredientState={ingredientState}
                  onToggleItem={toggleItem}
                  onToggleGroup={toggleGroupRow}
                />

                {notice && trimmed && !loading && results > 0 ? (
                  <p className="flex gap-2 rounded-lg bg-surface p-4 text-body-sm text-text-body">
                    {/* 아이콘 칸을 문구 첫 줄 높이(1lh)로 두어 아이콘이 첫 줄 가운데에 온다. */}
                    <span aria-hidden="true" className="flex h-lh shrink-0 items-center text-text-secondary">
                      <Icon name="info-circle" size={16} scalable />
                    </span>
                    <span className="min-w-0 flex-1">{notice}</span>
                  </p>
                ) : null}
              </div>
            </ScreenBody>
            <BottomActionBar
              position="screen-end"
              action={{ label, disabled: !changed, onClick: () => (changed ? onApply(draft) : undefined) }}
            />
          </Screen>
        </div>
      </div>
    </Portal>
  );
}

type ResultsProps = {
  readonly condition: IngredientCondition;
  readonly keyword: string;
  readonly loading: boolean;
  readonly total: number;
  readonly groupItems: readonly IngredientGroup[];
  readonly items: readonly IngredientSuggestionResponse[];
  readonly draft: Filter;
  readonly groups: IngredientGroups;
  readonly ingredientState: (id: number) => ResultRowState;
  readonly onToggleItem: (item: IngredientSuggestionResponse) => void;
  readonly onToggleGroup: (group: IngredientGroup) => void;
};

function Results({
  condition,
  keyword,
  loading,
  total,
  groupItems,
  items,
  draft,
  ingredientState,
  onToggleItem,
  onToggleGroup,
}: ResultsProps) {
  if (!keyword) return null;

  if (loading && total === 0) {
    return <p className="flex min-h-40 items-center justify-center text-body-sm text-text-secondary">검색하는 중…</p>;
  }

  if (total === 0) {
    return (
      <div className="py-12">
        <EmptyState
          icon={<Icon name="search" size={28} />}
          title={`‘${keyword}’${josaOf(keyword, "과/와")} 맞는 성분이 없어요`}
          description={"이름을 다시 확인하거나,\n영문 성분명(INCI)으로 검색해 보세요."}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {groupItems.length > 0 ? (
        <IngredientResultGroup title="성분군" count={groupItems.length}>
          {groupItems.map((group) => (
            <li key={group.code}>
              <IngredientResultRow
                name={groupLabel(group)}
                badge="성분군"
                state={draft[groupKeyOf(condition)].includes(group.code) ? "added" : "idle"}
                tone={condition}
                onToggle={() => onToggleGroup(group)}
              />
            </li>
          ))}
        </IngredientResultGroup>
      ) : null}
      {items.length > 0 ? (
        <IngredientResultGroup title="성분" count={items.length}>
          {items.map((item) => (
            <li key={item.id}>
              <IngredientResultRow
                name={item.koreanName}
                description={item.englishName}
                icons={item.skinEffects.slice(0, VISIBLE_EFFECTS).map((effect) => (
                  <EffectIcon key={effect.code} code={effect.code} size={14} className="text-text-secondary" />
                ))}
                state={ingredientState(item.id)}
                tone={condition}
                onToggle={() => onToggleItem(item)}
              />
            </li>
          ))}
        </IngredientResultGroup>
      ) : null}
    </div>
  );
}
