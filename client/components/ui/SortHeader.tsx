import { SortDropdown, type SortOption } from "./SortDropdown";

import { ResultCount } from "@/components/product/ResultCount";
import type { Sort } from "@/lib/domain/filter";

type SortHeaderProps<T extends string> = {
  readonly total: number;
  readonly sort: T;
  readonly onChangeSort: (sort: T) => void;
  /** 고를 수 있는 목록. 기본은 제품 목록이 쓰는 정렬 5 종이다. */
  readonly options?: readonly SortOption<T>[];
};

/**
 * 목록 결과 헤더(명세 APP · 목록 결과 헤더 gv4R9). 왼쪽에 결과 수, 오른쪽에 정렬을 둔다.
 * 조건 일치 제품·카테고리 상품·브랜드 상세와 위시리스트가 쓴다. 선반은 최근 등록순으로만 보여 주므로 정렬이 없다.
 */
export function SortHeader<T extends string = Sort>({ total, sort, onChangeSort, options }: SortHeaderProps<T>) {
  return (
    <div className="flex items-center justify-between gap-2">
      <ResultCount total={total} />
      <SortDropdown value={sort} onChange={onChangeSort} options={options} />
    </div>
  );
}
