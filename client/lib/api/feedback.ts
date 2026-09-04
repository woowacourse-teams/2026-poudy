import type { FeedbackImageUploadResponse, FeedbackRequest } from "@poudy/api/api.zod";

import { apiPost, apiPostForm } from "./client";

/** 화면에 두는 문의 유형. DATA_CORRECTION 은 제품 정보 정정 경로에서만 쓴다. */
export type FeedbackType = FeedbackRequest["type"];

export const CONTENT_MIN_LENGTH = 10;
export const CONTENT_MAX_LENGTH = 2000;
export const PRODUCT_NAME_MAX_LENGTH = 200;
export const BRAND_NAME_MAX_LENGTH = 100;

export const IMAGE_MAX_COUNT = 5;
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/**
 * 서버가 아직 HEIC 를 받지 못한다. 나중에 받게 되면 이 값만 고치면 되도록
 * input 의 accept 와 파일 검사가 같은 목록을 본다.
 */
export const IMAGE_ACCEPTED_TYPES = ["image/jpeg", "image/png"] as const;
export const IMAGE_ACCEPT_ATTRIBUTE = IMAGE_ACCEPTED_TYPES.join(",");

export const isAcceptedImageType = (type: string): boolean =>
  IMAGE_ACCEPTED_TYPES.some((accepted) => accepted === type);

type SendFeedbackInput = {
  readonly type: FeedbackType;
  readonly content: string;
  /** 문의를 연 화면의 경로. 서버 필드 이름은 path 다. */
  readonly originPath: string;
  readonly imageIds?: readonly string[];
};

export const sendFeedback = ({ type, content, originPath, imageIds }: SendFeedbackInput): Promise<void> =>
  apiPost("/api/feedback", {
    type,
    content,
    path: originPath,
    ...(imageIds?.length ? { imageIds } : {}),
  });

/** 한 번에 여러 장을 올린다. 성공하면 올린 순서대로 imageIds 가 온다. */
export const uploadFeedbackImages = (files: readonly File[]): Promise<FeedbackImageUploadResponse> => {
  const form = new FormData();
  for (const file of files) form.append("images", file);

  return apiPostForm("/api/feedback/images", form);
};

type RequestProductInput = {
  readonly productName: string;
  readonly brandName?: string;
};

/** 202 를 돌려주며 등록 완료가 아니라 접수만 뜻한다. */
export const requestProductRegistration = ({ productName, brandName }: RequestProductInput): Promise<void> =>
  apiPost("/api/product-requests", {
    productName,
    ...(brandName?.trim() ? { brandName: brandName.trim() } : {}),
  });
