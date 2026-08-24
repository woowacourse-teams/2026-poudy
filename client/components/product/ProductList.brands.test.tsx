/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { ProductList } from "./ProductList";

import { brands, categories, excludeCodes } from "@/mocks/fixtures";
import { server } from "@/mocks/server";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/products",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const openBrandSheet = async () => {
  render(<ProductList categories={categories} brands={brands} excludeCodes={excludeCodes} />);

  // 목록 응답이 도착해 조건에 걸린 브랜드를 알게 될 때까지 기다린다.
  await waitFor(() => expect(screen.getByRole("list")).toBeInTheDocument());

  await userEvent.click(screen.getByRole("button", { name: /브랜드/ }));

  // 제품 카드에도 브랜드 이름이 나오므로 시트 안으로 범위를 좁힌다.
  return within(await screen.findByRole("dialog"));
};

describe("ProductList 브랜드 시트", () => {
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
});
