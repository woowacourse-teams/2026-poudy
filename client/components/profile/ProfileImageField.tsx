"use client";

import { cn } from "@poudy/design-system/cn";
import { Icon } from "@poudy/design-system/icon";
import { useId, useRef } from "react";

import { ProfileAvatar } from "./ProfileAvatar";

import { IMAGE_ACCEPT_ATTRIBUTE } from "@/lib/api/feedback";

const UPLOAD_FAILED = "사진을 올리지 못했어요. 사진을 누르면 다시 올려요.";

const captionOf = ({
  uploading,
  failed,
  rejection,
}: {
  readonly uploading: boolean;
  readonly failed: boolean;
  readonly rejection?: string;
}): string => {
  if (rejection) return rejection;
  if (failed) return UPLOAD_FAILED;
  if (uploading) return "사진을 올리고 있어요.";
  return "";
};

/**
 * 사진을 누르면 고르거나 바꾸고, 실패한 사진을 누르면 다시 올린다. 사진이 있으면 오른쪽 위 ✕ 로 지운다.
 * 누를 수 있다는 것을 알리려고 오른쪽 아래에 표지를 늘 겹친다. 사진이 없으면 추가, 있으면 바꾸기 표지다. 올리는 중에는 숨기고, 실패하면 다시 올리기 표지로 바꾼다.
 */
export function ProfileImageField({
  src,
  uploading,
  failed,
  rejection,
  disabled,
  onSelect,
  onRetry,
  onRemove,
}: {
  readonly src: string | null;
  readonly uploading: boolean;
  readonly failed: boolean;
  readonly rejection?: string;
  readonly disabled?: boolean;
  readonly onSelect: (file: File) => void;
  readonly onRetry: () => void;
  readonly onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const messageId = useId();
  const caption = captionOf({ uploading, failed, rejection });
  const alerting = failed || Boolean(rejection);
  let buttonLabel = "프로필 사진 추가";
  if (src) buttonLabel = "프로필 사진 바꾸기";
  if (failed) buttonLabel = "사진 다시 올리기";
  let badgeIcon: "photo-plus" | "photo-edit" = "photo-plus";
  if (src) badgeIcon = "photo-edit";
  let messageRole = "status";
  if (alerting) messageRole = "alert";

  return (
    <section className="flex flex-col items-center gap-3" aria-label="프로필 사진">
      <div className="relative">
        <button
          type="button"
          aria-label={buttonLabel}
          aria-describedby={messageId}
          aria-busy={uploading || undefined}
          disabled={disabled}
          onClick={() => {
            if (failed) onRetry();
            else input.current?.click();
          }}
          className="pressable relative block rounded-full"
        >
          <ProfileAvatar src={src} className={cn("size-24", failed && "ring-2 ring-danger-action ring-offset-0")} />
          {uploading && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-scrim text-action-text">
              <Icon name="loader-2" size={24} className="animate-spinner" />
            </span>
          )}
          {!uploading && !failed && (
            <span className="absolute -right-1 bottom-0 flex size-8 items-center justify-center rounded-full border border-border bg-background text-text-primary">
              <Icon name={badgeIcon} size={16} />
            </span>
          )}
          {failed && (
            <span className="absolute bottom-1 left-1 flex size-6 items-center justify-center rounded-full bg-danger-action text-action-text">
              <Icon name="rotate-clockwise" size={14} />
            </span>
          )}
        </button>
        {src && (
          <button
            type="button"
            aria-label="사진 삭제"
            disabled={disabled}
            onClick={onRemove}
            className="pressable absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-action text-action-text after:absolute after:-inset-2.5"
          >
            <Icon name="x" size={14} bold />
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={IMAGE_ACCEPT_ATTRIBUTE}
        aria-label="프로필 사진 선택"
        tabIndex={-1}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onSelect(file);
        }}
      />
      <p
        id={messageId}
        role={messageRole}
        className={cn(
          "min-h-5 text-center text-caption",
          alerting && "text-danger-action",
          !alerting && "text-text-secondary",
        )}
      >
        {caption}
      </p>
    </section>
  );
}
