import type { FeedbackType } from "@/lib/api/feedback";

/** 제품 등록 요청은 다른 엔드포인트로 가므로 FeedbackType 에 없다. */
export const PRODUCT_REQUEST = "PRODUCT_REQUEST" as const;

export type InquiryChoice = Extract<FeedbackType, "BUG_REPORT" | "IMPROVEMENT" | "OTHER"> | typeof PRODUCT_REQUEST;

type InquiryCopy = {
  /** 유형 선택 버튼에 적는 문구. */
  readonly label: string;
  /** 입력 칸 위에 붙는 라벨. */
  readonly fieldLabel: string;
  /** 입력 칸 안에 흐리게 보이는 안내. */
  readonly placeholder: string;
};

/**
 * 유형마다 달라지는 문구를 한곳에 모은다. 화면에 조건문으로 흩어 두면
 * 어느 유형에서 무엇이 보이는지 알기 어렵다.
 */
export const INQUIRY_COPY: Record<InquiryChoice, InquiryCopy> = {
  BUG_REPORT: {
    label: "오류를 발견했어요",
    fieldLabel: "문의 내용",
    placeholder: "예를 들어 어느 화면에서 무엇을 누르셨는지 적어주시면 도움이 돼요.",
  },
  IMPROVEMENT: {
    label: "개선하고 싶은 점이 있어요",
    fieldLabel: "문의 내용",
    placeholder: "지금 어떤 점이 아쉬운지 함께 적어주시면 도움이 돼요.",
  },
  PRODUCT_REQUEST: {
    label: "등록하고 싶은 제품이 있어요",
    fieldLabel: "제품명",
    placeholder: "등록을 원하는 제품명을 적어주세요.",
  },
  OTHER: {
    label: "그 밖의 문의가 있어요",
    fieldLabel: "문의 내용",
    placeholder: "궁금하거나 알리고 싶은 내용을 적어주세요.",
  },
};

/** 화면에 보여 주는 차례. DATA_CORRECTION 은 제품 정보 정정 경로에서만 쓰므로 여기 없다. */
export const INQUIRY_CHOICES: readonly InquiryChoice[] = ["BUG_REPORT", "IMPROVEMENT", PRODUCT_REQUEST, "OTHER"];

/** 제품 정보 정정은 유형을 고르지 않고 들어오므로 문구를 따로 둔다. */
export const DATA_CORRECTION_COPY = {
  title: "제품 정보가 정확하지 않나요?",
  fieldLabel: "제보 내용",
  placeholder: "성분이나 용량, 가격 중 무엇이 다른지 실제 정보와 함께 적어주시면 확인이 빨라요.",
} as const;
