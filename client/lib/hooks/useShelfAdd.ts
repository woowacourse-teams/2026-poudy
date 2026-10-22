"use client";

import type { ProductSuggestionResponse, ShelfProductResponse, ShelfUsageStatus } from "@poudy/api/api.zod";
import { useCallback, useEffect, useRef, useState } from "react";

import { isSignedOut } from "@/lib/api/member";
import { addShelfProduct, fetchShelf, fetchShelfProductSuggestions, updateShelfProduct } from "@/lib/api/shelf";
import type { RatingDraft } from "@/lib/domain/shelf";

export type SuggestionState = {
  /** 이 결과를 받은 검색어. 입력이 바뀌어도 새 결과가 올 때까지 앞 결과를 둔다. */
  readonly keyword: string;
  readonly items: readonly ProductSuggestionResponse[];
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

  return { shelved, mark };
};

/**
 * 제품 추가 화면(/shelf/add)의 데이터. 자동완성과 선반에 담긴 제품을 함께 든다.
 * 담으면 지금 쓰는 제품으로 담고, 사용 상태와 평가는 이어서 뜨는 평가 시트에서 고친다(S52i).
 */
export const useShelfAdd = (onSignedOut: () => void) => {
  const [suggestions, setSuggestions] = useState<SuggestionState>(EMPTY);
  const latest = useRef("");
  const { shelved, mark } = useShelvedProducts(onSignedOut);

  const search = useCallback((keyword: string) => {
    const trimmed = keyword.trim();
    latest.current = trimmed;
    if (!trimmed) return setSuggestions(EMPTY);
    // TODO(#728): 자동완성을 받지 못하면 목록 자리에 오류를 알린다. 지금은 앞 결과를 그대로 둔다.
    fetchShelfProductSuggestions(trimmed).then(
      (page) => {
        if (latest.current !== trimmed) return;
        setSuggestions({ keyword: trimmed, items: page.items, total: page.pagination.totalElements });
      },
      () => undefined,
    );
  }, []);

  const add = useCallback(
    (productId: number) =>
      addShelfProduct({ productId, usageStatus: "IN_USE" }).then((item) => {
        mark(item);
        return item;
      }),
    [mark],
  );
  const update = useCallback(
    (productId: number, draft: RatingDraft) => updateShelfProduct(productId, draft).then(mark),
    [mark],
  );

  return { suggestions, search, shelved, add, update };
};
