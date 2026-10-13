import type { PaginationResponse } from "@poudy/api/api.zod";

type Props = {
  readonly pagination: PaginationResponse;
  readonly onChange: (page: number) => void;
};

const PAGE_BUTTON_CLASS =
  "h-9 rounded-button border border-border bg-background px-4 text-[14px] font-bold disabled:opacity-40";

export function AdminPagination({ pagination, onChange }: Props) {
  return (
    <nav aria-label="페이지" className="mt-6 flex items-center justify-center gap-4">
      <button
        type="button"
        disabled={pagination.page <= 1}
        onClick={() => onChange(pagination.page - 1)}
        className={PAGE_BUTTON_CLASS}
      >
        이전
      </button>
      <span className="text-[14px] text-text-secondary">
        {pagination.page} / {Math.max(pagination.totalPages, 1)} · 전체 {pagination.totalElements}건
      </span>
      <button
        type="button"
        disabled={!pagination.hasNext}
        onClick={() => onChange(pagination.page + 1)}
        className={PAGE_BUTTON_CLASS}
      >
        다음
      </button>
    </nav>
  );
}
