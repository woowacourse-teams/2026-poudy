"use client";

import type { ConcernGroupResponse, ConcernItemResponse, ProductIngredientResponse } from "@poudy/api/api.zod";
import { BottomSheet, BottomSheetBody, BottomSheetHeader } from "@poudy/design-system/bottom-sheet";
import { cn } from "@poudy/design-system/cn";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useState } from "react";

import { ConcernPicture } from "./ConcernPicture";

import { type ProductIngredientGroup, ProductIngredients } from "@/components/ingredient/IngredientGroupSheet";
import {
  closeMethodOf,
  EffectTags,
  FormulationRoles,
  RoleDescription,
  SHEET_CONTENT,
  SheetDetailLink,
} from "@/components/ingredient/SheetParts";
import type { SheetCloseMethod } from "@/lib/analytics/events";
import { fetchIngredientDetail, fetchIngredientGroup } from "@/lib/api/products";
import { concernSheetTitle } from "@/lib/domain/concerns";
import { formatEnglishName } from "@/lib/domain/format";
import { groupDisplayName } from "@/lib/domain/ingredient-groups";
import { concernIngredientCount } from "@/lib/domain/product-effects";
import { useSheetDescription } from "@/lib/hooks/useSheetDescription";

type Ingredients = ReadonlyMap<number, ProductIngredientResponse>;

const itemKey = (item: ConcernItemResponse) => (item.type === "INGREDIENT" ? `ingredient-${item.id}` : item.code);

/**
 * 고민 근거 성분 시트(S92 · S93). 고민 그림을 누르면 그 고민에 든 성분과 성분군을 칩으로 늘어놓고, 고른 칩의 설명을 아래에 보인다.
 *
 * 처음에는 첫 칩을 고른다. 칩을 고르면 시트를 바꾸지 않고 아래 설명만 바꾼다. 성분군을 고르면 성분군 설명과 이 제품에 든 성분 타일을,
 * 성분을 고르면 성분 설명과 배합 목적을 보인다(S24a · S24b 와 같은 내용). 발의 링크는 고른 칩의 설명 화면으로 간다.
 */
export function ConcernSheet({
  open,
  concern,
  ingredients,
  onClose,
  onOpenIngredient,
}: {
  readonly open: boolean;
  readonly concern: ConcernGroupResponse | undefined;
  readonly ingredients: Ingredients;
  /** 닫은 방법을 함께 넘긴다. 시트를 연 쪽이 분석에 남긴다. */
  readonly onClose: (method: SheetCloseMethod) => void;
  /** 성분군의 성분 타일을 눌렀을 때. 이 시트를 닫고 그 성분의 시트(S24b)로 바꿔 연다. */
  readonly onOpenIngredient: (ingredientId: number) => void;
}) {
  return (
    // 성분 정보를 긁어 가지 못하게 시트 전체의 선택을 막는다. 제품 상세의 성분 영역 · 성분 시트와 같다.
    <BottomSheet open={open && concern !== undefined} onClose={(reason) => onClose(closeMethodOf(reason))} noSelect>
      {/* 다른 고민을 열면 고른 칩을 첫 칩으로 되돌린다. */}
      {concern ? (
        <Content
          key={concern.code}
          concern={concern}
          ingredients={ingredients}
          onClose={onClose}
          onOpenIngredient={onOpenIngredient}
        />
      ) : null}
    </BottomSheet>
  );
}

function Content({
  concern,
  ingredients,
  onClose,
  onOpenIngredient,
}: {
  readonly concern: ConcernGroupResponse;
  readonly ingredients: Ingredients;
  readonly onClose: (method: SheetCloseMethod) => void;
  readonly onOpenIngredient: (ingredientId: number) => void;
}) {
  const [selectedKey, setSelectedKey] = useState(() => (concern.items[0] ? itemKey(concern.items[0]) : undefined));
  const selected = concern.items.find((item) => itemKey(item) === selectedKey) ?? concern.items[0];

  return (
    <>
      <BottomSheetHeader
        media={<ConcernPicture code={concern.code} size="sheet" />}
        title={
          <>
            {concernSheetTitle(concern.code, concern.name)} <br />
            성분 {concernIngredientCount(concern)}종
          </>
        }
        onClose={() => onClose("close_button")}
      />

      <BottomSheetBody>
        <div className={SHEET_CONTENT}>
          <ul aria-label="근거 성분" className="flex flex-wrap gap-2">
            {concern.items.map((item) => (
              <li key={itemKey(item)} className="min-w-0 max-w-full">
                <ItemChip item={item} selected={item === selected} onSelect={() => setSelectedKey(itemKey(item))} />
              </li>
            ))}
          </ul>

          {selected?.type === "INGREDIENT_GROUP" ? (
            <GroupDetail
              key={selected.code}
              group={productGroupOf(selected, ingredients)}
              onLeave={() => onClose("detail_link")}
              onOpenIngredient={onOpenIngredient}
            />
          ) : null}
          {selected?.type === "INGREDIENT" ? (
            <IngredientDetail key={selected.id} item={selected} ingredient={ingredients.get(selected.id)} />
          ) : null}
        </div>
      </BottomSheetBody>

      {selected?.type === "INGREDIENT_GROUP" ? (
        <SheetDetailLink
          href={`/ingredient-groups/${encodeURIComponent(selected.code)}`}
          entryPoint="ingredient_group_sheet"
          onClick={() => onClose("detail_link")}
          name={groupDisplayName(selected.name)}
          suffix="계열 자세히 보기"
        />
      ) : null}
      {selected?.type === "INGREDIENT" ? (
        <SheetDetailLink
          href={`/ingredients/${selected.id}`}
          entryPoint="ingredient_sheet"
          onClick={() => onClose("detail_link")}
          name={selected.koreanName}
          suffix="자세히 보기"
        />
      ) : null}
    </>
  );
}

/**
 * 근거 성분 칩. 명세 '성분 칩'(32 · 좌우 14)과 같은 모양이고, 고른 칩은 테두리를 글자색(`text-primary`)으로 진하게 둔다.
 * 누르는 순간 자기 선택 모양이 바뀌므로 크기 피드백은 붙이지 않는다(S07). 누르는 영역은 위아래 6 씩 넓혀 44 다.
 */
function ItemChip({
  item,
  selected,
  onSelect,
}: {
  readonly item: ConcernItemResponse;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  const { pressableProps } = usePressable();
  const label =
    item.type === "INGREDIENT_GROUP" ? `${groupDisplayName(item.name)} ${item.ingredients.length}종` : item.koreanName;

  return (
    <button
      type="button"
      aria-pressed={selected}
      {...pressableProps}
      onClick={onSelect}
      className={cn(
        "pressable fb-surface relative flex h-8 max-w-full items-center rounded-full border bg-background px-3.5 text-13 leading-none font-medium text-text-primary after:absolute after:inset-x-0 after:-inset-y-1.75",
        selected ? "border-text-primary" : "border-border-strong",
      )}
    >
      {/* 줄 높이가 1이라 truncate 의 overflow 가 괄호와 g·y 의 아랫부분을 자른다. 위아래 여백으로 잘리는 경계만 넓힌다. */}
      <span className="truncate py-1">{label}</span>
    </button>
  );
}

/** 고른 칩의 이름 · 영문명 · 피부 작용 태그. 8 씩 쌓는다. */
function DetailSummary({
  name,
  englishName,
  effects,
}: {
  readonly name: string;
  readonly englishName: string | undefined;
  readonly effects: ProductIngredientGroup["effects"];
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-section leading-snug font-bold text-text-primary">{name}</h3>
      {englishName ? <p className="text-body-sm leading-snug text-text-muted">{englishName}</p> : null}
      <EffectTags effects={effects} />
    </div>
  );
}

/** 성분군을 골랐을 때(S92). 성분군 시트(S24a)의 내용을 이름부터 이 자리에 그린다. */
function GroupDetail({
  group,
  onLeave,
  onOpenIngredient,
}: {
  readonly group: ProductIngredientGroup;
  readonly onLeave: () => void;
  readonly onOpenIngredient: (ingredientId: number) => void;
}) {
  const detail = useSheetDescription(group.code, () => fetchIngredientGroup(group.code));
  const description =
    detail.status === "loaded" ? ({ status: "loaded", value: detail.value.description } as const) : detail;

  return (
    <section className="flex flex-col gap-5">
      <DetailSummary
        name={groupDisplayName(group.name)}
        englishName={
          detail.status === "loaded" && detail.value.englishName
            ? formatEnglishName(detail.value.englishName)
            : undefined
        }
        effects={group.effects}
      />
      <RoleDescription description={description} heading="title" />
      {group.ingredients.length > 0 && (
        <ProductIngredients
          ingredients={group.ingredients}
          heading="title"
          onLeave={onLeave}
          onOpen={onOpenIngredient}
        />
      )}
    </section>
  );
}

/**
 * 성분을 골랐을 때(S93). 성분 시트(S24b)의 내용을 이름부터 이 자리에 그린다.
 * 제품 응답에서 성분을 찾지 못하면 칩의 이름만 두고 설명은 받아 온다.
 */
function IngredientDetail({
  item,
  ingredient,
}: {
  readonly item: Extract<ConcernItemResponse, { type: "INGREDIENT" }>;
  readonly ingredient: ProductIngredientResponse | undefined;
}) {
  const description = useSheetDescription(String(item.id), () =>
    fetchIngredientDetail(item.id).then((detail) => detail.description),
  );

  return (
    <section className="flex flex-col gap-5">
      <DetailSummary
        name={ingredient?.koreanName ?? item.koreanName}
        englishName={ingredient?.englishName ? formatEnglishName(ingredient.englishName) : undefined}
        effects={ingredient?.skinEffects ?? []}
      />
      <RoleDescription description={description} heading="title">
        <FormulationRoles roles={ingredient?.formulationRoles ?? []} />
      </RoleDescription>
    </section>
  );
}

/** 성분군 설명에는 누른 항목의 실제 성분과 그 성분에 연결된 피부 작용을 표시한다. */
const productGroupOf = (
  item: Extract<ConcernItemResponse, { type: "INGREDIENT_GROUP" }>,
  ingredients: Ingredients,
): ProductIngredientGroup => {
  const members = item.ingredients
    .map((ingredient) => ingredients.get(ingredient.id))
    .filter((ingredient): ingredient is ProductIngredientResponse => ingredient !== undefined);
  const actualEffects = members.flatMap((ingredient) => ingredient.skinEffects);
  const relatedEffects = actualEffects.filter(
    (effect, index) => actualEffects.findIndex((candidate) => candidate.code === effect.code) === index,
  );

  return { code: item.code, name: item.name, ingredients: members, effects: relatedEffects };
};
