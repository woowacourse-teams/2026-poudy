import { http, HttpResponse } from "msw";

import { brands, categories, excludeCodes, ingredientDetails, productDetails, products } from "./fixtures";

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

/*
 * 실제 서버의 필터 규칙을 그대로 재현하지 않는다. 화면이 요청을 보내고 응답을
 * 그리는 흐름을 확인할 정도만 맞춘다. 검증은 서버 연동 시점에 다시 한다.
 */
const filterProducts = (url: URL) => {
  const keyword = url.searchParams.get("keyword")?.trim().toLowerCase();
  const brandIds = numbers(url, "brandIds");
  const moisture = numbers(url, "moistureLevel");
  const oil = numbers(url, "oilLevel");

  return products.filter((product) => {
    if (keyword) {
      const haystack = `${product.name} ${product.brand.name}`.toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }
    if (brandIds.length && !brandIds.includes(product.brand.id)) return false;
    if (moisture.length && !moisture.includes(product.moistureLevel)) return false;
    if (oil.length && !oil.includes(product.oilLevel)) return false;
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
      brands: brands
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
    const matched = products
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
    const keyword = url.searchParams.get("keyword")?.trim().toLowerCase() ?? "";
    const ids = numbers(url, "ingredientIds");

    const summary = ({ id, koreanName, englishName, skinEffects }: (typeof ingredientDetails)[number]) => ({
      id,
      koreanName,
      englishName,
      skinEffects,
    });

    const matchesKeyword = (ingredient: (typeof ingredientDetails)[number]) =>
      `${ingredient.koreanName} ${ingredient.englishName}`.toLowerCase().includes(keyword);

    // 상한은 검색에만 걸고 순위는 흉내 내지 않는다.
    const limited = <T>(items: readonly T[]) => (keyword ? items.slice(0, INGREDIENT_SEARCH_LIMIT) : [...items]);

    // ID 로만 조회하면 요청한 순서를 지키고 없는 ID 는 뺀다.
    if (ids.length > 0) {
      const items = ids
        .map((id) => ingredientDetails.find((ingredient) => ingredient.id === id))
        .filter((ingredient) => ingredient !== undefined)
        .filter((ingredient) => !keyword || matchesKeyword(ingredient))
        .map(summary);

      return HttpResponse.json({ items: limited(items) });
    }

    return HttpResponse.json({ items: limited(ingredientDetails.filter(matchesKeyword).map(summary)) });
  }),

  http.get("*/api/ingredients/:ingredientId", ({ params }) => {
    const id = Number(params.ingredientId);
    const detail = ingredientDetails.find((ingredient) => ingredient.id === id);
    if (!detail) return notFound("성분을 찾을 수 없습니다.", "INGREDIENT_NOT_FOUND");
    return HttpResponse.json(detail);
  }),

  http.get("*/api/exclude-codes", () => HttpResponse.json({ items: excludeCodes })),

  http.get("*/api/categories", () => HttpResponse.json({ items: categories })),

  http.get("*/api/brands", () => HttpResponse.json({ items: brands })),

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
