"use client";

import { Button } from "@poudy/design-system/button";
import { useId, useRef } from "react";

import { ProfileAvatar } from "./ProfileAvatar";

import { IMAGE_ACCEPT_ATTRIBUTE } from "@/lib/api/feedback";

export function ProfileImageField({
  src,
  uploading,
  error,
  disabled,
  onSelect,
  onRemove,
}: {
  readonly src: string | null;
  readonly uploading: boolean;
  readonly error?: string;
  readonly disabled?: boolean;
  readonly onSelect: (file: File) => void;
  readonly onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const messageId = useId();

  return (
    <section className="flex flex-col items-center gap-3" aria-label="프로필 사진">
      <ProfileAvatar src={src} />
      <div className="flex items-center gap-2">
        <input
          ref={input}
          type="file"
          accept={IMAGE_ACCEPT_ATTRIBUTE}
          aria-label="프로필 사진 선택"
          className="sr-only"
          disabled={disabled}
          aria-describedby={messageId}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onSelect(file);
          }}
        />
        <Button type="button" variant="ghost" disabled={disabled} onClick={() => input.current?.click()}>
          {uploading ? "다른 사진 선택" : "사진 선택"}
        </Button>
        {src || uploading ? (
          <Button type="button" variant="subtle" disabled={disabled} onClick={onRemove}>
            사진 삭제
          </Button>
        ) : null}
      </div>
      <p
        id={messageId}
        role={error ? "alert" : "status"}
        className={error ? "text-caption text-danger-action" : "text-caption text-text-secondary"}
      >
        {error ?? (uploading ? "사진을 올리고 있어요. 잠시만 기다려 주세요." : "JPG, PNG, HEIC · 최대 5MB")}
      </p>
    </section>
  );
}
