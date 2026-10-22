import { createLocalStore } from "./local-store";

/**
 * 선반 기능 설명 시트(S54c)를 이미 보여 줬는지. 이 기기에만 남긴다.
 * 제품이 담긴 채 선반에 처음 들어왔을 때 한 번만 띄우고, 그 뒤에는 상단 도움말 버튼으로만 연다(UX-04).
 */
const store = createLocalStore<boolean>("poudy.shelf-feature-sheet.v1", {
  version: 1,
  fallback: false,
  isValid: (value: unknown): value is boolean => typeof value === "boolean",
});

export const hasSeenShelfFeatureSheet = (): boolean => store.read();

export const rememberShelfFeatureSheetSeen = (): void => store.write(true);
