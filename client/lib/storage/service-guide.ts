import { createLocalStore } from "./local-store";

const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";

/**
 * 조건으로 제품 목록을 한 번이라도 봤는지. 이 기기에만 남긴다.
 *
 * 홈 캐러셀 첫 장의 서비스 가이드(디자인 S20c)는 처음 온 사람에게만 보인다. 조건으로
 * 제품을 찾아본 사람은 쓰는 법을 이미 아는 것이라, 그때부터 원래 큐레이션부터 보여 준다.
 */
const store = createLocalStore<boolean>("poudy.explored.v1", {
  version: 1,
  fallback: false,
  isValid: isBoolean,
});

export const hasExplored = (): boolean => store.read();

export const markExplored = (): void => {
  if (!store.read()) store.write(true);
};
