import { useSyncExternalStore } from "react";

/*
 * 없는 주소 화면이 경로와 상관없이 하단 내비를 그리는 중인지. 레이아웃의 문의 버튼은 화면과 형제라 경로만 보므로,
 * 이 표시를 읽어 내비 위로 올라간다.
 */
let marks = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** 표시를 남기고, 거두는 함수를 돌려준다. */
export const markNotFoundNavigation = () => {
  marks += 1;
  notify();
  return () => {
    marks -= 1;
    notify();
  };
};

export const useNotFoundNavigation = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => marks > 0,
    () => false,
  );
