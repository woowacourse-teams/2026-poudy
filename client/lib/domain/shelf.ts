import type {
  IngredientAnalysisItemResponse,
  RatingPreference,
  RatingResponse,
  ShelfProductResponse,
  ShelfTab,
  ShelfUsageStatus,
} from "@poudy/api/api.zod";

import { LEVEL_LABELS } from "./product-display";

/** 사용 상태의 이름(S52). 서버도 탭 이름을 주지만 명세의 이름('사용 완료')과 달라 화면은 이 이름을 쓴다. */
export const USAGE_LABEL: Readonly<Record<ShelfUsageStatus, string>> = { IN_USE: "사용 중", USED: "사용 완료" };

/** 보기 탭의 이름. 전체 말고는 사용 상태의 이름과 같다. */
export const TAB_LABEL: Readonly<Record<ShelfTab, string>> = { ALL: "전체", ...USAGE_LABEL };

/** 전체 탭에서 목록을 나누는 순서. 지금 쓰는 제품을 먼저 둔다. */
const USAGE_ORDER: readonly ShelfUsageStatus[] = ["IN_USE", "USED"];

const levelPart = (label: string, level: number | null): readonly string[] =>
  [level].filter((value): value is number => value !== null).map((value) => `${label} ${value}`);

/** 내 평가 요약. 예: '수분감 2.5 · 유분감 1'. 수분감·유분감을 하나도 남기지 않았으면 없다. */
export const ratingSummary = (rating: RatingResponse): string | undefined =>
  [...levelPart("수분감", rating.moistureLevel), ...levelPart("유분감", rating.oilLevel)].join(" · ") || undefined;

/** 평가를 하나라도 남겼는지. 하나도 없으면 행 오른쪽에 '평가하기'를 둔다. */
export const isRated = (rating: RatingResponse): boolean =>
  rating.preference !== null || rating.moistureLevel !== null || rating.oilLevel !== null;

const BADGE: Readonly<Record<RatingPreference, "good" | "bad">> = { GOOD: "good", BAD: "bad" };

/** 썸네일에 겹칠 평가 배지. 맞았는지 고르지 않았으면 없다. */
export const ratingBadge = (rating: RatingResponse): "good" | "bad" | undefined =>
  (rating.preference !== null && BADGE[rating.preference]) || undefined;

export type ShelfSection = {
  /** 목록 구분 머리. 예: '사용 중 · 3'. 한 상태만 보는 탭에서는 두지 않는다. */
  readonly heading?: string;
  readonly items: readonly ShelfProductResponse[];
};

const inTab = (tab: ShelfTab) => (item: ShelfProductResponse) => tab === "ALL" || item.usageStatus === tab;

/**
 * 보기 탭에 맞춰 목록을 나눈다. 전체 탭은 사용 상태별로 머리를 달아 나누고, 빈 묶음은 뺀다.
 * 사용 중·사용 완료 탭은 머리 없이 하나로 둔다.
 */
export const shelfSections = (items: readonly ShelfProductResponse[], tab: ShelfTab): readonly ShelfSection[] =>
  [tab]
    .filter((current) => current !== "ALL")
    .map((current): ShelfSection => ({ items: items.filter(inTab(current)) }))
    .concat(
      USAGE_ORDER.filter(() => tab === "ALL")
        .map((status) => ({ status, items: items.filter((item) => item.usageStatus === status) }))
        .filter(({ items: grouped }) => grouped.length > 0)
        .map(({ status, items: grouped }) => ({
          heading: `${USAGE_LABEL[status]} · ${grouped.length}`,
          items: grouped,
        })),
    );

/** 보기 탭에 든 제품 수. */
export const countInTab = (items: readonly ShelfProductResponse[], tab: ShelfTab): number =>
  items.filter(inTab(tab)).length;

export type AnalysisSummary = {
  /** 결과에 나온 성분 중 이미 검색에서 제외 중인 수 */
  readonly inFilterCount: number;
  /** 평가를 바꿔 결과에 새로 나온 성분 수 */
  readonly newCount: number;
  /** 검색에서 제외 중인 성분 중 지금 결과에 없는 수 */
  readonly outsideResultCount: number;
  /**
   * 카드의 주 버튼 글. 이미 제외 중인 성분이 있고 신규 성분이 없으면 버튼을 두지 않는다(S53e · S53l).
   * 안 맞은 제품이 하나뿐이면 공통 성분이라 하기 어려워 고르기를 권하지 않는다(S53a).
   */
  readonly pickLabel?: string;
};

const pickLabelOf = (filterCount: number, newCount: number, badProductCount: number): string | undefined => {
  if (badProductCount < 2) return undefined;
  if (filterCount === 0) return "검색에서 제외할 성분 고르기";
  if (newCount > 0) return "검색에서 제외할 신규 성분 고르기";
  return undefined;
};

/**
 * 안 맞을 수 있는 성분 카드의 아래쪽을 정한다.
 * filterCount 는 나만의 필터에 든 성분 전체 수다. 결과 밖에서 넣은 성분도 검색에서 제외 중이므로 함께 센다.
 * badProductCount 는 결과를 낸 '안 맞았어요' 제품 수다.
 */
export const summarizeAnalysis = (
  items: readonly IngredientAnalysisItemResponse[],
  filterCount: number,
  badProductCount: number,
): AnalysisSummary => {
  const inFilterCount = items.filter((item) => item.inFilter).length;
  const newCount = items.filter((item) => item.isNew).length;
  return {
    inFilterCount,
    newCount,
    outsideResultCount: Math.max(filterCount - inFilterCount, 0),
    pickLabel: pickLabelOf(filterCount, newCount, badProductCount),
  };
};

/** 카드 설명. 주의 성분을 하나도 찾지 못했을 때만 둔다(S53m). */
export const ANALYSIS_EMPTY_DESCRIPTION = "안 맞았던 제품에서 주의 성분을 찾지 못했어요.";

/** 카드 주석. 결과가 있든 없든 맨 아래에 둔다(S52 · S53m). */
export const ANALYSIS_ACCURACY_NOTE = "안 맞았던 제품이 쌓일수록 결과가 더 정확해져요.";

/** 들어 있는 제품 수. 예: '제품 3개에 있음' */
export const productCountLabel = (item: IngredientAnalysisItemResponse): string =>
  `제품 ${item.products.length}개에 있음`;

/**
 * 검색에서 제외할 성분 고르기의 처음 선택. 이미 제외 중인 성분이 없으면 모두 골라 두고(S53c),
 * 있으면 새로 나온 성분만 골라 둔다(S53j). 이미 제외 중인 성분은 선택된 채 막는다.
 */
export const initialExcludeSelection = (items: readonly IngredientAnalysisItemResponse[]): readonly number[] =>
  items.filter((item) => item.inFilter || item.isNew || items.every((each) => !each.inFilter)).map((item) => item.id);

/** 새로 제외할 성분. 이미 제외 중인 성분은 빼고 보낸다. */
export const ingredientsToExclude = (
  items: readonly IngredientAnalysisItemResponse[],
  selected: readonly number[],
): readonly number[] => items.filter((item) => !item.inFilter && selected.includes(item.id)).map((item) => item.id);

/** 검색에서 제외할 성분 고르기 안내. 이미 제외 중인 성분이 있으면 유지된다고 알린다(S53j). */
export const excludeGuide = (items: readonly IngredientAnalysisItemResponse[]): string =>
  (items.some((item) => item.inFilter) && "이미 제외 중인 성분은 유지돼요.\n추가로 제외할 성분을 골라 주세요.") ||
  "고른 성분이 든 제품은 검색 결과에서 빠져요. 탐색 화면에서 언제든 끌 수 있어요.";

/**
 * 새로 나온 성분을 따로 표시할지. 서버는 처음 결과를 모두 새 성분으로 주지만, 아직 아무것도 제외하지 않았으면
 * 새 성분만 고를 일이 없어 표시하지 않는다(S52·S53c에는 표시가 없고 S53i·S53j에만 있다).
 */
export const marksNewIngredients = (filterCount: number): boolean => filterCount > 0;

/** 새로 나온 성분으로 표시할지. */
export const isMarkedNew = (item: IngredientAnalysisItemResponse, markNew: boolean): boolean =>
  markNew && item.isNew && !item.inFilter;

/** 성분 체크 행 오른쪽 글. 이미 제외 중이면 그 사실을, 신규 성분이면 '신규'를 앞에 붙인다(S53j). */
export const excludeRowNote = (item: IngredientAnalysisItemResponse, markNew: boolean): string =>
  (item.inFilter && "이미 제외 중이에요") ||
  (isMarkedNew(item, markNew) && `신규 · ${productCountLabel(item)}`) ||
  productCountLabel(item);

/** 평가 시트가 고치는 값. 서버의 수정 요청과 같은 모양이라 그대로 보낸다. */
export type RatingDraft = {
  readonly usageStatus: ShelfUsageStatus;
  readonly preference: RatingPreference | null;
  readonly moistureLevel: number | null;
  readonly oilLevel: number | null;
};

/**
 * 아직 선반에 담지 않은 제품을 평가 시트가 받는 선반 제품 모양으로 만든다(S52i · S39j).
 * 담기는 시트의 첫 저장에서 일어나므로, 그 전에는 사용 상태를 '지금 쓰는 중'으로 두고 평가를 비운다.
 * 담은 때(registeredAt)는 시트가 쓰지 않아 빈 값으로 둔다. 실제 값은 담은 뒤의 응답이 정한다.
 */
export const pendingShelfItem = (product: ShelfProductResponse["product"]): ShelfProductResponse => ({
  product,
  usageStatus: "IN_USE",
  rating: { preference: null, moistureLevel: null, oilLevel: null },
  possiblyUnsuitable: false,
  registeredAt: "",
});

/** 선반 제품의 지금 평가로 평가 시트를 채운다. */
export const draftOf = (item: ShelfProductResponse): RatingDraft => {
  const draft = { usageStatus: item.usageStatus, ...item.rating };
  if (!item.product.sensorySupported) {
    return { ...draft, moistureLevel: null, oilLevel: null };
  }
  return draft;
};

/** 평가 지우기. 사용 상태는 그대로 두고 평가 값만 비운다. */
export const clearedDraft = (item: ShelfProductResponse): RatingDraft => ({
  usageStatus: item.usageStatus,
  preference: null,
  moistureLevel: null,
  oilLevel: null,
});

/** 사용 완료로 옮기기. 평가는 그대로 둔다. */
export const movedDraft = (item: ShelfProductResponse, usageStatus: ShelfUsageStatus): RatingDraft => ({
  ...draftOf(item),
  usageStatus,
});

/**
 * 유수분 평가 슬라이더의 값 이름(S52e-1). 정수는 단계 이름('보통'), 반 칸은 두 단계 사이('보통~높음')다.
 * 제품 카드 · 필터와 같은 '없음 · 낮음 · 보통 · 높음' 척도로 읽히게 한다.
 */
export const ratingLevelText = (value: number): string => {
  const low = LEVEL_LABELS[Math.floor(value)] ?? LEVEL_LABELS[0];
  const high = LEVEL_LABELS[Math.ceil(value)] ?? LEVEL_LABELS[LEVEL_LABELS.length - 1];
  // 정수면 두 이름이 같아 하나만 남는다.
  return [...new Set([low, high])].join("~");
};

/** 유수분 평가 슬라이더의 눈금 이름. 정수 눈금에만 둔다. */
export const ratingLevelMark = (mark: number): string => LEVEL_LABELS[mark] ?? "";
