import type { FeedbackImageUploadResponse, FeedbackRequest } from "@poudy/api/api.zod";

import { apiPost, apiPostForm } from "./client";

/** 화면에 두는 문의 유형. 제품 정보 정정은 유형이 아니라 requestProductCorrection 으로 보낸다. */
export type FeedbackType = FeedbackRequest["type"];

export const CONTENT_MIN_LENGTH = 10;
export const CONTENT_MAX_LENGTH = 2000;
export const PRODUCT_NAME_MAX_LENGTH = 200;
export const BRAND_NAME_MAX_LENGTH = 100;

export const IMAGE_MAX_COUNT = 5;
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/**
 * 서버가 JPEG, PNG, HEIC 를 받는다. HEIC 는 서버가 JPEG 로 다시 저장한다.
 *
 * input 의 accept 와 파일 검사가 같은 목록을 본다. 형식이 늘거나 줄면 이 값만 고친다.
 */
export const IMAGE_ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif"] as const;
export const IMAGE_ACCEPT_ATTRIBUTE = IMAGE_ACCEPTED_TYPES.join(",");

export const isAcceptedImageType = (type: string): boolean =>
  IMAGE_ACCEPTED_TYPES.some((accepted) => accepted === type);

type SendFeedbackInput = {
  readonly type: FeedbackType;
  readonly content: string;
  /** 문의를 연 화면의 경로. 서버 필드 이름은 path 다. 모르면 보내지 않는다. */
  readonly originPath?: string;
  readonly imageIds?: readonly string[];
};

export const sendFeedback = ({ type, content, originPath, imageIds }: SendFeedbackInput): Promise<void> =>
  apiPost("/api/feedbacks", {
    type,
    content,
    // JSON 으로 바꿀 때 undefined 는 빠지므로 모르는 경로는 필드째 보내지 않는다.
    path: originPath,
    ...(imageIds?.length ? { imageIds } : {}),
  });

type RequestProductCorrectionInput = {
  readonly productId: number;
  readonly content: string;
  readonly imageIds?: readonly string[];
};

/** 대상 제품은 주소로 보내므로 본문에 유형과 경로가 없다. 없는 제품이면 404 가 온다. */
export const requestProductCorrection = ({
  productId,
  content,
  imageIds,
}: RequestProductCorrectionInput): Promise<void> =>
  apiPost(`/api/products/${productId}/correction-requests`, {
    content,
    ...(imageIds?.length ? { imageIds } : {}),
  });

/** 한 번에 여러 장을 올린다. 성공하면 올린 순서대로 imageIds 가 온다. 의견과 정정 요청이 함께 쓴다. */
export const uploadFeedbackImages = (files: readonly File[]): Promise<FeedbackImageUploadResponse> => {
  const form = new FormData();
  for (const file of files) form.append("images", file);

  return apiPostForm("/api/inquiry-images", form);
};

type RequestProductInput = {
  readonly productName: string;
  readonly brandName?: string;
};

/** 202 를 돌려주며 등록 완료가 아니라 접수만 뜻한다. */
export const requestProductRegistration = ({ productName, brandName }: RequestProductInput): Promise<void> =>
  apiPost("/api/products/registration-requests", {
    productName,
    ...(brandName?.trim() ? { brandName: brandName.trim() } : {}),
  });
