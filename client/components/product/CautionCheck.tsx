"use client";

import type { ProductPartResponse } from "@poudy/api/api.zod";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import { useState } from "react";

import { CautionIcon } from "./CautionIcon";

import { useIngredientSheetTracking } from "@/components/analytics/useIngredientSheetTracking";
import { IngredientGroupSheet, type ProductIngredientGroup } from "@/components/ingredient/IngredientGroupSheet";
import { IngredientSheet } from "@/components/ingredient/IngredientSheet";
import { openInPlace } from "@/components/ui/open-in-place";
import { slashBreakable } from "@/components/ui/slash-breakable";
import type { SheetCloseMethod } from "@/lib/analytics/events";
import { type CautionGroup, partitionCautions } from "@/lib/domain/caution-check";

type Ingredients = ProductPartResponse["ingredients"];

type Sheet =
  { readonly kind: "group"; readonly group: CautionGroup } | { readonly kind: "ingredient"; readonly id: number };

/**
 * 주의 성분 확인(명세 S24 `주의 성분 점검 · 기준 아이콘`). 기준을 공개 전성분에 '들어 있어요'와 '찾지 못했어요'로
 * 나눠 보여 준다. 들어 있는 기준을 위에 두어 눈이 먼저 닿게 하고, 그 옆에 걸린 성분을 칩으로 늘어놓는다.
 *
 * 기준을 누르면 성분군 시트를 열어 그 기준이 무엇인지와 이 제품에 든 해당 성분을 보여 준다.
 * 쓰임새별 성분의 성분군 칩과 같은 시트다. 걸린 성분 칩을 누르면 그 성분의 시트를 연다.
 */
export function CautionCheck({
  productId,
  groups,
  ingredients,
}: {
  readonly productId: number;
  readonly groups: readonly CautionGroup[];
  readonly ingredients: Ingredients;
}) {
  const [sheet, setSheet] = useState<Sheet>();
  const tracking = useIngredientSheetTracking();
  // 닫는 동안에도 내용이 남아 있어야 시트가 빈 채로 내려가지 않는다. 그래서 무엇을 열었는지와 열려 있는지를 따로 둔다.
  const [open, setOpen] = useState(false);

  if (groups.length === 0) return null;

  const byId = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const { contained, missing } = partitionCautions(groups);

  const show = (next: Sheet) => {
    setSheet(next);
    setOpen(true);
    tracking.opened(
      next.kind === "group"
        ? { sheet_type: "caution", product_id: productId, group_code: next.group.code }
        : { sheet_type: "ingredient", product_id: productId, ingredient_id: next.id },
    );
  };
  const close = (method: SheetCloseMethod) => {
    setOpen(false);
    tracking.closed(method);
  };

  return (
    <section data-no-select className="flex flex-col gap-3">
      <h3 className="text-section font-bold text-text-primary">주의 성분 확인</h3>

      <div className="flex flex-col gap-5 px-0.5 pt-1">
        {contained.length > 0 ? (
          <CautionBundle title="들어 있어요" count={contained.length} tone="contains">
            <ul className="flex flex-col gap-3">
              {contained.map((group) => (
                <li key={group.code} className="flex flex-wrap items-start gap-x-3 gap-y-2">
                  <CautionItem group={group} onOpen={(target) => show({ kind: "group", group: target })} />
                  <MatchedIngredients
                    ingredients={group.ingredientIds.flatMap((id) => byId.get(id) ?? [])}
                    onOpen={(id) => show({ kind: "ingredient", id })}
                  />
                </li>
              ))}
            </ul>
          </CautionBundle>
        ) : null}

        {missing.length > 0 ? (
          <CautionBundle title="찾지 못했어요" count={missing.length} tone="missing">
            {/*
              이름 길이가 제각각이라 흘려 놓으면 줄마다 끝이 들쭉날쭉하다. 두 칸 격자로 줄을 맞춘다.
              칸 수를 글자 크기로 정한다. 1배에서는 두 칸이지만, 글자를 키워 한 칸이 130px(글자 기준)보다
              좁아지면 한 칸으로 바뀐다. 두 칸에 억지로 담으면 긴 이름이 낱말 가운데서 갈라진다.
            */}
            <ul className="grid grid-cols-[repeat(auto-fit,minmax(max(min(100%,calc(130em/14)),calc((100%_-_12px)/2)),1fr))] gap-3 text-body">
              {missing.map((group) => (
                <li key={group.code} className="flex">
                  <CautionItem group={group} onOpen={(target) => show({ kind: "group", group: target })} />
                </li>
              ))}
            </ul>
          </CautionBundle>
        ) : null}
      </div>

      <IngredientGroupSheet
        open={open && sheet?.kind === "group"}
        group={sheet?.kind === "group" ? sheetGroupOf(sheet.group, ingredients) : undefined}
        kind="caution"
        onClose={close}
      />
      <IngredientSheet
        open={open && sheet?.kind === "ingredient"}
        ingredient={sheet?.kind === "ingredient" ? byId.get(sheet.id) : undefined}
        onClose={close}
      />
    </section>
  );
}

function CautionBundle({
  title,
  count,
  tone,
  children,
}: {
  readonly title: string;
  readonly count: number;
  readonly tone: "contains" | "missing";
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p
        className={
          tone === "contains"
            ? "flex gap-1 text-caption font-bold text-danger-action"
            : "flex gap-1 text-caption font-bold text-text-secondary"
        }
      >
        {title}
        <span>{count}종</span>
      </p>
      {children}
    </div>
  );
}

/**
 * 기준 아이콘과 이름. 누르면 성분군 시트를 연다.
 * 누름 면은 글자 자리를 그대로 두고 바깥으로 8px·6px 넓혀 칠한다. 음수 여백과 같은 크기의 안쪽 여백으로 넓힌다.
 * 아이콘 원은 글자를 키워도 32 그대로 둔다. 원 안의 아이콘도 크기가 정해져 있어 넘치지 않는다.
 */
function CautionItem({
  group,
  onOpen,
}: {
  readonly group: CautionGroup;
  readonly onOpen: (group: CautionGroup) => void;
}) {
  const { pressableProps } = usePressable();
  const { code, contains } = group;

  return (
    <Link
      href={`/ingredient-groups/${encodeURIComponent(code)}?from=product_detail`}
      {...pressableProps}
      onClick={(event) => openInPlace(event, () => onOpen(group))}
      className={
        contains
          ? "pressable fb-surface -mx-2 flex min-h-9 items-center gap-2 rounded-md px-2"
          : "pressable fb-surface -mx-2 -my-1.5 flex flex-1 items-center gap-2 rounded-md px-2 py-1.5"
      }
    >
      <span
        className={
          contains
            ? "flex size-8 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger-action"
            : "flex size-8 shrink-0 items-center justify-center rounded-full bg-success-soft text-success-text"
        }
      >
        <CautionIcon code={code} size={16} />
      </span>
      <span
        className={
          contains
            ? "text-body leading-snug font-semibold break-keep text-text-primary"
            : "text-body break-keep text-text-body"
        }
      >
        {/* `향료/알레르기` 처럼 빗금으로 이은 이름은 빗금 뒤에서 줄을 바꿀 수 있게 한다. */}
        {slashBreakable(group.name)}
      </span>
    </Link>
  );
}

/** 들어 있는 기준에 걸린 이 제품의 성분. 성분군 목록을 받아 오지 못해 모르면 칩을 두지 않는다. */
function MatchedIngredients({
  ingredients,
  onOpen,
}: {
  readonly ingredients: Ingredients;
  readonly onOpen: (id: number) => void;
}) {
  if (ingredients.length === 0) return null;

  return (
    <ul className="flex min-w-40 flex-1 flex-wrap gap-2">
      {ingredients.map((ingredient) => (
        <li key={ingredient.id}>
          <MatchedChip ingredient={ingredient} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  );
}

function MatchedChip({
  ingredient,
  onOpen,
}: {
  readonly ingredient: Ingredients[number];
  readonly onOpen: (id: number) => void;
}) {
  const { pressableProps } = usePressable();

  return (
    <Link
      href={`/ingredients/${ingredient.id}`}
      {...pressableProps}
      onClick={(event) => openInPlace(event, () => onOpen(ingredient.id))}
      className="pressable press-scale flex h-9 items-center rounded-full border border-danger-border bg-danger-soft px-3 text-13 leading-snug font-semibold text-danger-action"
    >
      {ingredient.koreanName}
    </Link>
  );
}

/** 성분군 시트에 넘길 것. 주의 성분 기준은 피부 작용과 묶이지 않으므로 작용 태그는 없다. */
const sheetGroupOf = (group: CautionGroup, ingredients: Ingredients): ProductIngredientGroup => {
  const byId = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));

  return {
    code: group.code,
    name: group.name,
    ingredients: group.ingredientIds.flatMap((id) => byId.get(id) ?? []),
    effects: [],
  };
};
