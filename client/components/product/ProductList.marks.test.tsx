/** @vitest-environment jsdom */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { ProductList } from "./ProductList";

import { track } from "@/lib/analytics/track";
import { clearProductPages } from "@/lib/storage/product-pages-cache";
import { allProducts, excludeCodes } from "@/mocks/fixtures";
import { server } from "@/mocks/server";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

const { navigation } = vi.hoisted(() => ({ navigation: { query: "" } }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/products",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(navigation.query),
}));

const MARK_GROUPS = [
  {
    code: "UV_FILTER_TYPE",
    name: "자외선 차단 유형",
    options: [
      { code: "MINERAL", name: "무기자차", productCount: 4 },
      { code: "ORGANIC", name: "유기자차", productCount: 0 },
      { code: "HYBRID", name: "혼합자차", productCount: 3 },
    ],
  },
  { code: "WASHABILITY", name: "세정 용이성", options: [{ code: "EASY_WASH", name: "이지워시", productCount: 2 }] },
  {
    code: "WATER_RESISTANCE",
    name: "내수성",
    options: [{ code: "WATERPROOF", name: "워터프루프", productCount: 1 }],
  },
];

const listResponse = (markGroups: typeof MARK_GROUPS, page = 1) => ({
  items: [allProducts[0]],
  pagination: { page, size: 20, totalElements: 1, totalPages: 1, hasNext: false },
  ...(page === 1
    ? { filterOptions: { brands: [], categories: [], skinTypes: [], sensitiveSkin: false, markGroups } }
    : {}),
});

const useList = (markGroups: typeof MARK_GROUPS = MARK_GROUPS) =>
  server.use(
    http.get("*/api/products", ({ request }) =>
      HttpResponse.json(listResponse(markGroups, Number(new URL(request.url).searchParams.get("page") ?? 1))),
    ),
    http.get("*/api/products/count", () => HttpResponse.json({ count: 7 })),
  );

const renderList = async () => {
  render(<ProductList excludeCodes={excludeCodes} empty={<p>조건에 맞는 제품이 없어요</p>} />);
  await screen.findByRole("main");
};

const openMarkSheet = async () => {
  await renderList();
  await userEvent.click(await screen.findByRole("button", { name: /제품 특성|유기자차|혼합자차/ }));
  return within(await screen.findByRole("dialog"));
};

beforeEach(() => {
  navigation.query = "";
  window.history.replaceState(null, "", "/products");
  vi.mocked(track).mockClear();
});

afterEach(() => {
  server.events.removeAllListeners();
  clearProductPages();
});

it("서버가 준 그룹·옵션·수를 그 순서대로 시트에 그리고, 서버가 주지 않은 다이소는 두지 않는다", async () => {
  useList();

  const sheet = await openMarkSheet();

  expect(sheet.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual([
    "자외선 차단 유형",
    "세정 용이성",
    "내수성",
  ]);
  expect(sheet.getAllByRole("checkbox").map((box) => box.closest("label")?.textContent)).toEqual([
    "무기자차4개",
    "유기자차0개",
    "혼합자차3개",
    "이지워시2개",
    "워터프루프1개",
  ]);
  expect(sheet.queryByText("다이소")).not.toBeInTheDocument();
});

it("후보가 없는 조건에서는 칩을 두지 않는다", async () => {
  useList([]);

  await renderList();

  expect(screen.getByRole("button", { name: /피부 타입/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /제품 특성/ })).not.toBeInTheDocument();
});

it("고른 값을 누른 차례와 상관없이 서버 순서로 주소에 쓰고, 개수 요청에도 같은 값을 보낸다", async () => {
  useList();
  const counted: string[][] = [];
  server.events.on("request:start", ({ request }) => {
    const url = new URL(request.url);
    if (url.pathname === "/api/products/count") counted.push(url.searchParams.getAll("marks"));
  });

  const sheet = await openMarkSheet();
  await userEvent.click(sheet.getByRole("checkbox", { name: /이지워시/ }));
  await userEvent.click(sheet.getByRole("checkbox", { name: /혼합자차/ }));
  await userEvent.click(sheet.getByRole("checkbox", { name: /무기자차/ }));

  await waitFor(() => expect(counted.at(-1)).toEqual(["MINERAL", "HYBRID", "EASY_WASH"]));
  await userEvent.click(sheet.getByRole("button", { name: /제품 보기/ }));

  expect(window.location.search).toBe("?marks=MINERAL&marks=HYBRID&marks=EASY_WASH");
  expect(track).toHaveBeenCalledWith("filter_applied", { filter_type: "mark", filter_value_count: 3 });
});

it("주소의 마크를 읽어 칩 값과 시트 선택으로 되살리고, 목록 요청에 싣는다", async () => {
  useList();
  navigation.query = "keyword=선크림&marks=HYBRID&marks=EASY_WASH";
  const requested: URLSearchParams[] = [];
  server.events.on("request:start", ({ request }) => {
    const url = new URL(request.url);
    if (url.pathname === "/api/products") requested.push(url.searchParams);
  });

  const sheet = await openMarkSheet();

  expect(requested[0].getAll("marks")).toEqual(["HYBRID", "EASY_WASH"]);
  expect(requested[0].get("keyword")).toBe("선크림");
  expect(screen.getByRole("button", { name: /혼합자차 외 1개/, hidden: true })).toBeInTheDocument();
  expect(sheet.getByRole("checkbox", { name: /혼합자차/ })).toBeChecked();
  expect(sheet.getByRole("checkbox", { name: /이지워시/ })).toBeChecked();
  expect(sheet.getByRole("checkbox", { name: /무기자차/ })).not.toBeChecked();
});

it("0개가 된 선택도 옵션에 남고, 시트의 초기화는 초안의 마크만 비운다", async () => {
  useList();
  navigation.query = "marks=ORGANIC&brandIds=1";

  const sheet = await openMarkSheet();

  expect(sheet.getByRole("checkbox", { name: /유기자차/ })).toBeChecked();
  await userEvent.click(sheet.getByRole("button", { name: "초기화" }));
  expect(sheet.getByRole("checkbox", { name: /유기자차/ })).not.toBeChecked();
  expect(track).toHaveBeenCalledWith("filter_reset", { filter_type: "mark" });

  await userEvent.click(sheet.getByRole("button", { name: /제품 보기/ }));
  expect(window.location.search).toBe("?brandIds=1");
});

it("칩 줄의 초기화 버튼으로 마크 조건도 함께 비운다", async () => {
  useList();
  navigation.query = "marks=HYBRID&keyword=선크림";

  await renderList();
  await userEvent.click(await screen.findByRole("button", { name: /초기화/ }));

  expect(window.location.search).toBe("?keyword=%EC%84%A0%ED%81%AC%EB%A6%BC");
});

it("중간 장으로 들어와 후보가 없으면 첫 장 링크를 주고, 고른 값은 코드로 적어 풀 수 있게 한다", async () => {
  useList();
  navigation.query = "marks=HYBRID&page=2";

  const sheet = await openMarkSheet();

  expect(sheet.getByRole("link", { name: "첫 페이지에서 전체 필터 선택지 보기" })).toHaveAttribute(
    "href",
    "/products?marks=HYBRID",
  );
  expect(sheet.queryByRole("checkbox")).not.toBeInTheDocument();
  await userEvent.click(sheet.getByRole("button", { name: /HYBRID/ }));
  expect(sheet.queryByText("HYBRID")).not.toBeInTheDocument();
});
