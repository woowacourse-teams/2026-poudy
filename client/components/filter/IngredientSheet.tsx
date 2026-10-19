"use client";

import type { ExcludeCode, IngredientGroupResponse } from "@poudy/api/api.zod";
import { BottomSheetBody, BottomSheetFooter, BottomSheetHeader } from "@poudy/design-system/bottom-sheet";
import { type ReactNode, useState } from "react";

import { ConditionNotice, useConditionNotice } from "./ConditionNotice";
import { ExcludeCodesAbout } from "./ExcludeCodesAbout";
import { IngredientConditionBody } from "./IngredientConditionBody";
import { IngredientSearchStep, type SearchPurpose } from "./IngredientSearchStep";

import { track } from "@/lib/analytics/track";
import { knownExcludeCodes } from "@/lib/domain/exclude-codes";
import type { Filter } from "@/lib/domain/filter";
import { addExcludeCode, resolutionMessage } from "@/lib/domain/ingredient-condition";
import type { GroupConditionKey, IngredientGroups } from "@/lib/domain/ingredient-groups";

type Step =
  { readonly kind: "edit" } | { readonly kind: "search"; readonly purpose: SearchPurpose } | { readonly kind: "about" };

const EDIT: Step = { kind: "edit" };

type IngredientSheetProps = {
  readonly draft: Filter;
  readonly setDraft: (filter: Filter) => void;
  readonly excludeCodes: readonly IngredientGroupResponse[];
  readonly names: ReadonlyMap<number, string>;
  readonly groups: IngredientGroups;
  readonly submitLabel: NonNullable<ReactNode>;
  /** 주 버튼을 막는다. 결과가 0개일 때 준다. */
  readonly submitDisabled?: boolean;
  readonly onSubmit: () => void;
  readonly onReset: () => void;
  readonly onClose: () => void;
};

/**
 * 성분 시트(명세 S23d · S23h · S23i, APP · 성분 조건 편집 본문 LBL92). 시트를 하나 더 쌓지 않고 같은 시트 안에서
 * 편집 → 검색해서 추가 → 자주 피하는 성분 설명으로 넘어간다. 뒤로 가면 담던 조건이 그대로 남는다.
 */
export function IngredientSheet(props: IngredientSheetProps) {
  const { draft, setDraft, excludeCodes, names, groups, onClose } = props;
  const [step, setStep] = useState<Step>(EDIT);
  // 안내 줄(S35a)은 다음 편집 전까지 남는다. 단계를 옮기거나 초기화해도 닫는다. 시트를 닫으면 이 상태도 함께 사라진다.
  const conflict = useConditionNotice<Filter>();
  const goTo = (next: Step) => {
    conflict.clear();
    setStep(next);
  };

  if (step.kind === "about") {
    return (
      <>
        <BottomSheetHeader title="자주 피하는 성분이란?" onBack={() => goTo(EDIT)} />
        <BottomSheetBody>
          {/* 적용 전 조건을 잃지 않도록 성분군 설명 페이지로 옮겨 가지 않고 정보만 보여 준다. */}
          <ExcludeCodesAbout quickFilters={knownExcludeCodes(excludeCodes)} />
        </BottomSheetBody>
      </>
    );
  }

  if (step.kind === "search") {
    return (
      <IngredientSearchStep
        purpose={step.purpose}
        draft={draft}
        excludeCodes={excludeCodes}
        groups={groups}
        names={names}
        onBack={() => goTo(EDIT)}
        onApply={(next) => {
          setDraft(next);
          setStep(EDIT);
        }}
      />
    );
  }

  return (
    <>
      <BottomSheetHeader title="성분" onClose={onClose} />
      <BottomSheetBody>
        <IngredientEditor
          draft={draft}
          setDraft={setDraft}
          excludeCodes={excludeCodes}
          names={names}
          groups={groups}
          conflict={conflict}
          onSearch={(purpose) => goTo({ kind: "search", purpose })}
          onAbout={() => goTo({ kind: "about" })}
        />
      </BottomSheetBody>
      <BottomSheetFooter
        primary={{ label: props.submitLabel, onClick: props.onSubmit, disabled: props.submitDisabled }}
        secondary={{
          label: "초기화",
          onClick: () => {
            conflict.clear();
            props.onReset();
          },
        }}
      />
    </>
  );
}

const SECTION = {
  include: { idsKey: "includeIngredientIds", groupKey: "includeGroupCodes" },
  exclude: { idsKey: "excludeIngredientIds", groupKey: "excludeGroupCodes" },
} as const satisfies Record<
  SearchPurpose,
  {
    readonly idsKey: "includeIngredientIds" | "excludeIngredientIds";
    readonly groupKey: GroupConditionKey;
  }
>;

type IngredientEditorProps = {
  readonly draft: Filter;
  readonly setDraft: (filter: Filter) => void;
  readonly excludeCodes: readonly IngredientGroupResponse[];
  readonly names: ReadonlyMap<number, string>;
  readonly groups: IngredientGroups;
  readonly conflict: ReturnType<typeof useConditionNotice<Filter>>;
  readonly onSearch: (purpose: SearchPurpose) => void;
  readonly onAbout: () => void;
};

/**
 * 성분 조건 편집 본문(IngredientConditionBody)에 조건 일치 제품의 담기·빼기와 기록(surface: filter_sheet)을 붙인다.
 * 자주 피하는 성분을 켜며 원하는 성분을 뺐으면 시트 머리 아래에 안내 줄을 띄운다(S35a).
 */
function IngredientEditor({
  draft,
  setDraft,
  excludeCodes,
  names,
  groups,
  conflict,
  onSearch,
  onAbout,
}: IngredientEditorProps) {
  const quickFilters = knownExcludeCodes(excludeCodes);

  const edit = (next: Filter) => {
    conflict.clear();
    setDraft(next);
  };

  const remove = (purpose: SearchPurpose, kind: "ingredient" | "group", value: number | string) => {
    const { idsKey, groupKey } = SECTION[purpose];
    if (kind === "group") {
      track("ingredient_condition_toggled", {
        target_type: "ingredient_group",
        group_code: String(value),
        condition: purpose,
        action: "remove",
        surface: "filter_sheet",
      });
      edit({ ...draft, [groupKey]: draft[groupKey].filter((code) => code !== value) });
      return;
    }
    track("ingredient_condition_toggled", {
      target_type: "ingredient",
      ingredient_id: Number(value),
      condition: purpose,
      action: "remove",
      surface: "filter_sheet",
    });
    edit({ ...draft, [idsKey]: draft[idsKey].filter((id) => id !== value) });
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
    if (had) {
      edit({ ...draft, excludeCodes: draft.excludeCodes.filter((item) => item !== code) });
      return;
    }
    const found = quickFilters.find((item) => item.code === code);
    const resolved = addExcludeCode(draft, code, found?.ingredients.map((item) => item.id) ?? []);
    setDraft(resolved.filter);
    conflict.show(
      resolutionMessage(resolved, "exclude", {
        target: found?.name ?? code,
        ingredient: (id) => names.get(id) ?? `성분 ${id}`,
        group: (value) => value,
      }),
      resolved,
      draft,
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <ConditionNotice notice={conflict.notice} onUndo={setDraft} onClose={conflict.clear} />
      <IngredientConditionBody
        filter={draft}
        names={names}
        groups={groups}
        quickFilters={quickFilters}
        onAdd={onSearch}
        onRemoveIngredient={(purpose, id) => remove(purpose, "ingredient", id)}
        onRemoveGroup={(purpose, code) => remove(purpose, "group", code)}
        onToggleQuickFilter={(code) => toggleCode(code)}
        onOpenQuickFilterInfo={onAbout}
      />
    </div>
  );
}
