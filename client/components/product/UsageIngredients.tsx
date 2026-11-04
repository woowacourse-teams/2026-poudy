"use client";

import type {
  ConcernItemResponse,
  ProductIngredientResponse,
  ProductPartResponse,
  SkinEffectItemResponse,
} from "@poudy/api/api.zod";
import { Disclosure, DisclosureContent, DisclosureIcon, DisclosureTrigger } from "@poudy/design-system/disclosure";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useState } from "react";

import { AttributionLink as Link } from "@/components/analytics/AttributionLink";
import { useIngredientSheetTracking } from "@/components/analytics/useIngredientSheetTracking";
import { EffectIcon, effectLabel } from "@/components/ingredient/EffectTag";
import { IngredientGroupSheet, type ProductIngredientGroup } from "@/components/ingredient/IngredientGroupSheet";
import { IngredientSheet } from "@/components/ingredient/IngredientSheet";
import { openInPlace } from "@/components/ui/open-in-place";
import type { SheetCloseMethod } from "@/lib/analytics/events";
import { groupDisplayName } from "@/lib/domain/ingredient-groups";
import { concernIngredientCount } from "@/lib/domain/product-effects";

type Sheet =
  | { readonly kind: "ingredient"; readonly id: number }
  | { readonly kind: "group"; readonly code: string; readonly item: SkinEffectItemResponse };

/** 서버가 정한 고민·효능 순서로 표시한다. 이전 응답만 쓰임새별 성분으로 보인다. */
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

  const effects = part.skinEffectGroups ?? [];
  if (part.concernGroups !== undefined ? part.concernGroups.length === 0 : effects.length === 0) return null;

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
      {part.concernGroups !== undefined ? (
        <>
          <h3 className="text-body leading-snug font-bold text-text-primary">고민별 성분</h3>
          <div className="mt-3 flex flex-col gap-2">
            {part.concernGroups.map((concern, index) => (
              <div key={concern.code} className="rounded-lg has-[[aria-expanded=true]]:bg-layer">
                <Disclosure defaultOpen={index === 0}>
                  <h4>
                    <DisclosureTrigger>
                      <button
                        type="button"
                        className="fb-surface flex min-h-16 w-full items-center gap-3 rounded-lg px-3 py-3 text-left"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface">
                          <EffectIcon code={concern.effects[0]?.code ?? ""} size={16} className="text-text-body" />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-body font-semibold text-text-primary">{concern.name}</span>
                          <span className="text-caption text-text-secondary">
                            {concern.effects.map((effect) => effect.name).join(" · ")}
                          </span>
                        </span>
                        <span className="shrink-0 text-caption text-text-secondary">
                          성분 {concernIngredientCount(concern)}종
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
        </>
      ) : (
        <>
          <h3 className="text-body leading-snug font-bold text-text-primary">쓰임새별 성분</h3>
          <p className="text-caption text-text-secondary">성분이 화장품에서 주로 쓰이는 목적으로 묶었어요</p>

          <ul>
            {effects.map((effect) => (
              /*
            라벨 칸은 디자인의 100px 을 두되, 기기에서 글자를 키워 이름이 넘치면 내용만큼 넓어진다(min-w-fit).
            높이는 아이콘 원과 성분 칩과 같은 32 로 두어, 첫 줄 칩과 세로 가운데가 맞는다.
            칩 목록이 들어갈 자리가 모자라면 라벨 아래 줄로 내려간다.
          */
              <li
                key={effect.id}
                className="flex flex-wrap gap-x-3 gap-y-2 border-b border-border py-3 last:border-b-0"
              >
                <span className="flex min-h-8 w-25 min-w-fit shrink-0 items-center gap-2 text-body">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface">
                    {/* 디자인은 17px 이지만 32px 원에서 가운데 자리가 7.5px 라는 소수가 되어 아이콘이 반 픽셀 아래로 밀린다. 16px 로 둔다. */}
                    <EffectIcon code={effect.code} size={16} className="text-text-body" />
                  </span>
                  <span className="text-body font-semibold text-text-primary">{effectLabel(effect)}</span>
                </span>

                {/*
              칩 목록의 최소 폭은 글자 크기(em)로 잡는다. 기기에서 글자를 키우면 함께 넓어져, 긴 성분명 칩이 좁은 칸에서
              갈라지기 전에 목록째 라벨 아래 줄로 내려간다. 1배에서는 170px 이다. 토큰에 글자 크기를 따르는 폭이 없어 잠시 예외로 둔다.
            */}
                {/* eslint-disable-next-line shadcn/no-arbitrary-values -- design-exception: 글자 크기를 따르는 최소 폭(em) 토큰이 없다 · 만료 2026-11-30 */}
                <ul className="flex min-w-[min(100%,calc(170em/13))] flex-1 flex-wrap gap-2 text-13">
                  {effect.items.map((item) => (
                    <li key={chipKey(item)}>
                      <Chip item={item} ingredients={ingredients} onOpen={show} />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </>
      )}

      <IngredientSheet
        open={open && sheet?.kind === "ingredient"}
        ingredient={sheet?.kind === "ingredient" ? ingredients.get(sheet.id) : undefined}
        onClose={close}
      />
      <IngredientGroupSheet
        open={open && sheet?.kind === "group"}
        group={sheet?.kind === "group" ? productGroupOf(part, sheet.item, ingredients) : undefined}
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

const chipKey = (item: SkinEffectItemResponse) => item.ingredientGroup?.code ?? `ingredient-${item.ingredients[0]?.id}`;

/**
 * 성분 칩은 최소 높이 32 · 좌우 14이며 긴 이름은 줄바꿈한다. 칩 사이와 줄 사이는 8이다.
 * 누르는 영역은 위아래 4씩 넓혀 이웃 줄의 영역과 겹치지 않게 한다.
 */
const CHIP =
  "pressable fb-surface press-scale relative flex min-h-8 max-w-full items-center rounded-full after:absolute after:inset-x-0 after:-inset-y-1 border border-border-strong bg-background px-3.5 py-1.5 text-13 leading-snug font-medium break-keep wrap-break-word text-text-primary";

/** 새 항목은 type으로 분기하고, 기존 시트가 받는 모양으로만 연결한다. */
function ConcernChip({
  item,
  ...rest
}: {
  readonly item: ConcernItemResponse;
  readonly ingredients: ReadonlyMap<number, ProductIngredientResponse>;
  readonly onOpen: (sheet: Sheet) => void;
}) {
  if (item.type === "INGREDIENT") {
    return (
      <Chip item={{ ingredientGroup: null, ingredients: [{ id: item.id, koreanName: item.koreanName }] }} {...rest} />
    );
  }
  return (
    <Chip item={{ ingredientGroup: { code: item.code, name: item.name }, ingredients: item.ingredients }} {...rest} />
  );
}

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
        onClick={(event) => openInPlace(event, () => onOpen({ kind: "group", code: group.code, item }))}
        className={CHIP}
      >
        {groupDisplayName(group.name)} {item.ingredients.length}종
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
      {ingredient.koreanName}
    </Link>
  );
}

/** 성분군 시트에는 누른 항목의 실제 성분과 그 성분에 연결된 피부 작용을 표시한다. */
const productGroupOf = (
  part: ProductPartResponse,
  item: SkinEffectItemResponse,
  ingredients: ReadonlyMap<number, ProductIngredientResponse>,
): ProductIngredientGroup | undefined => {
  const group = item.ingredientGroup;
  if (!group) return undefined;
  const selectedIds = new Set(item.ingredients.map((ingredient) => ingredient.id));
  const members = item.ingredients
    .map((ingredient) => ingredients.get(ingredient.id))
    .filter((ingredient): ingredient is ProductIngredientResponse => ingredient !== undefined);
  const rows = (part.skinEffectGroups ?? []).filter((effect) =>
    effect.items.some(
      (candidate) =>
        candidate.ingredientGroup?.code === group.code &&
        candidate.ingredients.some((member) => selectedIds.has(member.id)),
    ),
  );
  const actualEffects = members.flatMap((ingredient) => ingredient.skinEffects);
  const relatedEffects =
    part.concernGroups === undefined
      ? rows.map((row) => ({ code: row.code, name: row.name }))
      : actualEffects.filter(
          (effect, index) => actualEffects.findIndex((candidate) => candidate.code === effect.code) === index,
        );

  return {
    code: group.code,
    name: group.name,
    ingredients: members,
    effects: relatedEffects,
  };
};
