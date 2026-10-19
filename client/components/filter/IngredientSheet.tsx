"use client";

import type { ExcludeCode, IngredientGroupResponse } from "@poudy/api/api.zod";
import { BottomSheetBody, BottomSheetFooter, BottomSheetHeader } from "@poudy/design-system/bottom-sheet";
import { Button } from "@poudy/design-system/button";
import { Icon } from "@poudy/design-system/icon";
import { IconButton } from "@poudy/design-system/icon-button";
import { Tag } from "@poudy/design-system/tag";
import { ToggleChip, ToggleGroup } from "@poudy/design-system/toggle-chip";
import { Fragment, type ReactNode, useId, useState } from "react";

import { IngredientSearchStep, type SearchPurpose } from "./IngredientSearchStep";

import { track } from "@/lib/analytics/track";
import { knownExcludeCodes } from "@/lib/domain/exclude-codes";
import type { Filter } from "@/lib/domain/filter";
import { formatCount } from "@/lib/domain/format";
import { type GroupConditionKey, groupLabel, type IngredientGroups } from "@/lib/domain/ingredient-groups";

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
          <AboutExcludeCodes excludeCodes={excludeCodes} />
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
  include: { title: "원하는 성분", idsKey: "includeIngredientIds", groupKey: "includeGroupCodes" },
  exclude: { title: "피하고 싶은 성분", idsKey: "excludeIngredientIds", groupKey: "excludeGroupCodes" },
} as const satisfies Record<
  SearchPurpose,
  {
    readonly title: string;
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

/** 성분 조건 편집 본문. 원하는 성분 → 피하고 싶은 성분 → 자주 피하는 성분 순서다. */
function IngredientEditor({ draft, setDraft, excludeCodes, names, groups, onSearch, onAbout }: IngredientEditorProps) {
  const quickId = useId();

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

  const codes = knownExcludeCodes(excludeCodes);

  return (
    <div className="flex flex-col pb-4">
      <ConditionSection
        purpose="include"
        draft={draft}
        names={names}
        groups={groups}
        onSearch={onSearch}
        onRemove={remove}
      />
      <div className="flex flex-col gap-3 border-t border-border pt-6">
        <ConditionSection
          purpose="exclude"
          draft={draft}
          names={names}
          groups={groups}
          onSearch={onSearch}
          onRemove={remove}
        />

        <section aria-labelledby={quickId} className="flex flex-col gap-2 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-x-2">
            <div className="flex items-center">
              <h3 id={quickId} className="text-body-sm font-semibold text-text-body">
                자주 피하는 성분
              </h3>
              <IconButton
                size="sm"
                label="자주 피하는 성분 설명"
                icon={<Icon name="info-circle" size={16} className="text-text-secondary" />}
                onClick={onAbout}
              />
            </div>
            {draft.excludeCodes.length > 0 ? (
              <span className="text-body-sm text-text-secondary">{formatCount(draft.excludeCodes.length)} 선택</span>
            ) : null}
          </div>
          <ToggleGroup aria-labelledby={quickId}>
            {codes.map((code) => (
              <ToggleChip
                key={code.code}
                pressed={draft.excludeCodes.includes(code.code)}
                onPressedChange={() => toggleCode(code.code)}
              >
                {code.name}
              </ToggleChip>
            ))}
          </ToggleGroup>
        </section>
      </div>
    </div>
  );
}

type ConditionSectionProps = {
  readonly purpose: SearchPurpose;
  readonly draft: Filter;
  readonly names: ReadonlyMap<number, string>;
  readonly groups: IngredientGroups;
  readonly onSearch: (purpose: SearchPurpose) => void;
  readonly onRemove: (purpose: SearchPurpose, kind: "ingredient" | "group", value: number | string) => void;
};

/**
 * 원하는 성분 · 피하고 싶은 성분 섹션. 담은 성분과 성분군을 칩(Tag item)으로 쌓고 ✕ 로 뺀다.
 * 비어 있으면 개수와 [+ 추가] 대신 '검색해서 추가' 버튼만 둔다(명세 S23i).
 */
function ConditionSection({ purpose, draft, names, groups, onSearch, onRemove }: ConditionSectionProps) {
  const headingId = useId();
  const { title, idsKey, groupKey } = SECTION[purpose];
  const ids = draft[idsKey];
  const codes = draft[groupKey];
  const count = ids.length + codes.length;

  return (
    <section
      aria-labelledby={headingId}
      className={purpose === "include" ? "flex flex-col gap-3 pb-6" : "flex flex-col gap-3"}
    >
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-2">
        <h3 id={headingId} className="text-section font-bold text-text-primary">
          {title}
          {count > 0 ? <span className="text-text-secondary"> {count}</span> : null}
        </h3>
        {count > 0 ? (
          <Button
            variant="outline"
            leadingIcon={<Icon name="plus" size={16} />}
            onClick={() => onSearch(purpose)}
            aria-label={`${title} 추가`}
          >
            추가
          </Button>
        ) : null}
      </div>

      {count > 0 ? (
        <div className="flex flex-wrap gap-2">
          {codes.map((code) => {
            const group = groups.get(code);
            const name = group ? groupLabel(group) : code;
            return (
              <Tag key={`group-${code}`} variant="item" onRemove={() => onRemove(purpose, "group", code)}>
                {name}
              </Tag>
            );
          })}
          {ids.map((id) => (
            <Tag key={id} variant="item" onRemove={() => onRemove(purpose, "ingredient", id)}>
              {names.get(id) ?? `성분 ${id}`}
            </Tag>
          ))}
        </div>
      ) : (
        <Button variant="secondary" leadingIcon={<Icon name="plus" size={16} />} onClick={() => onSearch(purpose)}>
          {`${title} 검색해서 추가`}
        </Button>
      )}
    </section>
  );
}

/**
 * 자주 피하는 성분 설명(명세 S23h). 적용 전 조건을 잃지 않도록 성분군 설명 페이지로 옮겨 가지 않고 정보만 보여 준다.
 */
function AboutExcludeCodes({ excludeCodes }: { readonly excludeCodes: readonly IngredientGroupResponse[] }) {
  return (
    <div className="flex flex-col gap-2 pb-4">
      <p className="text-body-sm text-text-secondary">
        피부 상태나 취향에 따라 빼고 보는 분들이 많은 성분군이에요. 누구에게나 나쁜 성분이라는 뜻은 아니에요.
      </p>
      <ul>
        {knownExcludeCodes(excludeCodes).map((code) => (
          <li key={code.code} className="flex flex-col gap-1 border-b border-border py-4 last:border-b-0">
            <div className="flex items-center gap-2">
              <span className="text-title font-semibold text-text-primary">{code.name}</span>
              <Tag variant="label" tone="muted">
                {`${code.ingredients.length}종`}
              </Tag>
            </div>
            <p className="text-body-sm text-text-body">{code.description}</p>
            {code.ingredients.length > 0 ? (
              <p className="text-caption text-text-muted">
                예:{" "}
                {/* 이름 안(예: 에스디알코올40-B 의 하이픈)에서 줄이 갈리지 않게 이름마다 묶는다. 줄은 이름 사이에서만 바뀐다. */}
                {code.ingredients.slice(0, 3).map((ingredient, index) => (
                  <Fragment key={ingredient.id}>
                    {index > 0 ? " · " : null}
                    <span className="whitespace-nowrap">{ingredient.koreanName}</span>
                  </Fragment>
                ))}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
