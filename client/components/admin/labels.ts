import type { AdminFeedbackResponse } from "@poudy/api/api.zod";

import type { AdminRequestStatus } from "@/lib/api/admin";

export const REQUEST_STATUSES: readonly { readonly value: AdminRequestStatus; readonly label: string }[] = [
  { value: "RECEIVED", label: "접수" },
  { value: "IN_PROGRESS", label: "처리 중" },
  { value: "COMPLETED", label: "완료" },
  { value: "REJECTED", label: "반려" },
];

export const FEEDBACK_TYPE_LABELS: Readonly<Record<AdminFeedbackResponse["type"], string>> = {
  BUG_REPORT: "오류 제보",
  IMPROVEMENT: "개선 제안",
  OTHER: "기타",
  PRODUCT_CORRECTION: "제품 정보 정정",
};

export const formatDateTime = (value: string): string =>
  new Date(value).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });
