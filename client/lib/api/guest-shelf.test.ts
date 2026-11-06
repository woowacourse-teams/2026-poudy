/** @vitest-environment jsdom */
import type { ShelfProductInfoResponse } from "@poudy/api/api.zod";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  addGuestShelfProduct,
  fetchGuestShelf,
  importGuestShelf,
  isGuestShelfMode,
  enterGuestShelfMode,
  isInGuestShelf,
  leaveGuestShelfMode,
  removeGuestShelfProduct,
  updateGuestShelfProduct,
} from "./guest-shelf";

import { readGuestShelf } from "@/lib/storage/guest-shelf";
import { server } from "@/mocks/server";

const product = (id: number): ShelfProductInfoResponse => ({
  id,
  name: `제품 ${id}`,
  brandName: "브랜드",
  marks: [],
  imageUrl: `https://example.com/${id}.png`,
  sensorySupported: true,
});

afterEach(() => {
  window.sessionStorage.clear();
  leaveGuestShelfMode();
});

describe("비로그인 파우치", () => {
  it("비었으면 서버를 부르지 않고 빈 파우치를 준다", async () => {
    const called = vi.fn();
    server.use(
      http.post("*/api/shelf/ingredient-analysis", () => {
        called();
        return HttpResponse.json({});
      }),
    );

    const { shelf, analysis } = await fetchGuestShelf();

    expect(called).not.toHaveBeenCalled();
    expect(shelf.items).toEqual([]);
    expect(shelf.usages.map((usage) => usage.count)).toEqual([0, 0, 0]);
    expect(analysis).toEqual({ badProductCount: 0, items: [] });
  });

  it("평가만 서버에 보내고, 받은 결과로 안 맞을 수 있는 제품을 표시해 최근 담은 순으로 준다", async () => {
    const sent = vi.fn();
    server.use(
      http.post("*/api/shelf/ingredient-analysis", async ({ request }) => {
        sent(await request.json());
        return HttpResponse.json({ badProductCount: 1, items: [], possiblyUnsuitableProductIds: [1] });
      }),
    );
    addGuestShelfProduct(
      product(1),
      { usageStatus: "USED", preference: "BAD", moistureLevel: 1, oilLevel: null },
      "2026-11-01T10:00:00.000Z",
    );
    addGuestShelfProduct(product(2), { usageStatus: "IN_USE", preference: null, moistureLevel: null, oilLevel: null });

    const { shelf, analysis } = await fetchGuestShelf();

    expect(sent).toHaveBeenCalledWith({
      items: [
        { productId: 2, preference: null },
        { productId: 1, preference: "BAD" },
      ],
    });
    expect(shelf.items.map((item) => [item.product.id, item.possiblyUnsuitable])).toEqual([
      [2, false],
      [1, true],
    ]);
    expect(shelf.usages.map((usage) => usage.count)).toEqual([2, 1, 1]);
    expect(analysis.badProductCount).toBe(1);
  });

  it("평가를 고쳐도 담은 시각과 자리는 그대로 두고, 빼면 사라진다", () => {
    addGuestShelfProduct(
      product(1),
      { usageStatus: "IN_USE", preference: null, moistureLevel: null, oilLevel: null },
      "2026-11-01T10:00:00.000Z",
    );
    addGuestShelfProduct(product(2), { usageStatus: "IN_USE", preference: null, moistureLevel: null, oilLevel: null });

    updateGuestShelfProduct(1, { usageStatus: "USED", preference: "GOOD", moistureLevel: 2, oilLevel: 1 });

    expect(readGuestShelf().map((item) => item.product.id)).toEqual([2, 1]);
    expect(readGuestShelf()[1]).toMatchObject({
      usageStatus: "USED",
      rating: { preference: "GOOD", moistureLevel: 2, oilLevel: 1 },
      registeredAt: "2026-11-01T10:00:00.000Z",
    });

    removeGuestShelfProduct(1);
    expect(isInGuestShelf(1)).toBe(false);
    expect(isInGuestShelf(2)).toBe(true);
  });

  it("로그인한 뒤 회원 파우치로 옮기면 비우고, 옮기지 못하면 남긴다", async () => {
    const sent = vi.fn();
    addGuestShelfProduct(
      product(1),
      { usageStatus: "USED", preference: "BAD", moistureLevel: 1.5, oilLevel: null },
      "2026-11-01T10:00:00.000Z",
    );
    enterGuestShelfMode();
    server.use(http.post("*/api/users/me/shelf/products/import", () => new HttpResponse(null, { status: 500 })));

    await importGuestShelf();
    expect(isInGuestShelf(1)).toBe(true);
    expect(isGuestShelfMode()).toBe(false);

    server.use(
      http.post("*/api/users/me/shelf/products/import", async ({ request }) => {
        sent(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await importGuestShelf();

    expect(sent).toHaveBeenCalledWith({
      items: [
        {
          productId: 1,
          usageStatus: "USED",
          preference: "BAD",
          moistureLevel: 1.5,
          oilLevel: null,
          registeredAt: "2026-11-01T10:00:00.000Z",
        },
      ],
    });
    expect(readGuestShelf()).toEqual([]);
  });
});
