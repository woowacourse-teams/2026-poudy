"use client";

import type { ProductPartResponse } from "@poudy/api/api.zod";
import { cn } from "@poudy/design-system/cn";
import { Disclosure, DisclosureContent, DisclosureTrigger } from "@poudy/design-system/disclosure";
import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useState } from "react";

import { CautionIcon } from "./CautionIcon";

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
 * 민감하다면 살펴볼 성분(명세 S87 `주의 성분 점검 · 아코디언`). 기준을 공개 전성분에 들어 있는 것과 찾지 못한 것('통과한 기준')으로
 * 나눠 보여 준다. 들어 있는 기준을 위에 두어 눈이 먼저 닿게 하고, 제목 아래에 전체 기준 가운데 몇 가지가 들었는지 적는다.
 *
 * 들어 있는 기준은 아코디언 행이다. 처음에는 모두 접어 두고, 행을 누르면 걸린 성분 칩을 펼친다. 칩을 누르면 그 성분의 시트를 연다.
 * 통과한 기준은 누르면 성분군 시트를 열어 그 기준이 무엇인지 보여 준다.
 * 들어 있는 기준은 노랑(warning)으로 그린다. 빨강은 나에게 안 맞는 성분(S60 ⑤)만 쓴다(S60 ⑥).
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
    <section data-no-select className="flex flex-col gap-1">
      <h3 className="text-section leading-snug font-bold text-text-primary">민감하다면 살펴볼 성분</h3>
      <p className="text-body-sm text-text-secondary">
        {contained.length > 0
          ? `${groups.length}가지 기준 중 ${contained.length}가지가 들어 있어요`
          : `${groups.length}가지 기준을 모두 통과했어요`}
      </p>

      <div className="flex flex-col gap-5 px-0.5 pt-2">
        {contained.length > 0 ? (
          // 들어 있는 기준은 행 사이를 띄우지 않는다. 행 높이 48 이 간격을 겸한다.
          <ul className="flex flex-col">
            {contained.map((group) => {
              const matched = group.ingredientIds.flatMap((id) => byId.get(id) ?? []);
              return (
                <li key={group.code}>
                  {matched.length > 0 ? (
                    <ContainedRow
                      group={group}
                      ingredients={matched}
                      onOpenIngredient={(id) => show({ kind: "ingredient", id })}
                    />
                  ) : (
                    // 성분군 목록을 받아 오지 못해 걸린 성분을 모르면 펼칠 것이 없다. 이전처럼 기준을 누르면 성분군 시트를 연다.
                    <div className="flex min-h-12 items-center">
                      <CautionItem group={group} onOpen={(target) => show({ kind: "group", group: target })} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}

        {missing.length > 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-caption leading-snug font-bold text-success-text">통과한 기준 {missing.length}가지</p>
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
          </div>
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
 * 들어 있는 기준 한 행(S87 아코디언). 행 높이 48 에 기준 아이콘 원(32) · 이름(14 · 600)을 왼쪽에, 걸린 성분 수와 꺾쇠를 오른쪽에 둔다.
 * 처음에는 접어 두고, 행을 누르면 걸린 성분 칩을 이름 줄 아래에 펼친다. 칩 묶음은 아이콘 원 폭만큼(40) 들여 이름과 왼쪽을 맞추고,
 * 아래 8 을 띄운다. 꺾쇠는 접힘에서 오른쪽(흐림), 펼침에서 아래(본문색)를 가리킨다.
 * hover · 눌림 면은 행 둘레로 좌우 8 넓혀 칠한다(fb-surface 와 같은 ui-hover). 여백으로 넓히면 배치가 밀려 가상 요소로 칠한다.
 */
function ContainedRow({
  group,
  ingredients,
  onOpenIngredient,
}: {
  readonly group: CautionGroup;
  readonly ingredients: Ingredients;
  readonly onOpenIngredient: (id: number) => void;
}) {
  return (
    <Disclosure>
      <h4>
        <DisclosureTrigger>
          <button
            type="button"
            className="group pressable relative isolate flex min-h-12 w-full items-center gap-3 text-left before:absolute before:inset-y-0 before:-inset-x-2 before:-z-10 before:rounded-md before:transition-colors before:duration-(--duration-fast) data-hovered:before:bg-hover data-pressed:before:bg-hover data-pressed:before:duration-0"
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning-text">
                <CautionIcon code={group.code} size={16} />
              </span>
              <span className="min-w-0 text-body leading-snug font-semibold break-keep text-text-primary">
                {/* `향료/알레르기` 처럼 빗금으로 이은 이름은 빗금 뒤에서 줄을 바꿀 수 있게 한다. */}
                {slashBreakable(group.name)}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1">
              <span className="text-caption leading-snug whitespace-nowrap text-text-secondary">
                {ingredients.length}종
              </span>
              <Icon
                name="chevron-right"
                size={16}
                className="text-text-muted transition-transform duration-(--duration-fast) group-aria-expanded:rotate-90 group-aria-expanded:text-text-body motion-reduce:transition-none"
              />
            </span>
          </button>
        </DisclosureTrigger>
      </h4>
      <DisclosureContent>
        <ul className="flex flex-wrap gap-2 pb-2 pl-10">
          {ingredients.map((ingredient) => (
            <li key={ingredient.id} className="max-w-full">
              <MatchedChip ingredient={ingredient} onOpen={onOpenIngredient} />
            </li>
          ))}
        </ul>
      </DisclosureContent>
    </Disclosure>
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
