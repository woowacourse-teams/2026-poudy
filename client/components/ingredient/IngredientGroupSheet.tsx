"use client";

import type { ProductIngredientResponse, SkinEffectResponse } from "@poudy/api/api.zod";
import { BottomSheet, BottomSheetBody, BottomSheetHeader } from "@poudy/design-system/bottom-sheet";
import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";

import { closeMethodOf, EffectTags, RoleDescription, SheetDetailLink } from "./SheetParts";

import type { SheetCloseMethod } from "@/lib/analytics/events";
import { fetchIngredientGroup } from "@/lib/api/products";
import { formatEnglishName } from "@/lib/domain/format";
import { groupDisplayName } from "@/lib/domain/ingredient-groups";
import { useSheetDescription } from "@/lib/hooks/useSheetDescription";

/** 제품 안에서 본 성분군. 제품에 든 성분과 그 성분군이 묶인 쓰임새만 담는다. */
export type ProductIngredientGroup = {
  readonly code: string;
  readonly name: string;
  readonly ingredients: readonly ProductIngredientResponse[];
  readonly effects: readonly Pick<SkinEffectResponse, "code" | "name">[];
};

/**
 * S24a 성분군 시트. `세라마이드 5종` 칩을 누르면 성분군이 무엇이고 이 제품에 어느 성분이 들었는지 보여 준다.
 *
 * 성분군 전체가 아니라 이 제품에 든 성분만 늘어놓는다. 성분군의 모든 성분은 성분군 설명 화면에서 본다.
 */
export function IngredientGroupSheet({
  open,
  group,
  kind = "ingredient_group",
  onClose,
}: {
  readonly open: boolean;
  readonly group: ProductIngredientGroup | undefined;
  /** 성분군 칩에서 열었는지 주의 성분 기준에서 열었는지. 성분군 설명으로 넘어갈 때 유입 경로로 남긴다. */
  readonly kind?: "ingredient_group" | "caution";
  /** 닫은 방법을 함께 넘긴다. 시트를 연 쪽이 분석에 남긴다. */
  readonly onClose: (method: SheetCloseMethod) => void;
}) {
  return (
    <BottomSheet open={open && group !== undefined} onClose={(reason) => onClose(closeMethodOf(reason))}>
      {group ? (
        <Content
          group={group}
          from={kind === "caution" ? "caution_sheet" : "ingredient_group_sheet"}
          onClose={onClose}
        />
      ) : null}
    </BottomSheet>
  );
}

function Content({
  group,
  from,
  onClose,
}: {
  readonly group: ProductIngredientGroup;
  readonly from: "ingredient_group_sheet" | "caution_sheet";
  readonly onClose: (method: SheetCloseMethod) => void;
}) {
  const detail = useSheetDescription(group.code, () => fetchIngredientGroup(group.code));
  const name = groupDisplayName(group.name);
  const description =
    detail.status === "loaded" ? ({ status: "loaded", value: detail.value.description } as const) : detail;

  return (
    <>
      <BottomSheetHeader
        title={name}
        description={
          detail.status === "loaded"
            ? detail.value.englishName
              ? formatEnglishName(detail.value.englishName)
              : undefined
            : undefined
        }
        onClose={() => onClose("close_button")}
      />

      <BottomSheetBody>
        <div className="flex flex-col gap-6 pb-2">
          <EffectTags effects={group.effects} />
          <RoleDescription description={description} />

          {/* 주의 성분 기준처럼 이 제품에 든 성분이 없으면 목록을 두지 않는다. `0종` 과 빈 목록은 읽을 것이 없다. */}
          {group.ingredients.length > 0 && (
            <ProductIngredients ingredients={group.ingredients} onLeave={() => onClose("detail_link")} />
          )}
        </div>
      </BottomSheetBody>

      <SheetDetailLink
        href={`/ingredient-groups/${encodeURIComponent(group.code)}?from=${from}`}
        onClick={() => onClose("detail_link")}
      >
        {name} 성분군 자세히 보기
      </SheetDetailLink>
    </>
  );
}

function ProductIngredients({
  ingredients,
  onLeave,
}: {
  readonly ingredients: ProductIngredientGroup["ingredients"];
  /** 성분을 눌러 성분 설명으로 옮겨 갈 때. 시트를 떠난 것으로 남긴다. */
  readonly onLeave: () => void;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex flex-wrap items-baseline gap-x-1 text-title font-bold text-text-primary">
        이 제품에 든 성분
        <span className="font-medium text-text-secondary">{ingredients.length}종</span>
      </h3>
      <ul>
        {ingredients.map((ingredient) => (
          <li key={ingredient.id} className="border-b border-border last:border-b-0">
            <IngredientRow ingredient={ingredient} onLeave={onLeave} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function IngredientRow({
  ingredient,
  onLeave,
}: {
  readonly ingredient: ProductIngredientResponse;
  readonly onLeave: () => void;
}) {
  // 스크롤하다 스친 행이 눌린 것처럼 깜박이지 않게 잠깐 기다린다(STATE S05).
  const { pressableProps } = usePressable({ delayMs: 80 });

  return (
    <Link
      href={`/ingredients/${ingredient.id}?from=ingredient_group_sheet`}
      {...pressableProps}
      onClick={onLeave}
      className="pressable fb-surface flex min-h-15 items-center justify-between gap-2 py-2"
    >
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-body font-semibold text-text-primary">{ingredient.koreanName}</span>
        <span className="text-caption text-text-secondary">{formatEnglishName(ingredient.englishName)}</span>
      </span>
      <Icon name="chevron-right" size={16} scalable className="text-text-secondary" />
    </Link>
  );
}
