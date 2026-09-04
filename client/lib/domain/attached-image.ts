import { ApiError } from "@/lib/api/client";
import { IMAGE_MAX_BYTES, IMAGE_MAX_COUNT, isAcceptedImageType } from "@/lib/api/feedback";

export type AttachedImage = {
  readonly key: string;
  readonly file: File;
  /** 미리보기 주소. 문서를 떠날 때 되돌려준다. */
  readonly previewUrl: string;
  readonly status: "uploading" | "done" | "failed";
  /** 업로드를 마쳐야 생긴다. 이 값이 있어야 문의에 함께 실을 수 있다. */
  readonly imageId?: string;
};

/** 고른 파일을 받을 수 없는 이유. 없으면 받는다. */
export const rejectionOf = (file: File): string | undefined => {
  if (!isAcceptedImageType(file.type)) {
    /* 아이폰은 사진을 HEIC 로 저장한다. 형식만 알리면 무엇을 해야 할지 알 수 없다. */
    return `${file.name} 은 JPG 나 PNG 가 아니에요. 사진을 JPG 나 PNG 로 저장한 뒤 다시 첨부해주세요.`;
  }

  if (file.size > IMAGE_MAX_BYTES) return `${file.name} 은 5MB 를 넘어요. 더 작은 사진을 첨부해주세요.`;

  return undefined;
};

export const uploadFailureMessage = (error: unknown): string => {
  if (error instanceof ApiError && error.status === 413) {
    return "이미지 용량이 커서 올리지 못했어요. 더 작은 사진을 첨부해주세요.";
  }
  if (error instanceof ApiError && error.status === 429) {
    return "요청이 잦아 올리지 못했어요. 잠시 뒤 다시 시도해주세요.";
  }

  return "이미지를 올리지 못했어요. 잠시 뒤 다시 시도해주세요.";
};

/** 다섯 장을 넘겨 고르면 조용히 버리지 않고 받을 수 있는 데까지만 받는다. */
export const acceptableFiles = (picked: readonly File[], attachedCount: number): readonly File[] => {
  const room = IMAGE_MAX_COUNT - attachedCount;
  if (room <= 0) return [];

  return picked.filter((file) => !rejectionOf(file)).slice(0, room);
};

/** 올린 결과를 붙인다. imageId 를 받지 못한 자리는 실패로 둔다. */
export const settleUploads = (
  current: readonly AttachedImage[],
  added: readonly AttachedImage[],
  imageIds?: readonly string[],
): readonly AttachedImage[] =>
  current.map((image) => {
    const index = added.findIndex((one) => one.key === image.key);
    if (index < 0) return image;

    const imageId = imageIds?.[index];
    if (!imageId) return { ...image, status: "failed" as const };

    return { ...image, status: "done" as const, imageId };
  });

/** 올리는 중인 것이 하나라도 있거나 실패한 것이 남아 있으면 보낼 수 없다. */
export const isBlocked = (images: readonly AttachedImage[]): boolean =>
  images.some((image) => image.status === "uploading" || image.status === "failed");

export const doneImageIds = (images: readonly AttachedImage[]): readonly string[] =>
  images.flatMap((image) => {
    if (!image.imageId) return [];

    return [image.imageId];
  });
