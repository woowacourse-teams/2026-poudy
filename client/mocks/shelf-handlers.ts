import {
  ShelfProductAddRequest,
  ShelfProductUpdateRequest,
  SkinFilterIngredientsRequest,
  type IngredientAnalysisItemResponse,
  type RatingPreference,
  type ShelfProductResponse,
  type ShelfUsageStatus,
  type SkinFilterResponse,
} from "@poudy/api/api.zod";
import { http, HttpResponse } from "msw";

import { allProducts } from "./fixtures";

/*
 * 선반과 나만의 필터 목. 서버처럼 회원 한 명의 선반을 메모리에 든다.
 *
 * 화면 상태를 확인하려면 쿠키 `poudy-mock-shelf` 에 값을 넣는다.
 * - empty: 빈 선반(S54b)
 * - signed-out: 로그인 전(S54a)
 * - error: 선반을 불러오지 못함
 */
type MockShelfMode = "empty" | "signed-out" | "error" | undefined;

const mockShelfMode = (): MockShelfMode => {
  const cookie = globalThis.document?.cookie ?? "";
  const value = /(?:^|; )poudy-mock-shelf=([^;]+)/.exec(cookie)?.[1];
  if (value === "empty" || value === "signed-out" || value === "error") return value;
  return undefined;
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

const visibleShelf = () => (mockShelfMode() === "empty" ? [] : shelf);

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
  const bad = mockShelfMode() === "empty" ? [] : badItems();
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
      groupCodes: [],
      products,
      inFilter,
      isNew: newSuspectIds.includes(suspect.id) && !inFilter,
    };
  });
  return { badProductCount: bad.length, items };
};

const blocked = () => {
  const mode = mockShelfMode();
  if (mode === "signed-out") return problem(401, "UNAUTHORIZED", "로그인이 필요합니다.");
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
    "*/api/users/me/skin-filter",
    () =>
      blocked() ??
      HttpResponse.json({
        items: filterIds.map((id) => ({
          id,
          koreanName: SUSPECTS.find((suspect) => suspect.id === id)?.koreanName ?? `성분 ${id}`,
          formulationRoles: ROLES[id] ? [{ id: `role-${id}`, code: `ROLE_${id}`, name: ROLES[id] }] : [],
          skinEffects: [],
          excludeCodes: [],
        })),
      } satisfies SkinFilterResponse),
  ),

  http.post("*/api/users/me/skin-filter/ingredients", async ({ request }) => {
    const body = SkinFilterIngredientsRequest.safeParse(await request.json());
    if (!body.success) return problem(400, "INVALID_REQUEST_BODY", "요청 본문 값이 올바르지 않습니다.");
    filterIds = [...body.data.ingredientIds.filter((id) => !filterIds.includes(id)).reverse(), ...filterIds];
    newSuspectIds = newSuspectIds.filter((id) => !filterIds.includes(id));
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete("*/api/users/me/skin-filter/ingredients", ({ request }) => {
    const ids = new URL(request.url).searchParams.getAll("ingredientIds").map(Number);
    filterIds = filterIds.filter((id) => !ids.includes(id));
    return new HttpResponse(null, { status: 204 });
  }),
];
