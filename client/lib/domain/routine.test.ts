import { describe, expect, it } from "vitest";

import {
  appendedProducts,
  visibleThumbnailCount,
  isInOtherTimeOfDay,
  movedProduct,
  removedProduct,
  reorderedProducts,
} from "./routine";

const routine = { morning: [{ id: 1 }, { id: 2 }, { id: 3 }], evening: [{ id: 3 }] };

describe("루틴 제품 편집", () => {
  it("구간 끝에 붙이고 이미 있는 제품은 다시 붙이지 않는다", () => {
    expect(appendedProducts(routine, "morning", [2, 4])).toEqual({
      morningProductIds: [1, 2, 3, 4],
      eveningProductIds: [3],
    });
  });

  it("구간에서 뺀다", () => {
    expect(removedProduct(routine, "morning", 2)).toEqual({ morningProductIds: [1, 3], eveningProductIds: [3] });
  });

  it("구간 안에서 자리를 옮긴다", () => {
    expect(reorderedProducts(routine, "morning", { from: 0, to: 2 }).morningProductIds).toEqual([2, 3, 1]);
    expect(reorderedProducts(routine, "morning", { from: 2, to: 0 }).morningProductIds).toEqual([3, 1, 2]);
  });

  it("다른 구간 끝으로 옮기고, 다른 구간에 이미 있는지 알려 준다", () => {
    expect(movedProduct(routine, "morning", 1)).toEqual({ morningProductIds: [2, 3], eveningProductIds: [3, 1] });
    expect(isInOtherTimeOfDay(routine, "morning", 3)).toBe(true);
    expect(isInOtherTimeOfDay(routine, "morning", 1)).toBe(false);
  });
});

describe("루틴 카드 사진 수", () => {
  it("다 들어가면 전부 보이고, 넘치면 '외 N' 자리를 남긴다", () => {
    expect(visibleThumbnailCount(222, 6)).toBe(6);
    expect(visibleThumbnailCount(222, 9)).toBe(4);
    expect(visibleThumbnailCount(150, 9)).toBe(3);
  });

  it("폭이 아주 좁아도 한 장은 보이고, 재기 전에는 네 장까지 보인다", () => {
    expect(visibleThumbnailCount(20, 3)).toBe(1);
    expect(visibleThumbnailCount(null, 7)).toBe(4);
    expect(visibleThumbnailCount(null, 2)).toBe(2);
  });
});
