"use client";

import { useEffect, useRef, useState } from "react";

import { uploadProfileImage } from "@/lib/api/member";
import { rejectionOf } from "@/lib/domain/attached-image";
import { prepareProfileImage } from "@/lib/interaction/prepare-profile-image";

type Selection = {
  readonly url: string;
  readonly file: File;
  readonly id?: string;
  readonly failed?: boolean;
};

export function useProfileImage(originalUrl: string | null, onFailure: (error: unknown) => boolean) {
  const [selection, setSelection] = useState<Selection | null>();
  // 형식·용량이 맞지 않아 올리지 않은 사진의 이유. 다음 선택이나 삭제 때 지운다.
  const [rejection, setRejection] = useState<string>();
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

  const upload = async (file: File, url: string) => {
    const request = ++revision.current;
    setSelection({ url, file });
    try {
      const prepared = await prepareProfileImage(file);
      // 다른 사진을 고르거나 지웠으면 이전 선택의 결과를 사용하지 않는다.
      if (request !== revision.current) return;
      const uploaded = await uploadProfileImage(prepared);
      if (request !== revision.current) return;
      setSelection({ url, file, id: uploaded.imageId });
    } catch (error: unknown) {
      if (request !== revision.current) return;
      if (onFailure(error)) return;
      setSelection({ url, file, failed: true });
    }
  };

  const select = async (file: File) => {
    const rejected = rejectionOf(file);
    setRejection(rejected);
    if (rejected) return;
    releasePreview();
    const url = URL.createObjectURL(file);
    preview.current = url;
    await upload(file, url);
  };

  // 실패한 사진을 누르면 같은 사진을 다시 올린다.
  const retry = async () => {
    if (!selection?.failed) return;
    await upload(selection.file, selection.url);
  };

  const remove = () => {
    revision.current++;
    releasePreview();
    setSelection(null);
    setRejection(undefined);
  };

  const src = selection === undefined ? originalUrl : (selection?.url ?? null);
  const changed = selection !== undefined;
  const imageId = selection === null ? null : selection?.id;
  const failed = selection?.failed === true;
  const uploading = Boolean(selection) && !selection?.id && !failed;
  return { src, changed, imageId, uploading, failed, rejection, select, retry, remove };
}
