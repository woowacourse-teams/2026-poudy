import { PRODUCT_PLACEHOLDER } from "@/components/ui/ProductThumbnail";

/**
 * 제품 그림 주소. 그림이 없는 제품은 빈 문자열이 와서 그대로 넘기면 브라우저가 페이지를 다시 받는다.
 * TODO(#730): client 의 제품 그림 부품(ProductImage)과 표시 도우미가 들어오면 그쪽으로 옮긴다.
 */
export const productImageSrc = (imageUrl: string): string => imageUrl || PRODUCT_PLACEHOLDER;
