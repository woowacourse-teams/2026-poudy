/** @vitest-environment jsdom */
import type { IngredientAnalysisResponse, ShelfProductResponse } from "@poudy/api/api.zod";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UnsuitableIngredients } from "./UnsuitableIngredients";

import { fetchIngredientAnalysis, fetchShelf } from "@/lib/api/shelf";
import { SIGNED_OUT_USER_PRODUCT, type UserProductState } from "@/lib/domain/user-product";
import { productDetails } from "@/mocks/fixtures";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/api/shelf", () => ({ fetchIngredientAnalysis: vi.fn(), fetchShelf: vi.fn() }));
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
const MEMBER: UserProductState = { ...SIGNED_OUT_USER_PRODUCT, status: "ready" };
const mockShelf = (data: ReturnType<typeof response>) => {
  vi.mocked(fetchShelf).mockResolvedValue(data.shelf);
  vi.mocked(fetchIngredientAnalysis).mockResolvedValue(data.analysis);
};
const view = (selected = ingredients, userProduct = MEMBER) => (
  <UnsuitableIngredients productId={productDetails[0]!.id} userProduct={userProduct} ingredients={selected} />
);

beforeEach(() => {
  push.mockReset();
  vi.mocked(fetchShelf).mockReset();
  vi.mocked(fetchIngredientAnalysis).mockReset();
  mockShelf(response([], 0));
});

describe("로그인 전 제품 상세의 안 맞는 성분", () => {
  it("평가를 계산하지 않고 로그인 안내 카드를 보여 준다", async () => {
    render(view(ingredients, SIGNED_OUT_USER_PRODUCT));
    expect(screen.getByRole("heading", { name: "이 제품에 나와 안 맞는 성분이 있을까요?" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "로그인하고 확인하기" }));
    expect(push).toHaveBeenCalledWith("/login");
    expect(fetchShelf).not.toHaveBeenCalled();
    expect(fetchIngredientAnalysis).not.toHaveBeenCalled();
  });
});

describe("나만의 필터가 빈 회원의 평가 성분", () => {
  it("평가 분석에 있고 현재 구성품에 든 성분만 보여 준다", async () => {
    mockShelf(response([candidate, { ...candidate, id: -1, koreanName: "다른 구성품 성분" }]));
    render(view());

    expect(
      await screen.findByRole("heading", { name: "나와 안 맞을 수 있는 성분 1종이 들어 있어요" }),
    ).toBeInTheDocument();
    const card = screen.getByText("내 평가로 찾은 성분").closest("section")!;
    expect(within(card).getByRole("link", { name: ingredient.koreanName })).toBeInTheDocument();
    expect(within(card).queryByText("다른 구성품 성분")).not.toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "파우치" })).toHaveAttribute("href", "/pouch");
    expect(within(card).queryByText("나만의 필터")).not.toBeInTheDocument();
  });

  it.each([null, "GOOD"] as const)("제품 수와 평가 유무로 잠금 상태를 판단한다 (평가=%s)", async (preference) => {
    mockShelf(response([], 0, [savedProduct(preference)]));
    render(view());
    let heading = "나에게 안 맞는 성분이 없어요";
    if (preference === null) heading = "안 맞았던 제품을 알려 주면 찾아 드려요";
    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
  });

  it("등록 제품이 없으면 자물쇠와 평가 안내를 보여 준다", async () => {
    render(view());
    expect(await screen.findByRole("heading", { name: "안 맞았던 제품을 알려 주면 찾아 드려요" })).toBeInTheDocument();
    expect(document.querySelector(".blur-xs")).not.toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "파우치에서 평가하기" }));
    expect(push).toHaveBeenCalledWith("/pouch");
    expect(screen.queryByText("나만의 필터")).not.toBeInTheDocument();
  });

  it("평가는 있지만 현재 구성품에 겹치는 성분이 없으면 비교 결과를 보여 준다", async () => {
    mockShelf(response([candidate]));
    const { rerender } = render(view());
    await screen.findByRole("link", { name: ingredient.koreanName });
    rerender(view([]));
    expect(screen.getByRole("heading", { name: "나에게 안 맞는 성분이 없어요" })).toBeInTheDocument();
    expect(screen.getByText("평가로 찾은 주의 성분이 들어 있지 않아요.")).toBeInTheDocument();
  });

  it("분석 실패를 빈 결과로 표시하지 않고 다시 시도할 수 있다", async () => {
    vi.mocked(fetchIngredientAnalysis).mockRejectedValueOnce(new Error("연결 실패"));
    render(view());
    expect(await screen.findByText("주의 성분을 불러오지 못했어요.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByRole("heading", { name: "안 맞았던 제품을 알려 주면 찾아 드려요" })).toBeInTheDocument();
  });
});

describe("나만의 필터가 있는 회원", () => {
  it("걸린 성분이 없으면 안심 카드에 '나만의 필터' 표시 없이 [파우치]를 둔다", () => {
    render(view(ingredients, { ...MEMBER, myFilterEmpty: false }));
    const card = screen.getByRole("heading", { name: "나에게 안 맞는 성분이 없어요" }).closest("section")!;
    expect(within(card).queryByText("나만의 필터")).not.toBeInTheDocument();
    expect(within(card).queryByRole("link", { name: "필터 편집" })).not.toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "파우치" })).toHaveAttribute("href", "/pouch");
    expect(fetchShelf).not.toHaveBeenCalled();
  });
});
