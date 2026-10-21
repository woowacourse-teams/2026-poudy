"use client";

import { useCallback, useState } from "react";

import { usePreviewUrls } from "./usePreviewUrls";

import { IMAGE_MAX_COUNT, uploadFeedbackImages } from "@/lib/api/feedback";
import type { AttachedImage, UploadFailure } from "@/lib/domain/attached-image";
import {
  acceptableFiles,
  attachmentStatusOf,
  isBlocked,
  rejectionOf,
  settleUploads,
  uploadedImageIds,
  uploadFailureOf,
} from "@/lib/domain/attached-image";

export type { AttachedImage };

type Store = {
  readonly setImages: React.Dispatch<React.SetStateAction<readonly AttachedImage[]>>;
  readonly setRejection: React.Dispatch<React.SetStateAction<string | undefined>>;
  readonly setFailure: React.Dispatch<React.SetStateAction<UploadFailure | undefined>>;
  readonly preview: ReturnType<typeof usePreviewUrls>;
};

/** 파일을 올리고 결과를 그 사진들에 붙인다. 고를 때와 다시 시도할 때가 함께 쓴다. */
const upload = async (files: readonly File[], keys: readonly string[], store: Store) => {
  try {
    const { imageIds } = await uploadFeedbackImages(files);
    store.setImages((current) => settleUploads(current, keys, imageIds));
  } catch (error) {
    store.setImages((current) => settleUploads(current, keys));
    store.setFailure(uploadFailureOf(error));
  }
};

/** 고른 파일을 붙이고 서버에 올린다. 규격에 맞지 않는 파일은 고르는 순간 까닭을 알린다(FEEDBACK F06). */
const useAdd = (images: readonly AttachedImage[], store: Store) =>
  useCallback(
    (picked: readonly File[]) => {
      const rejected = picked.find(rejectionOf);
      store.setRejection(rejected ? rejectionOf(rejected) : undefined);

      const accepted = acceptableFiles(picked, images.length);
      if (accepted.length === 0) return;

      const added = accepted.map((file) => ({
        key: crypto.randomUUID(),
        file,
        previewUrl: store.preview.create(file),
        status: "uploading" as const,
      }));

      store.setImages((current) => [...current, ...added]);
      void upload(
        accepted,
        added.map((image) => image.key),
        store,
      );
    },
    [images.length, store],
  );

/** 올리지 못한 사진 한 장을 다시 올린다. 키가 그대로라 포커스가 그 사진에 남는다. */
const useRetry = (images: readonly AttachedImage[], store: Store) =>
  useCallback(
    (key: string) => {
      const target = images.find((image) => image.key === key);
      if (!target || target.status !== "failed") return;

      store.setRejection(undefined);
      store.setImages((current) =>
        current.map((image) => (image.key === key ? { ...image, status: "uploading" as const } : image)),
      );
      void upload([target.file], [key], store);
    },
    [images, store],
  );

/**
 * 사진을 목록에서 뺀다. 올리는 중인 사진이면 업로드 취소와 같다. 늦게 도착한 응답은 목록에 없는 사진이라
 * settleUploads 가 무시한다.
 */
const useRemove = (store: Store) =>
  useCallback(
    (key: string) => {
      store.setRejection(undefined);
      store.setImages((current) => {
        const target = current.find((image) => image.key === key);
        if (!target) return current;

        store.preview.revoke(target.previewUrl);
        return current.filter((image) => image.key !== key);
      });
    },
    [store],
  );

/** 첨부한 사진과 각각의 업로드 상태. 제출할 수 있는지가 이 상태에 달려 있다. */
export function useImageUpload() {
  const [images, setImages] = useState<readonly AttachedImage[]>([]);
  const [rejection, setRejection] = useState<string | undefined>(undefined);
  const [failure, setFailure] = useState<UploadFailure | undefined>(undefined);
  const preview = usePreviewUrls();
  // 묶음은 한 번만 만든다. setter 와 미리보기 함수는 렌더마다 같으므로 처음 값을 그대로 써도 된다.
  const [store] = useState<Store>(() => ({ setImages, setRejection, setFailure, preview }));

  const remove = useRemove(store);
  const clear = useCallback(() => {
    preview.revokeAll();
    setImages([]);
    setRejection(undefined);
    setFailure(undefined);
  }, [preview]);

  return {
    images,
    add: useAdd(images, store),
    retry: useRetry(images, store),
    remove,
    clear,
    ...attachmentStatusOf(images, rejection, failure),
    uploading: images.some((image) => image.status === "uploading"),
    failed: images.some((image) => image.status === "failed"),
    blocked: isBlocked(images),
    full: images.length >= IMAGE_MAX_COUNT,
    imageIds: uploadedImageIds(images),
  };
}
