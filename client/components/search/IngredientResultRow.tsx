"use client";

import type { IngredientSuggestionResponse } from "@poudy/api/api.zod";
import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";
import type { ReactNode } from "react";

import { EffectIcon, effectLabel } from "@/components/ingredient/EffectTag";
import type { IngredientCondition } from "@/lib/domain/ingredient-condition";
import { groupDisplayName, type IngredientGroup } from "@/lib/domain/ingredient-groups";

/** 이름 옆에 두는 효과 아이콘 수. 한 줄에 담기는 만큼이다. */
const VISIBLE_EFFECTS = 3;

/**
 * - idle: 아직 담지 않음. 테두리 원 안의 +
 * - selected: 담음. 원하는 성분은 검정, 피하고 싶은 성분은 브랜드 색 원 안의 ✓
 * - covered: 담은 성분군에 이미 들어 있음. 회색 원 안의 ✓, 누를 수 없다
 */
export type ResultRowState = "idle" | "selected" | "covered";

type RowProps = {
  readonly condition: IngredientCondition;
  readonly state: ResultRowState;
  readonly onToggle: () => void;
};

/** 성분 검색 결과 행(명세 APP · 성분 검색 결과 행 · 담김 · 이미 담김). 행 전체가 담기 버튼이다. */
export function IngredientResultRow({ item, ...row }: RowProps & { readonly item: IngredientSuggestionResponse }) {
  const effects = item.skinEffects;
  // 한글 이름 밖(영문명·이명)에서 걸린 줄은 맞은 원문을 덧붙여 왜 떴는지 알린다.
  const matchedElsewhere = item.match && item.match.field !== "KOREAN_NAME" ? item.match.text : undefined;

  return (
    <ResultButton {...row} name={item.koreanName}>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-2">
          {/* 성분 이름은 40자를 넘는 것이 있다. 앞머리가 비슷한 이름끼리 가를 수 있게 두 줄까지 보인다. */}
          <span className="line-clamp-2 min-w-0 text-title font-semibold group-data-covered:text-text-secondary">
            {item.koreanName}
            {matchedElsewhere ? <span className="font-normal text-text-secondary"> · {matchedElsewhere}</span> : null}
          </span>
          {effects.length > 0 ? (
            <span aria-hidden="true" className="flex shrink-0 items-center gap-0.5 text-text-secondary">
              {effects.slice(0, VISIBLE_EFFECTS).map((effect) => (
                <EffectIcon key={effect.code} code={effect.code} size={14} />
              ))}
            </span>
          ) : null}
        </span>
        {effects.length > 0 ? (
          <span className="text-body-sm text-text-secondary">{effects.map(effectLabel).join(" · ")}</span>
        ) : null}
      </span>
    </ResultButton>
  );
}

/** 성분군 검색 결과 행(명세 APP · 성분군 검색 결과 행). 이름 옆에 든 성분 수를 적는다. */
export function IngredientGroupResultRow({ group, ...row }: RowProps & { readonly group: IngredientGroup }) {
  const name = groupDisplayName(group.name);

  return (
    <ResultButton {...row} name={name}>
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <span className="min-w-0 text-title font-semibold">{name}</span>
        <span className="flex h-5 shrink-0 items-center rounded-md bg-layer px-2 text-label font-semibold text-text-secondary">
          {group.ingredientIds.length}종
        </span>
      </span>
    </ResultButton>
  );
}

function ResultButton({
  condition,
  state,
  onToggle,
  name,
  children,
}: RowProps & { readonly name: string; readonly children: ReactNode }) {
  const covered = state === "covered";
  const { pressableProps } = usePressable({ disabled: covered });

  return (
    <button
      type="button"
      aria-pressed={state !== "idle"}
      aria-disabled={covered || undefined}
      aria-label={covered ? `${name}, 담은 성분군에 이미 들어 있음` : `${name} 담기`}
      data-covered={covered ? "" : undefined}
      {...pressableProps}
      onClick={covered ? undefined : onToggle}
      className="group pressable fb-surface flex min-h-15 w-full items-center gap-3 py-3 text-left text-text-primary aria-disabled:cursor-default"
    >
      {children}
      <Mark condition={condition} state={state} />
    </button>
  );
}

/** 행 오른쪽의 원(36). 담기 전에는 +, 담으면 ✓ 다. */
function Mark({ condition, state }: { readonly condition: IngredientCondition; readonly state: ResultRowState }) {
  if (state === "idle") {
    return (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border-strong bg-background text-text-primary">
        <Icon name="plus" size={20} />
      </span>
    );
  }

  if (state === "covered") {
    return (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-layer text-text-secondary">
        <Icon name="check" size={20} />
      </span>
    );
  }

  return (
    <span
      className={
        condition === "include"
          ? "flex size-9 shrink-0 items-center justify-center rounded-full bg-action text-action-text"
          : "flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-text text-action-text"
      }
    >
      <Icon name="check" size={20} bold />
    </span>
  );
}
