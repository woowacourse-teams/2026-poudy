"use client";

import type { ProductPartResponse } from "@poudy/api/api.zod";
import { cn } from "@poudy/design-system/cn";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useState } from "react";

import { CautionIcon } from "./CautionIcon";
import { chipBlockClass } from "./chip-block";

import { AttributionLink as Link } from "@/components/analytics/AttributionLink";
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
 * 주의 성분 확인(명세 S24 `주의 성분 점검 · 기준 아이콘`). 기준을 공개 전성분에 '주의가 필요해요'(들어 있음)와 '안심하세요'(찾지 못함)로
 * 나눠 보여 준다. 들어 있는 기준을 위에 두어 눈이 먼저 닿게 하고, 기준 이름 뒤에 걸린 성분을 칩으로 늘어놓는다.
 *
 * 기준을 누르면 성분군 시트를 열어 그 기준이 무엇인지와 이 제품에 든 해당 성분을 보여 준다.
 * 들어 있는 기준은 노랑(warning)으로 그린다. 빨강은 나에게 안 맞는 성분(S60 ⑤)만 쓴다(S60 ⑥).
 * 고민별 성분의 성분군 칩과 같은 시트다. 걸린 성분 칩을 누르면 그 성분의 시트를 연다.
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
          <CautionBundle title="주의가 필요해요" count={contained.length} tone="contains">
            <ul className="flex flex-col gap-3">
              {contained.map((group) => (
                /*
                  들어 있는 기준 한 행은 기준 이름 칸 바로 뒤에 걸린 성분 칩 묶음을 잇는다.
                  이름 옆에 행 폭의 절반이 남지 않거나 가장 넓은 칩이 들어가지 않으면 묶음 전체가 이름 아래 8 로 내려가고,
                  칩이 많은 행은 늘 이름 아래에 둔다(chipBlockClass).
                */
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
          <CautionBundle title="안심하세요" count={missing.length} tone="missing">
            {/*
              이름 길이가 제각각이라 흘려 놓으면 줄마다 끝이 들쭉날쭉하다. 한 줄에 두 칸씩 둔다.
              칸마다 폭의 2/5 를 기본으로 주고 남는 폭을 나눠 가져, 1배에서는 두 칸이 같은 폭이 된다.
              글자를 키워 이름이 그 폭에 들어가지 않으면 칸이 내용만큼 넓어져 한 줄에 하나씩 놓인다.
              두 칸에 억지로 담으면 긴 이름이 낱말 가운데서 갈라진다.
            */}
            <ul className="flex flex-wrap gap-3 text-body">
              {missing.map((group) => (
                <li key={group.code} className="flex grow basis-2/5">
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
        // 타일을 누르면 성분군 시트를 닫고 그 성분의 시트로 바꿔 연다(S24a → S24b).
        onOpenIngredient={(id) => {
          tracking.closed("detail_link");
          show({ kind: "ingredient", id });
        }}
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
            ? "flex gap-1 text-caption font-bold text-warning-text"
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
 * 누름 면은 글자 자리를 그대로 두고 바깥으로 좌우 8px·위아래 2px 넓혀 칠한다. 여백으로 넓히면 배치가 밀리므로, 뒤에 깐 가상 요소를
 * 바깥으로 넓혀 그 면만 칠한다(STATE S10 · fb-surface 와 같은 ui-hover).
 * 아이콘 원은 글자를 키워도 32 그대로 둔다. 원 안의 아이콘도 크기가 정해져 있어 넘치지 않는다.
 *
 * 들어 있는 기준과 찾지 못한 기준은 같은 규격이다. 칸은 아이콘 원·성분 칩과 같은 32 로 두어 옆에 놓인 칩과 위아래가 맞고,
 * hover 면은 가상 요소라 칸과 따로 위아래 2 씩 넓혀 36 으로 칠하며, 누르는 영역은 ::after 로 위아래 4 씩 넓혀
 * 성분 칩과 같은 40 으로 둔다.
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
      href={`/ingredient-groups/${encodeURIComponent(code)}`}
      entryPoint="product_detail"
      {...pressableProps}
      onClick={(event) => openInPlace(event, () => onOpen(group))}
      className={cn(
        "pressable relative isolate flex min-h-8 items-center gap-2 before:absolute before:-inset-x-2 before:-inset-y-0.5 before:-z-10 before:rounded-md before:transition-colors before:duration-(--duration-fast) after:absolute after:-inset-x-2 after:-inset-y-1 data-hovered:before:bg-hover data-pressed:before:bg-hover data-pressed:before:duration-0",
        // 들어 있는 기준은 이름 칸이 내용 폭만 차지해 hover 면이 행 폭으로 넓어지지 않는다. 이름은 내용 폭을 지켜
        // 줄을 바꾸지 않고, 행보다 넓을 때만 빗금 뒤에서 줄을 바꾼다. 찾지 못한 기준은 두 칸 격자에서 칸 폭을 채운다.
        contains ? "min-w-fit" : "flex-1",
      )}
    >
      <span
        className={
          contains
            ? "flex size-8 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning-text"
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

/**
 * 들어 있는 기준에 걸린 이 제품의 성분. 성분군 목록을 받아 오지 못해 모르면 칩을 두지 않는다.
 * 칩 사이와 줄 사이 8 로 줄을 바꾼다. 이름 옆에 둘지 아래로 내릴지는 chipBlockClass 를 따른다.
 */
function MatchedIngredients({
  ingredients,
  onOpen,
}: {
  readonly ingredients: Ingredients;
  readonly onOpen: (id: number) => void;
}) {
  if (ingredients.length === 0) return null;

  return (
    <ul className={chipBlockClass(ingredients.length)}>
      {ingredients.map((ingredient) => (
        <li key={ingredient.id} className="max-w-full">
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
      // 명세 '성분 칩'(32 · 좌우 14)을 노랑으로 칠한다. hover · 눌림은 옅은 색 면 유형(fb-tint-warning)으로 면을 한 단계 진한
      // warning-border 로 바꾼다(S24 ⑤, STATE S03). 테두리는 투명이라 면 색이 그대로 비치므로 면과 함께 바뀐다.
      className="pressable press-scale fb-tint-warning relative flex h-8 max-w-full items-center rounded-full after:absolute after:inset-x-0 after:-inset-y-1.75 border border-transparent bg-warning-soft px-3.5 text-13 leading-none font-semibold text-warning-text"
    >
      {/* 줄 높이가 1이라 truncate 의 overflow 가 괄호와 g·y 의 아랫부분을 자른다. 위아래 여백으로 잘리는 경계만 넓힌다. */}
      <span className="truncate py-1">{ingredient.koreanName}</span>
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
