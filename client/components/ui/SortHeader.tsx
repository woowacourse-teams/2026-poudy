import { SortDropdown } from "./SortDropdown";

import type { Sort } from "@/lib/domain/filter";

type SortHeaderProps = {
  readonly total: number;
  readonly sort: Sort;
  readonly onChangeSort: (sort: Sort) => void;
};

/** 디자인 C08. 결과 개수와 정렬을 한 줄에 둔다. */
export function SortHeader({ total, sort, onChangeSort }: SortHeaderProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <p className="text-[13px] font-semibold text-text-secondary">총 {total.toLocaleString("ko-KR")}개</p>
      <SortDropdown value={sort} onChange={onChangeSort} />
    </div>
  );
}
