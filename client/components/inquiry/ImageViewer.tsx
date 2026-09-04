"use client";

import { useRef } from "react";

import { Icon } from "@/components/ui/icons/Icon";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import type { AttachedImage } from "@/lib/hooks/useImageUpload";

/** 첨부한 사진을 크게 본다. 작성 화면 위에 겹쳐 나타난다. */
export function ImageViewer({
  images,
  openKey,
  onClose,
  onRemove,
}: {
  readonly images: readonly AttachedImage[];
  readonly openKey: string;
  readonly onClose: () => void;
  readonly onRemove: (key: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, true, onClose);

  const index = images.findIndex((image) => image.key === openKey);
  const image = images[index];
  if (!image) return null;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label="첨부한 사진"
      className="fixed inset-0 z-50 flex flex-col bg-[#0B0C0E]"
    >
      <div className="flex items-center justify-between px-4 pt-12">
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="flex size-9 items-center justify-center rounded-full bg-[#111317B8] text-white"
        >
          <Icon name="x" size={18} />
        </button>

        <span className="text-[13px] text-white">
          {index + 1} / {images.length}
        </span>

        <button
          type="button"
          onClick={() => {
            onRemove(image.key);
            onClose();
          }}
          aria-label="이 사진 삭제"
          className="flex size-9 items-center justify-center rounded-full bg-[#111317B8] text-white"
        >
          <Icon name="trash" size={18} />
        </button>
      </div>

      {/*
       * min-h-0 이 없으면 flex 아이템이 내용만큼 늘어나 긴 사진이 화면 밖으로 나간다.
       * 담는 자리를 먼저 정하고 그 안에서 비율을 지켜 줄인다.
       */}
      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.previewUrl} alt={`첨부한 사진 ${index + 1}`} className="max-h-full max-w-full object-contain" />
      </div>
    </div>
  );
}
