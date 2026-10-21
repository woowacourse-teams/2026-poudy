import { WishlistResponse } from "@poudy/api/api.zod";

import { apiDelete, apiGet, apiPost, apiPut } from "./client";
import { isAdminSession, isSignedOut } from "./member";

const PATH = "/api/users/me/wishlist";

export type SaveResult = "done" | "failed" | "signedOut" | "adminSession";

export const fetchSavedProducts = (): Promise<WishlistResponse> =>
  apiGet(`${PATH}/products`, WishlistResponse, { withSession: true });

const failureOf = (error: unknown): SaveResult => {
  if (isSignedOut(error)) return "signedOut";
  if (isAdminSession(error)) return "adminSession";
  return "failed";
};

/** 같은 제품의 저장·해제는 보낸 순서대로 처리한다. 앞 요청이 끝나기 전에 뒤 요청이 도착해 결과가 뒤집히지 않게 한다. */
const pendingRequests = new Map<number, Promise<SaveResult>>();

const enqueue = (productId: number, send: () => Promise<void>): Promise<SaveResult> => {
  const previous = pendingRequests.get(productId) ?? Promise.resolve<SaveResult>("done");
  const next = previous.then(() =>
    send()
      .then((): SaveResult => "done")
      .catch(failureOf),
  );
  pendingRequests.set(productId, next);
  next.then(() => {
    if (pendingRequests.get(productId) === next) pendingRequests.delete(productId);
  });
  return next;
};

export const saveProduct = (productId: number): Promise<SaveResult> =>
  enqueue(productId, () => apiPut(`${PATH}/products/${productId}`));

export const unsaveProduct = (productId: number): Promise<SaveResult> =>
  enqueue(productId, () => apiDelete(`${PATH}/products/${productId}`));

/** 뺀 제품을 담았던 시각 그대로 되살린다. 다시 담기(`saveProduct`)와 달리 원래 자리로 돌아간다. */
export const restoreProduct = (productId: number): Promise<SaveResult> =>
  enqueue(productId, () => apiPost(`${PATH}/products/${productId}/restore`, undefined, { withSession: true }));
