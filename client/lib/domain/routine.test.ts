import { describe, expect, it } from "vitest";

import {
  appendedProducts,
  relativeTime,
  photoRow,
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

describe("사진 판 한 줄", () => {
  const products = (count: number) => Array.from({ length: count }, (_, index) => ({ id: index + 1 }));

  it("4개까지는 모두 보인다", () => {
    expect(photoRow(products(4))).toEqual({ shown: products(4), more: 0 });
  });

  it("5개부터는 앞 3개와 남은 개수를 알린다", () => {
    expect(photoRow(products(8))).toEqual({ shown: [{ id: 1 }, { id: 2 }, { id: 3 }], more: 5 });
  });

  it("지금 제품이 넷째 이후면 셋째 칸으로 당기고 나머지 순서는 그대로 둔다", () => {
    expect(photoRow(products(8), 6).shown).toEqual([{ id: 1 }, { id: 2 }, { id: 6 }]);
    expect(photoRow(products(8), 2).shown).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
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
