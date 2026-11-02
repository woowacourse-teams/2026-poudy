"use client";

import { useEffect, useRef, useState } from "react";

import { ApiError } from "@/lib/api/client";
import { uploadProfileImage } from "@/lib/api/member";
import { rejectionOf } from "@/lib/domain/attached-image";
import { prepareProfileImage } from "@/lib/interaction/prepare-profile-image";

export function useProfileImage(originalUrl: string | null, onFailure: (error: unknown) => boolean) {
  const [selection, setSelection] = useState<{ readonly url: string; readonly id: string } | null>();
  const [uploading, setUploading] = useState(false);
  // 닫히는 동안 문구가 비지 않게 마지막 문구는 남기고 열림만 끈다.
  const [failure, setFailure] = useState<{ readonly message: string; readonly open: boolean }>();
  const revision = useRef(0);
  const preview = useRef<string | null>(null);

  const releasePreview = () => {
    if (preview.current) URL.revokeObjectURL(preview.current);
    preview.current = null;
  };

  useEffect(
    () => () => {
      revision.current++;
      if (preview.current) URL.revokeObjectURL(preview.current);
    },
    [],
  );

  const select = async (file: File) => {
    const rejected = rejectionOf(file);
    if (rejected) {
      setFailure({ message: rejected, open: true });
      return;
    }
    const request = ++revision.current;
    setUploading(true);
    try {
      const prepared = await prepareProfileImage(file);
      // 다른 사진을 고르거나 지웠으면 이전 선택의 결과를 사용하지 않는다.
      if (request !== revision.current) return;
      const uploaded = await uploadProfileImage(prepared);
      if (request !== revision.current) return;
      // 미리보기는 저장할 수 있게 된 뒤에 바꾼다. 올리는 동안에는 이전 사진을 그대로 둔다.
      releasePreview();
      const url = URL.createObjectURL(file);
      preview.current = url;
      setSelection({ url, id: uploaded.imageId });
      setUploading(false);
    } catch (error: unknown) {
      if (request !== revision.current) return;
      setUploading(false);
      if (onFailure(error)) return;
      if (error instanceof ApiError && error.status === 429) {
        setFailure({ message: "업로드 요청이 잦아요. 잠시 후 다시 선택해 주세요.", open: true });
      } else if (error instanceof ApiError && error.status === 413) {
        setFailure({ message: "사진 용량이 커요. 더 작은 사진을 선택해 주세요.", open: true });
      } else if (error instanceof ApiError && error.status === 400) {
        setFailure({ message: error.message, open: true });
      } else {
        setFailure({ message: "잠시 후 사진을 다시 선택해 주세요.", open: true });
      }
    }
  };

  const dismissFailure = () => {
    if (failure) setFailure({ ...failure, open: false });
  };

  const remove = () => {
    revision.current++;
    releasePreview();
    setSelection(null);
    setUploading(false);
  };

  const src = selection === undefined ? originalUrl : (selection?.url ?? null);
  const changed = selection !== undefined;
  const imageId = selection === null ? null : selection?.id;
  return { src, changed, imageId, uploading, failure, dismissFailure, select, remove };
}
