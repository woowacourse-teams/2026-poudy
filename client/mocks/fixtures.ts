import { pipelineBrands, pipelineExcludeCodeIngredients, pipelineIngredients, pipelineProducts } from "./pipeline-data";

import type {
  BrandSummaryResponse,
  CategoryResponse,
  ExcludeCodeResponse,
  IngredientDetailResponse,
  ProductDetailResponse,
  ProductResponse,
} from "@poudy/api/api.zod";

/*
 * 값은 client/design/v1.pen 의 화면에 적힌 것을 그대로 옮겼다.
 * 목 데이터로 띄운 화면을 디자인과 바로 대조할 수 있게 하기 위함이다.
 *
 * 제품 그림은 디자인에 있는 것만 채운다. 비어 있으면 화면이 기본 공병 그림을 쓴다.
 */
const ROUNDLAB_TONER_IMAGE = "/images/products/roundlab-1025-toner.png";

export const brands: BrandSummaryResponse[] = [
  { id: 1, name: "라운드랩", englishName: "ROUND LAB", imageUrl: "", productCount: 48 },
  { id: 2, name: "토리든", englishName: "TORRIDEN", imageUrl: "", productCount: 21 },
  { id: 3, name: "아누아", englishName: "ANUA", imageUrl: "", productCount: 17 },
  { id: 4, name: "에스트라", englishName: "AESTURA", imageUrl: "", productCount: 12 },
  { id: 5, name: "닥터지", englishName: null, imageUrl: null, productCount: 9 },
];

const brandOf = (id: number) => {
  const found = brands.find((brand) => brand.id === id);
  if (!found) throw new Error(`알 수 없는 브랜드입니다: ${id}`);
  return {
    id: found.id,
    name: found.name,
    englishName: found.englishName,
    imageUrl: found.imageUrl,
  };
};

export const products: ProductResponse[] = [
  {
    id: 1,
    name: "1025 독도 토너",
    brand: brandOf(1),
    imageUrl: ROUNDLAB_TONER_IMAGE,
    price: 18000,
    volumeValue: 200,
    volumeUnit: "ml",
    moistureLevel: 2,
    oilLevel: 1,
  },
  {
    id: 2,
    name: "어성초 77 수딩 토너",
    brand: brandOf(3),
    imageUrl: "",
    price: 25000,
    volumeValue: 250,
    volumeUnit: "ml",
    moistureLevel: 2,
    oilLevel: 1,
  },
  {
    id: 3,
    name: "다이브인 저분자 히알루론산 토너",
    brand: brandOf(2),
    imageUrl: "",
    price: 23000,
    volumeValue: 300,
    volumeUnit: "ml",
    moistureLevel: 2,
    oilLevel: 1,
  },
  {
    id: 4,
    name: "다이브인 저분자 히알루론산 멀티 레이어 수분 진정 토너 대용량",
    brand: brandOf(2),
    imageUrl: "",
    price: 27000,
    volumeValue: 300,
    volumeUnit: "ml",
    moistureLevel: 2,
    oilLevel: 1,
  },
  {
    id: 5,
    name: "아토베리어365 크림",
    brand: brandOf(4),
    imageUrl: "",
    price: 28000,
    volumeValue: 80,
    volumeUnit: "ml",
    moistureLevel: 3,
    oilLevel: 2,
  },
  {
    id: 6,
    name: "가벼운 수분 앰플",
    brand: brandOf(2),
    imageUrl: "",
    price: 15000,
    volumeValue: 50,
    volumeUnit: "ml",
    moistureLevel: 3,
    oilLevel: 0,
  },
  {
    id: 7,
    name: "나이트 리페어 세럼",
    brand: brandOf(5),
    imageUrl: "",
    price: 42000,
    volumeValue: 30,
    volumeUnit: "ml",
    moistureLevel: 2,
    oilLevel: 3,
  },
  {
    id: 8,
    name: "다르 진정 클렌징 폼",
    brand: brandOf(1),
    imageUrl: "",
    price: 9800,
    volumeValue: 150,
    volumeUnit: "ml",
    moistureLevel: 1,
    oilLevel: 0,
  },
  {
    id: 9,
    name: "마일드 약산성 클렌저",
    brand: brandOf(3),
    imageUrl: "",
    price: 12500,
    volumeValue: 200,
    volumeUnit: "ml",
    moistureLevel: 1,
    oilLevel: 1,
  },
  {
    id: 10,
    name: "바하 모공 토너",
    brand: brandOf(1),
    imageUrl: "",
    price: 21000,
    volumeValue: 150,
    volumeUnit: "ml",
    moistureLevel: 1,
    oilLevel: 3,
  },
  {
    id: 11,
    name: "선 데일리 선크림",
    brand: brandOf(4),
    imageUrl: "",
    price: 19000,
    volumeValue: 50,
    volumeUnit: "ml",
    moistureLevel: 2,
    oilLevel: 2,
  },
  {
    id: 12,
    name: "저자극 수분 크림",
    brand: brandOf(5),
    imageUrl: "",
    price: 33000,
    volumeValue: 100,
    volumeUnit: "ml",
    moistureLevel: 3,
    oilLevel: 2,
  },
  {
    id: 13,
    name: "카밍 시카 밤",
    brand: brandOf(3),
    imageUrl: "",
    price: 26500,
    volumeValue: 40,
    volumeUnit: "ml",
    moistureLevel: 2,
    oilLevel: 3,
  },
  {
    id: 14,
    name: "판테놀 보습 로션",
    brand: brandOf(2),
    imageUrl: "",
    price: 16800,
    volumeValue: 120,
    volumeUnit: "ml",
    moistureLevel: 3,
    oilLevel: 1,
  },
  {
    id: 15,
    name: "하이드라 미스트",
    brand: brandOf(4),
    imageUrl: "",
    price: 11000,
    volumeValue: 100,
    volumeUnit: "ml",
    moistureLevel: 2,
    oilLevel: 0,
  },
];

/**
 * 카테고리. 이름과 ID 는 운영 데이터를 그대로 따른다.
 *
 * 파이프라인 제품이 들고 있는 `categoryId` 가 이 번호를 가리킨다. 목에서만 쓰는 번호를
 * 따로 두면 제품이 어느 카테고리에도 들지 못해, 조건을 걸어도 걸러지지 않는다.
 *
 * `productCount` 는 아래에서 실제 제품 수로 채운다. 손으로 적으면 제품을 늘리거나 줄일
 * 때마다 어긋난다.
 */
const CATEGORY_TREE: readonly {
  readonly id: number;
  readonly name: string;
  readonly children: readonly { readonly id: number; readonly name: string }[];
}[] = [
  {
    id: 1,
    name: "스킨케어",
    children: [
      { id: 2, name: "스킨/토너" },
      { id: 3, name: "에센스/세럼/앰플" },
      { id: 4, name: "크림" },
      { id: 5, name: "로션" },
    ],
  },
  {
    id: 6,
    name: "마스크팩",
    children: [
      { id: 7, name: "시트팩" },
      { id: 8, name: "패드" },
      { id: 9, name: "패치" },
    ],
  },
  {
    id: 10,
    name: "클렌징",
    children: [
      { id: 11, name: "클렌징폼/젤" },
      { id: 12, name: "오일/밤" },
    ],
  },
  {
    id: 13,
    name: "선케어",
    children: [
      { id: 14, name: "선크림" },
      { id: 15, name: "선스틱" },
    ],
  },
];

export const excludeCodes: ExcludeCodeResponse[] = [
  {
    code: "FRAGRANCE_ALLERGENS",
    name: "향료/알레르기 성분 제외",
    description: "착향 목적의 성분과 표시 대상 알레르기 유발 성분입니다.",
    ingredients: [
      { id: 101, koreanName: "리모넨", englishName: "Limonene" },
      { id: 102, koreanName: "리날룰", englishName: "Linalool" },
    ],
  },
  {
    code: "DRYING_ALCOHOLS",
    name: "건조 알코올 제외",
    description: "휘발성이 높아 건조함을 유발할 수 있는 알코올입니다.",
    ingredients: [{ id: 111, koreanName: "변성알코올", englishName: "Alcohol Denat." }],
  },
  {
    code: "HARSH_PRESERVATIVES",
    name: "자극성 방부제 제외",
    description: "자극 보고가 있는 방부 성분입니다.",
    ingredients: [{ id: 121, koreanName: "메틸파라벤", englishName: "Methylparaben" }],
  },
  {
    code: "SULFATES",
    name: "설페이트 성분 제외",
    description: "세정력이 강한 설페이트 계열 계면활성제입니다.",
    ingredients: [{ id: 131, koreanName: "소듐라우릴설페이트", englishName: "Sodium Lauryl Sulfate" }],
  },
  {
    code: "CYCLIC_SILICONES",
    name: "실리콘 자극원 제외",
    description: "고리형 실리콘 성분입니다.",
    ingredients: [{ id: 141, koreanName: "사이클로펜타실록세인", englishName: "Cyclopentasiloxane" }],
  },
  {
    code: "SYNTHETIC_COLORANTS",
    name: "합성 색소 제외",
    description: "타르 색소를 포함한 합성 착색 성분입니다.",
    ingredients: [{ id: 151, koreanName: "적색201호", englishName: "Red 201" }],
  },
];

const 보습 = { id: 1, code: "HYDRATION_RELATED", name: "보습" };
const 진정 = { id: 2, code: "SOOTHING_RELATED", name: "진정" };
const 각질케어 = { id: 3, code: "EXFOLIATION_RELATED", name: "각질 케어" };

const sunscreenIngredientNames = [
  "정제수",
  "징크옥사이드",
  "프로필헵틸카프릴레이트",
  "C12-15알킬벤조에이트",
  "부틸렌글라이콜",
] as const;

export const untaggedProductDetail: ProductDetailResponse = {
  id: 6,
  name: "더마 릴리프 썬스크린",
  brand: { id: 6, name: "셀퓨전씨", englishName: "Cell Fusion C", imageUrl: "" },
  categories: [{ id: 13, name: "선케어", child: { id: 14, name: "선크림" } }],
  imageUrl: "",
  variants: [{ id: 6, price: 39000, volumeValue: 50, volumeUnit: "ml", status: "SALE" }],
  moistureLevel: 1,
  oilLevel: 2,
  skinEffectGroups: [],
  ingredients: Array.from({ length: 24 }, (_, index) => ({
    id: 1001 + index,
    koreanName: sunscreenIngredientNames[index] ?? `성분 ${index + 1}`,
    englishName: `Ingredient ${index + 1}`,
    formulationRoles: [],
    skinEffects: [],
  })),
  freeOfCodes: ["DRYING_ALCOHOLS", "HARSH_PRESERVATIVES", "SULFATES", "CYCLIC_SILICONES", "SYNTHETIC_COLORANTS"],
  updatedAt: "2026-08-20T00:00:00+09:00",
};

export const productDetails: ProductDetailResponse[] = [
  {
    id: 1,
    name: "1025 독도 토너",
    brand: brandOf(1),
    categories: [{ id: 1, name: "스킨케어", child: { id: 2, name: "스킨/토너" } }],
    imageUrl: ROUNDLAB_TONER_IMAGE,
    variants: [
      { id: 1, price: 18000, volumeValue: 200, volumeUnit: "ml", status: "SALE" },
      { id: 2, price: 32000, volumeValue: 500, volumeUnit: "ml", status: "SALE" },
    ],
    moistureLevel: 3,
    oilLevel: 1,
    skinEffectGroups: [
      { id: 1, code: "HYDRATION_RELATED", name: "보습", ingredientIds: [2, 6] },
      { id: 2, code: "SOOTHING_RELATED", name: "진정", ingredientIds: [7, 6] },
      { id: 3, code: "EXFOLIATION_RELATED", name: "각질 케어", ingredientIds: [8] },
    ],
    ingredients: [
      {
        id: 1,
        koreanName: "정제수",
        englishName: "Water",
        formulationRoles: [
          { id: 1, code: "SKIN_CONDITIONING", name: "피부 컨디셔닝" },
          { id: 2, code: "SOLVENT", name: "용제" },
        ],
        skinEffects: [],
      },
      {
        id: 2,
        koreanName: "부틸렌글라이콜",
        englishName: "Butylene Glycol",
        formulationRoles: [
          { id: 3, code: "MOISTURISING", name: "보습제" },
          { id: 2, code: "SOLVENT", name: "용제" },
        ],
        skinEffects: [보습],
      },
      {
        id: 3,
        koreanName: "글리세린",
        englishName: "Glycerin",
        formulationRoles: [{ id: 3, code: "MOISTURISING", name: "보습제" }],
        skinEffects: [보습],
      },
      {
        id: 4,
        koreanName: "펜틸렌글라이콜",
        englishName: "Pentylene Glycol",
        formulationRoles: [
          { id: 1, code: "SKIN_CONDITIONING", name: "피부 컨디셔닝" },
          { id: 2, code: "SOLVENT", name: "용제" },
        ],
        skinEffects: [보습],
      },
      {
        id: 5,
        koreanName: "프로판다이올",
        englishName: "Propanediol",
        formulationRoles: [
          { id: 2, code: "SOLVENT", name: "용제" },
          { id: 4, code: "HUMECTANT", name: "보습 보조" },
        ],
        skinEffects: [보습],
      },
      {
        id: 6,
        koreanName: "판테놀",
        englishName: "Panthenol",
        formulationRoles: [{ id: 1, code: "SKIN_CONDITIONING", name: "피부 컨디셔닝" }],
        skinEffects: [보습, 진정],
      },
      {
        id: 7,
        koreanName: "아이리쉬모스추출물",
        englishName: "Chondrus Crispus Extract",
        formulationRoles: [{ id: 1, code: "SKIN_CONDITIONING", name: "피부 컨디셔닝" }],
        skinEffects: [진정],
      },
      {
        id: 8,
        koreanName: "프로테아제",
        englishName: "Protease",
        formulationRoles: [{ id: 5, code: "KERATOLYTIC", name: "각질 관리" }],
        skinEffects: [각질케어],
      },
    ],
    freeOfCodes: [
      "FRAGRANCE_ALLERGENS",
      "DRYING_ALCOHOLS",
      "HARSH_PRESERVATIVES",
      "SULFATES",
      "CYCLIC_SILICONES",
      "SYNTHETIC_COLORANTS",
    ],
    updatedAt: "2026-08-12T00:00:00+09:00",
  },
  untaggedProductDetail,
];

/** S06 화면의 출처 문구. 성분마다 같은 자료를 본다. */
const 성분정보출처 = ["식약처 화장품 성분사전", "EU CosIng"];
const 성분효과출처 = ["PubMed", "Cosmetic Ingredient Review (CIR)"];

export const ingredientDetails: IngredientDetailResponse[] = [
  {
    id: 1,
    koreanName: "정제수",
    englishName: "Water",
    description: "화장품의 기본 용매로, 다른 성분을 녹여 제형을 만드는 데 쓰입니다.",
    formulationRoles: [
      { id: 1, code: "SKIN_CONDITIONING", name: "피부 컨디셔닝" },
      { id: 2, code: "SOLVENT", name: "용제" },
    ],
    skinEffects: [],
    groupCodes: [],
    productCount: 1420,
    infoSources: 성분정보출처,
    effectSources: 성분효과출처,
    updatedAt: "2026-08-03T00:00:00+09:00",
  },
  {
    id: 2,
    koreanName: "부틸렌글라이콜",
    englishName: "Butylene Glycol",
    description: "수분을 끌어당기는 보습제이자 다른 성분을 녹이는 용제로 함께 쓰입니다.",
    formulationRoles: [
      { id: 3, code: "MOISTURISING", name: "보습제" },
      { id: 2, code: "SOLVENT", name: "용제" },
    ],
    skinEffects: [보습],
    groupCodes: [],
    productCount: 612,
    infoSources: 성분정보출처,
    effectSources: 성분효과출처,
    updatedAt: "2026-08-03T00:00:00+09:00",
  },
  {
    id: 3,
    koreanName: "글리세린",
    englishName: "Glycerin",
    description: "공기 중 수분을 끌어와 각질층에 붙잡아 두는 대표적인 보습 성분입니다.",
    formulationRoles: [{ id: 3, code: "MOISTURISING", name: "보습제" }],
    skinEffects: [보습],
    groupCodes: [],
    productCount: 984,
    infoSources: 성분정보출처,
    effectSources: 성분효과출처,
    updatedAt: "2026-08-03T00:00:00+09:00",
  },
  {
    id: 4,
    koreanName: "펜틸렌글라이콜",
    englishName: "Pentylene Glycol",
    description: "피부를 매끄럽게 정돈하는 용제로, 제형의 사용감을 가볍게 만드는 데 쓰입니다.",
    formulationRoles: [
      { id: 1, code: "SKIN_CONDITIONING", name: "피부 컨디셔닝" },
      { id: 2, code: "SOLVENT", name: "용제" },
    ],
    skinEffects: [보습],
    groupCodes: [],
    productCount: 356,
    infoSources: 성분정보출처,
    effectSources: 성분효과출처,
    updatedAt: "2026-08-03T00:00:00+09:00",
  },
  {
    id: 5,
    koreanName: "프로판다이올",
    englishName: "Propanediol",
    description: "옥수수 유래 용제로, 보습 성분이 피부에 잘 퍼지도록 돕는 역할을 합니다.",
    formulationRoles: [
      { id: 2, code: "SOLVENT", name: "용제" },
      { id: 4, code: "HUMECTANT", name: "보습 보조" },
    ],
    skinEffects: [보습],
    groupCodes: [],
    productCount: 274,
    infoSources: 성분정보출처,
    effectSources: 성분효과출처,
    updatedAt: "2026-08-03T00:00:00+09:00",
  },
  {
    id: 6,
    koreanName: "판테놀",
    englishName: "Panthenol",
    description:
      "수분 손실을 줄이는 보습 성분으로 활용되며, 피부 장벽이 건조하거나 예민해졌을 때 편안한 사용감을 더해요.",
    formulationRoles: [{ id: 1, code: "SKIN_CONDITIONING", name: "피부 컨디셔닝" }],
    skinEffects: [보습, 진정],
    groupCodes: [],
    productCount: 128,
    infoSources: 성분정보출처,
    effectSources: 성분효과출처,
    updatedAt: "2026-08-03T00:00:00+09:00",
  },
  {
    id: 7,
    koreanName: "아이리쉬모스추출물",
    englishName: "Chondrus Crispus Extract",
    description: "홍조류에서 얻은 추출물로, 피부를 부드럽게 정돈하는 데 쓰입니다.",
    formulationRoles: [{ id: 1, code: "SKIN_CONDITIONING", name: "피부 컨디셔닝" }],
    skinEffects: [진정],
    groupCodes: [],
    productCount: 63,
    infoSources: 성분정보출처,
    effectSources: 성분효과출처,
    updatedAt: "2026-08-03T00:00:00+09:00",
  },
  {
    id: 8,
    koreanName: "프로테아제",
    englishName: "Protease",
    description: "단백질을 분해하는 효소로, 쌓인 각질을 부드럽게 정돈하는 데 쓰입니다.",
    formulationRoles: [{ id: 5, code: "KERATOLYTIC", name: "각질 관리" }],
    skinEffects: [각질케어],
    groupCodes: [],
    productCount: 37,
    infoSources: 성분정보출처,
    effectSources: 성분효과출처,
    updatedAt: "2026-08-03T00:00:00+09:00",
  },
  {
    id: 9,
    koreanName: "판토텐산",
    englishName: "Pantothenic Acid",
    description: "비타민 B5 로도 불리며 피부 장벽을 돕는 성분으로 알려져 있습니다.",
    formulationRoles: [{ id: 1, code: "SKIN_CONDITIONING", name: "피부 컨디셔닝" }],
    skinEffects: [보습],
    groupCodes: [],
    productCount: 42,
    infoSources: 성분정보출처,
    effectSources: 성분효과출처,
    updatedAt: "2026-08-03T00:00:00+09:00",
  },
];

/*
 * 여기서부터는 poudy-data-pipeline 에서 옮긴 실제 데이터다.
 *
 * 위의 목 데이터는 디자인과 화면을 대조하려고 손으로 적은 것이라 다섯 개뿐이다.
 * 조건을 걸 때 개수가 실제로 움직이는지 보려면 데이터가 더 있어야 해서 함께 싣는다.
 *
 * 손으로 적은 제품과 ID 가 겹치지 않게 PIPELINE_ID_OFFSET 을 더한다.
 */
const PIPELINE_ID_OFFSET = 1000;

const pipelineBrandById = new Map(pipelineBrands.map((brand) => [brand.id, brand]));

/** 파이프라인 제품이 쓰는 성분 ID. 빠른 필터가 실제로 걸리는지 이 값으로 가른다. */
export const pipelineProductIngredients = new Map(
  pipelineProducts.map((product) => [product.id + PIPELINE_ID_OFFSET, new Set<number>(product.ingredientIds)]),
);

/** 제외 코드가 걸러 내는 성분 ID. */
export const excludeCodeIngredientIds = new Map(
  pipelineExcludeCodeIngredients.map((code) => [code.code, new Set<number>(code.ingredientIds)]),
);

const pipelineBrandOf = (id: number) => {
  const found = pipelineBrandById.get(id);
  return {
    id: (found?.id ?? 0) + PIPELINE_ID_OFFSET,
    name: found?.name ?? "알 수 없는 브랜드",
    englishName: found?.englishName ?? "",
    imageUrl: "",
  };
};

const pipelineProductList: ProductResponse[] = pipelineProducts.map((product) => ({
  id: product.id + PIPELINE_ID_OFFSET,
  name: product.name,
  brand: pipelineBrandOf(product.brandId),
  imageUrl: "",
  price: product.price,
  volumeValue: product.volumeValue,
  volumeUnit: product.volumeUnit,
  moistureLevel: product.moistureLevel,
  oilLevel: product.oilLevel,
}));

/**
 * 소분류마다 최소한 이만큼은 있게 채운다.
 *
 * 파이프라인에서 온 제품은 소분류마다 치우쳐 있다. 어떤 곳은 쉰 개가 넘고 어떤 곳은 한
 * 개뿐이라, 목으로 화면을 볼 때 카테고리를 골라도 볼 것이 없다. 모자란 만큼만 지어내
 * 어느 소분류를 골라도 목록과 페이지 넘김을 확인할 수 있게 한다.
 */
const CATEGORY_FLOOR = 50;

/** 지어낸 제품에 줄 ID. 파이프라인 것과 겹치지 않도록 한참 뒤에서 시작한다. */
const FILLER_ID_OFFSET = 100000;

/**
 * 모자란 소분류를 채울 제품.
 *
 * 값은 브랜드와 가격, 유수분을 돌려 가며 고른다. 한 소분류 안이 전부 같은 값이면 정렬이나
 * 유수분 조건을 걸었을 때 목록이 움직이지 않아, 화면을 확인하는 데 도움이 되지 않는다.
 */
/**
 * 채워 넣을 제품에 붙일 브랜드.
 *
 * 제품이 딸린 파이프라인 브랜드에서 고른다. 아무도 팔지 않는 브랜드가 목록에 끼면 어긋난다.
 * ID 는 `allBrands` 에서 자리를 옮겨 담는 규칙을 그대로 따라 미리 더해 둔다.
 *
 * 파이프라인 데이터는 원본이 기밀이라 저장소에 빈 파일로 두고 각자 로컬에서 채운다. 그래서
 * CI 처럼 비어 있는 곳에서는 고를 브랜드가 하나도 없어, 손으로 적은 브랜드로 물러선다.
 * 이 대비가 없으면 픽스처를 읽는 것만으로 무너져 테스트가 한 건도 돌지 않는다.
 */
const fillerBrandPool: readonly { readonly id: number; readonly name: string; readonly englishName: string | null }[] =
  pipelineBrands.length > 0
    ? pipelineBrands
        .filter((brand) => brand.productCount > 0)
        .map((brand) => ({ id: brand.id + PIPELINE_ID_OFFSET, name: brand.name, englishName: brand.englishName }))
    : brands.map((brand) => ({ id: brand.id, name: brand.name, englishName: brand.englishName }));

const fillerProducts: { readonly product: ProductResponse; readonly categoryId: number }[] = CATEGORY_TREE.flatMap(
  (category) =>
    category.children.flatMap((child) => {
      const have = [...pipelineProducts].filter((product) => product.categoryId === child.id).length;

      return Array.from({ length: Math.max(0, CATEGORY_FLOOR - have) }, (_, index) => {
        const seed = child.id * 100 + index;
        const brand = fillerBrandPool[seed % fillerBrandPool.length];

        return {
          categoryId: child.id,
          product: {
            id: FILLER_ID_OFFSET + seed,
            name: `${child.name} 샘플 ${index + 1}`,
            brand: {
              id: brand.id,
              name: brand.name,
              englishName: brand.englishName ?? "",
              imageUrl: "",
            },
            imageUrl: "",
            price: 12000 + (seed % 9) * 2500,
            volumeValue: [30, 50, 100, 150, 200, 300][seed % 6],
            volumeUnit: "ml",
            moistureLevel: seed % 4,
            oilLevel: (seed + 2) % 4,
          },
        };
      });
    }),
);

/** 손으로 적은 다섯 개 뒤에 파이프라인 제품과 채운 제품을 잇는다. */
export const allProducts: ProductResponse[] = [
  ...products,
  ...pipelineProductList,
  ...fillerProducts.map(({ product }) => product),
];

/**
 * 제품이 어느 소분류에 드는지.
 *
 * `ProductResponse` 에는 카테고리가 없어 목록 응답만 보아서는 알 수 없다. 조건에 걸린
 * 제품의 카테고리만 추려 내려면 이 지도가 있어야 한다. 제품은 모두 여기에 들어온다.
 * 하나라도 빠지면 그 제품만 걸리는 조건에서 카테고리 시트가 비어서 열린다.
 */
/**
 * 손으로 적은 제품이 드는 소분류. 이름을 보고 실제 소분류에 맞춘다.
 *
 * 파이프라인에서 오지 않아 카테고리가 붙지 않던 것들이다. 비워 두면 검색이 이 제품만
 * 집었을 때 카테고리 시트가 텅 빈 채로 열린다. `독도` 처럼 이름이 또렷한 제품을 찾을 때
 * 실제로 그런 일이 생겼다.
 */
const HAND_WRITTEN_CATEGORY_IDS: ReadonlyMap<number, number> = new Map([
  [1, 2], // 1025 독도 토너 → 스킨/토너
  [2, 2], // 어성초 77 수딩 토너 → 스킨/토너
  [3, 2], // 다이브인 저분자 히알루론산 토너 → 스킨/토너
  [4, 2], // 다이브인 저분자 히알루론산 멀티 레이어 수분 진정 토너 대용량 → 스킨/토너
  [5, 4], // 아토베리어365 크림 → 크림
  [6, 3], // 가벼운 수분 앰플 → 에센스/세럼/앰플
  [7, 3], // 나이트 리페어 세럼 → 에센스/세럼/앰플
  [8, 11], // 다르 진정 클렌징 폼 → 클렌징폼/젤
  [9, 11], // 마일드 약산성 클렌저 → 클렌징폼/젤
  [10, 2], // 바하 모공 토너 → 스킨/토너
  [11, 14], // 선 데일리 선크림 → 선크림
  [12, 4], // 저자극 수분 크림 → 크림
  [13, 12], // 카밍 시카 밤 → 오일/밤
  [14, 5], // 판테놀 보습 로션 → 로션
  [15, 2], // 하이드라 미스트 → 스킨/토너
]);

export const productCategoryIds: ReadonlyMap<number, number> = new Map([
  ...HAND_WRITTEN_CATEGORY_IDS,
  ...pipelineProducts
    .filter((product) => product.categoryId !== null)
    .map((product) => [product.id + PIPELINE_ID_OFFSET, product.categoryId as number] as const),
  ...fillerProducts.map(({ product, categoryId }) => [product.id, categoryId] as const),
]);

/** 피부 타입 코드. 서버가 늘어놓는 차례와 같게 두어 응답을 만들 때 그대로 쓴다. */
export const SKIN_TYPE_CODES = ["DRY", "OILY", "SENSITIVE", "COMBINATION"] as const;

export type SkinTypeCode = (typeof SKIN_TYPE_CODES)[number];

/**
 * 제품이 어느 피부 타입에 드는지.
 *
 * 한 제품이 여러 타입에 든다. 서버의 `Product` 도 `Set<SkinType>` 을 들고 있고, 조건은
 * 그 집합에 드는지로 가른다. 그래서 하나만 짝지어 두면 실제와 어긋난다.
 *
 * 값은 파이프라인에 없어서 목에서 정해 둔다. 유수분 값에서 계산하지는 않는다. 계산하면
 * 제품과 어긋나는 값이 나오고, 서버도 그런 방식을 쓰지 않는다.
 */
/**
 * 손으로 적은 제품이 드는 피부 타입.
 *
 * 카테고리와 같이 제품마다 적어 둔다. 유수분 값에서 계산하면 `독도 토너` 가 건성이면서
 * 지성으로 잡히는 것처럼 제품과 어긋나는 값이 나온다. 서버도 제품마다 붙은 집합을 쓰지
 * 유수분에서 끌어내지 않는다.
 */
const HAND_WRITTEN_SKIN_TYPES: ReadonlyMap<number, readonly SkinTypeCode[]> = new Map([
  [1, ["DRY", "SENSITIVE"]], // 1025 독도 토너: 순한 데일리 토너
  [2, ["SENSITIVE"]], // 어성초 77 수딩 토너: 진정
  [3, ["DRY"]], // 다이브인 저분자 히알루론산 토너: 보습
  [4, ["DRY"]], // 다이브인 히알루론산 대용량: 보습
  [5, ["DRY", "SENSITIVE"]], // 아토베리어365 크림: 장벽
  [6, ["DRY", "COMBINATION"]], // 가벼운 수분 앰플
  [7, ["DRY"]], // 나이트 리페어 세럼
  [8, ["OILY", "COMBINATION"]], // 다르 진정 클렌징 폼
  [9, ["SENSITIVE"]], // 마일드 약산성 클렌저
  [10, ["OILY", "COMBINATION"]], // 바하 모공 토너: 각질과 피지
  [11, []], // 선 데일리 선크림: 타입을 가리지 않는다
  [12, ["DRY", "SENSITIVE"]], // 저자극 수분 크림
  [13, ["SENSITIVE"]], // 카밍 시카 밤
  [14, ["DRY"]], // 판테놀 보습 로션
  [15, ["DRY", "OILY"]], // 하이드라 미스트: 수분만 더한다
]);

/**
 * 파이프라인과 채워 넣은 제품이 드는 피부 타입.
 *
 * 이쪽은 수가 많아 하나씩 적을 수 없다. 제품 ID 로 갈라 고르되, 한 타입에만 드는 것과
 * 여럿에 드는 것, 어디에도 들지 않는 것이 고루 나오도록 미리 정해 둔 조합에서 집는다.
 * 어느 제품이 어느 조합을 받는지에는 뜻이 없고, 조건을 걸면 목록이 줄어드는지만 본다.
 */
const SKIN_TYPE_COMBINATIONS: readonly (readonly SkinTypeCode[])[] = [
  ["DRY"],
  ["OILY"],
  ["SENSITIVE"],
  ["COMBINATION"],
  ["DRY", "SENSITIVE"],
  ["OILY", "COMBINATION"],
  ["DRY", "COMBINATION"],
  ["OILY", "SENSITIVE"],
  ["DRY", "OILY", "SENSITIVE"],
  [],
];

/**
 * 제품마다 딸린 피부 타입.
 *
 * `ProductResponse` 에는 피부 타입이 없어 목록 응답만 보아서는 알 수 없다. 카테고리와
 * 마찬가지로 이 지도가 있어야 조건에 걸린 제품의 타입을 추려 낼 수 있다.
 */
export const productSkinTypes: ReadonlyMap<number, readonly SkinTypeCode[]> = new Map(
  allProducts.map(
    (product) =>
      [
        product.id,
        HAND_WRITTEN_SKIN_TYPES.get(product.id) ?? SKIN_TYPE_COMBINATIONS[product.id % SKIN_TYPE_COMBINATIONS.length],
      ] as const,
  ),
);

/** 소분류마다 실제로 몇 개가 드는지. 제품이 늘고 줄어도 손댈 곳이 없게 여기서 센다. */
const categoryProductCounts = (() => {
  const counts = new Map<number, number>();
  for (const categoryId of productCategoryIds.values()) {
    counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
  }
  return counts;
})();

/** 대분류의 수는 딸린 소분류를 더한 값이다. 서버도 같은 방식으로 센다. */
export const categories: CategoryResponse[] = CATEGORY_TREE.map((category) => {
  const children = category.children.map((child) => ({
    ...child,
    productCount: categoryProductCounts.get(child.id) ?? 0,
  }));

  return {
    id: category.id,
    name: category.name,
    children,
    productCount: children.reduce((sum, child) => sum + child.productCount, 0),
  };
});

/** 브랜드마다 실제로 몇 개가 딸렸는지. 카테고리와 같이 제품에서 센다. */
const brandProductCounts = (() => {
  const counts = new Map<number, number>();
  for (const product of allProducts) {
    counts.set(product.brand.id, (counts.get(product.brand.id) ?? 0) + 1);
  }
  return counts;
})();

/**
 * 브랜드 목록.
 *
 * `productCount` 를 손으로 적으면 제품을 늘리거나 줄일 때마다 어긋난다. 브랜드 디렉터리는
 * 이 수를 그대로 보여 주므로, 실제로 딸린 제품에서 세어 화면과 목록이 따로 놀지 않게 한다.
 * 제품이 하나도 없는 브랜드는 고를 것이 없으므로 아예 빼 둔다.
 */
export const allBrands: BrandSummaryResponse[] = [
  ...brands,
  ...pipelineBrands.map((brand) => ({
    id: brand.id + PIPELINE_ID_OFFSET,
    name: brand.name,
    englishName: brand.englishName,
    imageUrl: "",
    productCount: 0,
  })),
]
  .map((brand) => ({ ...brand, productCount: brandProductCounts.get(brand.id) ?? 0 }))
  .filter((brand) => brand.productCount > 0);

/** 자동완성과 조건 칩에 쓸 성분 이름. 상세는 ingredientDetails 가 맡는다. */
export const pipelineIngredientSummaries = pipelineIngredients.map((ingredient) => ({
  id: ingredient.id,
  koreanName: ingredient.koreanName,
  englishName: ingredient.englishName,
  skinEffects: [] as { id: number; code: string; name: string }[],
}));
