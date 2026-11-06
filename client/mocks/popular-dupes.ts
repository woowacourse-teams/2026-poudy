import type { PopularDupe, PopularDupeProduct } from "@/lib/domain/popular-dupes";

// 화면 확인용 예시. 조회수 집계나 실제 성분 유사도 순위를 뜻하지 않는다.
// 기준 제품의 ID·구성품은 로컬 카탈로그와 맞춰 결과 화면으로 이동할 수 있게 한다.
const BLACK_SNAIL_TONER = {
  id: 1,
  partId: 1,
  name: "블랙 스네일 토너",
  brandName: "다 브랜드",
  imageUrl: "",
  volumeUnit: "ml",
  unitPrice: 90,
} satisfies PopularDupeProduct;

const VITA_TONER = {
  id: 13,
  partId: 4,
  name: "래디언스 비타 토너",
  brandName: "나 브랜드",
  imageUrl: "",
  volumeUnit: "ml",
  unitPrice: 105,
} satisfies PopularDupeProduct;

const PH_TONER = {
  id: 15,
  partId: 5,
  name: "PH 컨디션 토너",
  brandName: "나 브랜드",
  imageUrl: "",
  volumeUnit: "ml",
  unitPrice: 100,
} satisfies PopularDupeProduct;

export const MOCK_POPULAR_DUPES: readonly PopularDupe[] = [
  { source: VITA_TONER, alternative: BLACK_SNAIL_TONER, savingPercent: 14.29 },
  { source: PH_TONER, alternative: BLACK_SNAIL_TONER, savingPercent: 10 },
  { source: VITA_TONER, alternative: PH_TONER, savingPercent: 4.76 },
];
