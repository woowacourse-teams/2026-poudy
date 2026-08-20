import type {
  BrandListItemResponse,
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

export const brands: BrandListItemResponse[] = [
  { id: 1, name: "라운드랩", englishName: "ROUND LAB", imageUrl: "", productCount: 48 },
  { id: 2, name: "토리든", englishName: "TORRIDEN", imageUrl: "", productCount: 21 },
  { id: 3, name: "아누아", englishName: "ANUA", imageUrl: "", productCount: 17 },
  { id: 4, name: "에스트라", englishName: "AESTURA", imageUrl: "", productCount: 12 },
  { id: 5, name: "닥터지", englishName: "Dr.G", imageUrl: "", productCount: 9 },
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
];

export const categories: CategoryResponse[] = [
  {
    id: 1,
    name: "스킨케어",
    productCount: 375,
    children: [
      { id: 11, name: "스킨/토너", productCount: 120 },
      { id: 12, name: "에센스/세럼", productCount: 98 },
      { id: 13, name: "로션/크림", productCount: 87 },
      { id: 14, name: "클렌징", productCount: 40 },
      { id: 15, name: "마스크팩", productCount: 30 },
    ],
  },
  {
    id: 2,
    name: "선케어",
    productCount: 64,
    children: [{ id: 21, name: "선크림", productCount: 64 }],
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

export const productDetails: ProductDetailResponse[] = [
  {
    id: 1,
    name: "1025 독도 토너",
    brand: brandOf(1),
    categories: [{ id: 1, name: "스킨케어", child: { id: 11, name: "스킨/토너" } }],
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
