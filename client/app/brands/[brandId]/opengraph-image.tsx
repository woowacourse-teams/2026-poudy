import { fetchBrand } from "@/lib/api/products";
import {
  SOCIAL_IMAGE_CACHE_CONTROL,
  SOCIAL_IMAGE_CONTENT_TYPE,
  SOCIAL_IMAGE_LOGO_SRC,
  SOCIAL_IMAGE_SIZE,
  socialImage,
} from "@/lib/seo/social-image";

export const alt = "Poudy 브랜드 제품 정보";
export const size = SOCIAL_IMAGE_SIZE;
export const contentType = SOCIAL_IMAGE_CONTENT_TYPE;
export const revalidate = 86400;

export default async function BrandOpenGraphImage(props: { readonly params: Promise<{ readonly brandId: string }> }) {
  const { brandId } = await props.params;

  try {
    const brand = await fetchBrand(Number(brandId));
    return socialImage({
      title: brand.name,
      logoSrc: SOCIAL_IMAGE_LOGO_SRC,
      cacheControl: SOCIAL_IMAGE_CACHE_CONTROL,
    });
  } catch {
    return socialImage({
      title: "Poudy",
      logoSrc: SOCIAL_IMAGE_LOGO_SRC,
      cacheControl: SOCIAL_IMAGE_CACHE_CONTROL,
    });
  }
}
