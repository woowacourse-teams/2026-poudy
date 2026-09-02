/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProductList } from "./ProductList";

import { track } from "@/lib/analytics/track";
import { categories, excludeCodes, products } from "@/mocks/fixtures";
import { server } from "@/mocks/server";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

const { searchParams } = vi.hoisted(() => ({ searchParams: { current: new URLSearchParams() } }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/products",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => searchParams.current,
}));

const openBrandSheet = async () => {
  render(<ProductList categories={categories} excludeCodes={excludeCodes} />);

  // 목록 응답이 도착해 조건에 걸린 브랜드를 알게 될 때까지 기다린다.
  await waitFor(() => expect(screen.getByRole("list")).toBeInTheDocument());

  await userEvent.click(screen.getByRole("button", { name: /브랜드/ }));

  // 제품 카드에도 브랜드 이름이 나오므로 시트 안으로 범위를 좁힌다.
  return within(await screen.findByRole("dialog"));
};

describe("ProductList 브랜드 시트", () => {
  beforeEach(() => {
    searchParams.current = new URLSearchParams();
    vi.mocked(track).mockClear();
  });

  it("조건에 걸린 브랜드만 고를 수 있다", async () => {
    /*
     * 목록 응답이 돌려준 브랜드만 시트에 오른다. 어느 브랜드가 남는지는 목 데이터에
     * 달렸으므로 이름을 박아 두지 않고, 시트의 브랜드가 모두 응답에 있었는지로 본다.
     */
    server.use(
      http.get("*/api/products", () =>
        HttpResponse.json({
          items: [],
          pagination: { page: 0, size: 20, totalElements: 0, totalPages: 0, hasNext: false },
          brands: [{ id: 1, name: "라운드랩", englishName: "ROUND LAB", imageUrl: "" }],
        }),
      ),
    );

    const sheet = await openBrandSheet();

    await waitFor(() => expect(sheet.getByText("라운드랩")).toBeInTheDocument());
    // 응답에 없던 브랜드는 고를 수 없다.
    expect(sheet.queryByText("토리든")).not.toBeInTheDocument();
  });

  it("제품명 검색 결과가 렌더링되면 결과 수를 남긴다", async () => {
    searchParams.current = new URLSearchParams("keyword=독도");
    server.use(
      http.get("*/api/products", () =>
        HttpResponse.json({
          items: products.slice(0, 2),
          pagination: { page: 0, size: 20, totalElements: 2, totalPages: 1, hasNext: false },
          brands: [],
        }),
      ),
    );

    render(<ProductList categories={categories} excludeCodes={excludeCodes} />);

    await waitFor(() =>
      expect(track).toHaveBeenCalledWith("search_results_viewed", {
        mode: "product",
        query: "독도",
        result_count: 2,
        include_count: 0,
        exclude_count: 0,
        exclude_group_count: 0,
      }),
    );
    expect(screen.getAllByRole("link")[0]).toHaveAttribute("href", "/products/1?from=search_results");
  });
});
