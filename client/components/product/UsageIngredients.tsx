"use client";

import type { ProductIngredientResponse, ProductPartResponse, SkinEffectItemResponse } from "@poudy/api/api.zod";
import Link from "next/link";
import { useState } from "react";

import { EffectIcon, effectLabel } from "@/components/ingredient/EffectTag";
import { IngredientGroupSheet, type ProductIngredientGroup } from "@/components/ingredient/IngredientGroupSheet";
import { IngredientSheet } from "@/components/ingredient/IngredientSheet";
import { openInPlace } from "@/components/ui/open-in-place";
import { PRESS_SURFACE } from "@/components/ui/press";
import { groupDisplayName } from "@/lib/domain/ingredient-groups";

type Sheet = { readonly kind: "ingredient"; readonly id: number } | { readonly kind: "group"; readonly code: string };

/**
 * S24 쓰임새별 성분. 성분을 피부 작용별로 묶어 칩으로 늘어놓는다.
 *
 * 칩은 성분 설명과 성분군 설명으로 가는 링크로 그린다. 검색 로봇과 새 탭으로 여는 사람은 그 화면으로 가고,
 * 그냥 누르면 화면을 떠나지 않도록 시트로 연다(S24a·S24b).
 */
export function UsageIngredients({ part }: { readonly part: ProductPartResponse }) {
  const [sheet, setSheet] = useState<Sheet>();
  // 닫는 동안에도 내용이 남아 있어야 시트가 빈 채로 내려가지 않는다. 그래서 무엇을 열었는지와 열려 있는지를 따로 둔다.
  const [open, setOpen] = useState(false);

  if (part.skinEffectGroups.length === 0) return null;

  const ingredients = new Map(part.ingredients.map((ingredient) => [ingredient.id, ingredient]));

  const show = (next: Sheet) => {
    setSheet(next);
    setOpen(true);
  };

  return (
    <section data-no-select className="flex flex-col gap-1">
      <h3 className="text-[14px] font-bold text-[#182132]">쓰임새별 성분</h3>
      <p className="text-[12px] text-[#566273]">성분이 화장품에서 주로 쓰이는 목적으로 묶었어요</p>

      <ul>
        {part.skinEffectGroups.map((effect) => (
          /*
            라벨 칸과 칩 목록의 폭을 글자 크기(em)로 잡는다. 기기에서 글자를 키우면 라벨 칸이 함께 넓어지고,
            칩 목록이 들어갈 자리가 모자라면 라벨 아래 줄로 내려간다. 1배에서는 디자인의 100px 그대로다.
          */
          <li key={effect.id} className="flex flex-wrap gap-x-3 gap-y-2 border-b border-[#DEE2E9] py-3 last:border-b-0">
            <span className="flex min-h-9 w-[calc(100em/14)] shrink-0 items-center gap-2 text-[14px]">
              <span className="flex size-[2em] shrink-0 items-center justify-center rounded-2xl bg-[#EFF1F5] text-[16px]">
                {/* 디자인은 17px 이지만 32px 원에서 가운데 자리가 7.5px 라는 소수가 되어 아이콘이 반 픽셀 아래로 밀린다. 16px 로 둔다. */}
                <EffectIcon code={effect.code} size={16} className="text-[#424E5F]" />
              </span>
              <span className="text-[14px] leading-[1.3] font-semibold text-[#182132]">{effectLabel(effect)}</span>
            </span>

            <ul className="flex min-w-[min(100%,calc(170em/13))] flex-1 flex-wrap gap-2 text-[13px]">
              {effect.items.map((item) => (
                <li key={chipKey(item)}>
                  <Chip item={item} ingredients={ingredients} onOpen={show} />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <IngredientSheet
        open={open && sheet?.kind === "ingredient"}
        ingredient={sheet?.kind === "ingredient" ? ingredients.get(sheet.id) : undefined}
        onClose={() => setOpen(false)}
      />
      <IngredientGroupSheet
        open={open && sheet?.kind === "group"}
        group={sheet?.kind === "group" ? productGroupOf(part, sheet.code, ingredients) : undefined}
        onClose={() => setOpen(false)}
      />
    </section>
  );
}

const chipKey = (item: SkinEffectItemResponse) => item.ingredientGroup?.code ?? `ingredient-${item.ingredients[0]?.id}`;

const CHIP = `flex h-9 items-center rounded-full border border-[#CAD1DB] bg-white px-3 text-[13px] font-medium text-[#182132] ${PRESS_SURFACE}`;

function Chip({
  item,
  ingredients,
  onOpen,
}: {
  readonly item: SkinEffectItemResponse;
  readonly ingredients: ReadonlyMap<number, ProductIngredientResponse>;
  readonly onOpen: (sheet: Sheet) => void;
}) {
  const group = item.ingredientGroup;

  if (group) {
    return (
      <Link
        href={`/ingredient-groups/${encodeURIComponent(group.code)}`}
        onClick={(event) => openInPlace(event, () => onOpen({ kind: "group", code: group.code }))}
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
