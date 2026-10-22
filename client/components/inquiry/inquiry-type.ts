import type { InquiryType } from "@/lib/analytics/events";
import type { FeedbackType } from "@/lib/api/feedback";

/** 제품 등록 요청은 다른 엔드포인트로 가므로 FeedbackType 에 없다. */
export const PRODUCT_REQUEST = "PRODUCT_REQUEST" as const;

export type InquiryChoice = FeedbackType | typeof PRODUCT_REQUEST;

/** 화면에 보여 주는 차례(명세 S40 문의 유형 그리드). 제품 정보 정정은 대상 제품이 있는 경로에서만 받으므로 없다. */
export const INQUIRY_CHOICES: readonly InquiryChoice[] = ["BUG_REPORT", "IMPROVEMENT", PRODUCT_REQUEST, "OTHER"];

export const INQUIRY_LABEL: Record<InquiryChoice, string> = {
  BUG_REPORT: "오류 신고",
  IMPROVEMENT: "개선 제안",
  PRODUCT_REQUEST: "제품 등록 요청",
  OTHER: "그 밖의 문의",
};

/**
 * 문의 내용 칸의 안내. 유형마다 무엇을 적으면 도움이 되는지 다르다.
 * BUG_REPORT 는 명세 S40g 의 문구다.
 */
export const CONTENT_PLACEHOLDER: Record<FeedbackType, string> = {
  BUG_REPORT: "예를 들어 어느 화면에서 무엇을 누르셨는지 적어 주시면 도움이 돼요.",
  IMPROVEMENT: "지금 어떤 점이 아쉬운지 함께 적어 주시면 도움이 돼요.",
  OTHER: "궁금하거나 알리고 싶은 내용을 적어 주세요.",
};

/** 제품 정보 정정은 유형을 고르지 않고 들어오므로 문구를 따로 둔다(명세 S40e). */
export const CORRECTION_COPY = {
  title: "제품 정보가 정확하지 않나요?",
  label: "제보 내용",
  placeholder: "성분이나 용량, 가격 중 무엇이 다른지 실제 정보와 함께 적어 주시면 확인이 빨라요.",
  summary: "제품 정보 정정",
} as const;

export const analyticsTypeOf = (choice: InquiryChoice): InquiryType => {
  if (choice === PRODUCT_REQUEST) return "product_registration";
  if (choice === "BUG_REPORT") return "bug_report";
  if (choice === "IMPROVEMENT") return "improvement";
  return "other";
};
