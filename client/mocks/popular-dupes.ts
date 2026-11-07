import type { PopularDupe, PopularDupeProduct } from "@/lib/domain/popular-dupes";

// 2026-11-06 운영 API의 실제 유사제품 관계에서 선정했다.
// 같은 카테고리의 판매 중인 제품이며, 총가격과 단위 가격이 모두 낮다.
// 가격·용량·구성품·이미지를 검증했고 절약률은 같은 조합의 서버 계산값과 대조했다.
// 조회수 기준 정렬은 #1037의 후속 서버 작업에서 연결한다.
const BEPLAIN_CICATEROL_CREAM = {
  id: 135,
  partId: 113,
  name: "시카테롤 캡슐 베리어 크림",
  brandName: "비플레인",
  imageUrl:
    "https://techcourse-project-2026.s3.ap-northeast-2.amazonaws.com/poudy/images/products/%E1%84%87%E1%85%B5%E1%84%91%E1%85%B3%E1%86%AF%E1%84%85%E1%85%A6%E1%84%8B%E1%85%B5%E1%86%AB_%E1%84%89%E1%85%B5%E1%84%8F%E1%85%A1%E1%84%90%E1%85%A6%E1%84%85%E1%85%A9%E1%86%AF%20%E1%84%8F%E1%85%A2%E1%86%B8%E1%84%89%E1%85%B2%E1%86%AF%20%E1%84%87%E1%85%A6%E1%84%85%E1%85%B5%E1%84%8B%E1%85%A5%20%E1%84%8F%E1%85%B3%E1%84%85%E1%85%B5%E1%86%B7.webp",
  volumeUnit: "ml",
  unitPrice: 640,
} satisfies PopularDupeProduct;

const SKIN1004_TEA_TRICA_CREAM = {
  id: 1116,
  partId: 1016,
  name: "마다가스카르 센텔라 티트리카 B5 크림",
  brandName: "스킨1004",
  imageUrl:
    "https://techcourse-project-2026.s3.ap-northeast-2.amazonaws.com/poudy/images/products/%EC%8A%A4%ED%82%A81004_%EB%A7%88%EB%8B%A4%EA%B0%80%EC%8A%A4%EC%B9%B4%EB%A5%B4%20%EC%84%BC%ED%85%94%EB%9D%BC%20%ED%8B%B0%ED%8A%B8%EB%A6%AC%EC%B9%B4%20B5%20%ED%81%AC%EB%A6%BC.webp",
  volumeUnit: "ml",
  unitPrice: 347,
} satisfies PopularDupeProduct;

const ZEROID_DAILY_SUNSCREEN = {
  id: 35,
  partId: 25,
  name: "데일리 선크림 SPF50+ PA++++",
  brandName: "제로이드",
  imageUrl:
    "https://techcourse-project-2026.s3.ap-northeast-2.amazonaws.com/poudy/images/products/%E1%84%8C%E1%85%A6%E1%84%85%E1%85%A9%E1%84%8B%E1%85%B5%E1%84%83%E1%85%B3_%E1%84%83%E1%85%A6%E1%84%8B%E1%85%B5%E1%86%AF%E1%84%85%E1%85%B5%20%E1%84%89%E1%85%A5%E1%86%AB%E1%84%8F%E1%85%B3%E1%84%85%E1%85%B5%E1%86%B7%20SPF50%2B%20PA%2B%2B%2B%2B.webp",
  volumeUnit: "ml",
  unitPrice: 640,
} satisfies PopularDupeProduct;

const SIDMOOL_MINERAL_SUNSCREEN = {
  id: 1671,
  partId: 1572,
  name: "덕만이 무기자차 썬크림 SPF50+ PA++++",
  brandName: "시드물",
  imageUrl:
    "https://techcourse-project-2026.s3.ap-northeast-2.amazonaws.com/poudy/images/products/sidmool/0d1c0b6d1035e751cd84f4de7bb48d03083b5319d66c4c71927a2eeec5835902.webp",
  volumeUnit: "ml",
  unitPrice: 367,
} satisfies PopularDupeProduct;

const ABIB_HEARTLEAF_SERUM = {
  id: 182,
  partId: 153,
  name: "어성초 테카 캡슐 세럼 카밍 드롭",
  brandName: "아비브",
  imageUrl:
    "https://techcourse-project-2026.s3.ap-northeast-2.amazonaws.com/poudy/images/products/%E1%84%8B%E1%85%A1%E1%84%87%E1%85%B5%E1%84%87%E1%85%B3_%E1%84%8B%E1%85%A5%E1%84%89%E1%85%A5%E1%86%BC%E1%84%8E%E1%85%A9%20%E1%84%90%E1%85%A6%E1%84%8F%E1%85%A1%20%E1%84%8F%E1%85%A2%E1%86%B8%E1%84%89%E1%85%B2%E1%86%AF%20%E1%84%89%E1%85%A6%E1%84%85%E1%85%A5%E1%86%B7%20%E1%84%8F%E1%85%A1%E1%84%86%E1%85%B5%E1%86%BC%20%E1%84%83%E1%85%B3%E1%84%85%E1%85%A9%E1%86%B8.webp",
  volumeUnit: "ml",
  unitPrice: 640,
} satisfies PopularDupeProduct;

const SIDMOOL_CICA_PATCH = {
  id: 1486,
  partId: 1387,
  name: "시카 물 패치",
  brandName: "시드물",
  imageUrl:
    "https://techcourse-project-2026.s3.ap-northeast-2.amazonaws.com/poudy/images/products/sidmool/57d745894d8e5fc4ff264451f0169a31b84b7c055c36dac4c0c0a0b7b095f14e.webp",
  volumeUnit: "ml",
  unitPrice: 480,
} satisfies PopularDupeProduct;

export const MOCK_POPULAR_DUPES: readonly PopularDupe[] = [
  { source: BEPLAIN_CICATEROL_CREAM, alternative: SKIN1004_TEA_TRICA_CREAM, savingPercent: 45.83 },
  { source: ZEROID_DAILY_SUNSCREEN, alternative: SIDMOOL_MINERAL_SUNSCREEN, savingPercent: 42.71 },
  { source: ABIB_HEARTLEAF_SERUM, alternative: SIDMOOL_CICA_PATCH, savingPercent: 25.0 },
];
