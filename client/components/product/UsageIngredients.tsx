"use client";

import type { ProductPartResponse } from "@poudy/api/api.zod";
import { usePressable } from "@poudy/design-system/use-pressable";
import { Fragment, useState } from "react";

import { ConcernPicture } from "./ConcernPicture";
import { ConcernSheet } from "./ConcernSheet";

import { useIngredientSheetTracking } from "@/components/analytics/useIngredientSheetTracking";
import { IngredientSheet } from "@/components/ingredient/IngredientSheet";
import type { SheetCloseMethod } from "@/lib/analytics/events";
import { concernIngredientCount } from "@/lib/domain/product-effects";

type Concern = ProductPartResponse["concernGroups"][number];

type Sheet =
  { readonly kind: "concern"; readonly concern: Concern } | { readonly kind: "ingredient"; readonly id: number };

/**
 * 고민별 성분(S87 · S87-1). 서버가 정한 순서로 고민을 최대 3개 받아 고민 그림을 한 줄에 같은 폭으로 늘어놓는다.
 * 그림을 누르면 그 고민의 근거 성분 시트(S92 · S93)를 연다.
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

  if (part.concernGroups.length === 0) return null;

  const ingredients = new Map(part.ingredients.map((ingredient) => [ingredient.id, ingredient]));

  const show = (next: Sheet) => {
    setSheet(next);
    setOpen(true);
    tracking.opened(
      next.kind === "concern"
        ? { sheet_type: "concern", product_id: productId, concern_code: next.concern.code }
        : { sheet_type: "ingredient", product_id: productId, ingredient_id: next.id },
    );
  };
  const close = (method: SheetCloseMethod) => {
    setOpen(false);
    tracking.closed(method);
  };

  return (
    <section data-no-select className="flex flex-col gap-4">
      <h3 className="text-section leading-snug font-bold text-text-primary">이런 고민을 위한 성분이 있어요</h3>
      {/* 고민이 몇 개든 칸을 같은 폭으로 나누고 그림을 칸 가운데에 둔다. 칸 사이는 16 이다. */}
      <ul className="flex gap-4">
        {part.concernGroups.map((concern) => (
          <li key={concern.code} className="flex min-w-0 flex-1 justify-center">
            <ConcernCard concern={concern} onOpen={() => show({ kind: "concern", concern })} />
          </li>
        ))}
      </ul>

      <ConcernSheet
        open={open && sheet?.kind === "concern"}
        concern={sheet?.kind === "concern" ? sheet.concern : undefined}
        ingredients={ingredients}
        onClose={close}
        // 성분군의 타일을 누르면 고민 시트를 닫고 그 성분의 시트로 바꿔 연다(S92 → S24b).
        onOpenIngredient={(id) => {
          tracking.closed("detail_link");
          show({ kind: "ingredient", id });
        }}
      />
      <IngredientSheet
        open={open && sheet?.kind === "ingredient"}
        ingredient={sheet?.kind === "ingredient" ? ingredients.get(sheet.id) : undefined}
        onClose={close}
      />
    </section>
  );
}

/**
 * 고민 그림 카드. 그림(84) 아래 8 에 고민 이름(14 · 600)과 성분 수(12 · 보조색)를 2 간격으로 쌓는다.
 * hover · 눌림에서는 원 면을 한 단계 진한 `hover-on-surface` 로 바꾸고 고민 이름에 밑줄을 긋는다(S87 견본).
 * 고민 이름은 낱말 안에서 줄을 바꾸지 않고, `·` 뒤와 띄어쓰기에서만 바꾼다. 그래도 칸보다 긴 낱말만 칸 안에서 자른다.
 */
function ConcernCard({ concern, onOpen }: { readonly concern: Concern; readonly onOpen: () => void }) {
  const { pressableProps } = usePressable();

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      {...pressableProps}
      onClick={onOpen}
      className="group pressable press-scale flex max-w-full min-w-0 flex-col items-center gap-2 rounded-lg"
    >
      <ConcernPicture
        code={concern.code}
        size="section"
        className="group-data-hovered:bg-hover-on-surface group-data-pressed:bg-hover-on-surface"
      />
      <span className="flex max-w-full flex-col items-center gap-0.5 text-center">
        <span className="text-body leading-snug font-semibold break-keep wrap-anywhere text-text-primary underline-offset-2 group-data-hovered:underline group-data-pressed:underline">
          {dotBreakable(concern.name)}
        </span>
        <span className="text-caption leading-snug text-text-secondary">성분 {concernIngredientCount(concern)}종</span>
      </span>
    </button>
  );
}

/** `건조·당김`, `색소·잡티` 처럼 가운뎃점으로 이은 이름은 점 뒤에서 줄을 바꿀 수 있게 한다. */
const dotBreakable = (label: string) =>
  label.split("·").map((part, index) => (
    <Fragment key={index}>
      {index > 0 && (
        <>
          ·<wbr />
        </>
      )}
      {part}
    </Fragment>
  ));
