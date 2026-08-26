import { fetchIngredientDetail } from "@/lib/api/products";
import {
  SOCIAL_IMAGE_CACHE_CONTROL,
  SOCIAL_IMAGE_CONTENT_TYPE,
  socialImageLogoSrc,
  SOCIAL_IMAGE_SIZE,
  socialImage,
} from "@/lib/seo/social-image";

export const alt = "Poudy 성분 정보";
export const size = SOCIAL_IMAGE_SIZE;
export const contentType = SOCIAL_IMAGE_CONTENT_TYPE;
export const revalidate = 86400;

export default async function IngredientOpenGraphImage(props: {
  readonly params: Promise<{ readonly ingredientId: string }>;
}) {
  const { ingredientId } = await props.params;

  try {
    const ingredient = await fetchIngredientDetail(Number(ingredientId));
    return socialImage({
      title: ingredient.koreanName,
      logoSrc: await socialImageLogoSrc(),
      cacheControl: SOCIAL_IMAGE_CACHE_CONTROL,
    });
  } catch {
    return socialImage({
      title: "Poudy",
      logoSrc: await socialImageLogoSrc(),
      cacheControl: SOCIAL_IMAGE_CACHE_CONTROL,
    });
  }
}
