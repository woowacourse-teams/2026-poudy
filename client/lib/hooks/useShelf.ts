"use client";

import type { IngredientAnalysisResponse, ShelfProductResponse, ShelfResponse, UserResponse } from "@poudy/api/api.zod";
import { useCallback, useEffect, useRef, useState } from "react";

import { fetchGuestShelf, isGuestShelfMode, enterGuestShelfMode, importGuestShelf } from "@/lib/api/guest-shelf";
import { findMe, isAdminSession, isSignedOut } from "@/lib/api/member";
import { fetchMyFilter } from "@/lib/api/my-filter";
import {
  addShelfProduct,
  fetchIngredientAnalysis,
  fetchMemberShelf,
  removeShelfProduct,
  updateShelfProduct,
} from "@/lib/api/shelf";
import { draftOf, type RatingDraft } from "@/lib/domain/shelf";

export type ShelfData = {
  readonly shelf: ShelfResponse;
  readonly analysis: IngredientAnalysisResponse;
  /** 나만의 필터에 든 성분 수. 결과 밖에서 넣은 성분도 센다. 비로그인이면 0 이다. */
  readonly filterCount: number;
  /** 비로그인 선반이면 없다. */
  readonly member?: UserResponse;
};

export type ShelfState =
  | { readonly status: "loading" }
  | { readonly status: "adminSession" }
  | { readonly status: "error" }
  | { readonly status: "ready"; readonly data: ShelfData };

const loadMemberShelf = async (): Promise<ShelfData> => {
  await importGuestShelf();
  const [shelf, analysis, filter, member] = await Promise.all([
    fetchMemberShelf(),
    fetchIngredientAnalysis(),
    fetchMyFilter(),
    findMe(),
  ]);
  return { shelf, analysis, filterCount: filter.items.length, member };
};

/** 회원 선반을 읽고, 로그인하지 않았으면 비로그인 선반을 읽는다. 남아 있던 비로그인 선반은 회원 선반으로 먼저 옮긴다. */
const loadShelf = async (): Promise<ShelfData> => {
  if (!isGuestShelfMode()) {
    try {
      return await loadMemberShelf();
    } catch (error) {
      if (!isSignedOut(error)) throw error;
      enterGuestShelfMode();
    }
  }
  return { ...(await fetchGuestShelf()), filterCount: 0 };
};

const stateOfError = (error: unknown): ShelfState => {
  if (isAdminSession(error)) return { status: "adminSession" };
  return { status: "error" };
};

/**
 * 선반 화면의 데이터. 선반, 안 맞을 수 있는 성분, 나만의 필터, 회원 정보를 함께 읽는다.
 * 평가를 바꾸거나 제품을 빼면 서버가 성분을 다시 계산하므로 모두 다시 읽는다.
 */
export const useShelf = () => {
  const [state, setState] = useState<ShelfState>({ status: "loading" });
  // 다시 읽는 요청이 겹치면(오래 걸려 [다시 시도]를 누르는 등) 마지막 요청의 결과만 쓴다.
  const latestLoad = useRef(0);

  const reload = useCallback(() => {
    const request = ++latestLoad.current;
    return loadShelf().then(
      (data) => {
        if (request === latestLoad.current) setState({ status: "ready", data });
      },
      (error: unknown) => {
        if (request === latestLoad.current) setState(stateOfError(error));
      },
    );
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** 실패한 뒤 다시 읽는다. 다시 읽는 동안은 불러오는 중으로 돌린다. */
  const retry = useCallback(() => {
    setState({ status: "loading" });
    void reload();
  }, [reload]);

  return { state, retry, reload, ...useShelfMutations(state, reload) };
};

export type ShelfUpdateOptions = { readonly reason?: "normal" | "undo"; readonly ratingFlowId?: string };
const useShelfMutations = (state: ShelfState, reload: () => Promise<void>) => {
  const update = useCallback(
    (productId: number, draft: RatingDraft, options: ShelfUpdateOptions = {}) => {
      const previous =
        state.status === "ready" ? state.data.shelf.items.find((item) => item.product.id === productId) : undefined;
      return updateShelfProduct(productId, draft, {
        source: "shelf",
        ...options,
        previous: previous ? draftOf(previous) : undefined,
      }).then(reload);
    },
    [reload, state],
  );
  const remove = useCallback((productId: number) => removeShelfProduct(productId).then(reload), [reload]);
  /** 뺀 제품을 같은 사용 상태와 평가로 다시 담는다(빼기 되돌리기). 담은 때는 새로 정해진다. */
  const restore = useCallback(
    (item: ShelfProductResponse) =>
      addShelfProduct(
        { productId: item.product.id, ...draftOf(item) },
        { source: "shelf", reason: "undo", guest: { product: item.product, registeredAt: item.registeredAt } },
      ).then(reload),
    [reload],
  );

  return { update, remove, restore };
};
