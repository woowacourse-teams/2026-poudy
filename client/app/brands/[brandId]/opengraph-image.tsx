import { fetchBrand } from "@/lib/api/products";
import {
  SOCIAL_IMAGE_CACHE_CONTROL,
  SOCIAL_IMAGE_CONTENT_TYPE,
  socialImageLogoSrc,
  SOCIAL_IMAGE_SIZE,
  socialImage,
} from "@/lib/seo/social-image";

export const alt = "Poudy 브랜드 제품 정보";
export const size = SOCIAL_IMAGE_SIZE;
export const contentType = SOCIAL_IMAGE_CONTENT_TYPE;
export const revalidate = 86400;

// 동적 경로는 이 함수가 없으면 revalidate 를 두어도 요청마다 그린다. 빌드 때는 만들지 않고 처음 요청될 때 만들어 둔다.
export function generateStaticParams() {
  return [];
}

export default async function BrandOpenGraphImage(props: { readonly params: Promise<{ readonly brandId: string }> }) {
  const { brandId } = await props.params;

  try {
    const brand = await fetchBrand(Number(brandId));
    return socialImage({
      title: brand.name,
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
