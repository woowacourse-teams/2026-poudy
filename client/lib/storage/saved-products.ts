import { isSignedOut } from "@/lib/api/member";
import { deleteSavedProduct, fetchSavedProductIds, putSavedProduct } from "@/lib/api/saved-products";

export type SavedProductsStatus = "loading" | "ready" | "failed" | "signedOut";

export type SavedProductsSnapshot = {
  readonly status: SavedProductsStatus;
  readonly ids: readonly number[];
};

export type SaveResult = "done" | "failed" | "signedOut";

const LOADING: SavedProductsSnapshot = { status: "loading", ids: [] };
const SIGNED_OUT: SavedProductsSnapshot = { status: "signedOut", ids: [] };

const listeners = new Set<() => void>();
const pendingRequests = new Map<number, Promise<SaveResult>>();

let snapshot: SavedProductsSnapshot = LOADING;
let loading: Promise<void> | null = null;

const update = (next: SavedProductsSnapshot): void => {
  snapshot = next;
  listeners.forEach((listener) => listener());
};

const failureOf = (error: unknown): SaveResult => {
  if (isSignedOut(error)) return "signedOut";
  return "failed";
};

const load = (): Promise<void> => {
  loading = fetchSavedProductIds()
    .then((response) => update({ status: "ready", ids: response.productIds }))
    .catch((error: unknown) => {
      if (isSignedOut(error)) {
        update(SIGNED_OUT);
        return;
      }
      update({ status: "failed", ids: [] });
    });
  return loading;
};

export const reloadSavedProducts = (): Promise<void> => load();

export const subscribeSavedProducts = (listener: () => void): (() => void) => {
  listeners.add(listener);
  if (!loading) void load();
  return () => {
    listeners.delete(listener);
  };
};

export const getSavedProductsSnapshot = (): SavedProductsSnapshot => snapshot;

export const getSavedProductsServerSnapshot = (): SavedProductsSnapshot => LOADING;

const settle = (request: Promise<void>): Promise<SaveResult> =>
  request
    .then((): SaveResult => "done")
    .catch((error: unknown) => {
      const result = failureOf(error);
      if (result === "signedOut") update(SIGNED_OUT);
      if (result === "failed") void load();
      return result;
    });

const enqueue = (productId: number, send: () => Promise<void>): Promise<SaveResult> => {
  const previous = pendingRequests.get(productId) ?? Promise.resolve<SaveResult>("done");
  const next = previous.then(() => settle(send()));
  pendingRequests.set(productId, next);
  void next.then(() => {
    if (pendingRequests.get(productId) === next) pendingRequests.delete(productId);
  });
  return next;
};

export const saveProduct = (productId: number): Promise<SaveResult> => {
  update({ ...snapshot, ids: [productId, ...snapshot.ids.filter((id) => id !== productId)] });
  return enqueue(productId, () => putSavedProduct(productId));
};

export const unsaveProduct = (productId: number): Promise<SaveResult> => {
  update({ ...snapshot, ids: snapshot.ids.filter((id) => id !== productId) });
  return enqueue(productId, () => deleteSavedProduct(productId));
};
