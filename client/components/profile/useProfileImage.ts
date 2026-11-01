"use client";

import { useEffect, useRef, useState } from "react";

import { ApiError } from "@/lib/api/client";
import { uploadProfileImage } from "@/lib/api/member";
import { rejectionOf } from "@/lib/domain/attached-image";
import { prepareProfileImage } from "@/lib/interaction/prepare-profile-image";

export function useProfileImage(originalUrl: string | null, onFailure: (error: unknown) => void) {
  const [selection, setSelection] = useState<{ readonly url: string; readonly id?: string } | null>();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();
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
      setError(rejected);
      return;
    }
    const request = ++revision.current;
    releasePreview();
    const url = URL.createObjectURL(file);
    preview.current = url;
    setSelection({ url });
    setUploading(true);
    setError(undefined);
    try {
      const prepared = await prepareProfileImage(file);
      // 다른 사진을 고르거나 지웠으면 이전 선택의 결과를 사용하지 않는다.
      if (request !== revision.current) return;
      const uploaded = await uploadProfileImage(prepared);
      if (request !== revision.current) return;
      setSelection({ url, id: uploaded.imageId });
      setUploading(false);
    } catch (failure: unknown) {
      if (request !== revision.current) return;
      setUploading(false);
      onFailure(failure);
      if (failure instanceof ApiError && failure.status === 429) {
        setError("사진 업로드 요청이 잦아요. 잠시 후 다시 선택해 주세요.");
      } else if (failure instanceof ApiError && failure.status === 413) {
        setError("사진 용량이 커서 올리지 못했어요. 더 작은 사진을 선택해 주세요.");
      } else if (failure instanceof ApiError && failure.status === 400) {
        setError(failure.message);
      } else {
        setError("사진을 올리지 못했어요. 사진을 다시 선택해 주세요.");
      }
    }
  };

  const remove = () => {
    revision.current++;
    releasePreview();
    setSelection(null);
    setUploading(false);
    setError(undefined);
  };

  const src = selection === undefined ? originalUrl : (selection?.url ?? null);
  const changed = selection !== undefined;
  const imageId = selection === null ? null : selection?.id;
  const blocked = uploading || (selection !== undefined && selection !== null && !selection.id);
  return { src, changed, imageId, uploading, error, blocked, select, remove };
}
