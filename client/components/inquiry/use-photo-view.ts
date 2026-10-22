"use client";

import { useCallback, useRef, useState } from "react";

/**
 * 사진 한 장을 확대하고 옮긴 상태. x · y 는 사진 칸 크기에 대한 비율이라, 칸 크기를 모르는 키보드 이동도 같은 단위로 쓴다.
 * 화면에서 사진이 옮겨 간 거리는 x × 칸 너비다.
 */
export type PhotoView = { readonly scale: number; readonly x: number; readonly y: number };

export const IDENTITY: PhotoView = { scale: 1, x: 0, y: 0 };
export const MIN_SCALE = 1;
export const MAX_SCALE = 3;
/** 키보드로 옮기는 한 번의 거리. 보이는 영역의 10%(A11Y D03). */
export const KEY_STEP = 0.1;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** 확대한 만큼만 옮길 수 있다. 가장자리에서 멈추고, 더 밀어도 다음 사진으로 넘어가지 않는다. */
export const clampView = ({ scale, x, y }: PhotoView): PhotoView => {
  const s = clamp(scale, MIN_SCALE, MAX_SCALE);
  const limit = (s - 1) / 2;
  return { scale: s, x: clamp(x, -limit, limit), y: clamp(y, -limit, limit) };
};

/** 버튼과 키보드의 확대 단계는 1 · 2 · 3배다. 두 손가락으로 맞춘 배율에서는 가까운 다음 단계로 간다. */
export const zoomInStep = (scale: number) => Math.min(MAX_SCALE, Math.floor(scale + 0.001) + 1);
export const zoomOutStep = (scale: number) => Math.max(MIN_SCALE, Math.ceil(scale - 0.001) - 1);

const transformOf = ({ scale, x, y }: PhotoView) => `translate(${x * 100}%, ${y * 100}%) scale(${scale})`;

/**
 * 사진의 확대 · 이동 상태. 끄는 동안 매 프레임 React 를 다시 그리지 않도록 transform 은 요소에 바로 쓰고,
 * 버튼을 막을지 정하는 배율만 상태로 둔다.
 */
export function usePhotoView() {
  const view = useRef<PhotoView>(IDENTITY);
  const image = useRef<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);

  /** animate 가 거짓이면 손을 따라가도록 전환을 끈다(data-gesture). */
  const apply = (next: PhotoView, animate: boolean) => {
    view.current = next;
    const element = image.current;
    if (element) {
      element.toggleAttribute("data-gesture", !animate);
      element.style.transform = next === IDENTITY ? "" : transformOf(next);
    }
    setScale(next.scale);
  };

  /** 사진이 바뀌면 새 요소를 잡고 처음 상태로 돌린다. 렌더마다 다시 불리지 않도록 함수를 고정한다. */
  const imageRef = useCallback((element: HTMLImageElement | null) => {
    image.current = element;
    if (element) view.current = IDENTITY;
  }, []);

  return { view, scale, apply, imageRef };
}
