/** @vitest-environment jsdom */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";

import { ProductList } from "./ProductList";

import { clearProductPages } from "@/lib/storage/product-pages-cache";
import { excludeCodes } from "@/mocks/fixtures";
import { server } from "@/mocks/server";

const { navigation } = vi.hoisted(() => ({ navigation: { query: "", push: vi.fn() } }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/products",
  useRouter: () => ({ push: navigation.push, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(navigation.query),
}));

afterEach(() => {
  server.events.removeAllListeners();
  clearProductPages();
  navigation.push.mockClear();
});

it.each([
  ["brandIds=1", "브랜드", "checkbox"],
  ["categoryIds=3", "카테고리", "checkbox"],
  ["skinType=DRY", "피부 타입", "radio"],
] as const)("%s 적용 후 시트는 추가 목록 요청 없이 다른 후보를 제공한다", async (query, sheet, role) => {
  navigation.query = query;
  const paths: string[] = [];
  server.events.on("request:start", ({ request }) => paths.push(new URL(request.url).pathname));
  const { rerender } = render(<ProductList excludeCodes={excludeCodes} />);
  await screen.findByRole("main");
  await userEvent.click(screen.getByRole("button", { name: new RegExp(sheet) }));
  const dialog = within(await screen.findByRole("dialog"));
  const alternatives = dialog.getAllByRole(role).filter((option) => option.getAttribute("aria-checked") !== "true");
  expect(alternatives.length).toBeGreaterThan(0);
  await userEvent.click(alternatives[0]);
  await waitFor(() => expect(paths).toContain("/api/products/count"));
  expect(paths.filter((path) => path === "/api/products")).toHaveLength(1);
  await userEvent.click(dialog.getByRole("button", { name: /제품 보기/ }));
  navigation.query = window.location.search;
  rerender(<ProductList excludeCodes={excludeCodes} />);
  await waitFor(() => expect(paths.filter((path) => path === "/api/products")).toHaveLength(2));
});

it("중간 페이지 직접 진입은 목록을 추가 요청하지 않고 첫 페이지 안내와 해제를 제공한다", async () => {
  navigation.query = "page=2&brandIds=99999";
  const paths: string[] = [];
  server.events.on("request:start", ({ request }) => paths.push(new URL(request.url).pathname));
  render(<ProductList excludeCodes={excludeCodes} />);
  await screen.findByRole("main");
  await userEvent.click(screen.getByRole("button", { name: /브랜드/ }));
  const dialog = within(await screen.findByRole("dialog"));
  expect(dialog.getByRole("link", { name: /첫 페이지/ })).toHaveAttribute("href", "/products?brandIds=99999");
  expect(dialog.getByRole("button", { name: "브랜드 #99999 해제" })).toBeEnabled();
  expect(paths.filter((path) => path === "/api/products")).toHaveLength(1);
});
