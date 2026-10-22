import { withJosa } from "./format";

import { ApiError } from "@/lib/api/client";
import { IMAGE_MAX_BYTES, IMAGE_MAX_COUNT, isAcceptedImageType } from "@/lib/api/feedback";

/** 디자인 시스템 ImageAttachment 의 상태와 같은 이름을 쓴다. */
export type AttachedImageStatus = "uploading" | "uploaded" | "failed";

export type AttachedImage = {
  readonly key: string;
  readonly file: File;
  /** 미리보기 주소. 문서를 떠날 때 되돌려준다. */
  readonly previewUrl: string;
  readonly status: AttachedImageStatus;
  /** 업로드를 마쳐야 생긴다. 이 값이 있어야 문의에 함께 실을 수 있다. */
  readonly imageId?: string;
};

/** 마지막으로 실패한 업로드의 까닭. 용량과 잦은 요청은 다시 눌러도 같으므로 따로 알린다. */
export type UploadFailure = "too-large" | "rate-limited" | "other";

const MB = 1024 * 1024;

/** 파일 크기를 MB 로 소수 첫째 자리까지 적는다. */
const megabytes = (bytes: number): string => `${Number((bytes / MB).toFixed(1))}MB`;

/**
 * 고른 파일을 받을 수 없는 이유. 없으면 받는다.
 * 무엇이 왜 안 되는지 적는다(명세 CONTENT W07 · IMAGE P04: '○○가 7.4MB라 최대 5MB를 넘어요').
 */
export const rejectionOf = (file: File): string | undefined => {
  if (!isAcceptedImageType(file.type)) {
    return `${withJosa(file.name, "은/는")} 사진 파일이 아니에요. JPG나 PNG, HEIC 사진을 첨부해 주세요.`;
  }

  if (file.size > IMAGE_MAX_BYTES) {
    return `${withJosa(file.name, "이/가")} ${megabytes(file.size)}라 최대 ${megabytes(IMAGE_MAX_BYTES)}를 넘어요. 더 작은 사진을 첨부해 주세요.`;
  }

  return undefined;
};

export const uploadFailureOf = (error: unknown): UploadFailure => {
  if (error instanceof ApiError && error.status === 413) return "too-large";
  if (error instanceof ApiError && error.status === 429) return "rate-limited";
  return "other";
};

/** 다섯 장을 넘겨 고르면 조용히 버리지 않고 받을 수 있는 데까지만 받는다. */
export const acceptableFiles = (picked: readonly File[], attachedCount: number): readonly File[] => {
  const room = IMAGE_MAX_COUNT - attachedCount;
  if (room <= 0) return [];

  return picked.filter((file) => !rejectionOf(file)).slice(0, room);
};

/**
 * 올린 결과를 붙인다. imageId 를 받지 못한 자리는 실패로 둔다.
 * 그 사이 취소해 목록에서 빠진 사진은 current 에 없으므로 결과가 와도 되살아나지 않는다.
 */
export const settleUploads = (
  current: readonly AttachedImage[],
  keys: readonly string[],
  imageIds?: readonly string[],
): readonly AttachedImage[] =>
  current.map((image) => {
    const index = keys.indexOf(image.key);
    if (index < 0) return image;

    const imageId = imageIds?.[index];
    if (!imageId) return { ...image, status: "failed" as const, imageId: undefined };

    return { ...image, status: "uploaded" as const, imageId };
  });

/** 올리는 중인 것이 하나라도 있거나 실패한 것이 남아 있으면 보낼 수 없다. */
export const isBlocked = (images: readonly AttachedImage[]): boolean =>
  images.some((image) => image.status !== "uploaded");

export const uploadedImageIds = (images: readonly AttachedImage[]): readonly string[] =>
  images.flatMap((image) => {
    if (!image.imageId) return [];
    return [image.imageId];
  });

const countOf = (images: readonly AttachedImage[], status: AttachedImageStatus): number =>
  images.filter((image) => image.status === status).length;

const FAILURE_MESSAGE: Record<Exclude<UploadFailure, "other">, string> = {
  "too-large": "사진 용량이 커서 올리지 못했어요. 더 작은 사진을 첨부해 주세요.",
  "rate-limited": "요청이 잦아 올리지 못했어요. 잠시 후 다시 시도해 주세요.",
};

const statusLineOf = (total: number, uploading: number): string => {
  if (uploading > 0) return `${total - uploading} / ${IMAGE_MAX_COUNT}장 · ${uploading}장 올리는 중 · 장당 5MB 이하`;
  return `${total} / ${IMAGE_MAX_COUNT}장 · 장당 5MB 이하 · JPG, PNG, HEIC`;
};

/**
 * 사진 줄 아래 상태 줄(명세 R969J · IAOoG · rgAam). 같은 자리에서 문구만 바뀐다.
 * 고른 파일을 거절했으면 그 까닭을, 올리지 못한 사진이 있으면 실패를 오류로 보여 준다.
 */
export const attachmentStatusOf = (
  images: readonly AttachedImage[],
  rejection: string | undefined,
  failure: UploadFailure | undefined,
): { readonly status: string; readonly error?: string } => {
  const uploading = countOf(images, "uploading");
  const failed = countOf(images, "failed");
  const status = statusLineOf(images.length, uploading);

  if (rejection) return { status, error: rejection };
  if (failed === 0) return { status };
  if (failure && failure !== "other") return { status, error: FAILURE_MESSAGE[failure] };

  return { status, error: `${failed}장을 올리지 못했어요. 사진을 눌러 다시 시도해 주세요.` };
};
