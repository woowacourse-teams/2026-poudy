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
 * 결과 수와 정렬을 한 줄에 둔다. 명세의 목록 결과 헤더는 결과 수만 두므로(2026-10-14) 제품 목록은 ResultCount 를 쓴다.
 * 위시리스트만 아직 정렬을 쓴다(#739).
 */
export function SortHeader<T extends string = Sort>({ total, sort, onChangeSort, options }: SortHeaderProps<T>) {
  return (
    <div className="flex items-center justify-between gap-2">
      <ResultCount total={total} />
      <SortDropdown value={sort} onChange={onChangeSort} options={options} />
    </div>
  );
}
