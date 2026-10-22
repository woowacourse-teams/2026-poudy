"use client";

import type { ProductIngredientResponse, SkinEffectResponse } from "@poudy/api/api.zod";
import { BottomSheet, BottomSheetBody, BottomSheetHeader } from "@poudy/design-system/bottom-sheet";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";

import { closeMethodOf, EffectTags, RoleDescription, SHEET_CONTENT, SheetDetailLink } from "./SheetParts";

import { openInPlace } from "@/components/ui/open-in-place";
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
  onOpenIngredient,
}: {
  readonly open: boolean;
  readonly group: ProductIngredientGroup | undefined;
  /** 성분군 칩에서 열었는지 주의 성분 기준에서 열었는지. 성분군 설명으로 넘어갈 때 유입 경로로 남긴다. */
  readonly kind?: "ingredient_group" | "caution";
  /** 닫은 방법을 함께 넘긴다. 시트를 연 쪽이 분석에 남긴다. */
  readonly onClose: (method: SheetCloseMethod) => void;
  /**
   * 성분 타일을 눌렀을 때 그 성분의 시트(S24b)로 바꿔 연다. 넘기지 않으면 성분 설명 화면으로 옮겨 간다.
   */
  readonly onOpenIngredient?: (ingredientId: number) => void;
}) {
  return (
    // 성분 정보를 긁어 가지 못하게 시트 전체의 선택을 막는다. 제품 상세의 성분 영역 · 성분 상세 화면과 같다.
    <BottomSheet open={open && group !== undefined} onClose={(reason) => onClose(closeMethodOf(reason))} noSelect>
      {group ? (
        <Content
          group={group}
          from={kind === "caution" ? "caution_sheet" : "ingredient_group_sheet"}
          onClose={onClose}
          onOpenIngredient={onOpenIngredient}
        />
      ) : null}
    </BottomSheet>
  );
}

function Content({
  group,
  from,
  onClose,
  onOpenIngredient,
}: {
  readonly group: ProductIngredientGroup;
  readonly from: "ingredient_group_sheet" | "caution_sheet";
  readonly onClose: (method: SheetCloseMethod) => void;
  readonly onOpenIngredient?: (ingredientId: number) => void;
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
          detail.status === "loaded" && detail.value.englishName
            ? formatEnglishName(detail.value.englishName)
            : undefined
        }
        meta={<EffectTags effects={group.effects} />}
        onClose={() => onClose("close_button")}
      />

      <BottomSheetBody>
        <div className={SHEET_CONTENT}>
          <RoleDescription description={description} />

          {/* 주의 성분 기준처럼 이 제품에 든 성분이 없으면 목록을 두지 않는다. `0종` 과 빈 목록은 읽을 것이 없다. */}
          {group.ingredients.length > 0 && (
            <ProductIngredients
              ingredients={group.ingredients}
              onLeave={() => onClose("detail_link")}
              onOpen={onOpenIngredient}
            />
          )}
        </div>
      </BottomSheetBody>

      <SheetDetailLink
        href={`/ingredient-groups/${encodeURIComponent(group.code)}?from=${from}`}
        onClick={() => onClose("detail_link")}
      >
        {name} 계열 자세히 보기
      </SheetDetailLink>
    </>
  );
}

/**
 * '이 제품에 든 성분'(S24a). 2열 타일(회색 면 · lg · 안쪽 12, 한글명 13 + 영문명 12 · 흐림, 타일 사이 8)로 늘어놓는다.
 * 홀수면 마지막 줄 오른쪽은 비워 둔다. 전성분 순서는 쓰지 않는다.
 */
function ProductIngredients({
  ingredients,
  onLeave,
  onOpen,
}: {
  readonly ingredients: ProductIngredientGroup["ingredients"];
  /** 성분을 눌러 성분 설명으로 옮겨 갈 때. 시트를 떠난 것으로 남긴다. */
  readonly onLeave: () => void;
  readonly onOpen?: (ingredientId: number) => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="flex flex-wrap items-baseline gap-x-1 text-section leading-snug font-bold text-text-primary">
        이 제품에 든 성분
        <span className="font-semibold text-text-secondary">{ingredients.length}종</span>
      </h3>
      <ul className="grid grid-cols-2 gap-2">
        {ingredients.map((ingredient) => (
          <li key={ingredient.id} className="flex">
            <IngredientTile ingredient={ingredient} onLeave={onLeave} onOpen={onOpen} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * 성분 타일. 성분 설명으로 가는 링크로 그리고, 그냥 누르면 화면을 떠나지 않고 그 성분의 시트(S24b)로 바꿔 연다.
 * hover · 눌림은 회색 면 위 한 단계(fb-border)로 타일 면을 칠한다.
 */
function IngredientTile({
  ingredient,
  onLeave,
  onOpen,
}: {
  readonly ingredient: ProductIngredientResponse;
  readonly onLeave: () => void;
  readonly onOpen?: (ingredientId: number) => void;
}) {
  // 스크롤하다 스친 타일이 눌린 것처럼 깜박이지 않게 잠깐 기다린다(STATE S05).
  const { pressableProps } = usePressable({ delayMs: 80 });

  return (
    <Link
      href={`/ingredients/${ingredient.id}?from=ingredient_group_sheet`}
      {...pressableProps}
      onClick={(event) => {
        if (onOpen) openInPlace(event, () => onOpen(ingredient.id));
        else onLeave();
      }}
      className="pressable fb-border press-scale flex w-full min-w-0 flex-col gap-0.5 rounded-lg bg-surface p-3"
    >
      <span className="text-body-sm leading-snug font-semibold break-keep text-text-primary">
        {ingredient.koreanName}
      </span>
      <span className="text-caption leading-snug text-text-muted">{formatEnglishName(ingredient.englishName)}</span>
    </Link>
  );
}
