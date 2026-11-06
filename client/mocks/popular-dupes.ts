import type { PopularDupe, PopularDupeProduct } from "@/lib/domain/popular-dupes";

// 2026-11-06 운영 공개 API에서 확인한 제품·구성품·대표 단가와 실제 유사템 관계.
// 조회수 집계가 연결되기 전까지 보여 주는 예시 조합이며, 목록 순서는 인기 순위가 아니다.
const ZEROID_RED_CONTROL_CREAM = {
  id: 37,
  partId: 27,
  name: "핌프로브 레드 컨트롤 크림",
  brandName: "제로이드",
  imageUrl:
    "https://techcourse-project-2026.s3.ap-northeast-2.amazonaws.com/poudy/images/products/%E1%84%8C%E1%85%A6%E1%84%85%E1%85%A9%E1%84%8B%E1%85%B5%E1%84%83%E1%85%B3_%E1%84%91%E1%85%B5%E1%86%B7%E1%84%91%E1%85%B3%E1%84%85%E1%85%A9%E1%84%87%E1%85%B3%20%E1%84%85%E1%85%A6%E1%84%83%E1%85%B3%20%E1%84%8F%E1%85%A5%E1%86%AB%E1%84%90%E1%85%B3%E1%84%85%E1%85%A9%E1%86%AF%20%E1%84%8F%E1%85%B3%E1%84%85%E1%85%B5%E1%86%B7.webp",
  volumeUnit: "ml",
  unitPrice: 413,
} satisfies PopularDupeProduct;

const ZEROID_SOOTHING_CREAM = {
  id: 44,
  partId: 34,
  name: "수딩 크림",
  brandName: "제로이드",
  imageUrl:
    "https://techcourse-project-2026.s3.ap-northeast-2.amazonaws.com/poudy/images/products/%E1%84%8C%E1%85%A6%E1%84%85%E1%85%A9%E1%84%8B%E1%85%B5%E1%84%83%E1%85%B3_%E1%84%89%E1%85%AE%E1%84%83%E1%85%B5%E1%86%BC%20%E1%84%8F%E1%85%B3%E1%84%85%E1%85%B5%E1%86%B7.webp",
  volumeUnit: "ml",
  unitPrice: 375,
} satisfies PopularDupeProduct;

const ZEROID_INTENSIVE_CREAM = {
  id: 43,
  partId: 33,
  name: "인텐시브 크림",
  brandName: "제로이드",
  imageUrl:
    "https://techcourse-project-2026.s3.ap-northeast-2.amazonaws.com/poudy/images/products/%E1%84%8C%E1%85%A6%E1%84%85%E1%85%A9%E1%84%8B%E1%85%B5%E1%84%83%E1%85%B3_%E1%84%8B%E1%85%B5%E1%86%AB%E1%84%90%E1%85%A6%E1%86%AB%E1%84%89%E1%85%B5%E1%84%87%E1%85%B3%20%E1%84%8F%E1%85%B3%E1%84%85%E1%85%B5%E1%86%B7.webp",
  volumeUnit: "ml",
  unitPrice: 400,
} satisfies PopularDupeProduct;

const BIODERMA_SENSIBIO_TONER = {
  id: 48,
  partId: 38,
  name: "센시비오 토너",
  brandName: "바이오더마",
  imageUrl:
    "https://techcourse-project-2026.s3.ap-northeast-2.amazonaws.com/poudy/images/products/%E1%84%87%E1%85%A1%E1%84%8B%E1%85%B5%E1%84%8B%E1%85%A9%E1%84%83%E1%85%A5%E1%84%86%E1%85%A1_%E1%84%89%E1%85%A6%E1%86%AB%E1%84%89%E1%85%B5%E1%84%87%E1%85%B5%E1%84%8B%E1%85%A9%20%E1%84%90%E1%85%A9%E1%84%82%E1%85%A5.webp",
  volumeUnit: "ml",
  unitPrice: 118,
} satisfies PopularDupeProduct;

const BIODERMA_HYDRABIO_TONER = {
  id: 46,
  partId: 36,
  name: "하이드라비오 토너",
  brandName: "바이오더마",
  imageUrl:
    "https://techcourse-project-2026.s3.ap-northeast-2.amazonaws.com/poudy/images/products/%E1%84%87%E1%85%A1%E1%84%8B%E1%85%B5%E1%84%8B%E1%85%A9%E1%84%83%E1%85%A5%E1%84%86%E1%85%A1_%E1%84%92%E1%85%A1%E1%84%8B%E1%85%B5%E1%84%83%E1%85%B3%E1%84%85%E1%85%A1%E1%84%87%E1%85%B5%E1%84%8B%E1%85%A9%20%E1%84%90%E1%85%A9%E1%84%82%E1%85%A5.webp",
  volumeUnit: "ml",
  unitPrice: 80,
} satisfies PopularDupeProduct;

export const MOCK_POPULAR_DUPES: readonly PopularDupe[] = [
  { source: ZEROID_RED_CONTROL_CREAM, alternative: ZEROID_SOOTHING_CREAM, savingPercent: 9.09 },
  { source: ZEROID_INTENSIVE_CREAM, alternative: ZEROID_SOOTHING_CREAM, savingPercent: 6.25 },
  { source: BIODERMA_SENSIBIO_TONER, alternative: BIODERMA_HYDRABIO_TONER, savingPercent: 32.2 },
];
