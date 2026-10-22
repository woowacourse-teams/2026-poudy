"use client";

import { useRef } from "react";

import type { PhotoView } from "./use-photo-view";
import { clampView, IDENTITY, MAX_SCALE } from "./use-photo-view";

/** 이만큼 넘게 움직이면 누르기가 아니라 끌기다. */
const TAP_SLOP = 8;
/** 두 번 누르기로 볼 간격(ms) */
const DOUBLE_TAP_MS = 300;
/** 1배에서 좌우로 이만큼 넘게 쓸면 사진을 바꾸고, 아래로 이만큼 넘게 쓸면 닫는다(px). */
const SWIPE_DISTANCE = 60;
const CLOSE_DISTANCE = 100;
/** 짧게 튕긴 손짓도 넘기기로 본다. 이 속도(px/ms)를 넘고 FLICK_DISTANCE 이상 움직였으면 거리가 모자라도 넘긴다. */
const FLICK_VELOCITY = 0.5;
const FLICK_DISTANCE = 20;

type Point = { readonly x: number; readonly y: number };

type Gesture = {
  readonly start: Point;
  readonly view: PhotoView;
  /** 두 손가락을 댔을 때의 거리. 한 손가락이면 없다. */
  readonly distance?: number;
  /** 손을 댄 시각(ms). 튕긴 속도를 구한다. */
  readonly time: number;
  moved: boolean;
};

const distanceOf = (points: readonly Point[]) => {
  const [a, b] = points;
  if (!a || !b) return 0;
  return Math.hypot(a.x - b.x, a.y - b.y);
};

type Handlers = {
  readonly view: { readonly current: PhotoView };
  readonly apply: (next: PhotoView, animate: boolean) => void;
  /** 사진 칸의 크기(px). ResizeObserver 가 채운다. 아직 모르면 0 이다. */
  readonly size: { readonly current: { readonly width: number; readonly height: number } };
  readonly onSwipe: (direction: "previous" | "next") => void;
  readonly onClose: () => void;
  /** 손을 댄 순간. 조작 안내를 거둔다. */
  readonly onInteract: () => void;
};

/**
 * 사진 칸의 제스처(A11Y D03). 1배에서는 좌우로 쓸어 사진을 바꾸고 아래로 쓸어 닫는다. 확대한 동안에는 끌어서 옮긴다.
 * 두 번 누르면 1배 ↔ 2배, 두 손가락으로 벌리면 3배까지 키운다. 모든 제스처에는 버튼과 키보드 대안이 있다.
 */
export function usePhotoGesture({ view, apply, size, onSwipe, onClose, onInteract }: Handlers) {
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<Gesture | null>(null);
  const lastTap = useRef(0);

  const begin = (time: number) => {
    const points = [...pointers.current.values()];
    const [first] = points;
    if (!first) return;
    gesture.current =
      points.length >= 2
        ? { start: first, view: view.current, distance: distanceOf(points), time, moved: true }
        : { start: first, view: view.current, time, moved: false };
  };

  const move = (point: Point) => {
    const current = gesture.current;
    if (!current) return;
    const points = [...pointers.current.values()];

    if (current.distance) {
      const ratio = distanceOf(points) / current.distance;
      apply(clampView({ ...current.view, scale: current.view.scale * ratio }), false);
      return;
    }

    const dx = point.x - current.start.x;
    const dy = point.y - current.start.y;
    if (Math.abs(dx) + Math.abs(dy) > TAP_SLOP) current.moved = true;
    if (!current.moved) return;

    const { width, height } = size.current;
    if (width === 0 || height === 0) return;

    if (current.view.scale > 1) {
      apply(clampView({ ...current.view, x: current.view.x + dx / width, y: current.view.y + dy / height }), false);
      return;
    }

    // 1배: 손을 따라 사진을 미리 움직여 놓는다. 가로가 크면 넘기기, 아래로 크면 닫기다.
    const horizontal = Math.abs(dx) >= Math.abs(dy);
    apply({ scale: 1, x: horizontal ? dx / width : 0, y: horizontal ? 0 : Math.max(0, dy) / height }, false);
  };

  const end = (point: Point, time: number) => {
    const current = gesture.current;
    gesture.current = null;
    if (!current) return;

    if (current.distance) {
      // 거의 1배로 줄였으면 1배에 맞춘다. 남은 손가락은 새 제스처로 잇지 않는다.
      if (view.current.scale < 1.05) apply(IDENTITY, true);
      return;
    }

    if (!current.moved) {
      tap(current.view, point);
      return;
    }

    if (current.view.scale > 1) return;
    const dx = point.x - current.start.x;
    const dy = point.y - current.start.y;
    const velocity = Math.abs(dx) / Math.max(1, time - current.time);
    const flicked = velocity > FLICK_VELOCITY && Math.abs(dx) > FLICK_DISTANCE;
    if (Math.abs(dx) >= Math.abs(dy) && (Math.abs(dx) > SWIPE_DISTANCE || flicked)) {
      onSwipe(dx < 0 ? "next" : "previous");
      return;
    }
    if (dy > CLOSE_DISTANCE) {
      onClose();
      return;
    }
    apply(IDENTITY, true);
  };

  /**
   * 두 번 누르면 1배 ↔ 2배. 누른 곳이 제자리에 남도록 키운다. 확대할 곳을 바꾸려면 1배로 돌린 뒤 보고 싶은 곳을 두 번 누른다.
   * 사진 칸은 화면 전체를 덮으므로 누른 화면 좌표가 곧 칸 안의 좌표다.
   */
  const tap = (start: PhotoView, point: Point) => {
    const now = Date.now();
    if (now - lastTap.current > DOUBLE_TAP_MS) {
      lastTap.current = now;
      return;
    }
    lastTap.current = 0;
    if (start.scale > 1) {
      apply(IDENTITY, true);
      return;
    }
    const { width, height } = size.current;
    const scale = Math.min(2, MAX_SCALE);
    const x = width === 0 ? 0 : ((point.x - width / 2) * (1 - scale)) / width;
    const y = height === 0 ? 0 : ((point.y - height / 2) * (1 - scale)) / height;
    apply(clampView({ scale, x, y }), true);
  };

  return {
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
      onInteract();
      event.currentTarget.setPointerCapture(event.pointerId);
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      begin(event.timeStamp);
    },
    onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
      if (!pointers.current.has(event.pointerId)) return;
      const point = { x: event.clientX, y: event.clientY };
      pointers.current.set(event.pointerId, point);
      move(point);
    },
    onPointerUp: (event: React.PointerEvent<HTMLElement>) => {
      if (!pointers.current.delete(event.pointerId)) return;
      end({ x: event.clientX, y: event.clientY }, event.timeStamp);
    },
    onPointerCancel: (event: React.PointerEvent<HTMLElement>) => {
      pointers.current.delete(event.pointerId);
      gesture.current = null;
      if (view.current.scale <= 1) apply(IDENTITY, true);
    },
  };
}
