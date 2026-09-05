"use client";

import { useCallback, useState } from "react";

import { usePreviewUrls } from "./usePreviewUrls";

import { IMAGE_MAX_COUNT, uploadFeedbackImages } from "@/lib/api/feedback";
import type { AttachedImage } from "@/lib/domain/attached-image";
import {
  acceptableFiles,
  doneImageIds,
  isBlocked,
  rejectionOf,
  settleUploads,
  uploadFailureMessage,
} from "@/lib/domain/attached-image";

export type { AttachedImage };

type Store = {
  readonly setImages: React.Dispatch<React.SetStateAction<readonly AttachedImage[]>>;
  readonly setRejection: React.Dispatch<React.SetStateAction<string | undefined>>;
  readonly preview: ReturnType<typeof usePreviewUrls>;
};

/** 고른 파일을 붙이고 서버에 올린다. */
const useAdd = (images: readonly AttachedImage[], { setImages, setRejection, preview }: Store) =>
  useCallback(
    async (picked: readonly File[]) => {
      setRejection(undefined);

      const rejected = picked.find(rejectionOf);
      if (rejected) setRejection(rejectionOf(rejected));

      const accepted = acceptableFiles(picked, images.length);
      if (accepted.length === 0) return;

      const added = accepted.map((file) => ({
        key: crypto.randomUUID(),
        file,
        previewUrl: preview.create(file),
        status: "uploading" as const,
      }));

      setImages((current) => [...current, ...added]);

      try {
        const { imageIds } = await uploadFeedbackImages(accepted);
        setImages((current) => settleUploads(current, added, imageIds));
      } catch (error) {
        setImages((current) => settleUploads(current, added));
        setRejection(uploadFailureMessage(error));
      }
    },
    [images.length, preview, setImages, setRejection],
  );

/*
 * 올리는 중에는 지울 수 없다. 지운 뒤 응답이 오면 화면에 없는 이미지의 imageId 를
 * 들고 있게 된다. 실패한 이미지는 지울 수 있어야 한다. 지우지 못하면 제출이 막혀
 * 문의를 아예 보낼 수 없다.
 */
const useRemove = ({ setImages, setRejection, preview }: Store) =>
  useCallback(
    (key: string) => {
      setRejection(undefined);
      setImages((current) => {
        const target = current.find((image) => image.key === key);
        if (!target || target.status === "uploading") return current;

        preview.revoke(target.previewUrl);

        return current.filter((image) => image.key !== key);
      });
    },
    [preview, setImages, setRejection],
  );

/** 첨부한 이미지와 각각의 업로드 상태. 제출 가능 여부가 이 상태에 달려 있다. */
export function useImageUpload() {
  const [images, setImages] = useState<readonly AttachedImage[]>([]);
  const [rejection, setRejection] = useState<string | undefined>(undefined);
  const preview = usePreviewUrls();
  const store = { setImages, setRejection, preview };

  const clear = useCallback(() => {
    preview.revokeAll();
    setImages([]);
    setRejection(undefined);
  }, [preview]);

  return {
    images,
    rejection,
    add: useAdd(images, store),
    remove: useRemove(store),
    clear,
    uploading: images.some((image) => image.status === "uploading"),
    blocked: isBlocked(images),
    full: images.length >= IMAGE_MAX_COUNT,
    imageIds: doneImageIds(images),
  };
}
