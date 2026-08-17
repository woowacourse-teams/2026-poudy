"use client";

import type { BrandListItemResponse, CategoryResponse, ExcludeCodeResponse } from "@poudy/api/api.zod";
import { useState } from "react";

import { CheckboxRow } from "./CheckboxRow";

import { BottomSheet } from "@/components/ui/BottomSheet";
import type { ExcludeCode, Filter } from "@/lib/domain/filter";
import { LEVEL_LABELS } from "@/lib/domain/product-display";
import { useProductCount } from "@/lib/hooks/useProductCount";

export type SheetKind = "ingredient" | "category" | "brand" | "level";

type FilterSheetsProps = {
  readonly openSheet: SheetKind | undefined;
  readonly onClose: () => void;
  readonly filter: Filter;
  readonly onApply: (changed: Partial<Filter>) => void;
  readonly categories: readonly CategoryResponse[];
  readonly brands: readonly BrandListItemResponse[];
  readonly excludeCodes: readonly ExcludeCodeResponse[];
};

const toggle = (values: readonly number[], value: number): readonly number[] =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

/**
 * 시트 안의 선택은 로컬 상태로 두고 개수만 미리 조회한다.
 * 적용을 눌렀을 때만 URL 에 반영해 취소하면 원래 조건이 남게 한다.
 */
export function FilterSheets({
  openSheet,
  onClose,
  filter,
  onApply,
  categories,
  brands,
  excludeCodes,
}: FilterSheetsProps) {
  if (!openSheet) return null;

  return (
    <SheetBody
      key={openSheet}
      kind={openSheet}
      onClose={onClose}
      filter={filter}
      onApply={onApply}
      categories={categories}
      brands={brands}
      excludeCodes={excludeCodes}
    />
  );
}

function SheetBody({
  kind,
  onClose,
  filter,
  onApply,
  categories,
  brands,
  excludeCodes,
}: Omit<FilterSheetsProps, "openSheet"> & { readonly kind: SheetKind }) {
  const [draft, setDraft] = useState<Filter>(filter);
  const count = useProductCount(draft);

  const submitLabel = count === undefined ? "제품 보기" : `${count.toLocaleString("ko-KR")}개 제품 보기`;

  const reset = () =>
    setDraft({
      ...draft,
      ...(kind === "category" ? { categoryIds: [] } : {}),
      ...(kind === "brand" ? { brandIds: [] } : {}),
      ...(kind === "level" ? { moistureLevel: [], oilLevel: [] } : {}),
      ...(kind === "ingredient" ? { excludeCodes: [], excludeIngredientIds: [] } : {}),
    });

  const apply = () => {
    onApply(draft);
    onClose();
  };

  return (
    <BottomSheet
      open
      title={TITLES[kind]}
      description={DESCRIPTIONS[kind]}
      onClose={onClose}
      onReset={reset}
      submitLabel={submitLabel}
      onSubmit={apply}
    >
      {kind === "category" ? <CategoryOptions categories={categories} draft={draft} setDraft={setDraft} /> : null}
      {kind === "brand" ? <BrandOptions brands={brands} draft={draft} setDraft={setDraft} /> : null}
      {kind === "level" ? <LevelOptions draft={draft} setDraft={setDraft} /> : null}
      {kind === "ingredient" ? (
        <IngredientOptions excludeCodes={excludeCodes} draft={draft} setDraft={setDraft} />
      ) : null}
    </BottomSheet>
  );
}

const TITLES: Record<SheetKind, string> = {
  ingredient: "성분",
  category: "카테고리",
  brand: "브랜드",
  level: "유수분 범위",
};

const DESCRIPTIONS: Record<SheetKind, string> = {
  ingredient: "성분을 선택하고 포함·제외 조건을 정해 보세요",
  category: "원하는 제품 카테고리를 선택해 주세요",
  brand: "원하는 브랜드를 선택해 주세요",
  level: "원하는 사용감 범위를 각각 선택해 주세요",
};

type OptionProps = {
  readonly draft: Filter;
  readonly setDraft: (filter: Filter) => void;
};

function CategoryOptions({
  categories,
  draft,
  setDraft,
}: OptionProps & { readonly categories: readonly CategoryResponse[] }) {
  return (
    <ul>
      {categories.flatMap((category) =>
        category.children.map((child) => (
          <li key={child.id}>
            <CheckboxRow
              label={child.name}
              detail={`${child.productCount.toLocaleString("ko-KR")}개`}
              checked={draft.categoryIds.includes(child.id)}
              onToggle={() => setDraft({ ...draft, categoryIds: toggle(draft.categoryIds, child.id) })}
            />
          </li>
        )),
      )}
    </ul>
  );
}

function BrandOptions({
  brands,
  draft,
  setDraft,
}: OptionProps & { readonly brands: readonly BrandListItemResponse[] }) {
  return (
    <ul>
      {brands.map((brand) => (
        <li key={brand.id}>
          <CheckboxRow
            label={brand.name}
            detail={`${brand.productCount.toLocaleString("ko-KR")}개`}
            checked={draft.brandIds.includes(brand.id)}
            onToggle={() => setDraft({ ...draft, brandIds: toggle(draft.brandIds, brand.id) })}
          />
        </li>
      ))}
    </ul>
  );
}

function LevelOptions({ draft, setDraft }: OptionProps) {
  return (
    <>
      {(["moistureLevel", "oilLevel"] as const).map((key) => (
        <fieldset key={key} className="py-2">
          <legend className="text-[14px] font-semibold text-text-primary">
            {key === "moistureLevel" ? "수분감" : "유분감"}
          </legend>
          <div className="mt-2 flex gap-2">
            {LEVEL_LABELS.map((label, level) => {
              const selected = draft[key].includes(level);
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setDraft({ ...draft, [key]: toggle(draft[key], level) })}
                  className={[
                    "h-9 flex-1 rounded-lg border text-[13px]",
                    selected
                      ? "border-[#212124] bg-[#212124] text-white"
                      : "border-border bg-white text-text-secondary",
                  ].join(" ")}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </>
  );
}

function IngredientOptions({
  excludeCodes,
  draft,
  setDraft,
}: OptionProps & { readonly excludeCodes: readonly ExcludeCodeResponse[] }) {
  const toggleCode = (code: ExcludeCode) =>
    setDraft({
      ...draft,
      excludeCodes: draft.excludeCodes.includes(code)
        ? draft.excludeCodes.filter((item) => item !== code)
        : [...draft.excludeCodes, code],
    });

  return (
    <>
      <h3 className="pt-1 text-[14px] font-semibold text-text-primary">빠른 필터</h3>
      <ul>
        {excludeCodes.map((code) => (
          <li key={code.code}>
            <CheckboxRow
              label={code.name}
              detail={code.description}
              checked={draft.excludeCodes.includes(code.code)}
              onToggle={() => toggleCode(code.code)}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
