"use client";

import type { ProductIngredientResponse, ProductPartResponse } from "@poudy/api/api.zod";
import { BottomSheet, BottomSheetBody, BottomSheetHeader } from "@poudy/design-system/bottom-sheet";
import { Icon } from "@poudy/design-system/icon";
import { Tag } from "@poudy/design-system/tag";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";

import { useIngredientSheetTracking } from "@/components/analytics/useIngredientSheetTracking";
import { EffectIcon, effectLabel } from "@/components/ingredient/EffectTag";
import { closeMethodOf } from "@/components/ingredient/SheetParts";
import type { SheetCloseMethod } from "@/lib/analytics/events";

type IngredientListProps = {
  readonly productId: number;
  readonly partId: number;
  readonly ingredients: ProductPartResponse["ingredients"];
};

/** 닫힌 최초 HTML에도 목록을 남긴다. 성분 페이지에서 돌아오면 시트와 목록 위치를 복원한다. */
export function IngredientList({ productId, partId, ingredients }: IngredientListProps) {
  const [open, setOpen] = useState(false);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const restoredScroll = useSyncExternalStore(
    subscribeHistory,
    () => readListScroll(productId, partId),
    () => null,
  );
  const visible = open || restoredScroll !== null;
  const listRef = useRef<HTMLDivElement | null>(null);
  const restoreList = useCallback(
    (element: HTMLDivElement | null) => {
      listRef.current = element;
      if (element?.parentElement && restoredScroll !== null) element.parentElement.scrollTop = restoredScroll;
    },
    [restoredScroll],
  );
  const tracking = useIngredientSheetTracking();
  const { pressableProps } = usePressable();
  const close = (method: SheetCloseMethod) => {
    saveListScroll(null);
    setOpen(false);
    tracking.closed(method);
  };
  const leaveForIngredient = () => {
    saveListScroll({ productId, partId, scrollTop: listRef.current?.parentElement?.scrollTop ?? 0 });
    tracking.closed("detail_link");
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        ref={openerRef}
        type="button"
        {...pressableProps}
        onClick={() => {
          setOpen(true);
          tracking.opened({ sheet_type: "full_ingredients", product_id: productId });
        }}
        aria-haspopup="dialog"
        className="pressable fb-secondary press-scale flex min-h-11 w-full items-center justify-center gap-1 rounded-md bg-button-secondary px-4 py-2 text-center text-13 leading-snug font-semibold text-text-primary"
      >
        전체 성분 {ingredients.length}개 보기
        <Icon name="chevron-right" size={16} scalable className="text-text-secondary" />
      </button>
      {!visible ? (
        <div hidden>
          <IngredientRows ingredients={ingredients} onNavigate={leaveForIngredient} />
        </div>
      ) : null}
      <BottomSheet
        open={visible}
        onClose={(reason) => close(closeMethodOf(reason))}
        returnFocus={() => openerRef.current}
        noSelect
      >
        <BottomSheetHeader
          title={
            <>
              전체 성분 <span className="text-body font-medium text-text-secondary">{ingredients.length}개</span>
            </>
          }
          onClose={() => close("close_button")}
        />
        <BottomSheetBody>
          <div ref={restoreList} className="pb-6">
            <IngredientRows ingredients={ingredients} onNavigate={leaveForIngredient} />
          </div>
        </BottomSheetBody>
      </BottomSheet>
    </div>
  );
}

/** Next의 방문 기록 상태를 보존하면서 성분 상세로 떠난 목록의 위치를 남긴다. */
const saveListScroll = (
  position: { readonly productId: number; readonly partId: number; readonly scrollTop: number } | null,
) => {
  const state: unknown = window.history.state;
  const previous = typeof state === "object" && state !== null ? state : {};
  window.history.replaceState({ ...previous, poudyIngredientList: position }, "");
  window.dispatchEvent(new Event("poudy-ingredient-list-history"));
};

const readListScroll = (productId: number, partId: number): number | null => {
  const state: unknown = window.history.state;
  if (typeof state !== "object" || state === null || !("poudyIngredientList" in state)) return null;
  const saved = state.poudyIngredientList;
  if (
    typeof saved !== "object" ||
    saved === null ||
    !("productId" in saved) ||
    !("partId" in saved) ||
    !("scrollTop" in saved)
  )
    return null;
  if (
    saved.productId !== productId ||
    saved.partId !== partId ||
    typeof saved.scrollTop !== "number" ||
    !Number.isFinite(saved.scrollTop) ||
    saved.scrollTop < 0
  )
    return null;
  return saved.scrollTop;
};

const subscribeHistory = (notify: () => void) => {
  window.addEventListener("popstate", notify);
  window.addEventListener("poudy-ingredient-list-history", notify);
  return () => {
    window.removeEventListener("popstate", notify);
    window.removeEventListener("poudy-ingredient-list-history", notify);
  };
};

function IngredientRows({
  ingredients,
  onNavigate,
}: Pick<IngredientListProps, "ingredients"> & {
  readonly onNavigate: () => void;
}) {
  return (
    <ol aria-label="전성분" className="w-full">
      {ingredients.map((ingredient, index) => (
        <li key={ingredient.id} className="border-b border-border last:border-b-0">
          <IngredientRow ingredient={ingredient} order={index + 1} onNavigate={onNavigate} />
        </li>
      ))}
    </ol>
  );
}

/**
 * 전성분 시트 한 행.
 * 피부 작용은 중립색, 주의 성분은 주의색 태그로 오른쪽에 둔다. 좁으면 이름 아래로 흘린다.
 */
function IngredientRow({
  ingredient,
  order,
  onNavigate,
}: {
  readonly ingredient: ProductIngredientResponse;
  readonly order: number;
  readonly onNavigate: () => void;
}) {
  // 스크롤하다 스친 행이 눌린 것처럼 깜박이지 않게 잠깐 기다린다(STATE S05).
  const { pressableProps } = usePressable({ delayMs: 80 });
  const effects = ingredient.skinEffects;

  return (
    <Link
      href={`/ingredients/${ingredient.id}`}
      prefetch="auto"
      {...pressableProps}
      onClick={(event) => {
        if (
          event.defaultPrevented ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        )
          return;
        onNavigate();
      }}
      className="pressable fb-bleed flex min-h-15 items-center gap-2 px-0.5 py-3"
    >
      {/* 순번 칸은 글자를 따라 넓어지게 최소 폭만 준다. 1배에서는 24px 그대로다. */}
      <span className="flex h-7 min-w-6 shrink-0 items-center justify-center text-label text-text-secondary tabular-nums">
        {String(order).padStart(2, "0")}
      </span>

      {/*
        이름 칸과 주의 태그를 한 묶음으로 두고, 자리가 모자라면 태그가 이름 아래 줄 오른쪽으로 내려가게 한다.
        이름 칸은 글자 폭을 기본 폭으로 삼는다(grow). 기기에서 글자를 키워도 이름이 태그에 밀려
        낱말 가운데서 갈라지기 전에 태그가 먼저 다음 줄로 넘어간다. 1배에서는 한 줄 그대로다.
      */}
      <span className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-x-2 gap-y-1">
        <span className="flex min-w-24 grow flex-col gap-0.5">
          {/*
            이름과 아이콘은 글줄로 흘린다. 이름은 낱말 단위로만 줄을 바꾸고(break-keep), 아이콘 자리가 모자라면
            아이콘이 다음 줄로 넘어간다. 한 줄보다 긴 낱말만 글자 사이에서 갈라진다(wrap-break-word).
          */}
          <span className="text-13 leading-snug font-semibold break-keep wrap-break-word text-text-primary">
            {ingredient.koreanName}
          </span>
          <span className="text-caption text-text-secondary">
            {ingredient.formulationRoles.map((role) => role.name).join(" · ")}
          </span>
        </span>

        {/*
          태그 묶음은 줄어들 수 있게 둔다. 글자를 키워 태그 줄이 행보다 넓어지면 묶음 안에서 태그가 다음 줄로 넘어가고,
          오른쪽 정렬 때문에 왼쪽 순번 칸까지 밀려 나가지 않는다. 가장 넓은 태그 하나보다는 줄지 않는다.
        */}
        {effects.length > 0 || ingredient.cautions.length > 0 ? (
          <span className="flex flex-wrap items-center justify-end gap-2">
            {effects.map((effect) => (
              <Tag key={effect.code} variant="label" tone="neutral" icon={<EffectIcon code={effect.code} size={14} />}>
                {effectLabel(effect)}
              </Tag>
            ))}
            {ingredient.cautions.map((caution) => (
              <Tag key={caution.code} variant="label" tone="caution">
                {caution.label}
              </Tag>
            ))}
          </span>
        ) : null}
      </span>

      <Icon name="chevron-right" size={16} scalable className="shrink-0 text-text-secondary" />
    </Link>
  );
}
