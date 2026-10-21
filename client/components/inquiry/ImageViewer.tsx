"use client";

import { ConfirmSheet } from "@poudy/design-system/confirm-sheet";
import { Icon } from "@poudy/design-system/icon";
import { IconButton } from "@poudy/design-system/icon-button";
import { Portal } from "@poudy/design-system/portal";
import { useRef, useState } from "react";

import { usePhotoGesture } from "./use-photo-gesture";
import {
  clampView,
  IDENTITY,
  KEY_STEP,
  MAX_SCALE,
  MIN_SCALE,
  usePhotoView,
  zoomInStep,
  zoomOutStep,
} from "./use-photo-view";

import type { AttachedImage } from "@/lib/hooks/useImageUpload";

type ImageViewerProps = {
  /** 크게 볼 수 있는 사진. 올리기를 마친 사진만 넘긴다. */
  readonly images: readonly AttachedImage[];
  readonly initialKey: string;
  readonly onRemove: (key: string) => void;
  /** 닫는다. 사진을 모두 지워 닫으면 focusAdd 가 참이다. */
  readonly onClose: (focusAdd: boolean) => void;
};

const FOCUSABLE = 'button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Tab 이 뷰어 밖으로 나가려 하면 반대쪽 끝으로 돌려보낸다(A11Y D02). */
const keepFocusInside = (dialog: HTMLElement, event: React.KeyboardEvent) => {
  const focusable = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)];
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};

/**
 * 첨부 사진 전체 화면(명세 S40d)과 삭제 확인(S40f). 좌우로 넘기고, 확대하고, 확대한 채 옮긴다.
 * 모든 제스처에는 버튼과 키보드 대안이 있다(A11Y D03).
 */
export function ImageViewer({ images, initialKey, onRemove, onClose }: ImageViewerProps) {
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      images.findIndex((image) => image.key === initialKey),
    ),
  );
  const [hintVisible, setHintVisible] = useState(true);
  const [broken, setBroken] = useState<ReadonlySet<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement | null>(null);
  const size = useRef({ width: 0, height: 0 });
  const { view, scale, apply, imageRef } = usePhotoView();
  // 사진 칸의 ref. 렌더마다 다시 불리면 포커스를 빼앗고 관찰을 새로 걸므로 한 번만 만든다.
  const [areaCallback] = useState(() => (element: HTMLDivElement | null) => {
    areaRef.current = element;
    if (!element) return;
    element.focus();
    const observer = new ResizeObserver(([entry]) => {
      if (entry) size.current = { width: entry.contentRect.width, height: entry.contentRect.height };
    });
    observer.observe(element);
    return () => observer.disconnect();
  });

  const current = images[Math.min(index, images.length - 1)];
  const position = Math.min(index, images.length - 1);
  const hasPrevious = position > 0;
  const hasNext = position < images.length - 1;

  const goTo = (next: number) => {
    if (next < 0 || next >= images.length) {
      apply(IDENTITY, true);
      return;
    }
    // 사진을 바꾸면 1배로 돌아간다. 새 사진은 새 요소라 transform 이 없다.
    apply(IDENTITY, false);
    setIndex(next);
  };

  const zoom = (scale: number) => apply(clampView({ ...view.current, scale }), true);
  const pan = (dx: number, dy: number) => {
    const { scale, x, y } = view.current;
    apply(clampView({ scale, x: x + dx, y: y + dy }), true);
  };

  const gesture = usePhotoGesture({
    view: view,
    apply: apply,
    size,
    onSwipe: (direction) => goTo(position + (direction === "next" ? 1 : -1)),
    onClose: () => onClose(false),
    onInteract: () => setHintVisible(false),
  });

  /*
   * 방향키는 사진 칸에 포커스가 있을 때만 처리한다. 버튼에 포커스가 있으면 버튼이 Enter · Space 를 받는다(A11Y D03).
   * 한 번의 키는 배율에 따라 정해진 한 동작만 한다. 1배에서는 사진을 바꾸고, 확대한 동안에는 보이는 곳을 옮긴다.
   */
  const onAreaKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const zoomed = view.current.scale > 1;
    const actions: Record<string, () => void> = {
      ArrowLeft: () => (zoomed ? pan(KEY_STEP, 0) : goTo(position - 1)),
      ArrowRight: () => (zoomed ? pan(-KEY_STEP, 0) : goTo(position + 1)),
      ArrowUp: () => zoomed && pan(0, KEY_STEP),
      ArrowDown: () => zoomed && pan(0, -KEY_STEP),
      "+": () => zoom(zoomInStep(view.current.scale)),
      "=": () => zoom(zoomInStep(view.current.scale)),
      "-": () => zoom(zoomOutStep(view.current.scale)),
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    setHintVisible(false);
    action();
  };

  const confirmRemove = () => {
    if (!current) return;
    const remaining = images.length - 1;
    setConfirming(false);
    onRemove(current.key);
    // 지우면 다음 사진을 보여 준다. 마지막 사진이었으면 앞 사진을, 남은 사진이 없으면 뷰어를 닫는다(A11Y D03).
    if (remaining === 0) {
      onClose(true);
      return;
    }
    apply(IDENTITY, false);
    if (position >= remaining) setIndex(remaining - 1);
  };

  if (!current) return null;

  return (
    <Portal>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="첨부 사진"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose(false);
          }
          if (event.key === "Tab" && dialogRef.current) keepFocusInside(dialogRef.current, event);
        }}
        className="fixed inset-0 z-(--z-viewer) overflow-hidden bg-action text-on-dark"
      >
        {/*
          사진 칸. 뷰어를 열면 처음 포커스를 받아 방향키를 바로 쓸 수 있다. 칸 크기는 끄는 거리를 비율로 바꾸는 데 쓰고,
          ResizeObserver 로 받아 레이아웃을 다시 읽지 않는다.
        */}
        <div
          ref={areaCallback}
          tabIndex={0}
          role="group"
          aria-roledescription="사진"
          aria-label={`첨부 사진 ${position + 1}`}
          onKeyDown={onAreaKeyDown}
          {...gesture}
          className="absolute inset-0 flex touch-none items-center justify-center outline-none select-none"
        >
          {broken.has(current.key) ? (
            <p className="px-8 text-center text-body-sm text-on-dark-muted">
              이 사진은 미리 보여 드릴 수 없어요. 첨부는 정상으로 됐어요.
            </p>
          ) : (
            // 방금 고른 파일이라 이미지 최적화 대상이 아니다. 사용자 사진은 장식이 아니라 대체 텍스트를 준다(A11Y D05).
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={current.key}
              ref={imageRef}
              src={current.previewUrl}
              alt={`첨부 사진 ${position + 1}`}
              draggable={false}
              onError={() => setBroken((keys) => new Set(keys).add(current.key))}
              className="size-full object-contain transition-transform duration-(--duration-fast) ease-out data-gesture:transition-none motion-reduce:transition-none"
            />
          )}
          {/* 칸이 화면 끝까지 닿아 링이 잘리지 않게 안쪽에 그린다. */}
          <span data-focus-ring="" aria-hidden="true" className="pointer-events-none absolute inset-2 rounded-sm" />
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-overlay-dark"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-overlay-dark"
        />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 pt-3">
          <IconButton
            variant="overlay"
            label="닫기"
            icon={<Icon name="x" size={20} />}
            onClick={() => onClose(false)}
          />
          <p aria-live="polite" className="text-body-sm font-semibold tabular-nums">
            {position + 1} / {images.length}
          </p>
          <IconButton
            variant="overlay"
            label="이 사진 삭제"
            aria-haspopup="dialog"
            icon={<Icon name="trash" size={20} />}
            onClick={() => setConfirming(true)}
          />
        </div>

        {/* 첫 · 마지막 사진에서는 그쪽 버튼을 숨긴다(A11Y D03). */}
        {hasPrevious ? (
          <IconButton
            variant="overlay"
            label="이전 사진"
            icon={<Icon name="chevron-left" size={20} />}
            onClick={() => goTo(position - 1)}
            className="absolute top-1/2 left-3 -translate-y-1/2"
          />
        ) : null}
        {hasNext ? (
          <IconButton
            variant="overlay"
            label="다음 사진"
            icon={<Icon name="chevron-right" size={20} />}
            onClick={() => goTo(position + 1)}
            className="absolute top-1/2 right-3 -translate-y-1/2"
          />
        ) : null}

        <div className="absolute right-3 bottom-28 flex flex-col gap-2">
          <IconButton
            variant="overlay"
            label="확대"
            icon={<Icon name="plus" size={20} />}
            aria-disabled={scale >= MAX_SCALE || undefined}
            onClick={() => scale < MAX_SCALE && zoom(zoomInStep(scale))}
          />
          <IconButton
            variant="overlay"
            label="축소"
            icon={<Icon name="minus" size={20} />}
            aria-disabled={scale <= MIN_SCALE || undefined}
            onClick={() => scale > MIN_SCALE && zoom(zoomOutStep(scale))}
          />
        </div>

        {/* 처음 조작하기 전까지만 보여 준다. 사라질 때는 자리를 지킨 채 흐려진다. */}
        <div
          aria-hidden={!hintVisible || undefined}
          className="pointer-events-none absolute inset-x-0 bottom-14 flex justify-center px-gutter transition-opacity duration-(--duration-base) ease-out data-hidden:opacity-0 motion-reduce:transition-none"
          data-hidden={hintVisible ? undefined : ""}
        >
          <p className="flex items-center gap-2 rounded-full bg-overlay-dark px-4 py-3 text-body-sm">
            <Icon name="info-circle" size={16} scalable />
            <span>좌우로 넘기거나 버튼으로 옮기고, 확대할 수 있어요</span>
          </p>
        </div>

        <div aria-hidden="true" className="absolute inset-x-0 bottom-6 flex justify-center gap-1">
          {images.map((image, dot) => (
            <span
              key={image.key}
              data-current={dot === position ? "" : undefined}
              className="size-1.5 rounded-full bg-on-dark-muted data-current:bg-on-dark"
            />
          ))}
        </div>
      </div>

      <ConfirmSheet
        open={confirming}
        title="이 사진을 삭제할까요?"
        description="삭제한 사진은 문의에 첨부되지 않아요. 필요하면 다시 추가할 수 있어요."
        confirmLabel="삭제"
        tone="destructive"
        onConfirm={confirmRemove}
        onCancel={() => setConfirming(false)}
        returnFocus={() => areaRef.current}
      />
    </Portal>
  );
}
