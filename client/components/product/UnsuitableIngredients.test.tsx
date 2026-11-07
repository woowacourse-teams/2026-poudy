/** @vitest-environment jsdom */
import type { IngredientAnalysisResponse, ShelfProductResponse } from "@poudy/api/api.zod";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UnsuitableIngredients } from "./UnsuitableIngredients";

import { ApiError } from "@/lib/api/client";
import {
  enterGuestShelfMode,
  fetchGuestShelf,
  leaveGuestShelfMode,
  removeGuestShelfProduct,
} from "@/lib/api/guest-shelf";
import { fetchIngredientAnalysis, fetchMemberShelf } from "@/lib/api/shelf";
import { SIGNED_OUT_USER_PRODUCT } from "@/lib/domain/user-product";
import { clearGuestShelf, putGuestShelfItem } from "@/lib/storage/guest-shelf";
import { productDetails } from "@/mocks/fixtures";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/api/shelf", () => ({ fetchIngredientAnalysis: vi.fn(), fetchMemberShelf: vi.fn() }));
vi.mock("@/lib/api/guest-shelf", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/guest-shelf")>()),
  fetchGuestShelf: vi.fn(),
}));
vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

const ingredients = productDetails[0]!.selectedPart!.ingredients;
const ingredient = ingredients[0]!;
const savedProduct = (preference: "GOOD" | "BAD" | null): ShelfProductResponse => ({
  product: { id: 1, name: "제품", brandName: "브랜드", marks: [], imageUrl: "", sensorySupported: true },
  usageStatus: "IN_USE",
  rating: { preference, moistureLevel: null, oilLevel: null },
  possiblyUnsuitable: false,
  registeredAt: "2026-11-07T00:00:00Z",
});
const response = (
  items: IngredientAnalysisResponse["items"],
  badProductCount = 1,
  products = badProductCount > 0 ? [savedProduct("BAD")] : [],
) => ({
  shelf: { usages: [], items: products },
  analysis: { badProductCount, items },
});
const candidate = {
  id: ingredient.id,
  koreanName: ingredient.koreanName,
  formulationRoles: [],
  groupCodes: [],
  reasons: [{ code: "SENSITIVE_SKIN" as const, name: "민감성" }],
  products: [],
  inFilter: false,
  isNew: false,
};
const view = (selected = ingredients) => (
  <UnsuitableIngredients
    productId={productDetails[0]!.id}
    userProduct={SIGNED_OUT_USER_PRODUCT}
    ingredients={selected}
  />
);

beforeEach(() => {
  clearGuestShelf();
  leaveGuestShelfMode();
  vi.mocked(fetchMemberShelf).mockReset();
  vi.mocked(fetchMemberShelf).mockResolvedValue(response([], 1).shelf);
  vi.mocked(fetchIngredientAnalysis).mockReset();
  vi.mocked(fetchGuestShelf).mockReset();
  vi.mocked(fetchGuestShelf).mockResolvedValue(response([], 0));
});

describe("비로그인 제품 상세의 평가 성분", () => {
  it("상세는 회원 상태여도 분석 API가 비로그인이면 저장된 비로그인 평가를 반영한다", async () => {
    vi.mocked(fetchIngredientAnalysis).mockRejectedValue(new ApiError(401, "UNAUTHORIZED", "로그인이 필요합니다."));
    vi.mocked(fetchGuestShelf).mockResolvedValue(response([candidate]));
    render(
      <UnsuitableIngredients
        productId={1}
        userProduct={{ ...SIGNED_OUT_USER_PRODUCT, status: "ready" }}
        ingredients={ingredients}
      />,
    );
    expect(await screen.findByRole("link", { name: ingredient.koreanName })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "파우치에서 평가하기" })).not.toBeInTheDocument();
  });

  it("회원도 필터 설정 없이 기존 평가 분석 결과를 볼 수 있다", async () => {
    vi.mocked(fetchIngredientAnalysis).mockResolvedValue(response([candidate]).analysis);
    render(
      <UnsuitableIngredients
        productId={1}
        userProduct={{ ...SIGNED_OUT_USER_PRODUCT, status: "ready" }}
        ingredients={ingredients}
      />,
    );
    expect(await screen.findByRole("link", { name: ingredient.koreanName })).toBeInTheDocument();
    expect(fetchGuestShelf).not.toHaveBeenCalled();
  });

  it.each([null, "GOOD"] as const)(
    "회원도 제품 수와 평가 유무로 잠금 상태를 판단한다 (평가=%s)",
    async (preference) => {
      vi.mocked(fetchMemberShelf).mockResolvedValue(response([], 0, [savedProduct(preference)]).shelf);
      vi.mocked(fetchIngredientAnalysis).mockResolvedValue(response([], 0).analysis);
      render(
        <UnsuitableIngredients
          productId={1}
          userProduct={{ ...SIGNED_OUT_USER_PRODUCT, status: "ready" }}
          ingredients={ingredients}
        />,
      );
      expect(
        await screen.findByRole("heading", {
          name: preference === null ? "안 맞았던 제품을 알려 주면 찾아 드려요" : "나에게 안 맞는 성분이 없어요",
        }),
      ).toBeInTheDocument();
    },
  );

  it("회원 필터가 있던 화면도 비로그인 전환 뒤에는 비로그인 파우치로 다시 판단한다", async () => {
    render(
      <UnsuitableIngredients
        productId={1}
        ingredients={ingredients}
        userProduct={{ ...SIGNED_OUT_USER_PRODUCT, status: "ready", myFilterEmpty: false }}
      />,
    );
    expect(screen.getByRole("heading", { name: "나에게 안 맞는 성분이 없어요" })).toBeInTheDocument();
    act(() => enterGuestShelfMode());
    expect(await screen.findByRole("heading", { name: "안 맞았던 제품을 알려 주면 찾아 드려요" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "필터 편집" })).not.toBeInTheDocument();
  });

  it("로그인 없이 평가 분석에 있고 현재 구성품에 든 성분만 보여 준다", async () => {
    vi.mocked(fetchGuestShelf).mockResolvedValue(
      response([candidate, { ...candidate, id: -1, koreanName: "다른 구성품 성분" }]),
    );
    render(view());

    expect(
      await screen.findByRole("heading", { name: "나와 안 맞을 수 있는 성분 1종이 들어 있어요" }),
    ).toBeInTheDocument();
    const card = screen.getByText("내 평가로 찾은 성분").closest("section")!;
    expect(within(card).getByRole("link", { name: ingredient.koreanName })).toBeInTheDocument();
    expect(within(card).queryByText("다른 구성품 성분")).not.toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "파우치 보기" })).toHaveAttribute("href", "/pouch");
    expect(within(card).queryByRole("link", { name: "필터 편집" })).not.toBeInTheDocument();
    expect(within(card).getByText(/피부 타입을 선택하면 내 피부에 해당하는 주의 성분만/)).toBeInTheDocument();
  });

  it("등록 제품이 없으면 자물쇠와 평가 안내를 보여 준다", async () => {
    render(view());
    expect(await screen.findByRole("heading", { name: "안 맞았던 제품을 알려 주면 찾아 드려요" })).toBeInTheDocument();
    expect(document.querySelector(".blur-xs")).not.toBeNull();
    expect(screen.getByRole("button", { name: "파우치에서 평가하기" })).toBeInTheDocument();
  });

  it("등록 제품은 있어도 평가가 없으면 자물쇠를 보여 준다", async () => {
    vi.mocked(fetchGuestShelf).mockResolvedValue(response([], 0, [savedProduct(null)]));
    render(view());
    expect(await screen.findByRole("heading", { name: "안 맞았던 제품을 알려 주면 찾아 드려요" })).toBeInTheDocument();
  });

  it("잘 맞았어요 평가만 있어도 등록과 평가가 있으므로 성분 없음 카드를 보여 준다", async () => {
    vi.mocked(fetchGuestShelf).mockResolvedValue(response([], 0, [savedProduct("GOOD")]));
    render(view());
    expect(await screen.findByRole("heading", { name: "나에게 안 맞는 성분이 없어요" })).toHaveClass(
      "text-success-text",
    );
    expect(document.querySelector(".blur-xs")).toBeNull();
  });

  it("평가는 있지만 현재 구성품에 겹치는 성분이 없으면 비교 결과를 보여 준다", async () => {
    vi.mocked(fetchGuestShelf).mockResolvedValue(response([candidate]));
    const { rerender } = render(view());
    await screen.findByRole("link", { name: ingredient.koreanName });
    rerender(view([]));
    expect(screen.getByRole("heading", { name: "나에게 안 맞는 성분이 없어요" })).toBeInTheDocument();
    expect(screen.getByText("평가로 찾은 주의 성분이 들어 있지 않아요.")).toBeInTheDocument();
  });

  it("같은 화면에서 비로그인 파우치가 바뀌면 결과를 다시 계산한다", async () => {
    vi.mocked(fetchGuestShelf).mockResolvedValueOnce(response([candidate]));
    render(view());
    await screen.findByRole("link", { name: ingredient.koreanName });
    act(() => clearGuestShelf());
    expect(await screen.findByRole("heading", { name: "안 맞았던 제품을 알려 주면 찾아 드려요" })).toBeInTheDocument();
    expect(fetchGuestShelf).toHaveBeenCalledTimes(2);
  });

  it("안 맞은 제품을 빼도 잘 맞은 평가가 남으면 자물쇠 대신 성분 없음 카드를 표시한다", async () => {
    vi.mocked(fetchGuestShelf)
      .mockResolvedValueOnce(
        response([candidate], 1, [
          savedProduct("BAD"),
          { ...savedProduct("GOOD"), product: { ...savedProduct("GOOD").product, id: 2 } },
        ]),
      )
      .mockResolvedValue(response([], 0, [savedProduct("GOOD")]));
    render(view());
    await screen.findByRole("link", { name: ingredient.koreanName });
    act(() => removeGuestShelfProduct(1));
    expect(await screen.findByRole("heading", { name: "나에게 안 맞는 성분이 없어요" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "파우치에서 평가하기" })).not.toBeInTheDocument();
  });

  it("마지막 평가를 지우면 제품이 남아 있어도 자물쇠로 돌아간다", async () => {
    vi.mocked(fetchGuestShelf)
      .mockResolvedValueOnce(response([candidate]))
      .mockResolvedValue(response([], 0, [savedProduct(null)]));
    render(view());
    await screen.findByRole("link", { name: ingredient.koreanName });
    act(() => putGuestShelfItem(savedProduct(null)));
    expect(await screen.findByRole("heading", { name: "안 맞았던 제품을 알려 주면 찾아 드려요" })).toBeInTheDocument();
  });

  it("삭제 전에 시작한 느린 응답이 나중에 도착해도 지운 성분이 되살아나지 않는다", async () => {
    let complete: (data: Awaited<ReturnType<typeof fetchGuestShelf>>) => void = () => undefined;
    vi.mocked(fetchGuestShelf).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    render(view());
    act(() => clearGuestShelf());
    await screen.findByRole("heading", { name: "안 맞았던 제품을 알려 주면 찾아 드려요" });
    await act(async () => complete(response([candidate])));
    expect(screen.queryByRole("link", { name: ingredient.koreanName })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "안 맞았던 제품을 알려 주면 찾아 드려요" })).toBeInTheDocument();
  });

  it("분석 실패를 빈 결과로 표시하지 않고 다시 시도할 수 있다", async () => {
    vi.mocked(fetchGuestShelf).mockRejectedValueOnce(new Error("연결 실패"));
    render(view());
    expect(await screen.findByText("주의 성분을 불러오지 못했어요.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByRole("heading", { name: "안 맞았던 제품을 알려 주면 찾아 드려요" })).toBeInTheDocument();
  });
});
