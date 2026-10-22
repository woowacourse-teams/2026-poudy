"use client";

import type { IngredientAnalysisResponse, ShelfProductResponse, ShelfResponse, UserResponse } from "@poudy/api/api.zod";
import { useCallback, useEffect, useState } from "react";

import { findMe, isAdminSession, isSignedOut } from "@/lib/api/member";
import {
  addShelfProduct,
  fetchIngredientAnalysis,
  fetchShelf,
  removeShelfProduct,
  updateShelfProduct,
} from "@/lib/api/shelf";
import { fetchSkinFilter } from "@/lib/api/skin-filter";
import { draftOf, type RatingDraft } from "@/lib/domain/shelf";

export type ShelfData = {
  readonly shelf: ShelfResponse;
  readonly analysis: IngredientAnalysisResponse;
  /** 나만의 필터에 든 성분 수. 결과 밖에서 넣은 성분도 센다. */
  readonly filterCount: number;
  readonly member: UserResponse;
};

export type ShelfState =
  | { readonly status: "loading" }
  | { readonly status: "signedOut" }
  | { readonly status: "adminSession" }
  | { readonly status: "error" }
  | { readonly status: "ready"; readonly data: ShelfData };

const loadShelf = async (): Promise<ShelfData> => {
  const [shelf, analysis, filter, member] = await Promise.all([
    fetchShelf(),
    fetchIngredientAnalysis(),
    fetchSkinFilter(),
    findMe(),
  ]);
  return { shelf, analysis, filterCount: filter.items.length, member };
};

const stateOfError = (error: unknown): ShelfState => {
  if (isSignedOut(error)) return { status: "signedOut" };
  if (isAdminSession(error)) return { status: "adminSession" };
  return { status: "error" };
};

/**
 * 선반 화면의 데이터. 선반, 안 맞을 수 있는 성분, 나만의 필터, 회원 정보를 함께 읽는다.
 * 평가를 바꾸거나 제품을 빼면 서버가 성분을 다시 계산하므로 모두 다시 읽는다.
 */
export const useShelf = () => {
  const [state, setState] = useState<ShelfState>({ status: "loading" });

  const reload = useCallback(
    () =>
      loadShelf().then(
        (data) => setState({ status: "ready", data }),
        (error: unknown) => setState(stateOfError(error)),
      ),
    [],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  const update = useCallback(
    (productId: number, draft: RatingDraft) => updateShelfProduct(productId, draft).then(reload),
    [reload],
  );
  const remove = useCallback((productId: number) => removeShelfProduct(productId).then(reload), [reload]);
  /** 뺀 제품을 같은 사용 상태와 평가로 다시 담는다(빼기 되돌리기). 담은 때는 새로 정해진다. */
  const restore = useCallback(
    (item: ShelfProductResponse) => addShelfProduct({ productId: item.product.id, ...draftOf(item) }).then(reload),
    [reload],
  );

  /** 실패한 뒤 다시 읽는다. 다시 읽는 동안은 불러오는 중으로 돌린다. */
  const retry = useCallback(() => {
    setState({ status: "loading" });
    void reload();
  }, [reload]);

  return { state, retry, reload, update, remove, restore };
};
