import type { ShelfProductInfoResponse, SimilarProductResponse } from "@poudy/api/api.zod";

/** 저렴이 카드의 표시 모델. 조회 API의 응답 계약과 분리한다. */
export type PopularDupeProduct = Readonly<
  Pick<ShelfProductInfoResponse, "id" | "name" | "brandName" | "imageUrl"> &
    Pick<SimilarProductResponse, "partId" | "volumeUnit">
> & { readonly unitPrice: number };

export type PopularDupe = {
  readonly source: PopularDupeProduct;
  readonly alternative: PopularDupeProduct;
  readonly savingPercent: number;
};
