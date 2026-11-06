import { createLocalStore } from "./local-store";

/**
 * 제품 상세의 선반 소개(스포트라이트)를 이미 보여 줬는지. 이 기기에만 남긴다.
 * 처음 연 제품 상세에서 한 번만 띄우고, 다시 방문해도 띄우지 않는다.
 */
const store = createLocalStore<boolean>("poudy.shelf-intro.v1", {
  version: 1,
  fallback: false,
  isValid: (value: unknown): value is boolean => typeof value === "boolean",
});

export const hasSeenShelfIntro = (): boolean => store.read();

export const rememberShelfIntroSeen = (): void => store.write(true);
