"use client";

import { useRouter } from "next/navigation";
import { useCallback, useSyncExternalStore } from "react";

import { ADMIN_SESSION_MESSAGE } from "@/lib/domain/admin-session";
import { rememberLoginReturn } from "@/lib/storage/login-return";
import {
  getSavedProductsServerSnapshot,
  getSavedProductsSnapshot,
  type SaveResult,
  saveProduct,
  type SavedProductsStatus,
  subscribeSavedProducts,
  unsaveProduct,
} from "@/lib/storage/saved-products";

const LOGIN_PATH = "/login";

const useSignedInRequest = (status: SavedProductsStatus) => {
  const router = useRouter();

  return useCallback(
    (request: (productId: number) => Promise<SaveResult>, productId: number): Promise<SaveResult> | null => {
      if (status === "signedOut") {
        rememberLoginReturn();
        router.push(LOGIN_PATH);
        return null;
      }
      if (status === "adminSession") {
        window.alert(ADMIN_SESSION_MESSAGE);
        return null;
      }
      return request(productId).then((result) => {
        if (result === "signedOut") {
          rememberLoginReturn();
          router.push(LOGIN_PATH);
        }
        if (result === "adminSession") window.alert(ADMIN_SESSION_MESSAGE);
        return result;
      });
    },
    [status, router],
  );
};

export const useSavedProducts = () => {
  const { status, ids } = useSyncExternalStore(
    subscribeSavedProducts,
    getSavedProductsSnapshot,
    getSavedProductsServerSnapshot,
  );
  const run = useSignedInRequest(status);

  const isSaved = useCallback((productId: number) => ids.includes(productId), [ids]);
  const save = useCallback((productId: number) => run(saveProduct, productId), [run]);
  const unsave = useCallback((productId: number) => run(unsaveProduct, productId), [run]);

  const toggle = useCallback(
    (productId: number): Promise<SaveResult> | null => {
      if (ids.includes(productId)) return unsave(productId);
      return save(productId);
    },
    [ids, save, unsave],
  );

  return { status, isSaved, save, unsave, toggle };
};
