/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ProductList } from "./ProductList";

import { brands, categories, excludeCodes } from "@/mocks/fixtures";

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
    const sheet = await openBrandSheet();

    // 닥터지(id 5)는 픽스처에 제품이 없어 목록에서 빠진다.
    await waitFor(() => expect(sheet.getByText("라운드랩")).toBeInTheDocument());
    expect(sheet.queryByText("닥터지")).not.toBeInTheDocument();
  });
});
