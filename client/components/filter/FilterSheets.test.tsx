/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { ProductList } from "@/components/product/ProductList";
import { categories, excludeCodes } from "@/mocks/fixtures";
import { server } from "@/mocks/server";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/products",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

/** 조건에 걸린 제품 수를 정해 둔다. */
const countIs = (count: number) => server.use(http.get("*/api/products/count", () => HttpResponse.json({ count })));

const openSheet = async (name: RegExp) => {
  render(<ProductList categories={categories} excludeCodes={excludeCodes} />);

  await waitFor(() => expect(screen.getByRole("list")).toBeInTheDocument());
  await userEvent.click(screen.getByRole("button", { name }));

  return within(await screen.findByRole("dialog"));
};

/*
 * 적용 버튼은 네 시트가 BottomSheet 하나를 함께 쓴다. 시트마다 문구만 다르므로
 * 카테고리·브랜드·유수분·성분을 모두 훑어 어느 하나가 빠지지 않았는지 본다.
 */
const SHEETS = [
  { name: /카테고리/, label: /제품 보기/ },
  { name: /브랜드/, label: /제품 보기/ },
  { name: /유수분/, label: /보기/ },
  { name: /성분/, label: /제품 보기/ },
] as const;

describe("필터 시트의 적용 버튼", () => {
  it.each(SHEETS)("조건에 맞는 제품이 없으면 누를 수 없다 ($name)", async ({ name, label }) => {
    countIs(0);

    const sheet = await openSheet(name);

    await waitFor(() => expect(sheet.getByRole("button", { name: label })).toBeDisabled());
  });

  it.each(SHEETS)("제품이 있으면 누를 수 있다 ($name)", async ({ name, label }) => {
    countIs(7);

    const sheet = await openSheet(name);

    await waitFor(() => expect(sheet.getByRole("button", { name: label })).toBeEnabled());
  });

  it("아직 세는 중에는 막지 않는다", async () => {
    // 응답을 주지 않아 세는 중인 상태로 둔다.
    server.use(http.get("*/api/products/count", () => new Promise(() => {})));

    const sheet = await openSheet(/브랜드/);

    expect(sheet.getByRole("button", { name: /제품 보기/ })).toBeEnabled();
  });
});
