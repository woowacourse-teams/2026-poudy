/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProductSearchScreen, ProductSearchScreenFallback } from "./ProductSearchScreen";

import { track } from "@/lib/analytics/track";
import { clearRecentSearches, readRecentSearches } from "@/lib/storage/recent-searches";
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

const related = [
  { keyword: "1025 독도 토너", match: { startIndex: 5, endIndexExclusive: 7 } },
  { keyword: "라운드랩 1025 독도 로션", match: { startIndex: 10, endIndexExclusive: 12 } },
];

const resultsAre = (items: typeof related, count: number) =>
  server.use(
    http.get("*/api/products/related-keywords", () => HttpResponse.json({ items })),
    http.get("*/api/products/count", () => HttpResponse.json({ count })),
  );

describe("ProductSearchScreen", () => {
  beforeEach(() => {
    readsUrl.allowed = true;
    searchParams.current = new URLSearchParams();
    push.mockClear();
    vi.mocked(track).mockClear();
    localStorage.clear();
    clearRecentSearches();
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

  it("입력하면 입력한 검색어 줄을 맨 위에 두고 그 아래에 연관검색어를 보여 준다", async () => {
    resultsAre(related, 24);
    render(<ProductSearchScreen />);

    await userEvent.type(screen.getByRole("combobox", { name: "제품명 검색" }), "독도");

    await screen.findByRole("option", { name: "1025 독도 토너" }, WAIT);
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(3);
    ["독도", "1025 독도 토너", "라운드랩 1025 독도 로션"].forEach((name, at) =>
      expect(options[at]).toHaveAccessibleName(name),
    );
    expect(screen.queryByRole("heading", { name: "연관검색어" })).not.toBeInTheDocument();
  });

  it("연관검색어를 고르면 그 검색어로 결과 목록에 가고 최근 검색에 검색어로 남긴다", async () => {
    resultsAre(related, 24);
    render(<ProductSearchScreen />);

    await userEvent.type(screen.getByRole("combobox", { name: "제품명 검색" }), "독도");
    await userEvent.click(await screen.findByRole("option", { name: "라운드랩 1025 독도 로션" }, WAIT));

    expect(track).toHaveBeenCalledWith(
      "search_suggestion_selected",
      expect.objectContaining({ mode: "product", query: "독도", position: 1, keyword: "라운드랩 1025 독도 로션" }),
    );
    expect(track).not.toHaveBeenCalledWith("search_submitted", expect.anything());
    expect(push).toHaveBeenCalledWith(`/products?keyword=${encodeURIComponent("라운드랩 1025 독도 로션")}`);
    expect(readRecentSearches()).toEqual([{ kind: "keyword", keyword: "라운드랩 1025 독도 로션" }]);
  });

  it("입력한 검색어 줄을 고르면 그 검색어로 결과 목록에 간다", async () => {
    resultsAre(related, 24);
    render(<ProductSearchScreen />);

    await userEvent.type(screen.getByRole("combobox", { name: "제품명 검색" }), "독도");
    await userEvent.click(await screen.findByRole("option", { name: "독도" }, WAIT));

    expect(track).toHaveBeenCalledWith("search_submitted", { mode: "product", query: "독도", result_count: 24 });
    expect(push).toHaveBeenCalledWith("/products?keyword=%EB%8F%85%EB%8F%84");
    expect(readRecentSearches()).toEqual([{ kind: "keyword", keyword: "독도" }]);
  });

  it("입력한 검색어 줄은 입력이 멈추기 전에 눌러도 지금 검색어로 다 센 뒤에 보낸다", async () => {
    resultsAre(related, 24);
    render(<ProductSearchScreen />);

    const input = screen.getByRole("combobox", { name: "제품명 검색" });
    await userEvent.type(input, "독도");
    await screen.findByRole("option", { name: "1025 독도 토너" }, WAIT);

    resultsAre(related, 3);
    await userEvent.type(input, " 토너");
    await userEvent.click(screen.getByRole("option", { name: "독도 토너" }));

    await vi.waitFor(
      () => expect(push).toHaveBeenCalledWith(`/products?keyword=${encodeURIComponent("독도 토너")}`),
      WAIT,
    );
    expect(track).toHaveBeenCalledWith("search_submitted", { mode: "product", query: "독도 토너", result_count: 3 });
  });

  it("연관검색어를 받지 못해도 결과 수로 입력한 검색어 줄과 엔터를 쓸 수 있다", async () => {
    server.use(
      http.get("*/api/products/related-keywords", () =>
        HttpResponse.json({ status: 500, code: "INTERNAL_SERVER_ERROR" }, { status: 500 }),
      ),
      http.get("*/api/products/count", () => HttpResponse.json({ count: 24 })),
    );
    render(<ProductSearchScreen />);

    await userEvent.type(screen.getByRole("combobox", { name: "제품명 검색" }), "독도");

    expect(await screen.findByRole("option", { name: "독도" }, WAIT)).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(1);

    await userEvent.keyboard("{Enter}");

    expect(push).toHaveBeenCalledWith("/products?keyword=%EB%8F%85%EB%8F%84");
  });

  it("맞는 제품이 없으면 검색어를 인용해 알리고 연관검색어를 비운다", async () => {
    resultsAre([], 0);
    render(<ProductSearchScreen />);

    await userEvent.type(screen.getByRole("combobox", { name: "제품명 검색" }), "없는말");

    expect(await screen.findByText("‘없는말’과 맞는 제품이 없어요", {}, WAIT)).toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });
});
