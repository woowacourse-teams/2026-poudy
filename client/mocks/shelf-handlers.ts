import {
  GuestIngredientAnalysisPreviewRequest,
  GuestIngredientAnalysisRequest,
  ShelfProductAddRequest,
  ShelfProductUpdateRequest,
  MyFilterIngredientsRequest,
  type ExcludeCode,
  type IngredientAnalysisItemResponse,
  type RatingPreference,
  type ShelfProductResponse,
  type ShelfUsageStatus,
  type MyFilterResponse,
} from "@poudy/api/api.zod";
import { http, HttpResponse } from "msw";

import { allProducts, nameLengthIngredients } from "./fixtures";

/*
 * 선반과 나만의 필터 목. 서버처럼 회원 한 명의 선반을 메모리에 든다.
 *
 * 화면 상태를 확인하려면 쿠키 `poudy-mock-shelf` 에 값을 넣는다.
 * - empty: 빈 선반(S54b)
 * - signed-out: 로그인 전(S54a)
 * - error: 선반을 불러오지 못함
 * - filled: 나만의 필터에 이름 길이가 다른 성분 세 가지가 먼저 든 상태(S55j)
 * - no-skin: 피부 타입을 넣지 않은 회원. 평가 미리보기는 빠른 제외 성분만 후보로 삼고 넓힌 결과(ratedBadAcrossSkinTypes)를 함께 준다
 * - empty-no-skin: 빈 선반에 피부 타입도 없는 회원. 안 맞았어요 결과가 비어 넓힌 결과를 대신 보여 준다
 * - signed-out-no-match: 로그인 전이고, 안 맞았어요로 평가해도 겹치는 주의 성분이 없다(빈 결과)
 */
type MockShelfMode =
  "empty" | "empty-no-skin" | "signed-out" | "signed-out-no-match" | "error" | "filled" | "no-skin" | undefined;

const MOCK_SHELF_MODES: readonly NonNullable<MockShelfMode>[] = [
  "empty",
  "empty-no-skin",
  "signed-out",
  "signed-out-no-match",
  "error",
  "filled",
  "no-skin",
];

const mockShelfMode = (): MockShelfMode => {
  const cookie = globalThis.document?.cookie ?? "";
  const value = /(?:^|; )poudy-mock-shelf=([^;]+)/.exec(cookie)?.[1];
  return MOCK_SHELF_MODES.find((mode) => mode === value);
};

const problem = (status: number, code: string, detail: string) =>
  HttpResponse.json({ title: code, status, detail, code }, { status });

type MockItem = {
  readonly productId: number;
  readonly usageStatus: ShelfUsageStatus;
  readonly preference: RatingPreference | null;
  readonly moistureLevel: number | null;
  readonly oilLevel: number | null;
  readonly registeredAt: string;
};

const SEED: readonly Omit<MockItem, "registeredAt">[] = [
  { productId: 1, usageStatus: "IN_USE", preference: "GOOD", moistureLevel: 2.5, oilLevel: 1 },
  { productId: 5, usageStatus: "IN_USE", preference: "BAD", moistureLevel: 1.5, oilLevel: 2 },
  { productId: 12, usageStatus: "IN_USE", preference: null, moistureLevel: null, oilLevel: null },
  { productId: 11, usageStatus: "USED", preference: "GOOD", moistureLevel: 2, oilLevel: 0.5 },
  { productId: 14, usageStatus: "USED", preference: "BAD", moistureLevel: 3, oilLevel: 2.5 },
];

const seed = (): MockItem[] =>
  SEED.map((item, index) => ({ ...item, registeredAt: `2026-10-1${5 - index}T16:30:00+09:00` }));

/** 안 맞은 제품 수에 따라 결과에 나오는 성분. 실제 계산 대신 화면 상태를 보여 줄 만큼만 흉내 낸다. */
const SUSPECTS = [
  { id: 9001, koreanName: "리모넨" },
  { id: 9002, koreanName: "향료" },
  { id: 9003, koreanName: "페녹시에탄올" },
  { id: 9004, koreanName: "알코올" },
] as const;

/** 나만의 필터 화면(S55j)이 성분 아래 줄에 적는 제형 기능. */
const ROLES: Readonly<Record<number, string>> = { 9001: "착향제", 9002: "착향제", 9003: "보존제", 9004: "용제" };

/** 비로그인 성분 분석은 피부 정보가 없어 건성·지성·민감성 근거까지 함께 준다. */
const GUEST_REASONS: Readonly<Record<number, IngredientAnalysisItemResponse["reasons"]>> = {
  9001: [
    { code: "QUICK_EXCLUDE", name: "빠른 제외 성분" },
    { code: "SENSITIVE_SKIN", name: "민감성 피부 주의 후보" },
  ],
  9002: [{ code: "QUICK_EXCLUDE", name: "빠른 제외 성분" }],
  9003: [{ code: "SENSITIVE_SKIN", name: "민감성 피부 주의 후보" }],
  9004: [
    { code: "QUICK_EXCLUDE", name: "빠른 제외 성분" },
    { code: "DRY_SKIN", name: "건성 피부 주의 후보" },
  ],
};

/** 나만의 필터 화면(S55j)이 성분 이름 뒤에 그리는 주의 성분군. */
const CAUTIONS: Readonly<Record<number, readonly ExcludeCode[]>> = {
  9001: ["FRAGRANCE_ALLERGENS"],
  9002: ["FRAGRANCE_ALLERGENS"],
  9004: ["DRYING_ALCOHOLS"],
  9103: ["SULFATES"],
};

/** 나만의 필터에 든 성분 하나. 이름 길이 성분은 검색 목과 같은 이름·제형 기능·효과를 쓴다. */
const filterItem = (id: number): MyFilterResponse["items"][number] => {
  const sample = nameLengthIngredients.find((ingredient) => ingredient.id === id);
  return {
    id,
    koreanName: sample?.koreanName ?? SUSPECTS.find((suspect) => suspect.id === id)?.koreanName ?? `성분 ${id}`,
    formulationRoles: sample
      ? [...sample.formulationRoles]
      : ROLES[id]
        ? [{ id: `role-${id}`, code: `ROLE_${id}`, name: ROLES[id] }]
        : [],
    skinEffects: sample ? [...sample.skinEffects] : [],
    excludeCodes: [...(CAUTIONS[id] ?? [])],
  };
};

/** 'filled' 상태에서 담은 성분보다 앞에 두는 이름 길이 성분 */
const filledIds = (): readonly number[] =>
  mockShelfMode() === "filled" ? nameLengthIngredients.map((ingredient) => ingredient.id) : [];

let shelf: MockItem[] = seed();
let filterIds: number[] = [];
let lastSuspectIds: number[] = [];
let newSuspectIds: number[] = [];

const badItems = () => shelf.filter((item) => item.preference === "BAD");

const suspectsNow = () => {
  const count = badItems().length;
  if (count === 0) return [];
  if (count >= 3) return [...SUSPECTS];
  return SUSPECTS.slice(0, 3);
};

/** 평가가 바뀌어 결과가 달라지면 직전 결과에 없던 성분을 새 성분으로 남긴다. */
const recalculate = () => {
  const ids = suspectsNow().map((suspect) => suspect.id);
  const changed = ids.length !== lastSuspectIds.length || ids.some((id) => !lastSuspectIds.includes(id));
  if (!changed) return;
  newSuspectIds = ids.filter((id) => !lastSuspectIds.includes(id));
  lastSuspectIds = ids;
};
recalculate();

const productOf = (id: number) => allProducts.find((product) => product.id === id);

const rejectsSensoryRating = (
  productId: number,
  rating: { readonly moistureLevel?: number | null; readonly oilLevel?: number | null },
): boolean => {
  const product = productOf(productId);
  return (
    product !== undefined &&
    (product.moistureLevel === null || product.oilLevel === null) &&
    (rating.moistureLevel != null || rating.oilLevel != null)
  );
};

const toResponse = (item: MockItem): ShelfProductResponse | undefined => {
  const product = productOf(item.productId);
  if (!product) return undefined;
  const sensorySupported = product.moistureLevel !== null && product.oilLevel !== null;
  return {
    product: {
      id: product.id,
      name: product.name,
      brandName: product.brand.name,
      marks: product.marks,
      imageUrl: product.imageUrl,
      sensorySupported,
    },
    usageStatus: item.usageStatus,
    rating: {
      preference: item.preference,
      moistureLevel: sensorySupported ? item.moistureLevel : null,
      oilLevel: sensorySupported ? item.oilLevel : null,
    },
    possiblyUnsuitable: item.preference === "BAD",
    registeredAt: item.registeredAt,
  };
};

const isEmptyShelfMode = () => mockShelfMode() === "empty" || mockShelfMode() === "empty-no-skin";

const visibleShelf = () => (isEmptyShelfMode() ? [] : shelf);

const shelfResponse = () => {
  const items = visibleShelf()
    .map(toResponse)
    .filter((item): item is ShelfProductResponse => item !== undefined);
  const count = (status?: ShelfUsageStatus) => items.filter((item) => !status || item.usageStatus === status).length;
  return {
    usages: [
      { code: "ALL", name: "전체", count: count() },
      { code: "IN_USE", name: "사용 중", count: count("IN_USE") },
      { code: "USED", name: "사용했던", count: count("USED") },
    ],
    items,
  };
};

const analysisResponse = () => {
  const bad = isEmptyShelfMode() ? [] : badItems();
  const products = bad.flatMap((item) => {
    const product = productOf(item.productId);
    return product ? [{ id: product.id, name: product.name, imageUrl: product.imageUrl }] : [];
  });
  const items: IngredientAnalysisItemResponse[] = (bad.length === 0 ? [] : suspectsNow()).map((suspect) => {
    const inFilter = filterIds.includes(suspect.id);
    return {
      ...suspect,
      formulationRoles: ROLES[suspect.id]
        ? [{ id: `role-${suspect.id}`, code: `ROLE_${suspect.id}`, name: ROLES[suspect.id] }]
        : [],
      groupCodes: [...(CAUTIONS[suspect.id] ?? [])],
      reasons: [{ code: "QUICK_EXCLUDE", name: "빠른 제외 성분" }],
      products,
      inFilter,
      isNew: newSuspectIds.includes(suspect.id) && !inFilter,
    };
  });
  return { badProductCount: bad.length, items };
};

/** 비로그인 선반의 성분 분석. 보낸 평가만으로 회원 선반과 같은 규칙의 결과를 흉내 낸다. */
const guestAnalysisResponse = (ratings: GuestIngredientAnalysisRequest["items"]) => {
  const badIds = ratings.filter((rating) => rating.preference === "BAD").map((rating) => rating.productId);
  const products = badIds.flatMap((id) => {
    const product = productOf(id);
    return product ? [{ id: product.id, name: product.name, imageUrl: product.imageUrl }] : [];
  });
  const suspects = (badIds.length === 0 ? [] : SUSPECTS.slice(0, badIds.length >= 3 ? SUSPECTS.length : 3)).map(
    (suspect): IngredientAnalysisItemResponse => ({
      ...suspect,
      formulationRoles: ROLES[suspect.id]
        ? [{ id: `role-${suspect.id}`, code: `ROLE_${suspect.id}`, name: ROLES[suspect.id] }]
        : [],
      groupCodes: [...(CAUTIONS[suspect.id] ?? [])],
      reasons: [...(GUEST_REASONS[suspect.id] ?? [])],
      products,
      inFilter: false,
      isNew: false,
    }),
  );
  return { badProductCount: badIds.length, items: suspects, possiblyUnsuitableProductIds: badIds };
};

/** 미리보기에서 잘 맞았어요로 빠지는 성분. 실제 상쇄 규칙 대신 첫 성분이 이 제품에도 들었다고 친다. */
const SUITED_OFFSET_ID = SUSPECTS[0].id;

const withoutSuited = <T extends { readonly items: readonly IngredientAnalysisItemResponse[] }>(analysis: T): T => ({
  ...analysis,
  items: analysis.items.filter((item) => item.id !== SUITED_OFFSET_ID),
});

/** 이 제품에 든 주의 성분. 근거는 비로그인 성분 분석과 같다. */
const cautionIngredients = () =>
  SUSPECTS.slice(0, 3).map((suspect) => ({
    id: suspect.id,
    koreanName: suspect.koreanName,
    reasons: [...(GUEST_REASONS[suspect.id] ?? [])],
  }));

/**
 * 회원 미리보기. 선반에서 이 제품의 호불호만 바꿔 본 결과다. 선반에 없으면 담았다고 친다.
 * 목 회원은 건성 피부라 빠른 제외 · 건성 근거만 남긴다. 피부 타입이 없으면(no-skin) 빠른 제외만 남기고 넓힌 결과를 함께 준다.
 */
const memberPreview = (productId: number) => {
  const mode = mockShelfMode();
  const hasSkinType = mode !== "no-skin" && mode !== "empty-no-skin";
  const base = visibleShelf().filter((item) => item.productId !== productId);
  const analyzeWith = (
    preference: RatingPreference | null,
    keeps: (code: IngredientAnalysisItemResponse["reasons"][number]["code"]) => boolean,
  ) => {
    const ratings = [
      { productId, preference },
      ...base.map((item) => ({ productId: item.productId, preference: item.preference })),
    ];
    const { badProductCount, items } = guestAnalysisResponse(ratings);
    return {
      badProductCount,
      items: items
        .map((item) => ({ ...item, reasons: item.reasons.filter((reason) => keeps(reason.code)) }))
        .filter((item) => item.reasons.length > 0),
    };
  };
  const memberReason = (code: IngredientAnalysisItemResponse["reasons"][number]["code"]) =>
    code === "QUICK_EXCLUDE" || (hasSkinType && code === "DRY_SKIN");
  let ratedBad = analyzeWith("BAD", memberReason);
  if (mode === "empty-no-skin") ratedBad = { ...ratedBad, items: [] };
  let ratedBadAcrossSkinTypes = null;
  if (!hasSkinType) ratedBadAcrossSkinTypes = analyzeWith("BAD", () => true);
  const previewReason = (code: IngredientAnalysisItemResponse["reasons"][number]["code"]) =>
    !hasSkinType || memberReason(code);
  return {
    withoutRating: analyzeWith(null, previewReason),
    ratedGood: withoutSuited(analyzeWith("GOOD", previewReason)),
    ratedBad,
    ratedBadAcrossSkinTypes,
    productCautionIngredients: cautionIngredients(),
  };
};

/** 비로그인 미리보기. 보낸 평가에서 이 제품의 호불호만 바꿔 본 결과다. */
const guestPreview = (ratings: GuestIngredientAnalysisRequest["items"], productId: number) => {
  const others = ratings.filter((rating) => rating.productId !== productId);
  const analyzeWith = (preference: RatingPreference | null) => {
    const { badProductCount, items } = guestAnalysisResponse([{ productId, preference }, ...others]);
    if (mockShelfMode() === "signed-out-no-match") return { badProductCount, items: [] };
    return { badProductCount, items };
  };
  return {
    withoutRating: analyzeWith(null),
    ratedGood: withoutSuited(analyzeWith("GOOD")),
    ratedBad: analyzeWith("BAD"),
    ratedBadAcrossSkinTypes: null,
    productCautionIngredients: cautionIngredients(),
  };
};

const blocked = () => {
  const mode = mockShelfMode();
  if (mode === "signed-out" || mode === "signed-out-no-match") {
    return problem(401, "UNAUTHORIZED", "로그인이 필요합니다.");
  }
  if (mode === "error") return problem(500, "INTERNAL_SERVER_ERROR", "서버에서 처리하지 못했습니다.");
  return undefined;
};

/** 테스트가 선반을 처음 상태로 되돌린다. */
export const resetMockShelf = (): void => {
  shelf = seed();
  filterIds = [];
  lastSuspectIds = [];
  newSuspectIds = [];
  recalculate();
};

export const isMockShelved = (productId: number): boolean =>
  visibleShelf().some((item) => item.productId === productId);

export const shelfHandlers = [
  http.get("*/api/users/me/shelf/products", () => blocked() ?? HttpResponse.json(shelfResponse())),

  http.get("*/api/users/me/shelf/ingredient-analysis", () => blocked() ?? HttpResponse.json(analysisResponse())),
  http.get("*/api/users/me/shelf/ingredient-analysis/preview", ({ request }) => {
    const productId = Number(new URL(request.url).searchParams.get("productId"));
    return blocked() ?? HttpResponse.json(memberPreview(productId));
  }),
  http.post("*/api/shelf/ingredient-analysis/preview", async ({ request }) => {
    const body = GuestIngredientAnalysisPreviewRequest.safeParse(await request.json());
    if (!body.success) return problem(400, "INVALID_REQUEST_BODY", "요청 본문 값이 올바르지 않습니다.");
    return HttpResponse.json(guestPreview(body.data.items, body.data.productId));
  }),
  http.post("*/api/shelf/ingredient-analysis", async ({ request }) => {
    const body = GuestIngredientAnalysisRequest.safeParse(await request.json());
    if (!body.success) return problem(400, "INVALID_REQUEST_BODY", "요청 본문 값이 올바르지 않습니다.");
    return HttpResponse.json(guestAnalysisResponse(body.data.items));
  }),
  http.post("*/api/users/me/shelf/products/import", () => blocked() ?? new HttpResponse(null, { status: 204 })),

  http.post("*/api/users/me/shelf/products", async ({ request }) => {
    const body = ShelfProductAddRequest.safeParse(await request.json());
    if (!body.success) return problem(400, "INVALID_REQUEST_BODY", "요청 본문 값이 올바르지 않습니다.");
    if (!productOf(body.data.productId)) return problem(404, "PRODUCT_NOT_FOUND", "제품을 찾을 수 없습니다.");
    if (shelf.some((item) => item.productId === body.data.productId)) {
      return problem(409, "SHELF_PRODUCT_ALREADY_EXISTS", "이미 선반에 있는 제품입니다.");
    }

    if (rejectsSensoryRating(body.data.productId, body.data)) {
      return problem(400, "INVALID_REQUEST_BODY", "향수·클렌징 제품에는 수분감·유분감 평가를 남길 수 없습니다.");
    }

    const added: MockItem = {
      productId: body.data.productId,
      usageStatus: body.data.usageStatus,
      preference: body.data.preference ?? null,
      moistureLevel: body.data.moistureLevel ?? null,
      oilLevel: body.data.oilLevel ?? null,
      registeredAt: new Date().toISOString(),
    };
    shelf = [added, ...shelf];
    recalculate();
    return HttpResponse.json(toResponse(added), { status: 201 });
  }),

  http.put("*/api/users/me/shelf/products/:productId", async ({ params, request }) => {
    const productId = Number(params.productId);
    const body = ShelfProductUpdateRequest.safeParse(await request.json());
    if (!body.success) return problem(400, "INVALID_REQUEST_BODY", "요청 본문 값이 올바르지 않습니다.");
    const current = shelf.find((item) => item.productId === productId);
    if (!current) return problem(404, "SHELF_PRODUCT_NOT_FOUND", "선반에 없는 제품입니다.");

    if (rejectsSensoryRating(productId, body.data)) {
      return problem(400, "INVALID_REQUEST_BODY", "향수·클렌징 제품에는 수분감·유분감 평가를 남길 수 없습니다.");
    }

    const updated: MockItem = {
      ...current,
      usageStatus: body.data.usageStatus,
      preference: body.data.preference ?? null,
      moistureLevel: body.data.moistureLevel ?? null,
      oilLevel: body.data.oilLevel ?? null,
    };
    shelf = shelf.map((item) => (item.productId === productId ? updated : item));
    recalculate();
    return HttpResponse.json(toResponse(updated));
  }),

  http.delete("*/api/users/me/shelf/products/:productId", ({ params }) => {
    shelf = shelf.filter((item) => item.productId !== Number(params.productId));
    recalculate();
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(
    "*/api/users/me/my-filter",
    () =>
      blocked() ??
      HttpResponse.json({
        items: [...filledIds(), ...filterIds.filter((id) => !filledIds().includes(id))].map(filterItem),
      } satisfies MyFilterResponse),
  ),

  http.post("*/api/users/me/my-filter/ingredients", async ({ request }) => {
    const body = MyFilterIngredientsRequest.safeParse(await request.json());
    if (!body.success) return problem(400, "INVALID_REQUEST_BODY", "요청 본문 값이 올바르지 않습니다.");
    filterIds = [...body.data.ingredientIds.filter((id) => !filterIds.includes(id)).reverse(), ...filterIds];
    newSuspectIds = newSuspectIds.filter((id) => !filterIds.includes(id));
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete("*/api/users/me/my-filter/ingredients", ({ request }) => {
    const ids = new URL(request.url).searchParams.getAll("ingredientIds").map(Number);
    filterIds = filterIds.filter((id) => !ids.includes(id));
    return new HttpResponse(null, { status: 204 });
  }),
];
