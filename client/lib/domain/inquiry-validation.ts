import type { FieldRule } from "@poudy/design-system/field-rule";

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
/** 내용의 글자 수. 보낼 때 앞뒤 공백을 지우므로 그 기준으로 센다. 중간 공백은 센다(#823). */
export const contentLength = (value: string): number => value.trim().length;

export const contentError = (value: string): string | undefined => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;

  if (trimmed.length < CONTENT_MIN_LENGTH) {
    return `${CONTENT_MIN_LENGTH}자 이상 적어 주세요. 지금 ${trimmed.length}자예요.`;
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

/*
 * 칸마다 넘기는 검사 규칙. 오류를 언제 보여 줄지는 입력 부품이 정한다(FEEDBACK F06: 칸을 벗어날 때 처음 검사하고,
 * 한 번 오류가 난 칸은 입력할 때마다 다시 검사한다). 제출 버튼을 켤지 정할 때도 같은 함수를 부른다.
 */
export const contentRule: FieldRule = { validate: contentError };
export const productNameRule: FieldRule = { validate: productNameError };
export const brandNameRule: FieldRule = { validate: brandNameError };
