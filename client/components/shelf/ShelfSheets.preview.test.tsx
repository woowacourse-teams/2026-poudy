/** @vitest-environment jsdom */
import type { IngredientAnalysisPreviewResponse, ShelfProductResponse } from "@poudy/api/api.zod";
import { ToastProvider } from "@poudy/design-system/toast";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ShelfRatingSheet } from "./ShelfSheets";

import { fetchRatingPreview } from "@/lib/api/shelf";

vi.mock("@/lib/api/shelf", () => ({ fetchRatingPreview: vi.fn() }));
vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));
const item: ShelfProductResponse = {
  product: { id: 1, name: "검토 제품", brandName: "브랜드", marks: [], imageUrl: "", sensorySupported: true },
  usageStatus: "IN_USE",
  rating: { preference: null, moistureLevel: null, oilLevel: null },
  registeredAt: "2026-11-07T00:00:00Z",
  possiblyUnsuitable: false,
};
const preview: IngredientAnalysisPreviewResponse = {
  withoutRating: { badProductCount: 0, items: [] },
  ratedGood: { badProductCount: 0, items: [] },
  ratedBad: {
    badProductCount: 1,
    items: [
      {
        id: 1,
        koreanName: "새 성분",
        formulationRoles: [],
        groupCodes: [],
        reasons: [{ code: "QUICK_EXCLUDE", name: "빠른 제외 성분" }],
        products: [{ id: 1, name: "제품", imageUrl: "" }],
        inFilter: false,
        isNew: false,
      },
    ],
  },
  ratedBadAcrossSkinTypes: null,
  productCautionIngredients: [],
};
const view = (open: boolean) => (
  <ShelfRatingSheet item={open ? item : undefined} adding onClose={vi.fn()} onSave={async () => undefined} />
);

beforeEach(() => {
  vi.mocked(fetchRatingPreview).mockReset();
  Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn(() => ({ matches: false })) });
  Element.prototype.animate = vi.fn();
});

describe("평가 미리보기 요청과 선택 순서", () => {
  it("기존 BAD 평가를 열거나 원래 답으로 돌아오면 기존 후보를 새 성분으로 추가하지 않는다", async () => {
    vi.mocked(fetchRatingPreview).mockResolvedValue(preview);
    render(
      <ShelfRatingSheet
        item={{ ...item, rating: { ...item.rating, preference: "BAD" } }}
        onClose={vi.fn()}
        onSave={async () => undefined}
      />,
      { wrapper: ToastProvider },
    );
    expect((await screen.findByText("새 성분")).closest("li")).toHaveAttribute("data-phase", "stay");
    expect(screen.getByText("지금 결과 · 안 맞은 제품 1개 기준")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "잘 맞았어요" }));
    expect(screen.getByText("새 성분").closest("li")).toHaveAttribute("data-phase", "leave");
    await userEvent.click(screen.getByRole("button", { name: "안 맞았어요" }));
    expect(screen.getByText("새 성분").closest("li")).toHaveAttribute("data-phase", "stay");
  });

  it("기존 BAD를 GOOD으로 바꾸면 현재 후보를 제외하고 괜찮았던 성분 추가 화면은 표시하지 않는다", async () => {
    vi.mocked(fetchRatingPreview).mockResolvedValue({
      ...preview,
      productCautionIngredients: [
        { id: 1, koreanName: "새 성분", reasons: [{ code: "QUICK_EXCLUDE", name: "빠른 제외 성분" }] },
      ],
    });
    render(
      <ShelfRatingSheet
        item={{ ...item, rating: { ...item.rating, preference: "BAD" } }}
        onClose={vi.fn()}
        onSave={async () => undefined}
      />,
      { wrapper: ToastProvider },
    );
    await screen.findByText("새 성분");
    await userEvent.click(screen.getByRole("button", { name: "잘 맞았어요" }));
    expect(screen.getByText("새 성분").closest("li")).toHaveAttribute("data-phase", "leave");
    expect(screen.queryByText("나에게 괜찮았던 성분")).not.toBeInTheDocument();
    expect(
      screen
        .getAllByRole("status")
        .some((status) => status.textContent?.includes("잘 맞은 제품에도 든 성분은 후보에서 빠져요")),
    ).toBe(true);
  });

  it("기존 BAD 선택을 풀면 평가 없음 결과까지 후보가 빠지는 변화를 보여 준다", async () => {
    vi.mocked(fetchRatingPreview).mockResolvedValue(preview);
    render(
      <ShelfRatingSheet
        item={{ ...item, rating: { ...item.rating, preference: "BAD" } }}
        onClose={vi.fn()}
        onSave={async () => undefined}
      />,
      { wrapper: ToastProvider },
    );
    await screen.findByText("새 성분");
    await userEvent.click(screen.getByRole("button", { name: "안 맞았어요" }));
    expect(screen.getByText("새 성분").closest("li")).toHaveAttribute("data-phase", "leave");
  });

  it("기존 GOOD 평가를 열면 후보 제거 효과 없이 현재 결과를 표시하고 BAD로 바꾸면 새 후보가 나타난다", async () => {
    vi.mocked(fetchRatingPreview).mockResolvedValue({ ...preview, withoutRating: preview.ratedBad });
    render(
      <ShelfRatingSheet
        item={{ ...item, rating: { ...item.rating, preference: "GOOD" } }}
        onClose={vi.fn()}
        onSave={async () => undefined}
      />,
      { wrapper: ToastProvider },
    );
    await waitFor(() => expect(document.querySelector(".sheet-above")).not.toBeNull());
    expect(screen.queryByText("새 성분")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "안 맞았어요" }));
    expect(screen.getByText("새 성분").closest("li")).toHaveAttribute("data-phase", "enter");
  });

  it("같은 제품을 다시 열어 요청이 실패하면 이전 미리보기를 표시하지 않는다", async () => {
    vi.mocked(fetchRatingPreview).mockResolvedValueOnce(preview).mockRejectedValueOnce(new Error("연결 실패"));
    const { rerender } = render(view(true), { wrapper: ToastProvider });
    await waitFor(() => expect(document.querySelector(".sheet-above")).not.toBeNull());
    rerender(view(false));
    rerender(view(true));
    await waitFor(() => expect(fetchRatingPreview).toHaveBeenCalledTimes(2));
    expect(document.querySelector(".sheet-above")).toBeNull();
  });

  it("미리보기 실패는 안내 없이 숨기고 평가 선택과 저장을 계속 허용한다", async () => {
    vi.mocked(fetchRatingPreview).mockRejectedValue(new Error("미리보기 연결 실패"));
    const onSave = vi.fn(async () => undefined);
    render(
      <ShelfRatingSheet
        item={{ ...item, product: { ...item.product, sensorySupported: false } }}
        adding
        onClose={vi.fn()}
        onSave={onSave}
      />,
      { wrapper: ToastProvider },
    );
    await waitFor(() => expect(fetchRatingPreview).toHaveBeenCalledTimes(1));
    await userEvent.click(await screen.findByRole("button", { name: "안 맞았어요" }));
    expect(document.querySelector(".sheet-above")).toBeNull();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "다시 시도" })).not.toBeInTheDocument();
    expect(screen.queryByText(/미리보기를 불러오지 못/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "평가 저장" }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ preference: "BAD" }), expect.any(String)),
    );
  });

  it("응답 전에 평가를 골라도 결과가 도착하면 새 성분의 등장 움직임을 시작한다", async () => {
    let complete: (data: IngredientAnalysisPreviewResponse) => void = () => undefined;
    vi.mocked(fetchRatingPreview).mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    render(view(true), { wrapper: ToastProvider });
    await userEvent.click(await screen.findByRole("button", { name: "안 맞았어요" }));
    expect(document.querySelector(".sheet-above")).toBeNull();
    await act(async () => complete(preview));
    expect(screen.getByText("새 성분").closest("li")).toHaveAttribute("data-phase", "enter");
  });
});
