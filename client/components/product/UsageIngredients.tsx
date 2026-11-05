"use client";

import type { ProductIngredientResponse, ProductPartResponse, SkinEffectItemResponse } from "@poudy/api/api.zod";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useState } from "react";

import { chipBlockClass } from "./chip-block";

import { AttributionLink as Link } from "@/components/analytics/AttributionLink";
import { useIngredientSheetTracking } from "@/components/analytics/useIngredientSheetTracking";
import { EffectIcon, effectLabel } from "@/components/ingredient/EffectTag";
import { IngredientGroupSheet, type ProductIngredientGroup } from "@/components/ingredient/IngredientGroupSheet";
import { IngredientSheet } from "@/components/ingredient/IngredientSheet";
import { openInPlace } from "@/components/ui/open-in-place";
import type { SheetCloseMethod } from "@/lib/analytics/events";
import { groupDisplayName } from "@/lib/domain/ingredient-groups";

type Sheet = { readonly kind: "ingredient"; readonly id: number } | { readonly kind: "group"; readonly code: string };

/**
 * S24 쓰임새별 성분. 성분을 피부 작용별로 묶어 칩으로 늘어놓는다.
 *
 * 칩은 성분 설명과 성분군 설명으로 가는 링크로 그린다. 검색 로봇과 새 탭으로 여는 사람은 그 화면으로 가고,
 * 그냥 누르면 화면을 떠나지 않도록 시트로 연다(S24a·S24b).
 */
export function UsageIngredients({
  productId,
  part,
}: {
  readonly productId: number;
  readonly part: ProductPartResponse;
}) {
  const [sheet, setSheet] = useState<Sheet>();
  const tracking = useIngredientSheetTracking();
  // 닫는 동안에도 내용이 남아 있어야 시트가 빈 채로 내려가지 않는다. 그래서 무엇을 열었는지와 열려 있는지를 따로 둔다.
  const [open, setOpen] = useState(false);

  if (part.skinEffectGroups.length === 0) return null;

  const ingredients = new Map(part.ingredients.map((ingredient) => [ingredient.id, ingredient]));

  const show = (next: Sheet) => {
    setSheet(next);
    setOpen(true);
    tracking.opened(
      next.kind === "ingredient"
        ? { sheet_type: "ingredient", product_id: productId, ingredient_id: next.id }
        : { sheet_type: "ingredient_group", product_id: productId, group_code: next.code },
    );
  };
  const close = (method: SheetCloseMethod) => {
    setOpen(false);
    tracking.closed(method);
  };

  return (
    <section data-no-select className="flex flex-col gap-1">
      <h3 className="text-section leading-snug font-bold text-text-primary">쓰임새별 성분</h3>
      <p className="text-caption text-text-secondary">성분이 화장품에서 주로 쓰이는 목적으로 묶었어요</p>

      <ul>
        {part.skinEffectGroups.map((effect) => {
          /*
            쓰임새 한 행은 이름 칸 바로 뒤에 칩 묶음을 잇는다. 이름 칸은 아이콘 원(32)과 이름을 8 간격으로 두고 내용 폭만 차지한다.
            칩 묶음은 남은 폭을 모두 쓰고 그 안에서 칩이 줄을 바꾼다. 이름 옆에 행 폭의 절반이 남지 않거나 가장 넓은 칩이 들어가지 않으면
            묶음 전체가 이름 아래 8 로 내려가고, 칩이 많은 행은 늘 이름 아래에 둔다(chipBlockClass).
            칩이 한두 개인 행이 대부분이라, 늘 아래에 쌓으면 행마다 한 줄씩 길어진다.
          */
          const items = effect.items.filter(isShown);
          return (
            <li
              key={effect.id}
              className="flex flex-wrap items-start gap-x-3 gap-y-2 border-b border-border py-3 last:border-b-0"
            >
              {/* 이름은 내용 폭을 지켜 줄을 바꾸지 않는다. 행보다 넓을 때만 줄을 바꾼다. */}
              <span className="flex min-h-8 min-w-fit items-center gap-2 text-body">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface">
                  {/* 디자인은 17px 이지만 32px 원에서 가운데 자리가 7.5px 라는 소수가 되어 아이콘이 반 픽셀 아래로 밀린다. 16px 로 둔다. */}
                  <EffectIcon code={effect.code} size={16} className="text-text-body" />
                </span>
                <span className="text-body font-semibold text-text-primary">{effectLabel(effect)}</span>
              </span>

              <ul className={`${chipBlockClass(items.length)} text-13`}>
                {items.map((item) => (
                  <li key={chipKey(item)} className="max-w-full">
                    <Chip item={item} ingredients={ingredients} onOpen={show} />
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>

      <IngredientSheet
        open={open && sheet?.kind === "ingredient"}
        ingredient={sheet?.kind === "ingredient" ? ingredients.get(sheet.id) : undefined}
        onClose={close}
      />
      <IngredientGroupSheet
        open={open && sheet?.kind === "group"}
        group={sheet?.kind === "group" ? productGroupOf(part, sheet.code, ingredients) : undefined}
        onClose={close}
        // 타일을 누르면 성분군 시트를 닫고 그 성분의 시트로 바꿔 연다(S24a → S24b).
        onOpenIngredient={(id) => {
          tracking.closed("detail_link");
          show({ kind: "ingredient", id });
        }}
      />
    </section>
  );
}

/** 칩으로 그릴 수 있는 항목. 성분군이 아니면서 성분도 없으면 그릴 것이 없다. 칩 개수도 이것으로 센다. */
const isShown = (item: SkinEffectItemResponse): boolean => item.ingredientGroup !== null || item.ingredients.length > 0;

const chipKey = (item: SkinEffectItemResponse) => item.ingredientGroup?.code ?? `ingredient-${item.ingredients[0]?.id}`;

/**
 * 명세 '성분 칩'. 보이는 높이 32 · 좌우 14(10/20 에 36 에서 줄임). 칩 사이와 줄 사이는 8 이다.
 * 칩 이름은 줄을 바꾸지 않는다. 칩의 최대 폭은 칩 묶음 폭이고, 한 칩이 행보다 넓으면 말줄임으로 자른다(CONTENT W06).
 * 누르는 영역은 위아래 4 씩 넓혀 40 으로 둔다. 줄 사이가 8 이라 이웃 줄의 영역과 겹치지 않는다.
 * 높이가 정해진 한 줄 칩이라 줄 높이를 1 로 둔다. 1.4 면 행간을 반올림하며 글자가 위로 떠 세로 가운데가 어긋난다(TYPO T04).
 */
const CHIP =
  "pressable fb-surface press-scale relative flex h-8 max-w-full items-center rounded-full after:absolute after:inset-x-0 after:-inset-y-1 border border-border-strong bg-background px-3.5 text-13 leading-none font-medium text-text-primary";

function Chip({
  item,
  ingredients,
  onOpen,
}: {
  readonly item: SkinEffectItemResponse;
  readonly ingredients: ReadonlyMap<number, ProductIngredientResponse>;
  readonly onOpen: (sheet: Sheet) => void;
}) {
  const { pressableProps } = usePressable();
  const group = item.ingredientGroup;

  if (group) {
    return (
      <Link
        href={`/ingredient-groups/${encodeURIComponent(group.code)}`}
        entryPoint="product_detail"
        {...pressableProps}
        onClick={(event) => openInPlace(event, () => onOpen({ kind: "group", code: group.code }))}
        className={CHIP}
      >
        <span className="truncate">
          {groupDisplayName(group.name)} {item.ingredients.length}종
        </span>
      </Link>
    );
  }

  const ingredient = item.ingredients[0];
  if (!ingredient) return null;

  return (
    <Link
      href={`/ingredients/${ingredient.id}`}
      {...pressableProps}
      onClick={(event) => {
        // 전성분에 없는 성분이면 시트에 그릴 것이 없어 성분 설명 화면으로 보낸다.
        if (!ingredients.has(ingredient.id)) return;
        openInPlace(event, () => onOpen({ kind: "ingredient", id: ingredient.id }));
      }}
      className={CHIP}
    >
      <span className="truncate">{ingredient.koreanName}</span>
    </Link>
  );
}

/** 성분군 시트에 넘길 것을 모은다. 성분군이 여러 쓰임새에 걸쳐 있으면 쓰임새를 모두 붙인다. */
const productGroupOf = (
  part: ProductPartResponse,
  code: string,
  ingredients: ReadonlyMap<number, ProductIngredientResponse>,
): ProductIngredientGroup | undefined => {
  const rows = part.skinEffectGroups.filter((effect) =>
    effect.items.some((item) => item.ingredientGroup?.code === code),
  );
  const item = rows[0]?.items.find((candidate) => candidate.ingredientGroup?.code === code);
  if (!item?.ingredientGroup) return undefined;

  return {
    code,
    name: item.ingredientGroup.name,
    ingredients: item.ingredients
      .map((ingredient) => ingredients.get(ingredient.id))
      .filter((ingredient): ingredient is ProductIngredientResponse => ingredient !== undefined),
    effects: rows.map((row) => ({ code: row.code, name: row.name })),
  };
};
