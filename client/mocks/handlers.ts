import { http, HttpResponse } from "msw";

import {
  allBrands,
  allProducts,
  brands,
  categories,
  excludeCodeIngredientIds,
  excludeCodes,
  ingredientDetails,
  pipelineIngredientSummaries,
  pipelineProductIngredients,
  productDetails,
  products,
} from "./fixtures";

import { INGREDIENT_SEARCH_LIMIT } from "@/lib/domain/ingredient-search";

const numbers = (url: URL, key: string) =>
  url.searchParams
    .getAll(key)
    .flatMap((value) => value.split(","))
    .map(Number)
    .filter(Number.isFinite);

const notFound = (detail: string, code: string) =>
  HttpResponse.json({ title: "Not Found", status: 404, detail, code }, { status: 404 });

const paginate = <T>(matched: readonly T[], url: URL) => {
  const page = Number(url.searchParams.get("page") ?? 0);
  const size = Number(url.searchParams.get("size") ?? 20);
  const start = page * size;

  return {
    items: matched.slice(start, start + size),
    pagination: {
      page,
      size,
      totalElements: matched.length,
      totalPages: Math.ceil(matched.length / size),
      hasNext: start + size < matched.length,
    },
  };
};

const strings = (url: URL, key: string) =>
  url.searchParams
    .getAll(key)
    .flatMap((value) => value.split(","))
    .filter(Boolean);

/*
 * 손으로 적은 상세 성분을 앞에 두고 파이프라인 성분을 잇는다. 상세 화면이 있는
 * 성분이 먼저 잡혀야 눌렀을 때 빈 화면을 만나지 않는다.
 */
const detailIngredientIds = new Set(ingredientDetails.map((ingredient) => ingredient.id));
const searchableIngredients = [
  ...ingredientDetails.map(({ id, koreanName, englishName, skinEffects }) => ({
    id,
    koreanName,
    englishName,
    skinEffects,
  })),
  ...pipelineIngredientSummaries.filter((ingredient) => !detailIngredientIds.has(ingredient.id)),
];

/** 제품이 가진 성분. 손으로 적은 다섯 개는 성분을 따로 두지 않아 빈 집합이 된다. */
const ingredientsOf = (productId: number) => pipelineProductIngredients.get(productId) ?? new Set<number>();

/*
 * 실제 서버의 필터 규칙을 그대로 재현하지 않는다. 화면이 요청을 보내고 응답을
 * 그리는 흐름을 확인할 정도만 맞춘다. 검증은 서버 연동 시점에 다시 한다.
 *
 * 다만 조건을 걸 때 개수가 실제로 움직이는지 보려면 성분 조건은 걸려야 한다.
 * 빠른 필터와 성분 포함·제외는 파이프라인 데이터를 기준으로 가른다.
 */
const filterProducts = (url: URL) => {
  const keyword = url.searchParams.get("keyword")?.trim().toLowerCase();
  const brandIds = numbers(url, "brandIds");
  const moisture = numbers(url, "moistureLevel");
  const oil = numbers(url, "oilLevel");
  const codes = strings(url, "excludeCodes");
  const include = numbers(url, "includeIngredientIds");
  const exclude = numbers(url, "excludeIngredientIds");

  // 빠른 필터가 걸러 내는 성분을 한 덩어리로 모은다.
  const blockedByCode = new Set<number>();
  for (const code of codes) {
    for (const id of excludeCodeIngredientIds.get(code) ?? []) blockedByCode.add(id);
  }

  return allProducts.filter((product) => {
    if (keyword) {
      const haystack = `${product.name} ${product.brand.name}`.toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }
    if (brandIds.length && !brandIds.includes(product.brand.id)) return false;
    if (moisture.length && !moisture.includes(product.moistureLevel)) return false;
    if (oil.length && !oil.includes(product.oilLevel)) return false;

    const has = ingredientsOf(product.id);
    // 제외 조건은 하나라도 들어 있으면 뺀다.
    if (blockedByCode.size && [...blockedByCode].some((id) => has.has(id))) return false;
    if (exclude.length && exclude.some((id) => has.has(id))) return false;
    // 포함 조건은 모두 들어 있어야 남는다.
    if (include.length && !include.every((id) => has.has(id))) return false;
    return true;
  });
};

const sortProducts = (items: typeof products, sort: string | null) => {
  const sorted = [...items];
  switch (sort) {
    case "NAME_DESC":
      return sorted.sort((a, b) => b.name.localeCompare(a.name, "ko"));
    case "PRICE_ASC":
      return sorted.sort((a, b) => a.price - b.price);
    case "PRICE_DESC":
      return sorted.sort((a, b) => b.price - a.price);
    default:
      return sorted.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }
};

export const handlers = [
  http.get("*/api/products", ({ request }) => {
    const url = new URL(request.url);
    const matched = sortProducts(filterProducts(url), url.searchParams.get("sort"));

    return HttpResponse.json({
      ...paginate(matched, url),
      // 조건에 걸린 제품 전체의 브랜드다. 페이지가 아니라 matched 를 기준으로 한다.
      brands: allBrands
        .filter((brand) => matched.some((product) => product.brand.id === brand.id))
        .map(({ id, name, englishName, imageUrl }) => ({ id, name, englishName, imageUrl })),
    });
  }),

  http.get("*/api/products/count", ({ request }) => {
    const url = new URL(request.url);
    return HttpResponse.json({ count: filterProducts(url).length });
  }),

  http.get("*/api/products/suggestions", ({ request }) => {
    const url = new URL(request.url);
    const keyword = url.searchParams.get("keyword")?.trim().toLowerCase() ?? "";
    const matched = allProducts
      .filter((product) => `${product.name} ${product.brand.name}`.toLowerCase().includes(keyword))
      .map((product) => ({
        id: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        brandName: product.brand.name,
      }));

    return HttpResponse.json(paginate(matched, url));
  }),

  http.get("*/api/products/:productId", ({ params }) => {
    const id = Number(params.productId);
    const detail = productDetails.find((product) => product.id === id);
    if (!detail) return notFound("제품을 찾을 수 없습니다.", "PRODUCT_NOT_FOUND");
    return HttpResponse.json(detail);
  }),

  http.get("*/api/storage", ({ request }) => {
    const url = new URL(request.url);
    const ids = numbers(url, "productIds");
    // 요청한 순서를 유지하고 존재하는 제품만 돌려준다.
    const items = ids
      .map((id) => products.find((product) => product.id === id))
      .filter((product): product is (typeof products)[number] => Boolean(product));

    return HttpResponse.json({ items });
  }),

  http.get("*/api/ingredients", ({ request }) => {
    const url = new URL(request.url);
    const ids = numbers(url, "ingredientIds");

    // ID 를 보내면 요청한 순서를 지키고 없는 ID 는 뺀다. 없으면 전체를 조회한다.
    const matched = ids.length
      ? ids
          .map((id) => searchableIngredients.find((ingredient) => ingredient.id === id))
          .filter((ingredient) => ingredient !== undefined)
      : searchableIngredients;

    return HttpResponse.json(paginate(matched, url));
  }),

  http.get("*/api/ingredients/suggestions", ({ request }) => {
    const url = new URL(request.url);
    const keyword = url.searchParams.get("keyword")?.trim().toLowerCase() ?? "";
    const items = searchableIngredients
      .filter((ingredient) => `${ingredient.koreanName} ${ingredient.englishName}`.toLowerCase().includes(keyword))
      .slice(0, INGREDIENT_SEARCH_LIMIT);

    return HttpResponse.json({ items });
  }),

  http.get("*/api/ingredients/:ingredientId", ({ params }) => {
    const id = Number(params.ingredientId);
    const detail = ingredientDetails.find((ingredient) => ingredient.id === id);
    if (!detail) return notFound("성분을 찾을 수 없습니다.", "INGREDIENT_NOT_FOUND");
    return HttpResponse.json(detail);
  }),

  http.get("*/api/exclude-codes", () => HttpResponse.json({ items: excludeCodes })),

  http.get("*/api/categories", () => HttpResponse.json({ items: categories })),

  http.get("*/api/brands", () => HttpResponse.json({ items: allBrands })),

  http.get("*/api/brands/:brandId", ({ params }) => {
    const id = Number(params.brandId);
    const brand = brands.find((candidate) => candidate.id === id);
    if (!brand) return notFound("브랜드를 찾을 수 없습니다.", "BRAND_NOT_FOUND");

    return HttpResponse.json({
      id: brand.id,
      name: brand.name,
      englishName: brand.englishName,
      imageUrl: brand.imageUrl,
      categories,
    });
  }),
];
