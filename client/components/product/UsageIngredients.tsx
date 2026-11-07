"use client";

import type { ConcernItemResponse, ProductIngredientResponse, ProductPartResponse } from "@poudy/api/api.zod";
import { Disclosure, DisclosureContent, DisclosureIcon, DisclosureTrigger } from "@poudy/design-system/disclosure";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useState } from "react";

import { AttributionLink as Link } from "@/components/analytics/AttributionLink";
import { useIngredientSheetTracking } from "@/components/analytics/useIngredientSheetTracking";
import { EffectIcon } from "@/components/ingredient/EffectTag";
import { IngredientGroupSheet, type ProductIngredientGroup } from "@/components/ingredient/IngredientGroupSheet";
import { IngredientSheet } from "@/components/ingredient/IngredientSheet";
import { openInPlace } from "@/components/ui/open-in-place";
import type { SheetCloseMethod } from "@/lib/analytics/events";
import { groupDisplayName } from "@/lib/domain/ingredient-groups";
import { concernIngredientCount } from "@/lib/domain/product-effects";

type Sheet =
  | { readonly kind: "ingredient"; readonly id: number }
  | {
      readonly kind: "group";
      readonly code: string;
      readonly item: Extract<ConcernItemResponse, { type: "INGREDIENT_GROUP" }>;
    };

/** 서버가 정한 고민·효능·성분 순서로 표시한다. */
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

  if (part.concernGroups.length === 0) return null;

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
    <section data-no-select className="flex flex-col gap-4">
      <h3 className="text-section leading-snug font-bold text-text-primary">고민별 성분</h3>
      <div className="flex flex-col gap-2">
        {part.concernGroups.map((concern, index) => (
          <div key={concern.code} className="concern-card rounded-lg">
            <Disclosure defaultOpen={index === 0}>
              <h4>
                <DisclosureTrigger>
                  <button
                    type="button"
                    className="group fb-surface flex min-h-16 w-full items-center gap-3 rounded-lg px-3 py-3 text-left"
                  >
                    {/* 뒤가 회색 면이 되면 같은 색의 원이 사라지므로, 펼치거나 올렸을 때는 흰 원으로 둔다. */}
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface group-aria-expanded:bg-background group-data-hovered:bg-background group-data-pressed:bg-background">
                      <EffectIcon code={concern.effects[0]?.code ?? ""} size={16} className="text-text-body" />
                    </span>
                    {/* 이름 칸은 고민 이름 폭을 기본으로 둔다. 글자를 키워 자리가 모자라면 이름이 갈라지는 대신 성분 수가 아래로 내려간다. */}
                    <span className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <span className="flex min-w-min grow basis-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-body font-semibold whitespace-nowrap text-text-primary">
                          {concern.name}
                        </span>
                        <span className="text-caption text-text-secondary">
                          {concern.effects.map((effect) => effect.name).join(" · ")}
                        </span>
                      </span>
                      <span className="text-caption whitespace-nowrap text-text-secondary">
                        성분 {concernIngredientCount(concern)}종
                      </span>
                    </span>
                    <span className="flex text-text-secondary">
                      <DisclosureIcon size={16} />
                    </span>
                  </button>
                </DisclosureTrigger>
              </h4>
              <DisclosureContent>
                <div className="pr-3 pb-4 pl-15">
                  <ul className="flex flex-wrap gap-2">
                    {concern.items.map((item) => (
                      <li
                        key={item.type === "INGREDIENT" ? `ingredient-${item.id}` : item.code}
                        className="min-w-0 max-w-full"
                      >
                        <ConcernChip item={item} ingredients={ingredients} onOpen={show} />
                      </li>
                    ))}
                  </ul>
                </div>
              </DisclosureContent>
            </Disclosure>
          </div>
        ))}
      </div>

      <IngredientSheet
        open={open && sheet?.kind === "ingredient"}
        ingredient={sheet?.kind === "ingredient" ? ingredients.get(sheet.id) : undefined}
        onClose={close}
      />
      <IngredientGroupSheet
        open={open && sheet?.kind === "group"}
        group={sheet?.kind === "group" ? productGroupOf(sheet.item, ingredients) : undefined}
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

/**
 * 명세 '성분 칩'. 보이는 높이 32 · 좌우 14(10/20 에 36 에서 줄임). 칩 사이와 줄 사이는 8 이다.
 * 칩 이름은 줄을 바꾸지 않는다. 칩의 최대 폭은 칩 묶음 폭이고, 한 칩이 행보다 넓으면 말줄임으로 자른다(CONTENT W06).
 * 누르는 영역은 칩 위아래로 6 씩 넓혀 44 로 둔다(A11Y D12). 가상 요소는 테두리 안쪽을 기준으로 놓이므로 7 을 준다.
 * 줄 사이가 8 이라 이웃 줄의 영역이 칩 사이 빈자리에서 4 겹치고, 그 자리는 아래 줄이 받는다.
 * 높이가 정해진 한 줄 칩이라 줄 높이를 1 로 둔다. 1.4 면 행간을 반올림하며 글자가 위로 떠 세로 가운데가 어긋난다(TYPO T04).
 * 줄 높이가 1이라 truncate 의 overflow 가 괄호와 g·y 의 아랫부분을 자른다. 이름 칸의 위아래 여백으로 잘리는 경계만 넓힌다.
 */
const CHIP =
  "pressable fb-surface press-scale relative flex h-8 max-w-full items-center rounded-full after:absolute after:inset-x-0 after:-inset-y-1.75 border border-border-strong bg-background px-3.5 text-13 leading-none font-medium text-text-primary";

function ConcernChip({
  item,
  ingredients,
  onOpen,
}: {
  readonly item: ConcernItemResponse;
  readonly ingredients: ReadonlyMap<number, ProductIngredientResponse>;
  readonly onOpen: (sheet: Sheet) => void;
}) {
  const { pressableProps } = usePressable();
  if (item.type === "INGREDIENT_GROUP") {
    return (
      <Link
        href={`/ingredient-groups/${encodeURIComponent(item.code)}`}
        entryPoint="product_detail"
        {...pressableProps}
        onClick={(event) => openInPlace(event, () => onOpen({ kind: "group", code: item.code, item }))}
        className={CHIP}
      >
        <span className="truncate py-1">
          {groupDisplayName(item.name)} {item.ingredients.length}종
        </span>
      </Link>
    );
  }
  return (
    <Link
      href={`/ingredients/${item.id}`}
      {...pressableProps}
      onClick={(event) => {
        if (!ingredients.has(item.id)) return;
        openInPlace(event, () => onOpen({ kind: "ingredient", id: item.id }));
      }}
      className={CHIP}
    >
      <span className="truncate py-1">{item.koreanName}</span>
    </Link>
  );
}

/** 성분군 시트에는 누른 항목의 실제 성분과 그 성분에 연결된 피부 작용을 표시한다. */
const productGroupOf = (
  item: Extract<ConcernItemResponse, { type: "INGREDIENT_GROUP" }>,
  ingredients: ReadonlyMap<number, ProductIngredientResponse>,
): ProductIngredientGroup => {
  const members = item.ingredients
    .map((ingredient) => ingredients.get(ingredient.id))
    .filter((ingredient): ingredient is ProductIngredientResponse => ingredient !== undefined);
  const actualEffects = members.flatMap((ingredient) => ingredient.skinEffects);
  const relatedEffects = actualEffects.filter(
    (effect, index) => actualEffects.findIndex((candidate) => candidate.code === effect.code) === index,
  );

  return {
    code: item.code,
    name: item.name,
    ingredients: members,
    effects: relatedEffects,
  };
};
