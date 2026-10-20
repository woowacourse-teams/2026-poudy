"use client";

import type { ExcludeCode, IngredientGroupResponse } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { Icon } from "@poudy/design-system/icon";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { IngredientPicker } from "./IngredientPicker";
import { QuickFilterInfoSheet } from "./QuickFilterInfoSheet";
import { SearchModeTabs } from "./SearchModeTabs";
import { SearchTopBar } from "./SearchTopBar";

import { ConditionNotice, useConditionNotice } from "@/components/filter/ConditionNotice";
import { IngredientConditionBody } from "@/components/filter/IngredientConditionBody";
import { RollingNumber } from "@/components/ui/RollingNumber";
import { track } from "@/lib/analytics/track";
import { findConflicts } from "@/lib/domain/conflict";
import { knownExcludeCodes } from "@/lib/domain/exclude-codes";
import { EMPTY_FILTER, type Filter, serializeFilter } from "@/lib/domain/filter";
import { summarizeFilter } from "@/lib/domain/filter-summary";
import { formatCount } from "@/lib/domain/format";
import {
  addExcludeCode,
  clearIngredientConditions,
  groupKeyOf,
  hasIngredientCondition,
  type IngredientCondition,
  ingredientKeyOf,
  resolutionMessage,
} from "@/lib/domain/ingredient-condition";
import { excludedGroupIngredients, selectedGroupCodes } from "@/lib/domain/ingredient-groups";
import { useFilterQuery } from "@/lib/hooks/useFilterQuery";
import { useIngredientGroups } from "@/lib/hooks/useIngredientGroups";
import { useIngredientNames } from "@/lib/hooks/useIngredientNames";
import { useCountState } from "@/lib/hooks/useProductCount";
import { addRecentFilter } from "@/lib/storage/recent-filters";

const PATH = "/search/ingredients";

type IngredientSearchScreenProps = {
  readonly excludeCodes: readonly IngredientGroupResponse[];
};

const NO_NAMES: ReadonlyMap<number, string> = new Map();
const NO_GROUPS = new Map();
const ignore = () => {};

/**
 * 성분 추가 화면을 이 화면이 연 기록. 이 화면이 쌓은 기록이면 닫을 때 하나 되돌리고, 주소로 바로 들어온 것이면
 * 주소만 갈아 끼운다. 되돌릴 기록이 없는데 되돌리면 사이트 밖으로 나간다.
 */
let pickerPushed = false;

const urlOf = (filter: Filter, add?: IngredientCondition) => {
  const query = serializeFilter(filter);
  if (add) query.set("add", add);
  const text = query.toString();
  return text ? `${PATH}?${text}` : PATH;
};

const pickerConditionOf = (value: string | null): IngredientCondition | undefined =>
  value === "include" || value === "exclude" ? value : undefined;

/** 화면 머리. 탭 아래 8 을 띄운다(명세 '성분 필터링 검색 Section'). */
function Tabs() {
  return (
    <div className="pb-2">
      <SearchModeTabs current="ingredient" />
    </div>
  );
}

/**
 * 조건을 읽기 전의 S22. 조건이 없을 때와 같은 모양이다. 조건은 주소에서 읽어 브라우저에서만 알 수 있어, 미리 만든
 * HTML 에는 이 모양이 담긴다. 조건 없이 들어온 사람은 스크립트가 붙어도 화면이 바뀌지 않는다.
 */
export function IngredientSearchScreenFallback({ excludeCodes }: IngredientSearchScreenProps) {
  return (
    <main className="flex flex-1 flex-col">
      <SearchTopBar />
      <div className="flex flex-1 flex-col px-gutter pt-3 pb-6">
        <Tabs />
        <IngredientConditionBody
          filter={EMPTY_FILTER}
          names={NO_NAMES}
          groups={NO_GROUPS}
          quickFilters={knownExcludeCodes(excludeCodes)}
          onAdd={ignore}
          onRemoveIngredient={ignore}
          onRemoveGroup={ignore}
          onToggleQuickFilter={ignore}
          onOpenQuickFilterInfo={ignore}
        />
      </div>
      <CountBar label="조건을 골라 주세요" blocked />
    </main>
  );
}

/** S22 · S31 성분 탭. 조건은 이 화면의 주소에 담는다. */
export function IngredientSearchScreen({ excludeCodes }: IngredientSearchScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { filter, setCondition } = useFilterQuery(PATH);
  const adding = pickerConditionOf(searchParams.get("add"));
  const [infoOpen, setInfoOpen] = useState(false);
  // 자주 피하는 성분을 켜며 원하는 성분을 뺐으면 탭 아래 안내 줄로 알린다(S35). 다음 편집 전까지 남는다.
  const conflict = useConditionNotice<Filter>();
  const opener = useRef<HTMLElement | null>(null);
  const started = useRef(false);

  // 조건에는 ID 만 남으므로 이름은 서버에서 가져온다. 링크로 들어와도 이름이 보인다.
  const names = useIngredientNames([...filter.includeIngredientIds, ...filter.excludeIngredientIds]);
  const groups = useIngredientGroups(selectedGroupCodes(filter));
  const quickFilters = knownExcludeCodes(excludeCodes);
  const codeIngredients = new Map<string, readonly number[]>([
    ...quickFilters.map((code): [string, readonly number[]] => [code.code, code.ingredients.map((item) => item.id)]),
    ...excludedGroupIngredients(filter, groups),
  ]);
  const conflicts = findConflicts(filter, codeIngredients);
  const hasCondition = hasIngredientCondition(filter);

  const { count, counting } = useCountState(filter);
  const resultKey = serializeFilter(filter).toString();
  const trackedEmptyResult = useRef<string | undefined>(undefined);
  const conditionCounts = {
    include_count: filter.includeIngredientIds.length,
    exclude_count: filter.excludeIngredientIds.length,
    exclude_group_count: filter.excludeCodes.length,
  };

  // 0개는 결과 목록으로 넘어가지 않아 그 화면이 남기지 못한다. 개수가 화면에 반영된 뒤 조건마다 한 번 남긴다.
  useEffect(() => {
    if (!hasCondition || counting || count !== 0 || trackedEmptyResult.current === resultKey) return;
    trackedEmptyResult.current = resultKey;
    track("search_results_viewed", { mode: "ingredient", result_count: 0, ...conditionCounts });
    // conditionCounts 는 렌더마다 새로 만든다. 조건이 같으면 resultKey 가 같아 다시 보내지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, counting, hasCondition, resultKey]);

  // 주소로 들어온 충돌은 화면이 만든 것이 아니라 알린다. 걸린 성분이 같으면 다시 보내지 않는다.
  const conflictKey = conflicts.flatMap((conflict) => conflict.ingredientIds).join(",");
  useEffect(() => {
    if (!conflictKey) return;
    track("filter_conflict_shown", {
      conflict_count: conflicts.length,
      ingredient_count: conflictKey.split(",").length,
    });
    // conflicts 는 렌더마다 새로 만든다. 걸린 성분이 같으면 다시 보내지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conflictKey]);

  const markStarted = () => {
    if (started.current) return;
    started.current = true;
    track("search_started", { mode: "ingredient" });
  };

  const openPicker = (condition: IngredientCondition) => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    markStarted();
    pickerPushed = true;
    window.history.pushState(null, "", urlOf(filter, condition));
  };

  const closePicker = (next?: Filter) => {
    const url = urlOf(next ?? filter);
    if (!pickerPushed) {
      window.history.replaceState(null, "", url);
      return;
    }
    pickerPushed = false;
    // 쌓은 기록을 되돌린 뒤 그 자리의 주소를 새 조건으로 바꾼다. 성분 탭에서 뒤로 가면 담기 전 화면이 아니라 앞 화면으로 간다.
    if (next) {
      window.addEventListener("popstate", () => window.history.replaceState(null, "", url), { once: true });
    }
    window.history.back();
  };

  const applyPicked = (next: Filter) => {
    conflict.clear();
    trackChanges(filter, next);
    closePicker(next);
  };

  const removeIngredient = (condition: IngredientCondition, id: number) => {
    markStarted();
    track("ingredient_condition_toggled", {
      target_type: "ingredient",
      ingredient_id: id,
      condition,
      action: "remove",
      surface: "ingredient_search",
    });
    const key = ingredientKeyOf(condition);
    conflict.clear();
    setCondition({ [key]: filter[key].filter((value) => value !== id) });
  };

  const removeGroup = (condition: IngredientCondition, code: string) => {
    markStarted();
    track("ingredient_condition_toggled", {
      target_type: "ingredient_group",
      group_code: code,
      condition,
      action: "remove",
      surface: "ingredient_search",
    });
    const key = groupKeyOf(condition);
    conflict.clear();
    setCondition({ [key]: filter[key].filter((value) => value !== code) });
  };

  const toggleQuickFilter = (code: ExcludeCode, pressed: boolean) => {
    markStarted();
    track("ingredient_condition_toggled", {
      target_type: "exclude_group",
      exclude_code: code,
      condition: "exclude",
      action: pressed ? "add" : "remove",
      surface: "ingredient_search",
    });
    if (!pressed) {
      conflict.clear();
      setCondition({ excludeCodes: filter.excludeCodes.filter((item) => item !== code) });
      return;
    }
    const found = quickFilters.find((item) => item.code === code);
    const resolved = addExcludeCode(filter, code, found?.ingredients.map((item) => item.id) ?? []);
    setCondition({
      excludeCodes: resolved.filter.excludeCodes,
      includeIngredientIds: resolved.filter.includeIngredientIds,
    });
    conflict.show(
      resolutionMessage(resolved, "exclude", {
        target: found?.name ?? code,
        ingredient: (id) => names.get(id) ?? `성분 ${id}`,
        group: (value) => value,
      }),
      resolved,
      filter,
    );
  };

  const undoQuickFilter = (before: Filter) =>
    setCondition({ excludeCodes: before.excludeCodes, includeIngredientIds: before.includeIngredientIds });

  const reset = () => {
    track("filter_reset", { filter_type: "ingredient" });
    conflict.clear();
    setCondition(clearIngredientConditions(filter));
  };

  const summary = summarizeFilter(filter, names, groups);
  const blocked = !hasCondition || conflicts.length > 0 || counting || count === undefined || count === 0;

  const submit = () => {
    if (blocked || count === undefined) return;
    track("search_submitted", { mode: "ingredient", result_count: count, ...conditionCounts });
    addRecentFilter({ query: resultKey, summary, mode: "ingredient" });
    router.push(`/products?${resultKey}`);
  };

  return (
    <main className="flex flex-1 flex-col">
      <SearchTopBar action={hasCondition ? { text: "초기화", onClick: reset } : undefined} />
      <div className="flex flex-1 flex-col gap-4 px-gutter pt-3 pb-6">
        <div className="flex flex-col">
          <Tabs />
          <div className="flex flex-col gap-2">
            <ConditionNotice notice={conflict.notice} onUndo={undoQuickFilter} onClose={conflict.clear} />
            <IngredientConditionBody
              filter={filter}
              names={names}
              groups={groups}
              quickFilters={quickFilters}
              onAdd={openPicker}
              onRemoveIngredient={removeIngredient}
              onRemoveGroup={removeGroup}
              onToggleQuickFilter={toggleQuickFilter}
              onOpenQuickFilterInfo={() => setInfoOpen(true)}
              quickFilterInfoIsDialog
            />
          </div>
        </div>

        {conflicts.length > 0 ? (
          <p role="alert" className="flex gap-2 rounded-lg bg-danger-soft p-4 text-body-sm text-danger-action">
            <Icon name="alert-circle" size={16} scalable />
            <span className="min-w-0 flex-1">
              피하고 싶은 성분군에 든 성분이 원하는 성분에 있어요. 둘 중 하나를 빼 주세요.
            </span>
          </p>
        ) : null}
      </div>

      <CountBar
        blocked={blocked}
        onPress={submit}
        count={hasCondition ? count : undefined}
        label={hasCondition ? "제품 보기" : "조건을 골라 주세요"}
      />

      <QuickFilterInfoSheet open={infoOpen} onClose={() => setInfoOpen(false)} quickFilters={quickFilters} />

      {adding ? (
        <IngredientPicker
          // 조건마다 고르던 것을 새로 시작한다.
          key={adding}
          condition={adding}
          filter={filter}
          quickFilters={quickFilters}
          names={names}
          onApply={applyPicked}
          onBack={() => closePicker()}
          returnFocus={opener}
        />
      ) : null}
    </main>
  );
}

/** 성분 추가 화면에서 반영한 차이를 조건 하나씩 남긴다. 고르기만 하고 나간 것은 남기지 않는다. */
const trackChanges = (before: Filter, after: Filter) => {
  for (const condition of ["include", "exclude"] as const) {
    const key = ingredientKeyOf(condition);
    const groupKey = groupKeyOf(condition);
    for (const id of after[key].filter((value) => !before[key].includes(value))) {
      track("ingredient_condition_toggled", {
        target_type: "ingredient",
        ingredient_id: id,
        condition,
        action: "add",
        surface: "ingredient_search",
      });
    }
    for (const id of before[key].filter((value) => !after[key].includes(value))) {
      track("ingredient_condition_toggled", {
        target_type: "ingredient",
        ingredient_id: id,
        condition,
        action: "remove",
        surface: "ingredient_search",
      });
    }
    for (const code of after[groupKey].filter((value) => !before[groupKey].includes(value))) {
      track("ingredient_condition_toggled", {
        target_type: "ingredient_group",
        group_code: code,
        condition,
        action: "add",
        surface: "ingredient_search",
      });
    }
    for (const code of before[groupKey].filter((value) => !after[groupKey].includes(value))) {
      track("ingredient_condition_toggled", {
        target_type: "ingredient_group",
        group_code: code,
        condition,
        action: "remove",
        surface: "ingredient_search",
      });
    }
  }
  for (const code of before.excludeCodes.filter((value) => !after.excludeCodes.includes(value))) {
    track("ingredient_condition_toggled", {
      target_type: "exclude_group",
      exclude_code: code,
      condition: "exclude",
      action: "remove",
      surface: "ingredient_search",
    });
  }
};

type CountBarProps = {
  readonly label: string;
  readonly blocked: boolean;
  readonly count?: number;
  readonly onPress?: () => void;
};

/**
 * 성분 탭의 하단 행동 영역(명세 APP · 하단 행동 영역 · 내비 위). 하단 내비 바로 위에 붙는다.
 *
 * 디자인 시스템의 BottomActionBar 는 글자만 받아, 개수를 굴리는 RollingNumber 를 넣을 수 없어 같은 모양을 여기서 감싼다.
 * 숫자는 다이얼로 굴리고 낭독기에는 완성된 문구만 전한다. 구르는 동안에는 자리마다 0-9 가 모두 DOM 에 있다.
 */
function CountBar({ label, blocked, count, onPress }: CountBarProps) {
  const accessibleLabel = count === undefined ? label : `${formatCount(count)} ${label}`;

  return (
    <div className="sticky bottom-(--bottom-navigation-height) z-(--z-sticky) flex flex-col border-t border-border bg-background px-gutter py-3">
      <Button
        size="lg"
        aria-disabled={blocked || undefined}
        aria-label={accessibleLabel}
        onClick={onPress}
        className="w-full"
      >
        <span aria-hidden="true" className="inline-flex items-center">
          {count === undefined ? null : (
            <>
              <RollingNumber value={count} />
              개&nbsp;
            </>
          )}
          {label}
        </span>
      </Button>
    </div>
  );
}
