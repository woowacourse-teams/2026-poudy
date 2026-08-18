/**
 * localStorage 를 쓰므로 브라우저 환경이 필요하다.
 *
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from "vitest";

import { createLocalStore, isNumberArray } from "./local-store";
import {
  isSaved,
  readSavedProductIds,
  refreshSavedProducts,
  saveProduct,
  toggleSaved,
  unsaveProduct,
} from "./saved-products";

beforeEach(() => {
  window.localStorage.clear();
  refreshSavedProducts();
});

describe("createLocalStore", () => {
  const make = () => createLocalStore<number[]>("test.key", { version: 1, fallback: [], isValid: isNumberArray });

  it("저장한 값을 그대로 읽는다", () => {
    const store = make();
    store.write([1, 2]);
    expect(store.read()).toEqual([1, 2]);
  });

  it("저장된 값이 없으면 기본값을 준다", () => {
    expect(make().read()).toEqual([]);
  });

  it("JSON 이 깨져 있으면 기본값으로 되돌린다", () => {
    window.localStorage.setItem("test.key", "{망가진 값");
    expect(make().read()).toEqual([]);
  });

  it("기대한 모양이 아니면 기본값으로 되돌린다", () => {
    window.localStorage.setItem("test.key", JSON.stringify({ version: 1, value: "숫자가 아님" }));
    expect(make().read()).toEqual([]);
  });

  it("버전이 다르면 버린다", () => {
    window.localStorage.setItem("test.key", JSON.stringify({ version: 99, value: [1] }));
    expect(make().read()).toEqual([]);
  });

  it("clear 하면 기본값으로 돌아간다", () => {
    const store = make();
    store.write([1]);
    store.clear();
    expect(store.read()).toEqual([]);
  });
});

describe("저장함", () => {
  it("최근에 저장한 제품이 앞에 온다", () => {
    saveProduct(1);
    saveProduct(2);
    expect(readSavedProductIds()).toEqual([2, 1]);
  });

  it("이미 저장한 제품을 다시 저장하면 위로 올라가고 중복되지 않는다", () => {
    saveProduct(1);
    saveProduct(2);
    saveProduct(1);
    expect(readSavedProductIds()).toEqual([1, 2]);
  });

  it("저장을 해제하면 목록에서 빠진다", () => {
    saveProduct(1);
    saveProduct(2);
    unsaveProduct(1);
    expect(readSavedProductIds()).toEqual([2]);
    expect(isSaved(1)).toBe(false);
  });

  it("토글은 저장과 해제를 오간다", () => {
    expect(toggleSaved(3)).toEqual([3]);
    expect(toggleSaved(3)).toEqual([]);
  });
});
