import { isAdminSession, isSignedOut } from "@/lib/api/member";
import { deleteSavedProduct, fetchSavedProductIds, putSavedProduct } from "@/lib/api/saved-products";

export type SavedProductsStatus = "loading" | "ready" | "failed" | "signedOut" | "adminSession";

export type SavedProductsSnapshot = {
  readonly status: SavedProductsStatus;
  readonly ids: readonly number[];
};

export type SaveResult = "done" | "failed" | "signedOut" | "adminSession";

const LOADING: SavedProductsSnapshot = { status: "loading", ids: [] };
const SIGNED_OUT: SavedProductsSnapshot = { status: "signedOut", ids: [] };
const ADMIN_SESSION: SavedProductsSnapshot = { status: "adminSession", ids: [] };

const listeners = new Set<() => void>();
const pendingRequests = new Map<number, Promise<SaveResult>>();

let snapshot: SavedProductsSnapshot = LOADING;
let loading: Promise<void> | null = null;
let initialized = false;
let changeVersion = 0;

const update = (next: SavedProductsSnapshot): void => {
  snapshot = next;
  listeners.forEach((listener) => listener());
};

const failureOf = (error: unknown): SaveResult => {
  if (isSignedOut(error)) return "signedOut";
  if (isAdminSession(error)) return "adminSession";
  return "failed";
};

const loadFailureOf = (error: unknown): SavedProductsSnapshot => {
  const result = failureOf(error);
  if (result === "signedOut") return SIGNED_OUT;
  if (result === "adminSession") return ADMIN_SESSION;
  return { status: "failed", ids: [] };
};

const load = (): Promise<void> => {
  if (loading) return loading;
  initialized = true;
  loading = (async () => {
    while (true) {
      while (pendingRequests.size > 0) {
        await Promise.all(pendingRequests.values());
      }
      const requestedVersion = changeVersion;
      try {
        const response = await fetchSavedProductIds();
        if (requestedVersion !== changeVersion) continue;
        update({ status: "ready", ids: response.productIds });
      } catch (error: unknown) {
        if (requestedVersion !== changeVersion) continue;
        update(loadFailureOf(error));
      }
      return;
    }
  })().finally(() => {
    loading = null;
  });
  return loading;
};

export const reloadSavedProducts = (): Promise<void> => {
  changeVersion++;
  return load();
};

export const subscribeSavedProducts = (listener: () => void): (() => void) => {
  listeners.add(listener);
  if (!initialized) void load();
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
      if (result === "adminSession") update(ADMIN_SESSION);
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
  changeVersion++;
  update({ ...snapshot, ids: [productId, ...snapshot.ids.filter((id) => id !== productId)] });
  return enqueue(productId, () => putSavedProduct(productId));
};

export const unsaveProduct = (productId: number): Promise<SaveResult> => {
  changeVersion++;
  update({ ...snapshot, ids: snapshot.ids.filter((id) => id !== productId) });
  return enqueue(productId, () => deleteSavedProduct(productId));
};
