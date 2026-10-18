"use client";

import type { ExcludeCode } from "@poudy/api/api.zod";
import { Icon } from "@poudy/design-system/icon";
import { Tag } from "@poudy/design-system/tag";
import { ToggleChip, ToggleGroup } from "@poudy/design-system/toggle-chip";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useId } from "react";

import type { KnownExcludeCodeResponse } from "@/lib/domain/exclude-codes";
import type { Filter } from "@/lib/domain/filter";
import { formatCount } from "@/lib/domain/format";
import {
  conditionCount,
  groupKeyOf,
  type IngredientCondition,
  ingredientKeyOf,
} from "@/lib/domain/ingredient-condition";
import { groupLabel, type IngredientGroups } from "@/lib/domain/ingredient-groups";

const SECTION_TITLE: Record<IngredientCondition, string> = {
  include: "원하는 성분",
  exclude: "피하고 싶은 성분",
};

export type IngredientConditionEditorProps = {
  readonly filter: Filter;
  /** 성분 ID 로 찾은 이름. 아직 모르는 성분은 'ID 번 성분'으로 둔다. */
  readonly names: ReadonlyMap<number, string>;
  /** 담긴 성분군. 이름과 성분 수를 적는 데 쓴다. */
  readonly groups: IngredientGroups;
  readonly quickFilters: readonly KnownExcludeCodeResponse[];
  /** '+ 추가'나 빈 섹션의 큰 버튼을 누를 때. 성분 추가 화면을 연다. */
  readonly onAdd: (condition: IngredientCondition) => void;
  readonly onRemoveIngredient: (condition: IngredientCondition, id: number) => void;
  readonly onRemoveGroup: (condition: IngredientCondition, code: string) => void;
  readonly onToggleQuickFilter: (code: ExcludeCode, pressed: boolean) => void;
  /** ⓘ 를 누를 때. 자주 피하는 성분 설명 시트를 연다. */
  readonly onOpenQuickFilterInfo: () => void;
};

/**
 * 성분 조건 편집 본문(명세 APP · 성분 조건 편집 본문, S22 · S31). 원하는 성분, 피하고 싶은 성분, 자주 피하는 성분 순서다.
 * 무엇을 담을지는 성분 추가 화면이 정하고, 이 본문은 담긴 것을 보여 주고 빼거나 켜고 끄는 일만 한다.
 */
export function IngredientConditionEditor(props: IngredientConditionEditorProps) {
  return (
    <div className="flex flex-col">
      <ConditionSection {...props} condition="include" />
      <ConditionSection {...props} condition="exclude" />
      <QuickFilters {...props} />
    </div>
  );
}

function ConditionSection({
  filter,
  names,
  groups,
  condition,
  onAdd,
  onRemoveIngredient,
  onRemoveGroup,
}: IngredientConditionEditorProps & { readonly condition: IngredientCondition }) {
  const titleId = useId();
  const count = conditionCount(filter, condition);
  const title = SECTION_TITLE[condition];

  return (
    <section
      aria-labelledby={titleId}
      className={
        condition === "include" ? "flex flex-col gap-2 border-b border-border pt-2 pb-6" : "flex flex-col gap-2 pt-6"
      }
    >
      <div className="flex min-h-8 items-center justify-between gap-2">
        <h2 id={titleId} className="flex items-center gap-1 text-section">
          <span className="font-bold text-text-primary">{title}</span>
          {count > 0 ? (
            <>
              <span aria-hidden="true" className="font-semibold text-text-secondary">
                {count}
              </span>
              <span className="sr-only">{formatCount(count)}</span>
            </>
          ) : null}
        </h2>
        {count > 0 ? <AddPill label={`${title} 추가`} onPress={() => onAdd(condition)} /> : null}
      </div>

      {count === 0 ? (
        <AddArea label={`${title} 검색해서 추가`} onPress={() => onAdd(condition)} />
      ) : (
        <ul aria-label={`담은 ${title}`} className="flex flex-wrap gap-2">
          {filter[groupKeyOf(condition)].map((code) => {
            const group = groups.get(code);
            const label = group ? groupLabel(group) : code;
            return (
              <li key={`group-${code}`} className="max-w-full min-w-0">
                <Tag variant="item" onRemove={() => onRemoveGroup(condition, code)} removeLabel={`${label} 빼기`}>
                  {label}
                </Tag>
              </li>
            );
          })}
          {filter[ingredientKeyOf(condition)].map((id) => (
            <li key={id} className="max-w-full min-w-0">
              <Tag variant="item" onRemove={() => onRemoveIngredient(condition, id)}>
                {names.get(id) ?? `${id}번 성분`}
              </Tag>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** 담긴 것이 있을 때 섹션 제목 오른쪽의 '+ 추가'. 보이는 높이는 32 이고 누르는 영역은 위아래로 넓혀 44 다. */
function AddPill({ label, onPress }: { readonly label: string; readonly onPress: () => void }) {
  const { pressableProps } = usePressable();

  return (
    <button
      type="button"
      aria-label={label}
      aria-haspopup="dialog"
      {...pressableProps}
      onClick={onPress}
      className="pressable fb-border flex h-8 shrink-0 items-center gap-1 rounded-full bg-layer px-3 text-body-sm leading-none font-semibold text-text-primary after:absolute after:inset-x-0 after:-inset-y-1.5"
    >
      <Icon name="plus" size={16} scalable />
      추가
    </button>
  );
}

/** 빈 섹션의 큰 추가 버튼(명세 '빈 상태 · 추가 영역'). 무엇을 담는 자리인지 문구로 말한다. */
function AddArea({ label, onPress }: { readonly label: string; readonly onPress: () => void }) {
  const { pressableProps } = usePressable();

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      {...pressableProps}
      onClick={onPress}
      className="pressable fb-border flex min-h-12 w-full items-center justify-center gap-1 rounded-lg bg-surface px-4 py-2 text-body font-semibold text-text-body"
    >
      <Icon name="plus" size={16} scalable />
      {label}
    </button>
  );
}

function QuickFilters({
  filter,
  quickFilters,
  onToggleQuickFilter,
  onOpenQuickFilterInfo,
}: IngredientConditionEditorProps) {
  const titleId = useId();
  const info = usePressable();
  const selected = filter.excludeCodes.length;

  return (
    <div className="flex flex-col gap-2 pt-3">
      <div className="flex min-h-5 items-center gap-1">
        <h3 id={titleId} className="text-body-sm font-semibold text-text-body">
          자주 피하는 성분
        </h3>
        {/* 보이는 아이콘은 16 이고 누르는 영역은 둘레로 넓혀 44 다. 머리 줄 높이(20)는 그대로 둔다. */}
        <button
          type="button"
          aria-label="자주 피하는 성분 설명 보기"
          aria-haspopup="dialog"
          {...info.pressableProps}
          onClick={onOpenQuickFilterInfo}
          className="pressable fb-circle flex size-5 shrink-0 items-center justify-center rounded-full text-text-secondary before:-inset-1 after:absolute after:-inset-3"
        >
          <Icon name="info-circle" size={16} className="relative" />
        </button>
        <span className="flex-1" />
        {selected > 0 ? <span className="text-body-sm font-medium text-text-secondary">{selected}개 선택</span> : null}
      </div>

      <ToggleGroup aria-labelledby={titleId}>
        {quickFilters.map((code) => (
          <ToggleChip
            key={code.code}
            pressed={filter.excludeCodes.includes(code.code)}
            onPressedChange={(pressed) => onToggleQuickFilter(code.code, pressed)}
          >
            {code.name}
          </ToggleChip>
        ))}
      </ToggleGroup>
    </div>
  );
}
