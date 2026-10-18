import { formatCount } from "@/lib/domain/format";

/** 목록 결과 헤더(명세 APP · 목록 결과 헤더 gv4R9). 높이 40 에 결과 수만 둔다. 정렬은 MVP 에서 뺐다(2026-10-14). */
export function ResultCount({ total }: { readonly total: number }) {
  return (
    <p className="flex min-h-10 items-center text-body-sm font-semibold text-text-secondary">총 {formatCount(total)}</p>
  );
}
