import { formatCount } from "@/lib/domain/format";

/** 목록 결과 헤더(gv4R9)의 결과 수. 높이 40. 정렬과 함께 SortHeader 가 이 줄을 그린다. */
export function ResultCount({ total }: { readonly total: number }) {
  return (
    <p className="flex min-h-10 items-center text-body-sm font-semibold text-text-secondary">총 {formatCount(total)}</p>
  );
}
