import {
  BRAND_NAME_MAX_LENGTH,
  CONTENT_MAX_LENGTH,
  CONTENT_MIN_LENGTH,
  PRODUCT_NAME_MAX_LENGTH,
} from "@/lib/api/feedback";

/**
 * 입력이 서버 제약을 지키는지 본다. 서버가 400 으로 거절할 요청을 미리 막고,
 * 무엇이 모자란지 그 자리에서 알린다.
 *
 * 아직 아무것도 적지 않은 칸은 잘못이 아니다. 화면에 들어오자마자 붉은 글씨가
 * 깔리면 처음 온 사람에게는 자기가 뭘 잘못한 것처럼 보인다.
 */
export const contentError = (value: string): string | undefined => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;

  if (trimmed.length < CONTENT_MIN_LENGTH) {
    return `${CONTENT_MIN_LENGTH}자 이상 적어주세요. 지금 ${trimmed.length}자예요.`;
  }

  /* 입력 칸이 maxLength 로 막고 있어 여기까지 오지 않지만, 붙여넣기 같은 경로를 위해 남긴다. */
  if (trimmed.length > CONTENT_MAX_LENGTH) return `${CONTENT_MAX_LENGTH.toLocaleString("ko-KR")}자까지 적을 수 있어요.`;

  return undefined;
};

export const productNameError = (value: string): string | undefined => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;

  if (trimmed.length > PRODUCT_NAME_MAX_LENGTH) return `${PRODUCT_NAME_MAX_LENGTH}자까지 적을 수 있어요.`;

  return undefined;
};

/** 브랜드는 선택이므로 비어 있는 것은 잘못이 아니다. */
export const brandNameError = (value: string): string | undefined => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;

  if (trimmed.length > BRAND_NAME_MAX_LENGTH) return `${BRAND_NAME_MAX_LENGTH}자까지 적을 수 있어요.`;

  return undefined;
};
