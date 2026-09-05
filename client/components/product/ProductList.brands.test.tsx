/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProductList } from "./ProductList";

import { track } from "@/lib/analytics/track";
import { excludeCodes, products } from "@/mocks/fixtures";
import { server } from "@/mocks/server";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

const { searchParams } = vi.hoisted(() => ({ searchParams: { current: new URLSearchParams() } }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/products",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => searchParams.current,
}));

const openBrandSheet = async () => {
  render(<ProductList excludeCodes={excludeCodes} />);

  // 목록 응답이 도착해 조건에 걸린 브랜드를 알게 될 때까지 기다린다.
  await waitFor(() => expect(screen.getByRole("main")).toBeInTheDocument());

  await userEvent.click(screen.getByRole("button", { name: /브랜드/ }));

  // 제품 카드에도 브랜드 이름이 나오므로 시트 안으로 범위를 좁힌다.
  return within(await screen.findByRole("dialog"));
};

describe("ProductList 브랜드 시트", () => {
  beforeEach(() => {
    searchParams.current = new URLSearchParams();
    vi.mocked(track).mockClear();
  });

  it("데이터를 기다리는 동안만 스켈레톤을 두고, 카드가 오면 바로 읽힌다", async () => {
    server.use(
      http.get("*/api/products", async () => {
        await delay(100);
        return HttpResponse.json({
          items: products.slice(0, 2),
          pagination: { page: 0, size: 20, totalElements: 2, totalPages: 1, hasNext: false },
          brands: [],
        });
      }),
    );

    const { container } = render(<ProductList excludeCodes={excludeCodes} />);
    expect(container.querySelectorAll("[data-product-skeleton]")).toHaveLength(20);
    expect(container.querySelectorAll("[data-product-card]")).toHaveLength(0);
    expect(screen.queryByText("조건에 맞는 제품이 없어요")).not.toBeInTheDocument();

    await waitFor(() => expect(container.querySelectorAll("[data-product-card]")).toHaveLength(2));

    // 카드가 오면 자리를 채우던 스켈레톤은 물러난다.
    expect(container.querySelectorAll("[data-product-skeleton]")).toHaveLength(0);

    // 그림에 load 를 주지 않아도 제품 이름은 이미 읽힌다.
    const cards = container.querySelectorAll("[data-product-card]");
    expect(cards[0]).toHaveTextContent(products[0].name);
    expect(cards[1]).toHaveTextContent(products[1].name);
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

    render(<ProductList excludeCodes={excludeCodes} />);

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

  it("첫 제품 이미지만 즉시 받고 다음 제품부터 지연한다", async () => {
    server.use(
      http.get("*/api/products", () =>
        HttpResponse.json({
          items: products.slice(0, 2),
          pagination: { page: 0, size: 20, totalElements: 2, totalPages: 1, hasNext: false },
          brands: [],
        }),
      ),
    );

    const { container } = render(<ProductList excludeCodes={excludeCodes} />);
    await waitFor(() => expect(container.querySelectorAll("[data-product-image]")).toHaveLength(2));

    const images = container.querySelectorAll("[data-product-image]");
    expect(images[0]).toHaveAttribute("loading", "eager");
    expect(images[1]).toHaveAttribute("loading", "lazy");
  });
});
