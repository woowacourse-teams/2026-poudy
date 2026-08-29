import { SITE_DESCRIPTION } from "@/lib/seo/site";
import { SOCIAL_IMAGE_CONTENT_TYPE, socialImageLogoSrc, SOCIAL_IMAGE_SIZE, socialImage } from "@/lib/seo/social-image";

export const alt = SITE_DESCRIPTION;
export const size = SOCIAL_IMAGE_SIZE;
export const contentType = SOCIAL_IMAGE_CONTENT_TYPE;

export default async function OpenGraphImage() {
  return socialImage({
    title: "내 피부에 맞는\n화장품 탐색, Poudy",
    logoSrc: await socialImageLogoSrc(),
  });
}
