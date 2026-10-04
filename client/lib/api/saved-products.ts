import { SavedProductIdsResponse, SavedProductsResponse } from "@poudy/api/api.zod";

import { apiDelete, apiGet, apiPut } from "./client";

const PATH = "/api/members/me/saved-products";

export const fetchSavedProductIds = (): Promise<SavedProductIdsResponse> =>
  apiGet(`${PATH}/ids`, SavedProductIdsResponse, { withSession: true });

export const fetchSavedProducts = (): Promise<SavedProductsResponse> =>
  apiGet(PATH, SavedProductsResponse, { withSession: true });

export const putSavedProduct = (productId: number): Promise<void> => apiPut(`${PATH}/${productId}`);

export const deleteSavedProduct = (productId: number): Promise<void> => apiDelete(`${PATH}/${productId}`);
