"use client";

import type { ShelfProductResponse, ShelfProductSuggestionResponse, ShelfUsageStatus } from "@poudy/api/api.zod";
import { useCallback, useEffect, useRef, useState } from "react";

import { isSignedOut } from "@/lib/api/member";
import {
  addShelfProduct,
  fetchShelf,
  fetchShelfProductSuggestions,
  removeShelfProduct,
  updateShelfProduct,
} from "@/lib/api/shelf";
import type { RatingDraft } from "@/lib/domain/shelf";

export type SuggestionState = {
  /** 이 결과를 받은 검색어. 입력이 바뀌어도 새 결과가 올 때까지 앞 결과를 둔다. */
  readonly keyword: string;
  readonly items: readonly ShelfProductSuggestionResponse[];
  readonly total: number;
};

const EMPTY: SuggestionState = { keyword: "", items: [], total: 0 };

/** 선반에 담긴 제품과 그 사용 상태. 자동완성 행에 '선반에 있음'을 표시하는 데 쓴다. */
const useShelvedProducts = (onSignedOut: () => void) => {
  const [shelved, setShelved] = useState<ReadonlyMap<number, ShelfUsageStatus>>(new Map());
  const onSignedOutRef = useRef(onSignedOut);

  useEffect(() => {
    fetchShelf().then(
      (shelf) => setShelved(new Map(shelf.items.map((item) => [item.product.id, item.usageStatus]))),
      (error: unknown) => {
        if (isSignedOut(error)) onSignedOutRef.current();
      },
    );
  }, []);

  const mark = useCallback((item: ShelfProductResponse) => {
    setShelved((current) => new Map(current).set(item.product.id, item.usageStatus));
  }, []);

  const unmark = useCallback((productId: number) => {
    setShelved((current) => {
      const next = new Map(current);
      next.delete(productId);
      return next;
    });
  }, []);

  return { shelved, mark, unmark };
};

/**
 * 제품 자동완성. 입력이 바뀌어도 새 결과가 올 때까지 앞 결과를 둔다.
 * 받지 못하면 그 검색어를 failedKeyword 로 남겨 목록 자리에 섹션 오류를 둔다. 같은 검색어로 다시 찾으면 지운다.
 */
const useProductSuggestions = () => {
  const [suggestions, setSuggestions] = useState<SuggestionState>(EMPTY);
  const [failedKeyword, setFailedKeyword] = useState<string>();
  const latest = useRef("");

  const search = useCallback((keyword: string) => {
    const trimmed = keyword.trim();
    latest.current = trimmed;
    setFailedKeyword(undefined);
    if (!trimmed) return setSuggestions(EMPTY);
    fetchShelfProductSuggestions(trimmed).then(
      (page) => {
        if (latest.current !== trimmed) return;
        setSuggestions({ keyword: trimmed, items: page.items, total: page.pagination.totalElements });
      },
      () => {
        if (latest.current === trimmed) setFailedKeyword(trimmed);
      },
    );
  }, []);

  return { suggestions, failedKeyword, search };
};

/**
 * 제품 추가 화면(/shelf/add)의 데이터. 자동완성과 선반에 담긴 제품을 함께 든다.
 * 담으면 지금 쓰는 제품으로 담고, 사용 상태와 평가는 이어서 뜨는 평가 시트에서 고친다(S52i).
 */
export const useShelfAdd = (onSignedOut: () => void) => {
  const { suggestions, failedKeyword, search } = useProductSuggestions();
  const { shelved, mark, unmark } = useShelvedProducts(onSignedOut);

  const add = useCallback(
    (productId: number) =>
      addShelfProduct({ productId, usageStatus: "IN_USE" }).then((item) => {
        mark(item);
        return item;
      }),
    [mark],
  );
  const update = useCallback(
    (productId: number, draft: RatingDraft) =>
      updateShelfProduct(productId, draft).then((item) => {
        mark(item);
        return item;
      }),
    [mark],
  );
  /** 막 담은 제품을 다시 뺀다([담김] 누르기 · 되돌리기). */
  const remove = useCallback(
    (productId: number) => removeShelfProduct(productId).then(() => unmark(productId)),
    [unmark],
  );

  return { suggestions, failedKeyword, search, shelved, add, update, remove };
};
