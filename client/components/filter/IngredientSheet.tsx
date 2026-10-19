"use client";

import type { ExcludeCode, IngredientGroupResponse } from "@poudy/api/api.zod";
import { BottomSheetBody, BottomSheetFooter, BottomSheetHeader } from "@poudy/design-system/bottom-sheet";
import { type ReactNode, useState } from "react";

import { ExcludeCodesAbout } from "./ExcludeCodesAbout";
import { IngredientConditionBody } from "./IngredientConditionBody";
import { IngredientSearchStep, type SearchPurpose } from "./IngredientSearchStep";

import { track } from "@/lib/analytics/track";
import { knownExcludeCodes } from "@/lib/domain/exclude-codes";
import type { Filter } from "@/lib/domain/filter";
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

  if (step.kind === "about") {
    return (
      <>
        <BottomSheetHeader title="자주 피하는 성분이란?" onBack={() => setStep(EDIT)} />
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
        onBack={() => setStep(EDIT)}
        onApply={(changed) => {
          setDraft({ ...draft, ...changed });
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
          onSearch={(purpose) => setStep({ kind: "search", purpose })}
          onAbout={() => setStep({ kind: "about" })}
        />
      </BottomSheetBody>
      <BottomSheetFooter
        primary={{ label: props.submitLabel, onClick: props.onSubmit, disabled: props.submitDisabled }}
        secondary={{ label: "초기화", onClick: props.onReset }}
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
  readonly onSearch: (purpose: SearchPurpose) => void;
  readonly onAbout: () => void;
};

/** 성분 조건 편집 본문(IngredientConditionBody)에 조건 일치 제품의 담기·빼기와 기록(surface: filter_sheet)을 붙인다. */
function IngredientEditor({ draft, setDraft, excludeCodes, names, groups, onSearch, onAbout }: IngredientEditorProps) {
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
      setDraft({ ...draft, [groupKey]: draft[groupKey].filter((code) => code !== value) });
      return;
    }
    track("ingredient_condition_toggled", {
      target_type: "ingredient",
      ingredient_id: Number(value),
      condition: purpose,
      action: "remove",
      surface: "filter_sheet",
    });
    setDraft({ ...draft, [idsKey]: draft[idsKey].filter((id) => id !== value) });
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
    <IngredientConditionBody
      filter={draft}
      names={names}
      groups={groups}
      quickFilters={knownExcludeCodes(excludeCodes)}
      onAdd={onSearch}
      onRemoveIngredient={(purpose, id) => remove(purpose, "ingredient", id)}
      onRemoveGroup={(purpose, code) => remove(purpose, "group", code)}
      onToggleQuickFilter={(code) => toggleCode(code)}
      onOpenQuickFilterInfo={onAbout}
    />
  );
}
