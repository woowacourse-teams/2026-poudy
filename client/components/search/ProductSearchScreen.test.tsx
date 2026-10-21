/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProductSearchScreen, ProductSearchScreenFallback } from "./ProductSearchScreen";

import { track } from "@/lib/analytics/track";
import { server } from "@/mocks/server";

const { push, searchParams, readsUrl } = vi.hoisted(() => ({
  push: vi.fn(),
  searchParams: { current: new URLSearchParams() },
  readsUrl: { allowed: true },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => {
    if (!readsUrl.allowed) throw new Error("주소를 읽었다");
    return searchParams.current;
  },
}));

/** 입력이 멈춘 뒤 검색하므로, 바쁜 CI 에서도 결과를 기다릴 만큼 넉넉히 둔다. */
const WAIT = { timeout: 5000 };

vi.setConfig({ testTimeout: 20_000 });

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

const product = {
  id: 1,
  name: "1025 독도 토너",
  brandName: "라운드랩",
  marks: [],
  imageUrl: "https://example.com/toner.png",
  match: { field: "PRODUCT_NAME" as const, text: "1025 독도 토너", startIndex: 5, endIndexExclusive: 7 },
};

const suggestionsAre = (items: readonly (typeof product)[], total: number) =>
  server.use(
    http.get("*/api/products/suggestions", () =>
      HttpResponse.json({
        items,
        pagination: { page: 1, size: 20, totalElements: total, totalPages: 1, hasNext: false },
      }),
    ),
  );

describe("ProductSearchScreen", () => {
  beforeEach(() => {
    readsUrl.allowed = true;
    searchParams.current = new URLSearchParams();
    push.mockClear();
    vi.mocked(track).mockClear();
    localStorage.clear();
  });

  it("미리 만든 모양은 주소를 읽지 않고 검색창과 넘겨받은 것을 그린다", () => {
    readsUrl.allowed = false;
    render(
      <ProductSearchScreenFallback>
        <p>인기 검색어</p>
      </ProductSearchScreenFallback>,
    );

    expect(screen.getByRole("searchbox", { name: "제품명 검색" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "제품명 검색", current: "page" })).toBeInTheDocument();
    expect(screen.getByText("인기 검색어")).toBeInTheDocument();
  });

  it("입력하면 검색 결과 행과 제품 바로가기를 보여 주고, 제품을 고르면 상세로 간다", async () => {
    suggestionsAre([product], 24);
    render(<ProductSearchScreen />);

    await userEvent.type(screen.getByRole("combobox", { name: "제품명 검색" }), "독도");

    expect(await screen.findByRole("option", { name: /‘독도’ 검색 결과\s*24개/ }, WAIT)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("option", { name: /1025 독도 토너/ }));

    expect(track).toHaveBeenCalledWith(
      "search_suggestion_selected",
      expect.objectContaining({ mode: "product", query: "독도", position: 0, product_id: 1 }),
    );
    expect(push).toHaveBeenCalledWith("/products/1?from=suggestion");
  });

  it("검색 결과 행을 고르면 결과 목록으로 간다", async () => {
    suggestionsAre([product], 24);
    render(<ProductSearchScreen />);

    await userEvent.type(screen.getByRole("combobox", { name: "제품명 검색" }), "독도");
    await userEvent.click(await screen.findByRole("option", { name: /‘독도’ 검색 결과/ }, WAIT));

    expect(track).toHaveBeenCalledWith("search_submitted", { mode: "product", query: "독도", result_count: 24 });
    expect(push).toHaveBeenCalledWith("/products?keyword=%EB%8F%85%EB%8F%84");
  });

  it("맞는 제품이 없으면 검색어를 인용해 알린다", async () => {
    suggestionsAre([], 0);
    render(<ProductSearchScreen />);

    await userEvent.type(screen.getByRole("combobox", { name: "제품명 검색" }), "없는말");

    expect(await screen.findByText("‘없는말’과 맞는 제품이 없어요", {}, WAIT)).toBeInTheDocument();
  });
});
