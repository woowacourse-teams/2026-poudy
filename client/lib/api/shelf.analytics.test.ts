/** @vitest-environment jsdom */
import type { ShelfProductResponse } from "@poudy/api/api.zod";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { addShelfProduct, removeShelfProduct } from "./shelf";

import { track } from "@/lib/analytics/track";
import { server } from "@/mocks/server";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));
const item: ShelfProductResponse = {
  product: { id: 1, name: "제품", brandName: "브랜드", marks: [], imageUrl: "", sensorySupported: true },
  usageStatus: "IN_USE",
  rating: { preference: "GOOD", moistureLevel: null, oilLevel: null },
  possiblyUnsuitable: false,
  registeredAt: "2026-10-25T00:00:00+09:00",
};
const request = {
  productId: 1,
  usageStatus: "IN_USE" as const,
  preference: "GOOD" as const,
  moistureLevel: null,
  oilLevel: null,
};
beforeEach(() => {
  vi.mocked(track).mockClear();
});
describe("서버 성공 기준 선반 계측", () => {
  it("응답을 기다리는 동안에는 성공을 보내지 않고 성공 응답 뒤 출처와 평가 흐름을 한 번 보낸다", async () => {
    let entered = () => {};
    let release = () => {};
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post("*/api/users/me/shelf/products", async () => {
        entered();
        await pending;
        return HttpResponse.json(item);
      }),
    );
    const saving = addShelfProduct(request, { source: "product_detail", ratingFlowId: "rating", entryPoint: "saved" });
    await started;
    expect(track).not.toHaveBeenCalled();
    release();
    await saving;
    const added = vi.mocked(track).mock.calls.filter(([name]) => name === "shelf_product_added");
    expect(added).toEqual([
      [
        "shelf_product_added",
        expect.objectContaining({
          source: "product_detail",
          entry_point: "saved",
          rating_flow_id: "rating",
          has_fit_rating: true,
        }),
      ],
    ]);
  });
  it("서버에서 거절한 담기는 성공이나 평가 완료로 기록하지 않는다", async () => {
    server.use(
      http.post("*/api/users/me/shelf/products", () =>
        HttpResponse.json({ code: "SHELF_PRODUCT_ALREADY_EXISTS", detail: "이미 있음" }, { status: 409 }),
      ),
    );
    await expect(addShelfProduct(request, { source: "shelf_add" })).rejects.toThrow();
    expect(vi.mocked(track).mock.calls.filter(([name]) => name.startsWith("shelf_"))).toHaveLength(0);
  });
  it("담기 취소용 되돌리기는 일반 삭제와 구분한다", async () => {
    server.use(http.delete("*/api/users/me/shelf/products/1", () => new HttpResponse(null, { status: 204 })));
    await removeShelfProduct(1, { source: "shelf_add", reason: "undo" });
    expect(track).toHaveBeenCalledWith(
      "shelf_product_removed",
      expect.objectContaining({ source: "shelf_add", mutation_reason: "undo" }),
    );
  });
});
