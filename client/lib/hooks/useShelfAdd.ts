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
import { draftOf, type RatingDraft } from "@/lib/domain/shelf";

export type SuggestionState = {
  /** 이 결과를 받은 검색어. 입력이 바뀌어도 새 결과가 올 때까지 앞 결과를 둔다. */
  readonly keyword: string;
  readonly items: readonly ShelfProductSuggestionResponse[];
  readonly total: number;
};

const EMPTY: SuggestionState = { keyword: "", items: [], total: 0 };

/** 선반에 담긴 제품과 그 사용 상태. 자동완성 행에 '선반에 있음'을 표시하는 데 쓴다. */
const useShelvedProducts = (onSignedOut: () => void) => {
  const [ready, setReady] = useState(false);
  const [shelved, setShelved] = useState<ReadonlyMap<number, ShelfUsageStatus>>(new Map());
  const onSignedOutRef = useRef(onSignedOut);

  useEffect(() => {
    fetchShelf().then(
      (shelf) => {
        setShelved(new Map(shelf.items.map((item) => [item.product.id, item.usageStatus])));
        setReady(true);
      },
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

  return { shelved, mark, unmark, ready };
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
 * 담기는 평가 시트의 첫 저장에서 일어난다. 시트에서 고른 사용 상태와 평가를 함께 보내 한 번에 담는다(S52i).
 */
export const useShelfAdd = (onSignedOut: () => void) => {
  const { suggestions, failedKeyword, search } = useProductSuggestions();
  const { shelved, mark, unmark, ready } = useShelvedProducts(onSignedOut);

  const { add, update } = useShelfWrites(mark);
  /** 막 담은 제품을 다시 뺀다(담은 뒤 토스트의 되돌리기). */
  const remove = useCallback(
    (productId: number) =>
      removeShelfProduct(productId, { source: "shelf_add", reason: "undo" }).then(() => unmark(productId)),
    [unmark],
  );

  return { suggestions, failedKeyword, search, shelved, add, update, remove, ready };
};

const previousDraft = (
  items: ReadonlyMap<number, ShelfProductResponse>,
  productId: number,
): RatingDraft | undefined => {
  const item = items.get(productId);
  return item ? draftOf(item) : undefined;
};
const useShelfWrites = (mark: (item: ShelfProductResponse) => void) => {
  const savedItems = useRef(new Map<number, ShelfProductResponse>());
  const add = useCallback(
    (productId: number, draft: RatingDraft, ratingFlowId?: string) =>
      addShelfProduct({ productId, ...draft }, { source: "shelf_add", ratingFlowId }).then((item) => {
        savedItems.current.set(productId, item);
        mark(item);
        return item;
      }),
    [mark],
  );
  const update = useCallback(
    (productId: number, draft: RatingDraft, ratingFlowId?: string) =>
      updateShelfProduct(productId, draft, {
        source: "shelf_add",
        ratingFlowId,
        previous: previousDraft(savedItems.current, productId),
      }).then((item) => {
        savedItems.current.set(productId, item);
        mark(item);
        return item;
      }),
    [mark],
  );
  return { add, update };
};
