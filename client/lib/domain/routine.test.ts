import { describe, expect, it } from "vitest";

import {
  appendedProducts,
  relativeTime,
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
  it("다 들어가면 전부 보이고, 넘치면 '외 N개' 자리를 남긴다", () => {
    expect(visibleThumbnailCount(222, 6)).toBe(6);
    expect(visibleThumbnailCount(222, 9)).toBe(4);
    expect(visibleThumbnailCount(150, 9)).toBe(2);
  });

  it("폭이 아주 좁아도 한 장은 보이고, 재기 전에는 세 장까지 보인다", () => {
    expect(visibleThumbnailCount(20, 3)).toBe(1);
    expect(visibleThumbnailCount(null, 7)).toBe(3);
    expect(visibleThumbnailCount(null, 2)).toBe(2);
  });
});

describe("댓글 시각", () => {
  const now = new Date("2026-11-04T12:00:00+09:00");

  it("일주일 안이면 지난 시간으로 적는다", () => {
    expect(relativeTime("2026-11-04T11:59:30+09:00", now)).toBe("방금");
    expect(relativeTime("2026-11-04T11:59:00+09:00", now)).toBe("방금");
    expect(relativeTime("2026-11-04T11:58:59+09:00", now)).toBe("1분 전");
    expect(relativeTime("2026-11-04T11:15:00+09:00", now)).toBe("45분 전");
    expect(relativeTime("2026-11-04T07:00:00+09:00", now)).toBe("5시간 전");
    expect(relativeTime("2026-11-02T12:00:00+09:00", now)).toBe("2일 전");
  });

  it("일주일이 넘으면 날짜로, 해가 다르면 연도까지 적는다", () => {
    expect(relativeTime("2026-10-20T12:00:00+09:00", now)).toBe("10월 20일");
    expect(relativeTime("2025-12-31T12:00:00+09:00", now)).toBe("2025년 12월 31일");
  });
});
