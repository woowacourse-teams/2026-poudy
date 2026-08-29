/**
 * localStorage 를 쓰므로 브라우저 환경이 필요하다.
 *
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from "vitest";

import {
  clearSavedProducts,
  readSavedProductIds,
  readSavedProducts,
  refreshSavedProducts,
  saveProduct,
  savedAtOf,
  unsaveProduct,
} from "./saved-products";

const LEGACY_KEY = "poudy.saved-products.v1";
const KEY = "poudy.saved-products.v2";

beforeEach(() => {
  window.localStorage.clear();
  refreshSavedProducts();
});

describe("저장한 제품", () => {
  it("담은 때를 함께 적는다", () => {
    saveProduct(7);

    const [first] = readSavedProducts();

    expect(first?.id).toBe(7);
    expect(Number.isNaN(Date.parse(first?.savedAt ?? ""))).toBe(false);
  });

  it("최근에 담은 것을 앞에 둔다", () => {
    saveProduct(1);
    saveProduct(2);

    expect(readSavedProductIds()).toEqual([2, 1]);
  });

  it("담은 때를 물어볼 수 있다", () => {
    saveProduct(3);

    expect(savedAtOf(3)).toBe(readSavedProducts()[0]?.savedAt);
    expect(savedAtOf(999)).toBeUndefined();
  });

  it("담은 것을 빼면 때도 함께 지운다", () => {
    saveProduct(4);
    unsaveProduct(4);

    expect(readSavedProducts()).toEqual([]);
    expect(savedAtOf(4)).toBeUndefined();
  });
});

describe("번호만 담던 예전 저장을 옮긴다", () => {
  /** 예전 형식을 직접 적어 둔다. */
  const writeLegacy = (ids: readonly number[]) => {
    window.localStorage.setItem(LEGACY_KEY, JSON.stringify({ version: 1, value: ids }));
    refreshSavedProducts();
  };

  it("차례를 그대로 두고 담은 때를 채운다", () => {
    writeLegacy([5, 3, 1]);

    const moved = readSavedProducts();

    expect(moved.map((item) => item.id)).toEqual([5, 3, 1]);
    expect(moved.every((item) => !Number.isNaN(Date.parse(item.savedAt)))).toBe(true);
  });

  it("옮기고 나면 예전 자리를 비운다", () => {
    writeLegacy([2, 9]);
    readSavedProducts();

    expect(window.localStorage.getItem(LEGACY_KEY)).toBeNull();
    expect(window.localStorage.getItem(KEY)).not.toBeNull();
  });

  it("옮길 것이 없으면 아무것도 만들지 않는다", () => {
    expect(readSavedProducts()).toEqual([]);
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it("모두 지우면 예전 자리도 함께 지운다", () => {
    writeLegacy([1]);
    clearSavedProducts();

    expect(readSavedProducts()).toEqual([]);
    expect(window.localStorage.getItem(LEGACY_KEY)).toBeNull();
  });
});
