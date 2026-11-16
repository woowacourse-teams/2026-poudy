/** @vitest-environment jsdom */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProductList } from "./ProductList";

import { clearProductPages } from "@/lib/storage/product-pages-cache";
import { allProducts, excludeCodes } from "@/mocks/fixtures";
import { server } from "@/mocks/server";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

// 주소는 replaceState 로 바꿔도 이 값을 고치기 전까지 따라오지 않는다. 실제 앱에서 주소가 전환으로 늦게 따라오는 것과 같다.
const { navigation } = vi.hoisted(() => ({ navigation: { query: "" } }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/products",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(navigation.query),
}));

const MARK_GROUPS = [
  {
    code: "PRODUCT_FEATURE",
    name: "제품 특성",
    options: [
      { code: "EASY_WASH", name: "이지워시", productCount: 2 },
      { code: "DAISO", name: "다이소", productCount: 5 },
    ],
  },
];

beforeEach(() => {
  navigation.query = "";
  window.history.replaceState(null, "", "/products");
  server.use(
    http.get("*/api/products", () =>
      HttpResponse.json({
        items: [allProducts[0]],
        pagination: { page: 1, size: 20, totalElements: 1, totalPages: 1, hasNext: false },
        filterOptions: { brands: [], categories: [], skinOptions: [], markGroups: MARK_GROUPS },
      }),
    ),
    http.get("*/api/products/count", () => HttpResponse.json({ count: 7 })),
  );
});

afterEach(() => {
  clearProductPages();
});

const list = <ProductList excludeCodes={excludeCodes} empty={<p>조건에 맞는 제품이 없어요</p>} />;

const renderList = async (query: string) => {
  navigation.query = query;
  const view = render(list);
  await screen.findByRole("main");
  // 마크 그룹 칩은 첫 장의 후보가 와야 생긴다.
  await screen.findByRole("button", { name: /^제품 특성/ });
  return view;
};

/** 시트를 여는 칩의 이름을 칩 줄의 순서대로. 접근 가능한 이름의 앞부분(조건 이름)만 남긴다. */
const chipOrder = () =>
  chipRow()
    .getAllByRole("button")
    .filter((button) => button.getAttribute("aria-haspopup") === "dialog")
    .map((button) => button.getAttribute("aria-label")?.split(",")[0] ?? button.textContent);

const chipRow = () => {
  const row = screen.getByRole("button", { name: "필터 조건 모두 초기화" }).closest<HTMLElement>(".overflow-x-auto");
  if (!row) throw new Error("칩 줄을 찾지 못했다");
  return within(row);
};

/** jsdom 의 scrollLeft 는 값을 담지 않아 쓴 값을 기록한다. */
const watchScroll = () => {
  const row = screen.getByRole("button", { name: "필터 조건 모두 초기화" }).closest<HTMLElement>(".overflow-x-auto");
  if (!row) throw new Error("칩 줄을 찾지 못했다");
  const written: number[] = [];
  Object.defineProperty(row, "scrollLeft", {
    configurable: true,
    get: () => written.at(-1) ?? 120,
    set: (value: number) => written.push(value),
  });
  return written;
};

describe("켜진 칩 앞쪽 정렬(#1243)", () => {
  it("화면에 들어오면 값이 걸린 칩을 앞으로 모으고, 묶음 안에서는 기본 순서를 지킨다", async () => {
    await renderList("marks=DAISO&brandIds=1&excludeCodes=FRAGRANCE_ALLERGENS");

    expect(chipOrder()).toEqual(["성분", "브랜드", "제품 특성", "카테고리", "유수분", "피부 타입"]);
  });

  it("값이 걸린 칩이 없으면 기본 순서 그대로다", async () => {
    await renderList("");

    expect(chipOrder()).toEqual(["성분", "카테고리", "브랜드", "유수분", "피부 타입", "제품 특성"]);
  });

  it("시트에서 적용하고 닫으면, 주소가 따라오기 전이어도 적용한 칩을 앞으로 옮기고 가로 스크롤을 맨 앞으로 돌린다", async () => {
    await renderList("");
    const scrolled = watchScroll();

    await userEvent.click(screen.getByRole("button", { name: /^제품 특성/ }));
    const sheet = within(await screen.findByRole("dialog"));
    await userEvent.click(sheet.getByRole("checkbox", { name: /다이소/ }));
    await userEvent.click(await sheet.findByRole("button", { name: /제품 보기/ }));

    expect(window.location.search).toBe("?marks=DAISO");
    expect(chipOrder()).toEqual(["제품 특성", "성분", "카테고리", "브랜드", "유수분", "피부 타입"]);
    expect(scrolled.at(-1)).toBe(0);
  });

  it("적용하지 않고 닫아도 지금 조건으로 다시 정렬한다", async () => {
    const view = await renderList("marks=DAISO");
    // 칩 줄의 초기화 버튼으로 비우면 순서는 그대로다.
    await userEvent.click(screen.getByRole("button", { name: "필터 조건 모두 초기화" }));
    navigation.query = window.location.search.slice(1);
    view.rerender(list);
    expect(chipOrder()).toEqual(["제품 특성", "성분", "카테고리", "브랜드", "유수분", "피부 타입"]);

    await userEvent.click(screen.getByRole("button", { name: /^브랜드/ }));
    const sheet = within(await screen.findByRole("dialog"));
    await userEvent.click(sheet.getByRole("button", { name: "닫기" }));

    await waitFor(() =>
      expect(chipOrder()).toEqual(["성분", "카테고리", "브랜드", "유수분", "피부 타입", "제품 특성"]),
    );
  });

  it("칩 줄의 초기화 버튼으로 비우면 순서와 가로 스크롤을 그대로 둔다", async () => {
    const view = await renderList("marks=DAISO&brandIds=1");
    const scrolled = watchScroll();

    await userEvent.click(screen.getByRole("button", { name: "필터 조건 모두 초기화" }));
    navigation.query = window.location.search.slice(1);
    view.rerender(list);

    expect(navigation.query).toBe("");
    expect(chipOrder()).toEqual(["브랜드", "제품 특성", "성분", "카테고리", "유수분", "피부 타입"]);
    expect(scrolled).toEqual([]);
  });
});
