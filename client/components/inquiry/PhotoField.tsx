"use client";

import { ImageAttachment } from "@poudy/design-system/image-attachment";
import { useState } from "react";

import { ImageViewer } from "./ImageViewer";

import { IMAGE_ACCEPT_ATTRIBUTE, IMAGE_MAX_COUNT } from "@/lib/api/feedback";
import type { useImageUpload } from "@/lib/hooks/useImageUpload";

type Upload = ReturnType<typeof useImageUpload>;

/**
 * 사진 첨부(명세 S40a · S40e 이미지 첨부 섹션). 고르기와 상태 표시는 디자인 시스템 ImageAttachment 가,
 * 업로드와 취소 · 다시 시도는 useImageUpload 가 맡는다. 올린 사진을 누르면 전체 화면(S40d)으로 본다.
 */
export function PhotoField({ upload }: { readonly upload: Upload }) {
  const [openKey, setOpenKey] = useState<string | undefined>(undefined);
  // 뷰어를 닫으면 연 사진으로 포커스를 돌려준다(A11Y D02). 연 요소는 누른 그 순간의 포커스다.
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  const uploaded = upload.images.filter((image) => image.status === "uploaded");

  return (
    <>
      <ImageAttachment
        label="사진"
        optional
        images={upload.images.map(({ key, previewUrl, status }) => ({ key, src: previewUrl, status }))}
        max={IMAGE_MAX_COUNT}
        accept={IMAGE_ACCEPT_ATTRIBUTE}
        onSelect={upload.add}
        onRemove={upload.remove}
        onCancel={upload.remove}
        onRetry={upload.retry}
        onOpen={(key) => {
          setOpener(document.activeElement instanceof HTMLElement ? document.activeElement : null);
          setOpenKey(key);
        }}
        status={upload.status}
        error={upload.error}
      />

      {openKey ? (
        <ImageViewer
          images={uploaded}
          initialKey={openKey}
          onRemove={upload.remove}
          onClose={(focusAdd) => {
            setOpenKey(undefined);
            // 사진을 모두 지웠으면 연 사진이 사라졌으므로 사진 추가 버튼으로 보낸다.
            const target = focusAdd || !opener?.isConnected ? addButton() : opener;
            target?.focus();
          }}
        />
      ) : null}
    </>
  );
}

const addButton = () => document.querySelector<HTMLElement>('button[aria-label="사진 추가"]');
