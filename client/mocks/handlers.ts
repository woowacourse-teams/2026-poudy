import type { ProductDetailResponse } from "@poudy/api/api.zod";
import { http, HttpResponse } from "msw";

import { matchesKeyword, toChosung } from "@/lib/domain/chosung";
import { keepIf } from "@/lib/domain/optional";

import {
  allBrands,
  allProducts,
  brands,
  categories,
  excludeCodeIngredientIds,
  excludeCodes,
  excludeGroupsOf,
  ingredientDetails,
  pipelineIngredientSummaries,
  pipelineProductIngredients,
  productCategoryIds,
  productSkinTypes,
  productDetails,
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

const problem = (status: number, detail: string, code: string) =>
  HttpResponse.json({ title: code, status, detail, code }, { status });

const MOCK_IMAGE_MAX_COUNT = 5;
const MOCK_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/* 목에서 실패 화면을 확인하려고 쓰는 낱말. */
const RATE_LIMIT_KEYWORD = "429";
const SERVER_ERROR_KEYWORD = "500";

const forcedError = (text: string) => {
  if (text.includes(RATE_LIMIT_KEYWORD)) return problem(429, "요청이 너무 잦습니다.", "TOO_MANY_REQUESTS");
  if (text.includes(SERVER_ERROR_KEYWORD))
    return problem(500, "서버에서 처리하지 못했습니다.", "INTERNAL_SERVER_ERROR");

  return undefined;
};

const paginate = <T>(matched: readonly T[], url: URL) => {
  const page = Number(url.searchParams.get("page") ?? 1);
  const size = Number(url.searchParams.get("size") ?? 20);
  const start = (page - 1) * size;

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
 * 초성으로 걸린 자리를 원문 인덱스로 되돌린다.
 *
 * 서버 `SearchableText.rangeOf` 와 같은 규칙이다. 초성 문자열은 원문과 글자 수가
 * 같아 자리가 그대로 겹치므로, 초성에서 찾은 자리를 그대로 쓴다.
 *
 * `프로판다이올` 의 초성은 `ㅍㄹㅍㄷㅇㅇ` 이라 `ㅍㄷㅇㅇ` 는 2 부터 6 까지, 곧
 * `판다이올` 이다. 이름 전체를 맞았다고 하면 통째로 진해져 어디가 걸렸는지 알 수 없다.
 */
const chosungRange = (keyword: string, text: string) => {
  const startIndex = toChosung(text).indexOf(keyword);

  return keepIf(startIndex >= 0, { startIndex, endIndexExclusive: startIndex + keyword.length });
};

const suggestionMatch = <Field extends string>(
  keyword: string,
  candidates: readonly { readonly field: Field; readonly text: string }[],
) => {
  for (const candidate of candidates) {
    const startIndex = candidate.text.toLowerCase().indexOf(keyword);
    if (startIndex >= 0) {
      return {
        ...candidate,
        startIndex,
        endIndexExclusive: startIndex + keyword.length,
      };
    }
  }

  /* 초성으로 걸린 줄은 초성 자리를 원문 자리로 되돌려 그 구간만 짚는다. */
  for (const candidate of candidates) {
    const [range] = chosungRange(keyword, candidate.text);
    if (range) return { ...candidate, ...range };
  }

  /*
   * 음차로만 걸린 줄이 남는다. `PDRN` 을 `피디알엔` 으로 찾은 경우라 원문에 맞는
   * 자리를 집어 줄 수 없어 이름 전체를 짚는다. 서버도 읽은 표현에서 찾은 구간을
   * 되돌려 주지만, 목은 그 표를 두지 않아 여기까지만 흉내 낸다.
   */
  const transformed = candidates.find((candidate) => matchesKeyword(keyword, candidate.text));
  if (!transformed) throw new Error("검색 제안 목의 일치 원문을 찾지 못했습니다.");

  return {
    ...transformed,
    startIndex: 0,
    endIndexExclusive: transformed.text.length,
  };
};

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
/**
 * 제품이 고른 피부 타입에 드는지 본다.
 *
 * 서버는 제품마다 딸린 집합에 그 타입이 들어 있는지로 가른다(`Product.matchesSkinType`).
 * 목도 `productSkinTypes` 를 같은 방식으로 읽어, 한 제품이 여러 타입에 드는 경우를 그대로
 * 다룬다. 어느 타입에도 들지 않는 제품은 어떤 타입을 골라도 빠진다.
 */
const matchesSkinType = (skinType: string, product: { readonly id: number }): boolean =>
  (productSkinTypes.get(product.id) ?? []).some((code) => code === skinType);

const filterProducts = (url: URL) => {
  const keyword = url.searchParams.get("keyword")?.trim().toLowerCase();
  const brandIds = numbers(url, "brandIds");
  const categoryIds = numbers(url, "categoryIds");
  const moisture = numbers(url, "moistureLevel");
  const oil = numbers(url, "oilLevel");
  const skinType = url.searchParams.get("skinType")?.trim();
  const codes = strings(url, "excludeCodes");
  const include = numbers(url, "includeIngredientIds");
  const exclude = numbers(url, "excludeIngredientIds");

  // 빠른 필터가 걸러 내는 성분을 한 덩어리로 모은다.
  const blockedByCode = new Set<number>();
  for (const code of codes) {
    for (const id of excludeCodeIngredientIds.get(code) ?? []) blockedByCode.add(id);
  }

  return allProducts.filter((product) => {
    if (keyword && !matchesKeyword(keyword, product.name, product.brand.name)) return false;
    if (brandIds.length && !brandIds.includes(product.brand.id)) return false;
    // 서버처럼 소분류와 대분류 ID 모두 허용한다.
    const categoryId = productCategoryIds.get(product.id);
    const parent = categories.find((category) => category.children.some((child) => child.id === categoryId));
    if (categoryIds.length && !categoryIds.includes(categoryId ?? -1) && !categoryIds.includes(parent?.id ?? -1))
      return false;
    if (moisture.length && !moisture.includes(product.moistureLevel)) return false;
    if (oil.length && !oil.includes(product.oilLevel)) return false;
    if (skinType && !matchesSkinType(skinType, product)) return false;

    const has = ingredientsOf(product.id);
    // 제외 조건은 하나라도 들어 있으면 뺀다.
    if (blockedByCode.size && [...blockedByCode].some((id) => has.has(id))) return false;
    if (exclude.length && exclude.some((id) => has.has(id))) return false;
    // 포함 조건은 모두 들어 있어야 남는다.
    if (include.length && !include.every((id) => has.has(id))) return false;
    return true;
  });
};

/** 서버처럼 ea 와 용량 0 은 단가를 셈하지 않는다. */
const unitPriceOf = (product: (typeof allProducts)[number]) =>
  product.volumeUnit === "ea" || product.volumeValue === 0 ? undefined : product.price / product.volumeValue;

/** 단가를 셈할 수 없는 제품은 방향과 관계없이 뒤로 보낸다. */
const byUnitPrice = (direction: 1 | -1) => (a: (typeof allProducts)[number], b: (typeof allProducts)[number]) => {
  const left = unitPriceOf(a);
  const right = unitPriceOf(b);
  if (left === undefined || right === undefined) return Number(left === undefined) - Number(right === undefined);
  return (left - right) * direction;
};

/**
 * 동점은 서버처럼 ID 오름차순이다.
 * 목에는 조회수와 검색 관련도가 없어 기본순은 ID 순서로 대신한다.
 */
const sortProducts = (items: typeof allProducts, sort: string | null) => {
  const sorted = items.toSorted((a, b) => a.id - b.id);
  switch (sort) {
    case "PRICE_ASC":
      return sorted.sort((a, b) => a.price - b.price);
    case "PRICE_DESC":
      return sorted.sort((a, b) => b.price - a.price);
    case "UNIT_PRICE_ASC":
      return sorted.sort(byUnitPrice(1));
    case "UNIT_PRICE_DESC":
      return sorted.sort(byUnitPrice(-1));
    default:
      return sorted;
  }
};

/**
 * 목록에 있는 정보만으로 제품 상세를 세운다.
 * 성분과 분류는 목록이 들고 있지 않아 비운다.
 */
const detailOf = (product: (typeof allProducts)[number]): ProductDetailResponse => ({
  id: product.id,
  name: product.name,
  brand: product.brand,
  categories: [],
  imageUrl: product.imageUrl,
  variants: [
    {
      id: product.id,
      price: product.price,
      volumeValue: product.volumeValue,
      volumeUnit: product.volumeUnit,
      status: "SALE",
    },
  ],
  moistureLevel: product.moistureLevel,
  oilLevel: product.oilLevel,
  skinEffectGroups: [],
  ingredients: [],
  // 목록에는 성분이 없어 어느 성분군이 빠졌는지 알 수 없다. 모두 들어 있는 것으로 둔다.
  excludeGroups: excludeGroupsOf([]),
  updatedAt: "2026-08-01T00:00:00+09:00",
});

/**
 * 조건에 걸린 제품이 실제로 속한 카테고리만 추린다.
 *
 * 서버는 `조회 조건에 해당하는 제품 전체의 카테고리와 제품 수` 를 내려준다. 전체를 그대로
 * 주면 조건에 맞는 제품이 하나도 없는 카테고리까지 시트에 떠서, 골라도 빈 목록이 나온다.
 *
 * 소분류가 하나도 걸리지 않은 대분류는 통째로 뺀다. 제품 수도 걸린 것만 세어 실제와 맞춘다.
 */
const matchedCategories = (matched: readonly (typeof allProducts)[number][]) => {
  const counts = new Map<number, number>();
  for (const product of matched) {
    const categoryId = productCategoryIds.get(product.id);
    if (categoryId !== undefined) counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
  }

  return categories
    .map((category) => {
      const children = category.children
        .filter((child) => counts.has(child.id))
        .map((child) => ({ ...child, productCount: counts.get(child.id) ?? 0 }));

      return {
        ...category,
        children,
        productCount: children.reduce((sum, child) => sum + child.productCount, 0),
      };
    })
    .filter((category) => category.children.length > 0);
};

/**
 * 홈의 인기 검색어. 실제 순위는 검색 기록에서 나오지만 목에서는 고정해 둔다.
 * 순위 변동은 오름과 내림, 유지와 새로 든 것을 모두 한 번씩 담아 화면을 확인할 수 있게 한다.
 */
/*
 * 변동은 이전 집계와 견주어 나온다. 서버는 견줄 것이 없으면 `change` 를 아예 빼고 내려보내므로
 * (`RankingChange.isKnown`), 마지막 하나는 빠진 경우를 그대로 두어 화면이 그때도 서는지 본다.
 */
const searchKeywordRankings = [
  { rank: 1, keyword: "나이아신아마이드", change: { movement: "UP", steps: 2 } },
  { rank: 2, keyword: "어성초", change: { movement: "DOWN", steps: 1 } },
  { rank: 3, keyword: "레티놀", change: { movement: "SAME", steps: 0 } },
  { rank: 4, keyword: "세라마이드", change: { movement: "NEW", steps: 0 } },
  { rank: 5, keyword: "판테놀", change: { movement: "UP", steps: 3 } },
  { rank: 6, keyword: "비타민C", change: { movement: "SAME", steps: 0 } },
  { rank: 7, keyword: "히알루론산", change: { movement: "DOWN", steps: 2 } },
  { rank: 8, keyword: "무기자차", change: { movement: "UP", steps: 1 } },
  { rank: 9, keyword: "클렌징오일", change: { movement: "SAME", steps: 0 } },
  { rank: 10, keyword: "마스크팩" },
] as const;

const skinTypes = [
  { code: "DRY", name: "건성" },
  { code: "OILY", name: "지성" },
  { code: "SENSITIVE", name: "민감성" },
  { code: "COMBINATION", name: "복합성" },
] as const;

/**
 * 조건에 걸린 제품이 드는 피부 타입을 모은다.
 *
 * 브랜드나 카테고리와 같은 기준이다. 서버는 `조회 조건에 해당하는 제품 전체의 피부타입` 을
 * 중복 없이 내려주는데, 늘어놓는 차례는 제품이 걸린 순서가 아니라 피부 타입을 정의한
 * 순서를 따른다. 위의 목록이 이미 그 순서이므로 여기에서 걸러 내기만 하면 차례가 맞는다.
 *
 * 걸린 제품이 든 타입을 모두 모은다는 점이 중요하다. 조건으로 건 타입만 담는 것이 아니다.
 * 건성으로 좁혀도 그 제품들이 민감성에도 든다면 민감성까지 함께 담긴다. 서버의
 * `skinTypesOf` 도 걸린 제품의 집합을 합치는 방식이다.
 *
 * 카테고리와 달리 제품 수는 담지 않는다. 서버가 코드와 이름만 내려주기 때문이다.
 */
const matchedSkinTypes = (matched: readonly (typeof allProducts)[number][]) => {
  const present = new Set<string>();
  for (const product of matched) {
    for (const code of productSkinTypes.get(product.id) ?? []) present.add(code);
  }

  return skinTypes.filter((type) => present.has(type.code));
};

const matchedBrands = (matched: readonly (typeof allProducts)[number][]) =>
  allBrands
    .filter((brand) => matched.some((product) => product.brand.id === brand.id))
    .map(({ id, name, englishName, imageUrl }) => ({ id, name, englishName, imageUrl }));

const withoutCondition = (url: URL, condition: string) => {
  const candidateUrl = new URL(url);
  candidateUrl.searchParams.delete(condition);
  return filterProducts(candidateUrl);
};

const filterOptions = (url: URL) => ({
  brands: matchedBrands(withoutCondition(url, "brandIds")),
  categories: matchedCategories(withoutCondition(url, "categoryIds")),
  skinTypes: matchedSkinTypes(withoutCondition(url, "skinType")),
});

const curations = [
  {
    id: 1,
    title: "가을바람에 지친 피부,\n장벽부터 채워요",
    description: "세라마이드·판테놀 보습 성분 모아보기",
    thumbnailImageUrl: "/images/curations/autumn-barrier.jpg",
  },
  {
    id: 2,
    title: "자극 없이 씻어내는\n순한 클렌징",
    description: "설페이트 뺀 클렌저 모아보기",
    thumbnailImageUrl: "/images/curations/gentle-cleansing.jpg",
  },
  {
    id: 3,
    title: "번들거림은 줄이고\n수분은 남기고",
    description: "지성 피부를 위한 가벼운 보습",
    thumbnailImageUrl: "/images/curations/light-moisture.jpg",
  },
  /* 상세 아래의 다른 큐레이션이 여러 장 이어지는 모습을 보려고 더한다. 썸네일은 앞의 그림을 돌려 쓴다. */
  {
    id: 4,
    title: "환절기에 붉어지는 볼,\n진정부터 챙겨요",
    description: "병풀·판테놀 진정 성분 모아보기",
    thumbnailImageUrl: "/images/curations/autumn-barrier.jpg",
  },
  {
    id: 5,
    title: "민감한 날엔\n향 없는 제품으로",
    description: "무향료 보습제 모아보기",
    thumbnailImageUrl: "/images/curations/gentle-cleansing.jpg",
  },
  {
    id: 6,
    title: "아침에 바르기 좋은\n산뜻한 선크림",
    description: "백탁 적은 데일리 선크림 모아보기",
    thumbnailImageUrl: "/images/curations/light-moisture.jpg",
  },
] as const;

/** 상세 블록의 제품 칸. 목록 응답의 제품을 큐레이션이 쓰는 모양으로 옮긴다. */
const curationProduct = (product: (typeof allProducts)[number]) => ({
  id: product.id,
  name: product.name,
  brandName: product.brand.name,
  imageUrl: product.imageUrl,
  price: product.price,
  volumeValue: product.volumeValue,
  volumeUnit: product.volumeUnit,
  moistureLevel: product.moistureLevel,
  oilLevel: product.oilLevel,
});

/*
 * 블록 ID 와 필터 ID 는 스키마가 UUID 를 요구한다. 목에서 새로 만들면 다시 그릴 때마다
 * 값이 달라져, 고른 필터가 풀리거나 스냅샷 검사가 흔들린다. 손으로 적어 고정해 둔다.
 */
const CURATION_BLOCK_IDS = {
  image: "0d4bd6d9-6a84-4a47-8f29-5b4c2d1a7e01",
  products: "0d4bd6d9-6a84-4a47-8f29-5b4c2d1a7e02",
  productsByFilter: "0d4bd6d9-6a84-4a47-8f29-5b4c2d1a7e03",
} as const;

const CURATION_FILTER_IDS = {
  toner: "3f7c2e18-91a5-4c63-8d2b-6e1f9a4c5b01",
  cream: "3f7c2e18-91a5-4c63-8d2b-6e1f9a4c5b02",
} as const;

/**
 * 큐레이션 상세. 세 가지 블록이 모두 들어간 한 벌을 둔다.
 *
 * 목록의 큐레이션은 셋이지만 상세는 첫 번째만 손으로 적는다. 나머지는 같은 블록 구성을
 * 제목만 바꿔 돌려주어, 어느 카드로 들어와도 화면이 그려진다.
 */
const curationBlocks = [
  {
    id: CURATION_BLOCK_IDS.image,
    type: "IMAGE" as const,
    spacingTop: 0,
    spacingBottom: 24,
    imageUrl: "/images/curations/autumn-barrier.jpg",
  },
  {
    id: CURATION_BLOCK_IDS.products,
    type: "PRODUCTS" as const,
    spacingTop: 0,
    spacingBottom: 32,
    products: allProducts.slice(0, 4).map(curationProduct),
  },
  {
    id: CURATION_BLOCK_IDS.productsByFilter,
    type: "PRODUCTS_BY_FILTER" as const,
    spacingTop: 0,
    spacingBottom: 40,
    filters: [
      { id: CURATION_FILTER_IDS.toner, label: "토너" },
      { id: CURATION_FILTER_IDS.cream, label: "크림" },
    ],
    /* 앞의 둘은 토너, 뒤의 둘은 크림에 넣어 필터를 눌렀을 때 목록이 실제로 갈린다. */
    products: allProducts.slice(0, 4).map((product, index) => ({
      product: curationProduct(product),
      filterIds: [index < 2 ? CURATION_FILTER_IDS.toner : CURATION_FILTER_IDS.cream],
    })),
  },
];

/** 인기 제품은 목록 앞에서 잘라 쓴다. 목에는 조회수가 없어 순위를 만들 기준이 없다. */
const RANKING_SIZE = 6;

export const handlers = [
  http.post("*/api/products/:productId/views", () => new HttpResponse(null, { status: 204 })),

  http.get("*/api/curations", () => HttpResponse.json({ items: curations })),

  http.get("*/api/curations/:curationId", ({ params }) => {
    const curation = curations.find(({ id }) => id === Number(params.curationId));
    if (!curation) return notFound("큐레이션을 찾을 수 없습니다.", "CURATION_NOT_FOUND");

    return HttpResponse.json({
      id: curation.id,
      /* 실제 서버처럼 목록과 같은 제목을 줄바꿈까지 그대로 내려 준다. */
      title: curation.title,
      description: curation.description,
      blocks: curationBlocks,
    });
  }),

  http.get("*/api/skin-types", () => HttpResponse.json({ items: skinTypes })),

  http.get("*/api/search-keywords/rankings", () => HttpResponse.json({ items: searchKeywordRankings })),

  http.post("*/api/search-keywords", () => new HttpResponse(null, { status: 204 })),

  /*
   * 카테고리를 주면 목록이 달라지는 것만 보이면 되므로, 카테고리 ID 만큼 앞을 건너뛴다.
   * 목 제품에는 카테고리가 없어 실제로 걸러 낼 기준이 없다.
   */
  http.get("*/api/products/rankings", ({ request }) => {
    const [categoryId] = numbers(new URL(request.url), "categoryIds");
    const offset = categoryId ? categoryId % allProducts.length : 0;
    const ranked = [...allProducts.slice(offset), ...allProducts.slice(0, offset)].slice(0, RANKING_SIZE);

    return HttpResponse.json({
      items: ranked.map((product) => ({
        product: {
          id: product.id,
          name: product.name,
          brandName: product.brand.name,
          imageUrl: product.imageUrl,
          price: product.price,
          moistureLevel: product.moistureLevel,
          oilLevel: product.oilLevel,
        },
      })),
    });
  }),

  http.get("*/api/products", ({ request }) => {
    const url = new URL(request.url);
    const matched = sortProducts(filterProducts(url), url.searchParams.get("sort"));

    return HttpResponse.json({
      ...paginate(matched, url),
      ...(Number(url.searchParams.get("page") ?? 1) === 1 ? { filterOptions: filterOptions(url) } : {}),
      // 조건에 걸린 제품 전체의 브랜드다. 페이지가 아니라 matched 를 기준으로 한다.
      brands: matchedBrands(matched),
      // 카테고리도 같은 기준이다. 조건에 걸린 제품이 실제로 속한 것만 추린다.
      categories: matchedCategories(matched),
      // 피부 타입도 마찬가지다. 조건에 걸린 제품이 드는 타입만 중복 없이 담는다.
      skinTypes: matchedSkinTypes(matched),
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
      .filter((product) => matchesKeyword(keyword, product.name, product.brand.name))
      .map((product) => ({
        id: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        brandName: product.brand.name,
        match: suggestionMatch(keyword, [
          { field: "PRODUCT_NAME", text: product.name },
          { field: "BRAND_NAME", text: product.brand.name },
        ]),
      }));

    return HttpResponse.json(paginate(matched, url));
  }),

  http.get("*/api/products/:productId", ({ params }) => {
    const id = Number(params.productId);
    const detail = productDetails.find((product) => product.id === id);
    if (detail) return HttpResponse.json(detail);

    /*
     * 손으로 적은 상세는 몇 개뿐이라 나머지는 목록에 있는 정보로 상세를 세운다.
     * 목록에서 보이는 제품을 눌렀는데 없는 제품이라고 하면 목을 쓰는 동안
     * 화면을 확인할 수 없다.
     */
    const listed = allProducts.find((product) => product.id === id);
    if (!listed) return notFound("제품을 찾을 수 없습니다.", "PRODUCT_NOT_FOUND");

    return HttpResponse.json(detailOf(listed));
  }),

  http.get("*/api/storage", ({ request }) => {
    const url = new URL(request.url);
    const ids = numbers(url, "productIds");
    // 요청한 순서를 유지하고 존재하는 제품만 돌려준다.
    const items = ids
      .map((id) => allProducts.find((product) => product.id === id))
      .filter((product): product is (typeof allProducts)[number] => Boolean(product));

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
      .filter((ingredient) => matchesKeyword(keyword, ingredient.koreanName, ingredient.englishName))
      .slice(0, INGREDIENT_SEARCH_LIMIT)
      .map((ingredient) => ({
        ...ingredient,
        match: suggestionMatch(keyword, [
          { field: "KOREAN_NAME", text: ingredient.koreanName },
          { field: "ENGLISH_NAME", text: ingredient.englishName },
        ]),
      }));

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

  /*
   * 문의 접수. 실패 문구를 눈으로 확인할 수 있도록 특정 낱말로 오류를 부른다.
   * 목에서만 쓰는 장치이므로 실제 서버는 이런 규칙을 두지 않는다.
   */
  http.post("*/api/feedbacks", async ({ request }) => {
    const body = (await request.json()) as { content?: string };
    const forced = forcedError(body.content ?? "");
    if (forced) return forced;

    return new HttpResponse(null, { status: 204 });
  }),

  http.post("*/api/products/:productId/correction-requests", async ({ request }) => {
    const body = (await request.json()) as { content?: string };
    const forced = forcedError(body.content ?? "");
    if (forced) return forced;

    return new HttpResponse(null, { status: 204 });
  }),

  http.post("*/api/pending-images", async ({ request }) => {
    const form = await request.formData();
    const images = form.getAll("images").filter((value): value is File => value instanceof File);

    if (images.length === 0) return problem(400, "이미지를 찾을 수 없습니다.", "INVALID_FEEDBACK_IMAGE");
    if (images.length > MOCK_IMAGE_MAX_COUNT) {
      return problem(400, "이미지는 다섯 장까지 올릴 수 있습니다.", "INVALID_FEEDBACK_IMAGE");
    }

    const tooLarge = images.find((image) => image.size > MOCK_IMAGE_MAX_BYTES);
    if (tooLarge) return problem(413, "이미지 용량이 너무 큽니다.", "PAYLOAD_TOO_LARGE");

    const named = images.find((image) => image.name.includes(RATE_LIMIT_KEYWORD));
    if (named) return problem(429, "요청이 너무 잦습니다.", "TOO_MANY_REQUESTS");

    return HttpResponse.json({ imageIds: images.map(() => crypto.randomUUID()) }, { status: 201 });
  }),

  http.post("*/api/products/registration-requests", async ({ request }) => {
    const body = (await request.json()) as { productName?: string };
    const forced = forcedError(body.productName ?? "");
    if (forced) return forced;

    return new HttpResponse(null, { status: 202 });
  }),
];
