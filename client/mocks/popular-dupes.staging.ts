import type { PopularDupe, PopularDupeProduct } from "@/lib/domain/popular-dupes";

// 2026-11-12 staging의 evidence 유사제품 관계와 실제 가격으로 갱신했다.
// 최근 완료된 7일(11/05~11/11) 대체 제품 조회수 내림차순의 고정 조합 3개다.
// 판매 중·같은 카테고리/단위이며 총가격과 단가가 모두 낮고, 대체 제품은 중복하지 않는다.
// 자동 갱신 API는 #1037의 후속 서버 작업에서 연결한다.
const MANYO_PANTHETOIN_MASK = {
  id: 873,
  partId: 767,
  name: "판테토인 딥 모이스처 마스크",
  brandName: "마녀공장",
  imageUrl:
    "https://techcourse-project-2026.s3.ap-northeast-2.amazonaws.com/poudy/images/products/%EB%A7%88%EB%85%80%EA%B3%B5%EC%9E%A5_%ED%8C%90%ED%85%8C%ED%86%A0%EC%9D%B8%20%EB%94%A5%20%EB%AA%A8%EC%9D%B4%EC%8A%A4%EC%B2%98%20%EB%A7%88%EC%8A%A4%ED%81%AC.webp",
  volumeUnit: "ea",
  unitPrice: 4000,
} satisfies PopularDupeProduct;

const FUSIDERM_BARRIER_MASK = {
  id: 2049,
  partId: 2043,
  name: "베리어 리페어 크림 마스크",
  brandName: "후시덤",
  imageUrl:
    "https://techcourse-project-2026.s3.ap-northeast-2.amazonaws.com/poudy/images/products/hub/db88269c2d57ae73ffe3d81f/%ED%9B%84%EC%8B%9C%EB%8D%A4_%EB%B2%A0%EB%A6%AC%EC%96%B4%20%EB%A6%AC%ED%8E%98%EC%96%B4%20%ED%81%AC%EB%A6%BC%20%EB%A7%88%EC%8A%A4%ED%81%AC.webp",
  volumeUnit: "ea",
  unitPrice: 2000,
} satisfies PopularDupeProduct;

const VT_REEDLE_SHOT_700 = {
  id: 2115,
  partId: 2070,
  name: "리들샷 700",
  brandName: "VT 코스메틱",
  imageUrl:
    "https://techcourse-project-2026.s3.ap-northeast-2.amazonaws.com/poudy/images/products/hub/de5369f46ace60bfe7c71f4a/VT%20%EC%BD%94%EC%8A%A4%EB%A9%94%ED%8B%B1_%EB%A6%AC%EB%93%A4%EC%83%B7%20700.webp",
  volumeUnit: "ml",
  unitPrice: 1933,
} satisfies PopularDupeProduct;

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

const REAL_BARRIER_CICA_SUNSCREEN = {
  id: 1838,
  partId: 1832,
  name: "시카 그린 톤업 선크림 SPF50+ PA++++",
  brandName: "리얼베리어",
  imageUrl:
    "https://techcourse-project-2026.s3.ap-northeast-2.amazonaws.com/poudy/images/products/hub/fa4237677ac6f8c4e4b1da9d/%EB%A6%AC%EC%96%BC%EB%B2%A0%EB%A6%AC%EC%96%B4_%EC%8B%9C%EC%B9%B4%20%EA%B7%B8%EB%A6%B0%20%ED%86%A4%EC%97%85%20%EC%84%A0%ED%81%AC%EB%A6%BC%20SPF50%2B%20PA%2B%2B%2B%2B.webp",
  volumeUnit: "ml",
  unitPrice: 580,
} satisfies PopularDupeProduct;

const NUMBUZIN_TONE_UP_SUNSCREEN = {
  id: 644,
  partId: 535,
  name: "3번 도자기결 톤업베이지 선크림 SPF50+ PA++++ (블러/글로우)",
  brandName: "넘버즈인",
  imageUrl:
    "https://techcourse-project-2026.s3.ap-northeast-2.amazonaws.com/poudy/images/products/%EB%84%98%EB%B2%84%EC%A6%88%EC%9D%B8_3%EB%B2%88%20%EB%8F%84%EC%9E%90%EA%B8%B0%EA%B2%B0%20%ED%86%A4%EC%97%85%EB%B2%A0%EC%9D%B4%EC%A7%80%20%EC%84%A0%ED%81%AC%EB%A6%BC%20SPF50%2B%20PA%2B%2B%2B%2B%20%28%EB%B8%94%EB%9F%AC%252F%EA%B8%80%EB%A1%9C%EC%9A%B0%29.webp",
  volumeUnit: "ml",
  unitPrice: 520,
} satisfies PopularDupeProduct;

export const STAGING_POPULAR_DUPES: readonly PopularDupe[] = [
  { source: MANYO_PANTHETOIN_MASK, alternative: FUSIDERM_BARRIER_MASK, savingPercent: 50 },
  { source: VT_REEDLE_SHOT_700, alternative: BEPLAIN_CICATEROL_CREAM, savingPercent: 66.9 },
  { source: REAL_BARRIER_CICA_SUNSCREEN, alternative: NUMBUZIN_TONE_UP_SUNSCREEN, savingPercent: 10.34 },
];
