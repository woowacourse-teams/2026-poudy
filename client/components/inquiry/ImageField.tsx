"use client";

import { useRef } from "react";

import { Icon } from "@/components/ui/icons/Icon";
import { IMAGE_ACCEPT_ATTRIBUTE, IMAGE_MAX_COUNT } from "@/lib/api/feedback";
import type { AttachedImage } from "@/lib/hooks/useImageUpload";

function Thumbnail({
  image,
  index,
  onOpen,
  onRemove,
}: {
  readonly image: AttachedImage;
  readonly index: number;
  readonly onOpen: (key: string) => void;
  readonly onRemove: (key: string) => void;
}) {
  const uploading = image.status === "uploading";

  return (
    <li className="relative size-16 shrink-0">
      <button
        type="button"
        onClick={() => onOpen(image.key)}
        aria-label={`첨부한 사진 ${index + 1} 크게 보기`}
        className="size-full overflow-hidden rounded-xl border border-border"
      >
        {/* 사용자가 방금 고른 파일이라 next/image 의 최적화 대상이 아니다. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.previewUrl} alt="" className="size-full object-cover" />
      </button>

      {uploading ? (
        <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-[#20212466]">
          <span
            role="status"
            aria-label={`사진 ${index + 1} 올리는 중`}
            className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent"
          />
        </span>
      ) : (
        /* 올리는 중에는 지울 수 없다. 지운 뒤 응답이 오면 화면에 없는 사진의 imageId 가 남는다. */
        <button
          type="button"
          onClick={() => onRemove(image.key)}
          aria-label={`첨부한 사진 ${index + 1} 삭제`}
          className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-action text-action-text"
        >
          <Icon name="x" size={12} strokeWidth={2.5} />
        </button>
      )}

      {image.status === "failed" ? (
        <span className="absolute inset-x-0 -bottom-4 text-center text-[10px] text-brand">실패</span>
      ) : null}
    </li>
  );
}

export function ImageField({
  images,
  rejection,
  full,
  onAdd,
  onRemove,
  onOpen,
}: {
  readonly images: readonly AttachedImage[];
  readonly rejection?: string;
  readonly full: boolean;
  readonly onAdd: (files: readonly File[]) => void;
  readonly onRemove: (key: string) => void;
  readonly onOpen: (key: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="flex flex-col gap-2">
      <p className="text-[13px] font-semibold text-text-primary">이미지</p>

      <ul className="flex flex-wrap items-start gap-2">
        <li>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={full}
            aria-label="이미지 첨부"
            className="flex size-16 items-center justify-center rounded-xl border border-border bg-background text-text-secondary disabled:opacity-40"
          >
            <Icon name="plus" size={20} />
          </button>

          <input
            ref={inputRef}
            type="file"
            accept={IMAGE_ACCEPT_ATTRIBUTE}
            multiple
            hidden
            onChange={(event) => {
              onAdd([...(event.target.files ?? [])]);
              /* 같은 파일을 다시 고를 수 있도록 값을 비운다. */
              event.target.value = "";
            }}
          />
        </li>

        {images.map((image, index) => (
          <Thumbnail key={image.key} image={image} index={index} onOpen={onOpen} onRemove={onRemove} />
        ))}
      </ul>

      <p className="text-[11px] text-text-secondary">
        {images.length} / {IMAGE_MAX_COUNT} · 장당 5MB · JPG, PNG
      </p>

      {rejection ? (
        <p role="alert" className="text-[12px] text-brand">
          {rejection}
        </p>
      ) : null}
    </section>
  );
}
