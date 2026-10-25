/** @vitest-environment jsdom */
import type { ShelfProductResponse } from "@poudy/api/api.zod";
import { ToastProvider } from "@poudy/design-system/toast";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ShelfRatingSheet } from "./ShelfSheets";

import { track } from "@/lib/analytics/track";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));
const item: ShelfProductResponse = {
  product: { id: 1, name: "제품", brandName: "브랜드", marks: [], imageUrl: "", sensorySupported: true },
  usageStatus: "IN_USE",
  rating: { preference: null, moistureLevel: null, oilLevel: null },
  possiblyUnsuitable: false,
  registeredAt: "",
};
beforeEach(() => {
  vi.mocked(track).mockClear();
});
describe("평가 화면의 실제 저장 상태", () => {
  it("적합도를 저장하고 사용감을 건너뛰면 앞선 답과 담기 성공이 남아 있다고 기록한다", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<ShelfRatingSheet item={item} adding onSave={onSave} onClose={onClose} />, { wrapper: ToastProvider });
    await userEvent.click(screen.getByRole("button", { name: "잘 맞았어요" }));
    await userEvent.click(screen.getByRole("button", { name: "다음" }));
    await userEvent.click(await screen.findByRole("button", { name: "건너뛰기" }));
    expect(track).toHaveBeenCalledWith(
      "shelf_rating_closed",
      expect.objectContaining({
        close_reason: "skip_sensory",
        product_persisted: true,
        has_fit_rating: true,
        has_sensory_rating: false,
      }),
    );
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledExactlyOnceWith("saved");
  });
  it("적합도를 고른 뒤 나중에 평가하기를 선택하면 적합도를 저장한 것으로 기록하지 않는다", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ShelfRatingSheet item={item} adding onSave={onSave} onClose={vi.fn()} />, { wrapper: ToastProvider });
    await userEvent.click(screen.getByRole("button", { name: "잘 맞았어요" }));
    await userEvent.click(screen.getByRole("button", { name: "나중에 할게요" }));
    await waitFor(() =>
      expect(track).toHaveBeenCalledWith(
        "shelf_rating_closed",
        expect.objectContaining({ close_reason: "later", product_persisted: true, has_fit_rating: false }),
      ),
    );
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ preference: null }), expect.any(String));
  });
  it("저장 실패 후 닫으면 선택한 답을 저장된 평가로 세지 않는다", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("failed"));
    render(<ShelfRatingSheet item={item} adding onSave={onSave} onClose={vi.fn()} />, { wrapper: ToastProvider });
    await userEvent.click(screen.getByRole("button", { name: "잘 맞았어요" }));
    await userEvent.click(screen.getByRole("button", { name: "다음" }));
    await screen.findByText("평가를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    await userEvent.keyboard("{Escape}");
    expect(track).toHaveBeenCalledWith(
      "shelf_rating_closed",
      expect.objectContaining({ close_reason: "dismissed", product_persisted: false, has_fit_rating: false }),
    );
  });
});
