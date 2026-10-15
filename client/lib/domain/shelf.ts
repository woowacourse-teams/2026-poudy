import type {
  IngredientAnalysisItemResponse,
  RatingPreference,
  RatingResponse,
  ShelfProductResponse,
  ShelfTab,
  ShelfUsageStatus,
} from "@poudy/api/api.zod";

/** 사용 상태의 이름. 탭 이름은 서버가 주지만 목록 구분 머리와 제품 추가 행은 상태만 받는다. */
export const USAGE_LABEL: Readonly<Record<ShelfUsageStatus, string>> = { IN_USE: "사용 중", USED: "사용했던" };

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
 * 사용 중·사용했던 탭은 머리 없이 하나로 둔다.
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
  /** 카드의 주 버튼 글. 이미 제외 중인 성분이 있고 새 성분이 없으면 버튼을 두지 않고 관리 줄만 둔다(S53l). */
  readonly pickLabel?: string;
  /** 관리 줄을 둘지. 검색에서 제외 중인 성분이 하나라도 있으면 둔다(S53i·S53l). */
  readonly showManage: boolean;
};

const pickLabelOf = (filterCount: number, newCount: number): string | undefined =>
  (filterCount === 0 && "검색에서 제외할 성분 고르기") ||
  (newCount > 0 && `새로 나온 성분 ${newCount}개 고르기`) ||
  undefined;

/**
 * 안 맞을 수 있는 성분 카드의 아래쪽을 정한다.
 * filterCount 는 나만의 필터에 든 성분 전체 수다. 결과 밖에서 넣은 성분도 검색에서 제외 중이므로 함께 센다.
 */
export const summarizeAnalysis = (
  items: readonly IngredientAnalysisItemResponse[],
  filterCount: number,
): AnalysisSummary => {
  const inFilterCount = items.filter((item) => item.inFilter).length;
  const newCount = items.filter((item) => item.isNew).length;
  return {
    inFilterCount,
    newCount,
    outsideResultCount: Math.max(filterCount - inFilterCount, 0),
    pickLabel: pickLabelOf(filterCount, newCount),
    showManage: filterCount > 0,
  };
};

/** 카드 설명. 안 맞은 제품이 하나뿐이면 공통 성분이 아니라 그 제품의 주의 성분이다(S53a). */
export const analysisDescription = (badProductCount: number): string =>
  (badProductCount === 1 && "안 맞았던 제품 1개에 들어 있던 주의 성분이에요.") ||
  "안 맞았던 제품들에 공통으로 들어 있던 성분이에요.";

/** 정확도 안내. 안 맞은 제품이 하나뿐이면 하나 더 평가하라고 권한다(S53a). */
export const analysisHint = (badProductCount: number): string =>
  (badProductCount === 1 && "안 맞은 제품을 하나 더 평가하면 공통 성분을 비교해 드려요") ||
  "평가한 제품이 늘수록 더 많은 기록으로 비교해요";

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

/** 성분 체크 행 오른쪽 글. 이미 제외 중이면 그 사실을, 새로 나왔으면 '새로'를 앞에 붙인다(S53j). */
export const excludeRowNote = (item: IngredientAnalysisItemResponse, markNew: boolean): string =>
  (item.inFilter && "이미 제외 중이에요") ||
  (isMarkedNew(item, markNew) && `새로 · ${productCountLabel(item)}`) ||
  productCountLabel(item);

/** 평가 시트가 고치는 값. 서버의 수정 요청과 같은 모양이라 그대로 보낸다. */
export type RatingDraft = {
  readonly usageStatus: ShelfUsageStatus;
  readonly preference: RatingPreference | null;
  readonly moistureLevel: number | null;
  readonly oilLevel: number | null;
};

/** 선반 제품의 지금 평가로 평가 시트를 채운다. */
export const draftOf = (item: ShelfProductResponse): RatingDraft => ({
  usageStatus: item.usageStatus,
  preference: item.rating.preference,
  moistureLevel: item.rating.moistureLevel,
  oilLevel: item.rating.oilLevel,
});

/** 평가 지우기. 사용 상태는 그대로 두고 평가 값만 비운다. */
export const clearedDraft = (item: ShelfProductResponse): RatingDraft => ({
  usageStatus: item.usageStatus,
  preference: null,
  moistureLevel: null,
  oilLevel: null,
});

/** 사용했던으로 옮기기. 평가는 그대로 둔다. */
export const movedDraft = (item: ShelfProductResponse, usageStatus: ShelfUsageStatus): RatingDraft => ({
  ...draftOf(item),
  usageStatus,
});

/**
 * 이름이 받침으로 끝나는지. 한글은 받침을 보고, 숫자는 읽는 소리의 받침을 본다(0·1·3·6·7·8).
 * 그 밖의 글자는 읽는 소리를 알 수 없어 받침이 없는 것으로 둔다.
 */
const endsWithConsonant = (name: string): boolean => {
  const last = name.trimEnd().at(-1) ?? "";
  const code = last.codePointAt(0) ?? 0;
  const hangul = code >= 0xac00 && code <= 0xd7a3;
  return (hangul && (code - 0xac00) % 28 !== 0) || (!hangul && /[013678]/.test(last));
};

/** 이름 뒤에 목적격 조사를 붙인다. 예: '1025 독도 크림을', '블랙 스네일 토너를' */
export const withObjectParticle = (name: string): string => `${name}${(endsWithConsonant(name) && "을") || "를"}`;
