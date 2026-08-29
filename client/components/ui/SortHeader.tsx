import { SortDropdown, type SortOption } from "./SortDropdown";

import type { Sort } from "@/lib/domain/filter";

type SortHeaderProps<T extends string> = {
  readonly total: number;
  readonly sort: T;
  readonly onChangeSort: (sort: T) => void;
  /** 고를 수 있는 목록. 기본은 제품 목록이 쓰는 정렬 4 종이다. */
  readonly options?: readonly SortOption<T>[];
};

/** 디자인 C08. 결과 개수와 정렬을 한 줄에 둔다. */
export function SortHeader<T extends string = Sort>({ total, sort, onChangeSort, options }: SortHeaderProps<T>) {
  return (
    <div className="flex items-center justify-between py-2">
      <p className="text-[13px] font-semibold text-text-secondary">총 {total.toLocaleString("ko-KR")}개</p>
      <SortDropdown value={sort} onChange={onChangeSort} options={options} />
    </div>
  );
}
