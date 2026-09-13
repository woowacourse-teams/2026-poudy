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
  restoreProducts,
  saveProduct,
  savedAtOf,
  savedEntriesOf,
  unsaveProduct,
  unsaveProducts,
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

  it("여러 제품을 한 번에 빼고 나머지 차례는 지킨다", () => {
    [1, 2, 3, 4].forEach(saveProduct);

    unsaveProducts([2, 4]);

    expect(readSavedProductIds()).toEqual([3, 1]);
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

describe("되돌리기", () => {
  it("저장을 푼 항목을 담았던 때와 자리까지 그대로 되살린다", () => {
    saveProduct(1);
    saveProduct(2);
    saveProduct(3);

    // 가운데 것을 뺐다가 되돌린다.
    const removed = savedEntriesOf([2]);
    const savedAt = savedAtOf(2);
    unsaveProduct(2);
    expect(readSavedProductIds()).toEqual([3, 1]);

    restoreProducts(removed);

    expect(readSavedProductIds()).toEqual([3, 2, 1]);
    // 담았던 때가 새로 찍히지 않아야 `최근 저장순` 이 어긋나지 않는다.
    expect(savedAtOf(2)).toBe(savedAt);
  });

  it("담은 때가 같아도 원래 차례로 돌아간다", () => {
    // 잇달아 담으면 밀리초까지 같을 수 있다. 그때도 자리가 뒤집히지 않아야 한다.
    saveProduct(1);
    saveProduct(2);
    const [first, second] = readSavedProducts();
    expect(first.savedAt).toBe(second.savedAt);

    const removed = savedEntriesOf([2]);
    unsaveProduct(2);
    restoreProducts(removed);

    expect(readSavedProductIds()).toEqual([2, 1]);
  });

  it("여럿을 되살려도 서로의 자리를 밀지 않는다", () => {
    saveProduct(1);
    saveProduct(2);
    saveProduct(3);
    saveProduct(4);
    // 최근 저장순은 4, 3, 2, 1 이다.

    /*
     * 화면에서 저장을 푸는 것은 한 번에 하나씩이라, 뺄 때마다 그때의 자리를 남긴다.
     * 되돌리기도 하나씩이지만 한꺼번에 넘겨도 같은 자리로 돌아가야 한다.
     */
    const third = savedEntriesOf([3]);
    unsaveProduct(3);
    const second = savedEntriesOf([2]);
    unsaveProduct(2);
    expect(readSavedProductIds()).toEqual([4, 1]);

    restoreProducts([...third, ...second]);

    expect(readSavedProductIds()).toEqual([4, 3, 2, 1]);
  });

  it("잇달아 뺀 뒤 되살려도 저마다 담았던 자리로 돌아간다", () => {
    saveProduct(1);
    saveProduct(2);
    saveProduct(3);
    saveProduct(4);
    // 최근 저장순은 4, 3, 2, 1 이다.

    // 하나씩 뺀다. 두 번째로 뺄 때의 목록은 이미 첫 번째가 빠진 상태다.
    const first = savedEntriesOf([4]);
    unsaveProduct(4);
    const second = savedEntriesOf([2]);
    unsaveProduct(2);
    expect(readSavedProductIds()).toEqual([3, 1]);

    restoreProducts([...first, ...second]);

    expect(readSavedProductIds()).toEqual([4, 3, 2, 1]);
  });

  it("되살릴 것이 없으면 목록을 건드리지 않는다", () => {
    saveProduct(1);

    expect(restoreProducts([])).toEqual([1]);
    expect(readSavedProductIds()).toEqual([1]);
  });
});
