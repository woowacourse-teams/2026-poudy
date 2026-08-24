import {
  SOCIAL_IMAGE_CONTENT_TYPE,
  SOCIAL_IMAGE_LOGO_SRC,
  SOCIAL_IMAGE_SIZE,
  socialImage,
} from "@/lib/seo/social-image";

export const alt = "화장품 전성분 기반 성분 분석 및 맞춤형 뷰티 정보 서비스, Poudy";
export const size = SOCIAL_IMAGE_SIZE;
export const contentType = SOCIAL_IMAGE_CONTENT_TYPE;

export default function OpenGraphImage() {
  return socialImage({
    title: "내 피부에 맞는\n화장품 탐색, Poudy",
    logoSrc: SOCIAL_IMAGE_LOGO_SRC,
  });
}
