import { describe, expect, it } from "vitest";

import { createLocalStore, isNumberArray } from "./local-store";
import { readSavedProductIds, saveProduct } from "./saved-products";

// 이 파일은 node 환경에서 돌아간다. window 가 없는 서버 렌더링 상황과 같다.
describe("window 가 없는 환경", () => {
  it("window 를 건드리지 않는지 확인한다", () => {
    expect(typeof window).toBe("undefined");
  });

  it("읽기가 기본값을 준다", () => {
    const store = createLocalStore<number[]>("ssr.key", { version: 1, fallback: [], isValid: isNumberArray });
    expect(store.read()).toEqual([]);
  });

  it("쓰기가 예외를 던지지 않는다", () => {
    const store = createLocalStore<number[]>("ssr.key", { version: 1, fallback: [], isValid: isNumberArray });
    expect(() => store.write([1, 2])).not.toThrow();
  });

  it("저장함을 다뤄도 화면이 죽지 않는다", () => {
    expect(() => saveProduct(1)).not.toThrow();
    expect(readSavedProductIds()).toEqual([1]);
  });
});
