import { WishlistProductIdsResponse, WishlistResponse } from "@poudy/api/api.zod";

import { apiDelete, apiGet, apiPut } from "./client";

const PATH = "/api/users/me/wishlist";

export const fetchSavedProductIds = (): Promise<WishlistProductIdsResponse> =>
  apiGet(`${PATH}/product-ids`, WishlistProductIdsResponse, { withSession: true });

export const fetchSavedProducts = (): Promise<WishlistResponse> =>
  apiGet(`${PATH}/products`, WishlistResponse, { withSession: true });

export const putSavedProduct = (productId: number): Promise<void> => apiPut(`${PATH}/products/${productId}`);

export const deleteSavedProduct = (productId: number): Promise<void> => apiDelete(`${PATH}/products/${productId}`);
