/**
 * @vitest-environment jsdom
 */
import type { CategoryResponse, ProductRankingItemResponse } from "@poudy/api/api.zod";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PopularProducts } from "./PopularProducts";

import { track } from "@/lib/analytics/track";
import { fetchProductRankings } from "@/lib/api/products";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));
vi.mock("@/lib/api/products", () => ({ fetchProductRankings: vi.fn() }));

const rankingOf = (id: number, name: string): ProductRankingItemResponse => ({
  product: {
    id,
    name,
    brandName: "라운드랩",
    imageUrl: `/images/products/${id}.png`,
    price: 20000,
    moistureLevel: 2,
    oilLevel: 1,
  },
});

const initialItems = [rankingOf(1, "1025 독도 토너"), rankingOf(2, "자작나무 수분 크림")];

const categories = [
  { id: 11, name: "스킨케어", children: [], productCount: 10 },
  { id: 12, name: "마스크팩", children: [], productCount: 5 },
] as readonly CategoryResponse[];

beforeEach(() => {
  vi.mocked(fetchProductRankings).mockReset();
  vi.mocked(track).mockReset();
});

describe("PopularProducts", () => {
  it("서버가 준 첫 화면을 그대로 그린다", () => {
    render(<PopularProducts initialItems={initialItems} categories={categories} />);

    expect(screen.getByText(/1025 독도 토너/)).toBeInTheDocument();
    expect(fetchProductRankings).not.toHaveBeenCalled();
  });

  it("카테고리를 고르면 그 카테고리로 다시 받아 온다", async () => {
    vi.mocked(fetchProductRankings).mockResolvedValue({ items: [rankingOf(3, "어성초 토너")] });
    render(<PopularProducts initialItems={initialItems} categories={categories} />);

    await userEvent.click(screen.getByRole("button", { name: "스킨케어" }));

    expect(fetchProductRankings).toHaveBeenCalledWith([11]);
    expect(track).toHaveBeenCalledWith("category_selected", {
      category_id: 11,
      category_name: "스킨케어",
      origin_surface: "home",
    });
    await waitFor(() => expect(screen.getByText(/어성초 토너/)).toBeInTheDocument());
    expect(screen.queryByText(/1025 독도 토너/)).not.toBeInTheDocument();
  });

  it("고른 카테고리의 제품 링크에 카테고리 경로를 남긴다", async () => {
    vi.mocked(fetchProductRankings).mockResolvedValue({ items: [rankingOf(3, "어성초 토너")] });
    render(<PopularProducts initialItems={initialItems} categories={categories} />);

    await userEvent.click(screen.getByRole("button", { name: "스킨케어" }));
    const product = await screen.findByRole("link", { name: /어성초 토너/ });

    expect(product).toHaveAttribute("href", "/products/3?from=home_category");
  });

  it("전체로 되돌리면 서버가 준 첫 화면을 다시 쓴다", async () => {
    vi.mocked(fetchProductRankings).mockResolvedValue({ items: [rankingOf(3, "어성초 토너")] });
    render(<PopularProducts initialItems={initialItems} categories={categories} />);

    await userEvent.click(screen.getByRole("button", { name: "스킨케어" }));
    await waitFor(() => expect(screen.getByText(/어성초 토너/)).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "전체" }));

    expect(screen.getByText(/1025 독도 토너/)).toBeInTheDocument();
    // 전체는 이미 받아 둔 값이라 다시 부르지 않는다.
    expect(fetchProductRankings).toHaveBeenCalledTimes(1);
  });

  it("고른 칩만 눌린 것으로 알린다", async () => {
    vi.mocked(fetchProductRankings).mockResolvedValue({ items: [] });
    render(<PopularProducts initialItems={initialItems} categories={categories} />);

    expect(screen.getByRole("button", { name: "전체" })).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(screen.getByRole("button", { name: "마스크팩" }));

    expect(screen.getByRole("button", { name: "마스크팩" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "전체" })).toHaveAttribute("aria-pressed", "false");
  });

  it("고른 카테고리에 제품이 없으면 빈 안내를 보여 준다", async () => {
    vi.mocked(fetchProductRankings).mockResolvedValue({ items: [] });
    render(<PopularProducts initialItems={initialItems} categories={categories} />);

    await userEvent.click(screen.getByRole("button", { name: "스킨케어" }));

    await waitFor(() => expect(screen.getByText("아직 볼 만한 제품이 모이지 않았어요")).toBeInTheDocument());
  });

  it("순위가 비면 아무것도 그리지 않는다", () => {
    const { container } = render(<PopularProducts initialItems={[]} categories={categories} />);

    expect(container).toBeEmptyDOMElement();
  });
});
