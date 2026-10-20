"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode, RefObject } from "react";

import { cn } from "./cn";
import { Icon } from "./icon";
import { IconButton } from "./icon-button";
import { usePressable } from "./use-pressable";

export type AttachedImageStatus = "uploaded" | "uploading" | "failed";

export type AttachedImage = {
  /** 목록에서 사진을 가리키는 값. 다시 시도해도 바뀌지 않아야 포커스가 그 사진에 남는다. */
  readonly key: string;
  /** 미리 보기 주소. 방금 고른 파일이면 object URL 이다. */
  readonly src: string;
  readonly status: AttachedImageStatus;
};

export type ImageAttachmentProps = {
  /** 칸 이름. 예: '사진', '전성분 사진'. 사진 추가 버튼의 이름에도 쓴다('사진 추가'). */
  readonly label: string;
  /** 고르지 않아도 되는 칸이면 라벨 옆에 '선택'을 붙인다. */
  readonly optional?: boolean;
  readonly images: readonly AttachedImage[];
  /** 올릴 수 있는 장수. 다 차면 추가 버튼을 막고, 이유는 status 문구로 알린다. */
  readonly max: number;
  /**
   * 고를 수 있는 형식(input accept). 규격은 IMAGE P04 를 따른다. JPG·PNG 와 함께 아이폰 기본 형식인 HEIC(HEIF)도 받는다.
   * 예: 'image/jpeg,image/png,image/heic,image/heif'
   */
  readonly accept: string;
  /**
   * 사진을 골랐을 때. 크기·형식·장수 같은 규격은 쓰는 쪽이 고르는 순간 검사하고, 어긋나면 error 로 이유를 알린다
   * (FEEDBACK F06). 통과한 파일의 업로드 요청도 쓰는 쪽이 맡는다.
   */
  readonly onSelect: (files: readonly File[]) => void;
  /** 올린 사진이나 올리지 못한 사진을 지운다. */
  readonly onRemove: (key: string) => void;
  /** 올리는 중인 사진의 업로드를 취소한다. */
  readonly onCancel: (key: string) => void;
  /** 올리지 못한 사진을 다시 올린다. 사진을 누르면 부른다. */
  readonly onRetry: (key: string) => void;
  /** 올린 사진을 크게 본다. 넘기지 않으면 사진은 누를 수 없다. */
  readonly onOpen?: (key: string) => void;
  /**
   * 사진 줄 아래 상태 줄(회색). 같은 자리에서 문구만 바뀐다.
   * 예: '3 / 5장 · 장당 5MB 이하 · JPG, PNG, HEIC', '3 / 5장 · 1장 올리는 중 · 장당 5MB 이하'
   */
  readonly status?: ReactNode;
  /**
   * 상태 줄 자리의 오류(빨간 아이콘 + 문구). 원인과 기준을 함께 적는다. 해결되면 비워 status 로 돌아간다.
   * 예: '5MB를 넘는 사진은 올릴 수 없어요', '1장을 올리지 못했어요. 사진을 눌러 다시 시도해 주세요.'
   */
  readonly error?: string;
  /** 추가 버튼 옆 안내. 사진이 없을 때만 보인다. 예: S53h '뒷면 전성분이 보이게 찍어 주시면 …' */
  readonly aside?: ReactNode;
  /** 자리. 모양은 부품이 정한다. */
  readonly className?: string;
};

function AddButton({
  label,
  full,
  describedBy,
  onPick,
  buttonRef,
}: {
  readonly label: string;
  readonly full: boolean;
  readonly describedBy: string;
  readonly onPick: () => void;
  readonly buttonRef: RefObject<HTMLButtonElement | null>;
}) {
  const { pressableProps } = usePressable({ disabled: full });
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={`${label} 추가`}
      aria-disabled={full || undefined}
      aria-describedby={describedBy}
      {...pressableProps}
      onClick={onPick}
      className="pressable press-scale fb-surface flex size-18 shrink-0 items-center justify-center rounded-sm border border-border-strong bg-background text-text-secondary select-none"
    >
      <Icon name="photo-plus" size={24} />
    </button>
  );
}

function PhotoButton({
  name,
  onPress,
  describedBy,
  children,
}: {
  readonly name: string;
  readonly onPress: () => void;
  readonly describedBy?: string;
  readonly children: ReactNode;
}) {
  const { pressableProps } = usePressable();
  return (
    <button
      type="button"
      aria-label={name}
      aria-describedby={describedBy}
      data-on-image=""
      {...pressableProps}
      onClick={onPress}
      className="pressable fb-overlay absolute inset-0 rounded-sm select-none"
    >
      {children}
    </button>
  );
}

function Thumbnail({
  image,
  index,
  errorId,
  onRemove,
  onCancel,
  onRetry,
  onOpen,
  itemRef,
}: {
  readonly image: AttachedImage;
  readonly index: number;
  readonly errorId?: string;
  readonly onRemove: (key: string) => void;
  readonly onCancel: (key: string) => void;
  readonly onRetry: (key: string) => void;
  readonly onOpen?: (key: string) => void;
  readonly itemRef: (node: HTMLLIElement | null) => void;
}) {
  const name = `첨부 사진 ${index + 1}`;
  const uploading = image.status === "uploading";
  const failed = image.status === "failed";

  return (
    <li
      ref={itemRef}
      aria-busy={uploading || undefined}
      className={cn(
        // 자르지 않는다. 사진 버튼의 포커스 링(칸 밖 2)이 잘리지 않게 사진과 덮개가 각자 모서리를 둥글린다.
        "relative size-18 shrink-0 rounded-sm bg-surface",
        // 실패는 빨간 테두리(2)로 사진 위에 알린다(FEEDBACK F06 항목 오류). 테두리는 사진 위에 겹쳐 그려 크기가 그대로다.
        "after:pointer-events-none after:absolute after:inset-0 after:rounded-sm after:border",
        failed ? "after:border-2 after:border-danger-action" : "after:border-border",
      )}
    >
      {/* 사용자 사진은 장식이 아니라 대체 텍스트를 준다(A11Y D05). 방금 고른 파일이라 이미지 최적화 대상이 아니다. */}
      <img src={image.src} alt={name} className="size-full rounded-sm object-cover" />

      {failed ? (
        // 사진을 누르면 다시 올린다. 배지는 그 뜻을 그림으로 보여 준다.
        <PhotoButton name={`${name} 다시 올리기`} describedBy={errorId} onPress={() => onRetry(image.key)}>
          <span
            aria-hidden="true"
            className="absolute bottom-1.5 left-1.5 flex size-6 items-center justify-center rounded-full bg-danger-action text-action-text"
          >
            <Icon name="rotate-clockwise" size={14} />
          </span>
        </PhotoButton>
      ) : uploading ? (
        <span className="absolute inset-0 flex items-center justify-center rounded-sm bg-scrim text-action-text">
          <Icon name="loader-2" size={24} className="animate-spinner" />
          <span className="sr-only">{name} 올리는 중</span>
        </span>
      ) : onOpen ? (
        <PhotoButton name={`${name} 크게 보기`} onPress={() => onOpen(image.key)}>
          {null}
        </PhotoButton>
      ) : null}

      {/* 누르는 영역(44)은 사진 밖으로 넘치지 않게 사진 안쪽 모서리에서 넓힌다(A11Y D12). */}
      <IconButton
        variant="thumbnail-remove"
        label={uploading ? `${name} 올리기 취소` : `${name} 삭제`}
        icon={<Icon name="x" size={14} bold />}
        onClick={() => (uploading ? onCancel(image.key) : onRemove(image.key))}
        className="absolute top-0 right-0 items-start justify-end"
      />
    </li>
  );
}

/**
 * 사진 첨부(명세 APP · 사진 첨부 버튼, APP · 첨부 사진 · 업로드 중 · 업로드 실패). 문의하기(S40)와 선반 제품
 * 등록 요청의 전성분 사진(S53h)에서 쓴다.
 *
 * 부품은 고르기, 미리 보기, 상태 표시, 지운 뒤의 포커스만 맡는다. 업로드 요청과 취소·다시 시도는 쓰는 쪽이 넘긴다.
 *
 * - 첨부 버튼 72×72 를 맨 앞에 두고, 사진(72×72)을 고른 순서로 잇는다. 줄이 넘치면 다음 줄로 내린다.
 * - 올리는 중: 어둡게 덮고 진행 표시. 오른쪽 위 ✕는 업로드 취소다.
 * - 올리지 못함: 빨간 테두리와 다시 시도 배지. 사진을 누르면 다시 올린다. 오류 문구는 상태 줄에 두고 사진에 잇는다.
 * - 사진을 지우면 포커스는 다음 사진 → 앞 사진 → 첨부 버튼 순으로 옮긴다(A11Y D02 · D03).
 */
export function ImageAttachment({
  label,
  optional = false,
  images,
  max,
  accept,
  onSelect,
  onRemove,
  onCancel,
  onRetry,
  onOpen,
  status,
  error,
  aside,
  className,
}: ImageAttachmentProps) {
  const labelId = useId();
  const statusId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const items = useRef(new Map<string, HTMLLIElement>());
  // 지운 사진의 자리. 쓰는 쪽이 목록에서 빼고 다시 그린 뒤에 포커스를 옮긴다.
  const removedAt = useRef<{ readonly key: string; readonly index: number } | null>(null);
  const full = images.length >= max;

  useEffect(() => {
    const removed = removedAt.current;
    if (!removed || images.some((image) => image.key === removed.key)) return;
    removedAt.current = null;
    const next = images[removed.index] ?? images[removed.index - 1];
    const target = next ? items.current.get(next.key)?.querySelector<HTMLElement>("button") : addRef.current;
    target?.focus();
  }, [images]);

  const remove = (key: string, index: number) => {
    removedAt.current = { key, index };
    onRemove(key);
  };
  const cancel = (key: string, index: number) => {
    removedAt.current = { key, index };
    onCancel(key);
  };

  return (
    <div role="group" aria-labelledby={labelId} className={cn("flex flex-col gap-2", className)}>
      <p id={labelId} className="flex items-baseline gap-1">
        <span className="text-body font-bold text-text-primary">{label}</span>
        {optional ? <span className="text-body-sm text-text-secondary">선택</span> : null}
      </p>

      <div className="flex items-center gap-3">
        <ul className="flex flex-wrap gap-2">
          <li className="flex">
            <AddButton
              label={label}
              full={full}
              describedBy={statusId}
              onPick={() => inputRef.current?.click()}
              buttonRef={addRef}
            />
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              multiple={max > 1}
              hidden
              tabIndex={-1}
              onChange={(event) => {
                const files = [...(event.target.files ?? [])];
                // 같은 파일을 다시 고를 수 있도록 값을 비운다.
                event.target.value = "";
                if (files.length > 0) onSelect(files);
              }}
            />
          </li>
          {images.map((image, index) => (
            <Thumbnail
              key={image.key}
              image={image}
              index={index}
              errorId={error ? statusId : undefined}
              onRemove={(key) => remove(key, index)}
              onCancel={(key) => cancel(key, index)}
              onRetry={onRetry}
              onOpen={onOpen}
              itemRef={(node) => {
                if (node) items.current.set(image.key, node);
                else items.current.delete(image.key);
              }}
            />
          ))}
        </ul>
        {aside && images.length === 0 ? <p className="min-w-0 text-caption text-text-secondary">{aside}</p> : null}
      </div>

      {/* 상태 줄. 비어 있어도 한 줄을 지켜 문구가 바뀌어도 아래가 밀리지 않는다. 실패는 즉시, 정중하게 알린다(A11Y D06). */}
      <p
        id={statusId}
        aria-live="polite"
        className={cn(
          "field-message flex items-start gap-1 text-body-sm",
          error ? "text-danger-action" : "text-text-secondary",
        )}
      >
        {error ? (
          <>
            {/* 문구가 두 줄로 넘어가도 아이콘은 첫 줄 가운데에 둔다. */}
            <Icon name="alert-circle" size={14} className="mt-0.5" />
            <span>{error}</span>
          </>
        ) : (
          status
        )}
      </p>
    </div>
  );
}
