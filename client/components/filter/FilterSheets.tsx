"use client";

import type {
  BrandResponse,
  CategoryResponse,
  IngredientGroupResponse,
  MarkGroupOptionResponse,
  SkinTypeResponse,
} from "@poudy/api/api.zod";
import { BottomSheet, BottomSheetBody, BottomSheetFooter, BottomSheetHeader } from "@poudy/design-system/bottom-sheet";
import { useState } from "react";

import { BrandOptions } from "./BrandOptions";
import { CategoryOptions } from "./CategoryOptions";
import { IngredientSheet } from "./IngredientSheet";
import { LevelOptions } from "./LevelOptions";
import { MarkOptions } from "./MarkOptions";
import { SheetCountLabel } from "./SheetCountLabel";
import { SkinTypeOptions } from "./SkinTypeOptions";
import { UnavailableSelections } from "./UnavailableSelections";

import { useTrackedView } from "@/components/analytics/useTrackedView";
import { isMarkGroupSheet, markGroupOf, marksWithoutSheet } from "@/components/product/product-chips";
import type { FilterType } from "@/lib/analytics/events";
import { rememberFilterFlow } from "@/lib/analytics/filter-flow";
import { createAnalyticsId } from "@/lib/analytics/shelf-journey";
import { track } from "@/lib/analytics/track";
import type { Filter } from "@/lib/domain/filter";
import { selectedGroupCodes } from "@/lib/domain/ingredient-groups";
import { useIngredientGroups } from "@/lib/hooks/useIngredientGroups";
import { useIngredientNames } from "@/lib/hooks/useIngredientNames";
import { useCountState } from "@/lib/hooks/useProductCount";

/** 서버의 마크 그룹 하나를 고치는 시트. 그룹의 수와 이름은 서버가 정하므로 코드를 담아 가른다. */
export type MarkSheetKind = `mark:${string}`;
/** `mark` 는 그룹을 알 수 없는 마크를 푸는 시트다. 후보를 받지 못한 중간 장으로 들어왔을 때만 열린다. */
type FixedSheetKind = "ingredient" | "category" | "brand" | "level" | "skinType" | "mark";
export type SheetKind = FixedSheetKind | MarkSheetKind;

type FilterSheetsProps = {
  readonly openSheet: SheetKind | undefined;
  readonly onClose: () => void;
  readonly filter: Filter;
  readonly onApply: (changed: Partial<Filter>) => void;
  readonly categories: readonly CategoryResponse[];
  readonly brands: readonly BrandResponse[];
  /** 서버가 피부 타입과 민감성 조건을 모두 제외해 계산한 후보. */
  readonly skinTypes: readonly SkinTypeResponse[];
  readonly sensitiveSkinAvailable: boolean;
  /** 서버가 그룹마다 자기 조건만 제외해 계산한 마크 후보. 그룹과 옵션의 순서도 서버가 정한다. */
  readonly markGroups: readonly MarkGroupOptionResponse[];
  readonly excludeCodes: readonly IngredientGroupResponse[];
  /** 시트를 연 시점에 이미 아는 결과 수. 첫 응답 전까지 버튼에 보여 준다. */
  readonly initialCount?: number;
  /** 필터 후보를 받지 못한 장(중간 장으로 들어온 경우)에서 후보가 있는 첫 장으로 가는 주소. */
  readonly optionsPageHref?: string;
};

const TITLES: Record<FixedSheetKind, string> = {
  ingredient: "성분",
  category: "카테고리",
  brand: "브랜드",
  level: "유수분 범위",
  skinType: "피부 타입",
  mark: "제품 특성",
};

/** 시트 종류를 분석 이벤트의 filter_type 으로 옮긴다. */
const FILTER_TYPES: Record<FixedSheetKind, FilterType> = {
  ingredient: "ingredient",
  category: "category",
  brand: "brand",
  level: "moisture_oil",
  skinType: "skin_type",
  mark: "mark",
};

export const filterTypeOf = (kind: SheetKind): FilterType => (isMarkGroupSheet(kind) ? "mark" : FILTER_TYPES[kind]);

/** 시트마다 [초기화]가 비우는 조건. */
const CLEARED: Record<Exclude<FixedSheetKind, "mark">, Partial<Filter>> = {
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
  skinType: { skinTypes: [], sensitiveSkin: false },
};

/** 이 시트가 [초기화]로 비우는 조건. 마크는 한 값을 여러 시트가 나눠 쓰므로 지금 값에서 자기 몫만 뺀다. */
export const clearedConditions = (
  kind: SheetKind,
  filter: Filter,
  markGroups: readonly MarkGroupOptionResponse[],
): Partial<Filter> =>
  kind === "mark" || isMarkGroupSheet(kind)
    ? { marks: marksWithoutSheet(kind, filter.marks, markGroups) }
    : CLEARED[kind];

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
      <SheetContent key={session.number} kind={session.kind} active={Boolean(openSheet)} {...rest} />
    </BottomSheet>
  );
}

function SheetContent({
  kind,
  active,
  onClose,
  filter,
  onApply,
  categories,
  brands,
  skinTypes,
  sensitiveSkinAvailable,
  markGroups,
  excludeCodes,
  initialCount,
  optionsPageHref,
}: Omit<FilterSheetsProps, "openSheet"> & { readonly kind: SheetKind; readonly active: boolean }) {
  const [draft, setDraft] = useState<Filter>(filter);
  // 초기화하면 슬라이더처럼 안에 상태를 든 선택지를 처음부터 다시 그린다.
  const [resetCount, setResetCount] = useState(0);
  // 적용하면 후보가 새로 와서 그룹이 사라질 수 있다. 내려가는 동안에도 연 때의 제목을 둔다.
  const [title] = useState(() =>
    isMarkGroupSheet(kind) ? (markGroupOf(kind, markGroups)?.name ?? TITLES.mark) : TITLES[kind],
  );
  const markGroup = markGroupOf(kind, markGroups);
  const { count, counting } = useCountState(draft, initialCount);
  const [flowId] = useState(createAnalyticsId);
  const markSheet = filterTypeOf(kind) === "mark";
  const markGroupCode = markGroup?.code ?? "other";
  useTrackedView(
    "filter_sheet_opened",
    { filter_flow_id: flowId, filter_type: "mark", mark_group: markGroupCode, mark_count: filter.marks.length },
    { key: flowId, enabled: active && markSheet },
  );
  useTrackedView(
    "filter_preview_result_viewed",
    {
      filter_flow_id: flowId,
      filter_type: "mark",
      mark_group: markGroupCode,
      mark_codes: draft.marks,
      result_count: count ?? 0,
    },
    { key: JSON.stringify({ draft, count }), enabled: active && markSheet && !counting && count !== undefined },
  );

  // 담긴 성분의 이름과 성분군은 서버에서 가져온다.
  const names = useIngredientNames([...draft.includeIngredientIds, ...draft.excludeIngredientIds]);
  const groups = useIngredientGroups(selectedGroupCodes(draft));

  const submitLabel = <SheetCountLabel count={count} counting={counting} />;
  // 지금 조건으로 센 결과가 0개일 때만 막는다. 세는 동안 남아 있는 이전 0 으로는 막지 않는다.
  // 버튼 글자('0개 제품 보기')가 이유를 말하므로 따로 문구를 두지 않는다.
  const submitDisabled = count === 0 && !counting;

  // 이 시트가 비울 조건이 없으면 [초기화]를 막는다(명세 S23i). 비운 모습과 지금 초안이 같은지로 본다.
  const cleared = clearedConditions(kind, draft, markGroups);
  const resetDisabled = JSON.stringify({ ...draft, ...cleared }) === JSON.stringify(draft);

  const reset = () => {
    track("filter_reset", { filter_type: filterTypeOf(kind) });
    setDraft({ ...draft, ...cleared });
    setResetCount(resetCount + 1);
  };

  const submit = () => {
    if (markSheet)
      rememberFilterFlow(draft, { filter_flow_id: flowId, mark_group: markGroupCode, mark_codes: draft.marks });
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
        resetDisabled={resetDisabled}
        onClose={onClose}
      />
    );
  }

  return (
    <>
      <BottomSheetHeader title={title} onClose={onClose} />

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
            sensitiveSkinAvailable={sensitiveSkinAvailable}
            markGroups={markGroups}
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

          {kind === "skinType" && !optionsPageHref ? (
            <SkinTypeOptions
              selected={draft.skinTypes}
              sensitiveSkin={draft.sensitiveSkin}
              skinTypes={skinTypes}
              sensitiveSkinAvailable={sensitiveSkinAvailable}
              onChange={(changed) => setDraft({ ...draft, ...changed })}
            />
          ) : null}

          {markGroup && !optionsPageHref ? (
            <MarkOptions
              group={markGroup}
              groups={markGroups}
              selected={draft.marks}
              onChange={(marks) => setDraft({ ...draft, marks })}
            />
          ) : null}
        </div>
      </BottomSheetBody>

      <BottomSheetFooter
        primary={{ label: submitLabel, onClick: submit, disabled: submitDisabled }}
        secondary={{ label: "초기화", onClick: reset, disabled: resetDisabled }}
      />
    </>
  );
}
