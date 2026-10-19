"use client";

import type { BrandResponse, CategoryResponse, IngredientGroupResponse, SkinTypeResponse } from "@poudy/api/api.zod";
import { BottomSheet, BottomSheetBody, BottomSheetFooter, BottomSheetHeader } from "@poudy/design-system/bottom-sheet";
import { useState } from "react";

import { BrandOptions } from "./BrandOptions";
import { CategoryOptions } from "./CategoryOptions";
import { IngredientSheet } from "./IngredientSheet";
import { LevelOptions } from "./LevelOptions";
import { SheetCountLabel } from "./SheetCountLabel";
import { SkinTypeOptions } from "./SkinTypeOptions";
import { UnavailableSelections } from "./UnavailableSelections";

import type { FilterType } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import type { Filter } from "@/lib/domain/filter";
import { selectedGroupCodes } from "@/lib/domain/ingredient-groups";
import { useIngredientGroups } from "@/lib/hooks/useIngredientGroups";
import { useIngredientNames } from "@/lib/hooks/useIngredientNames";
import { useCountState } from "@/lib/hooks/useProductCount";

export type SheetKind = "ingredient" | "category" | "brand" | "level" | "skinType";

type FilterSheetsProps = {
  readonly openSheet: SheetKind | undefined;
  readonly onClose: () => void;
  readonly filter: Filter;
  readonly onApply: (changed: Partial<Filter>) => void;
  readonly categories: readonly CategoryResponse[];
  readonly brands: readonly BrandResponse[];
  /** 서버가 피부 타입 조건만 제외해 계산한 후보. */
  readonly skinTypes: readonly SkinTypeResponse[];
  readonly excludeCodes: readonly IngredientGroupResponse[];
  /** 시트를 연 시점에 이미 아는 결과 수. 첫 응답 전까지 버튼에 보여 준다. */
  readonly initialCount?: number;
  /** 필터 후보를 받지 못한 장(중간 장으로 들어온 경우)에서 후보가 있는 첫 장으로 가는 주소. */
  readonly optionsPageHref?: string;
};

const TITLES: Record<SheetKind, string> = {
  ingredient: "성분",
  category: "카테고리",
  brand: "브랜드",
  level: "유수분 범위",
  skinType: "피부 타입",
};

/** 시트 종류를 분석 이벤트의 filter_type 으로 옮긴다. */
export const FILTER_TYPES: Record<SheetKind, FilterType> = {
  ingredient: "ingredient",
  category: "category",
  brand: "brand",
  level: "moisture_oil",
  skinType: "skin_type",
};

/** 시트마다 [초기화]가 비우는 조건. */
const CLEARED: Record<SheetKind, Partial<Filter>> = {
  ingredient: {
    excludeCodes: [],
    excludeIngredientIds: [],
    includeIngredientIds: [],
    includeGroupCodes: [],
    excludeGroupCodes: [],
  },
  category: { categoryIds: [] },
  brand: { brandIds: [] },
  level: { moistureLevel: [], oilLevel: [] },
  skinType: { skinType: undefined, sensitiveSkin: false },
};

/**
 * 필터 시트(명세 S23a~S23j). 시트 안의 선택은 초안으로 두고 결과 수만 미리 조회한다.
 * [N개 제품 보기]를 눌러야 주소에 반영하고, 닫거나 끌어내리면 초안을 버린다(A11Y D02: 닫기는 취소).
 */
export function FilterSheets({ openSheet, ...rest }: FilterSheetsProps) {
  /*
   * 닫힌 뒤에도 나가는 전환이 끝날 때까지 시트가 남아야 한다. 여기서 곧바로 지우면
   * BottomSheet 가 아무리 기다려도 이미 트리에서 빠진 뒤라 내려가는 모습이 보이지 않는다.
   * 마지막으로 열었던 종류를 기억해 두고 그 내용을 그대로 그린다.
   */
  const [session, setSession] = useState({ kind: openSheet, open: Boolean(openSheet), number: 0 });
  if (openSheet && (!session.open || openSheet !== session.kind)) {
    setSession({ kind: openSheet, open: true, number: session.number + 1 });
  } else if (!openSheet && session.open) {
    setSession({ ...session, open: false });
  }
  if (!session.kind) return null;

  return (
    <BottomSheet open={Boolean(openSheet)} onClose={rest.onClose}>
      <SheetContent key={session.number} kind={session.kind} {...rest} />
    </BottomSheet>
  );
}

function SheetContent({
  kind,
  onClose,
  filter,
  onApply,
  categories,
  brands,
  skinTypes,
  excludeCodes,
  initialCount,
  optionsPageHref,
}: Omit<FilterSheetsProps, "openSheet"> & { readonly kind: SheetKind }) {
  const [draft, setDraft] = useState<Filter>(filter);
  // 초기화하면 슬라이더처럼 안에 상태를 든 선택지를 처음부터 다시 그린다.
  const [resetCount, setResetCount] = useState(0);
  const { count, counting } = useCountState(draft, initialCount);

  // 담긴 성분의 이름과 성분군은 서버에서 가져온다.
  const names = useIngredientNames([...draft.includeIngredientIds, ...draft.excludeIngredientIds]);
  const groups = useIngredientGroups(selectedGroupCodes(draft));

  const submitLabel = <SheetCountLabel count={count} />;
  // 지금 조건으로 센 결과가 0개일 때만 막는다. 세는 동안 남아 있는 이전 0 으로는 막지 않는다.
  // 버튼 글자('0개 제품 보기')가 이유를 말하므로 따로 문구를 두지 않는다.
  const submitDisabled = count === 0 && !counting;

  const reset = () => {
    track("filter_reset", { filter_type: FILTER_TYPES[kind] });
    setDraft({ ...draft, ...CLEARED[kind] });
    setResetCount(resetCount + 1);
  };

  const submit = () => {
    onApply(draft);
    onClose();
  };

  if (kind === "ingredient") {
    return (
      <IngredientSheet
        draft={draft}
        setDraft={setDraft}
        excludeCodes={excludeCodes}
        names={names}
        groups={groups}
        submitLabel={submitLabel}
        submitDisabled={submitDisabled}
        onSubmit={submit}
        onReset={reset}
        onClose={onClose}
      />
    );
  }

  return (
    <>
      <BottomSheetHeader title={TITLES[kind]} onClose={onClose} />

      <BottomSheetBody>
        <div key={resetCount} className="pb-4">
          {kind !== "level" && optionsPageHref ? (
            <a href={optionsPageHref} className="flex min-h-11 items-center text-body-sm text-text-secondary underline">
              첫 페이지에서 전체 필터 선택지 보기
            </a>
          ) : null}
          <UnavailableSelections
            kind={kind}
            draft={draft}
            brands={brands}
            categories={categories}
            skinTypes={skinTypes}
            onChange={setDraft}
          />

          {kind === "category" ? (
            <CategoryOptions
              categories={categories}
              selectedIds={draft.categoryIds}
              onSelect={(categoryIds) => setDraft({ ...draft, categoryIds })}
            />
          ) : null}

          {kind === "brand" ? (
            <BrandOptions
              brands={brands}
              selectedIds={draft.brandIds}
              onChange={(brandIds) => setDraft({ ...draft, brandIds })}
            />
          ) : null}

          {kind === "level" ? (
            <LevelOptions
              moistureLevel={draft.moistureLevel}
              oilLevel={draft.oilLevel}
              onChange={(changed) => setDraft((current) => ({ ...current, ...changed }))}
            />
          ) : null}

          {kind === "skinType" ? (
            <SkinTypeOptions
              skinType={draft.skinType}
              sensitiveSkin={draft.sensitiveSkin}
              skinTypes={skinTypes}
              onChange={(changed) => setDraft({ ...draft, ...changed })}
            />
          ) : null}
        </div>
      </BottomSheetBody>

      <BottomSheetFooter
        primary={{ label: submitLabel, onClick: submit, disabled: submitDisabled }}
        secondary={{ label: "초기화", onClick: reset }}
      />
    </>
  );
}
