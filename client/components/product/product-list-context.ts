"use client";

import { createContext, useContext } from "react";

import type { SheetKind } from "@/components/filter/FilterSheets";
import type { Filter } from "@/lib/domain/filter";

/**
 * 목록 안쪽 부품이 목록의 조건을 보고 필터 시트를 여는 길. 빈 상태는 화면마다 서버 컴포넌트가 넘기므로
 * 함수를 직접 받을 수 없어, 목록이 이 맥락으로 건넨다(예: S51e [성분 조건 수정하기]).
 */
export type ProductListActions = {
  /** 목록이 지금 보여 주는 조건. 화면이 고정한 조건까지 들어 있다. */
  readonly filter: Filter;
  /** 화면이 고정한 조건. 사용자가 걸지 않은 조건이라 빈 상태 문구에서 뺀다. */
  readonly fixedFilter: Partial<Filter>;
  readonly basePath: string;
  readonly openSheet: (kind: SheetKind) => void;
};

export const ProductListContext = createContext<ProductListActions | null>(null);

export const useProductListActions = (): ProductListActions => {
  const actions = useContext(ProductListContext);
  if (!actions) throw new Error("useProductListActions 는 ProductList 안에서 쓴다.");
  return actions;
};
