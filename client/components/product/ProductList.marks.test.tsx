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
  {
    code: "PRODUCT_FEATURE",
    name: "제품 특성",
    options: [
      { code: "EASY_WASH", name: "이지워시", productCount: 2 },
      { code: "WATERPROOF", name: "워터프루프", productCount: 1 },
      { code: "DAISO", name: "다이소", productCount: 5 },
    ],
  },
];

const listResponse = (markGroups: typeof MARK_GROUPS, page = 1) => ({
  items: [allProducts[0]],
  pagination: { page, size: 20, totalElements: 1, totalPages: 1, hasNext: false },
  ...(page === 1 ? { filterOptions: { brands: [], categories: [], skinOptions: [], markGroups } } : {}),
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

const UV_CHIP = /자외선 차단 유형/;

const openMarkSheet = async (chip: RegExp = UV_CHIP) => {
  await renderList();
  await userEvent.click(await screen.findByRole("button", { name: chip }));
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

it("서버가 준 그룹마다 칩을 그 순서대로 두고, 시트에는 그 그룹의 옵션 이름만 그린다", async () => {
  useList();

  const sheet = await openMarkSheet();

  const chips = screen.getAllByRole("button", { hidden: true }).map((button) => button.textContent);
  expect(chips.filter((name) => /^(피부 타입|자외선 차단 유형|제품 특성)$/.test(name))).toEqual([
    "피부 타입",
    "자외선 차단 유형",
    "제품 특성",
  ]);
  expect(sheet.getByRole("heading", { name: "자외선 차단 유형" })).toBeInTheDocument();
  expect(sheet.getAllByRole("checkbox").map((box) => box.closest("label")?.textContent)).toEqual([
    "무기자차",
    "유기자차",
    "혼합자차",
  ]);
});

it("서버가 다이소를 제품 특성으로 주면 고를 수 있고 marks 로 요청한다", async () => {
  useList();
  const counted: string[][] = [];
  server.events.on("request:start", ({ request }) => {
    const url = new URL(request.url);
    if (url.pathname === "/api/products/count") counted.push(url.searchParams.getAll("marks"));
  });

  const sheet = await openMarkSheet(/제품 특성/);

  expect(sheet.getAllByRole("checkbox").map((box) => box.closest("label")?.textContent)).toEqual([
    "이지워시",
    "워터프루프",
    "다이소",
  ]);
  await userEvent.click(sheet.getByRole("checkbox", { name: /다이소/ }));
  await waitFor(() => expect(counted.at(-1)).toEqual(["DAISO"]));
  await userEvent.click(sheet.getByRole("button", { name: /제품 보기/ }));

  expect(window.location.search).toBe("?marks=DAISO");
});

it("후보가 없는 조건에서는 마크 칩을 두지 않는다", async () => {
  useList([]);

  await renderList();

  expect(screen.getByRole("button", { name: /피부 타입/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /자외선 차단 유형|제품 특성/ })).not.toBeInTheDocument();
});

it("다른 그룹의 선택을 지키며 서버 순서로 주소에 쓰고, 개수 요청에도 같은 값을 보낸다", async () => {
  useList();
  navigation.query = "marks=EASY_WASH";
  const counted: string[][] = [];
  server.events.on("request:start", ({ request }) => {
    const url = new URL(request.url);
    if (url.pathname === "/api/products/count") counted.push(url.searchParams.getAll("marks"));
  });

  const sheet = await openMarkSheet();
  await userEvent.click(sheet.getByRole("checkbox", { name: /혼합자차/ }));
  await userEvent.click(sheet.getByRole("checkbox", { name: /무기자차/ }));

  await waitFor(() => expect(counted.at(-1)).toEqual(["MINERAL", "HYBRID", "EASY_WASH"]));
  await userEvent.click(sheet.getByRole("button", { name: /제품 보기/ }));

  expect(window.location.search).toBe("?marks=MINERAL&marks=HYBRID&marks=EASY_WASH");
  // 분석 이벤트의 수는 이 시트에서 고른 값만 센다.
  expect(track).toHaveBeenCalledWith("filter_applied", {
    filter_type: "mark",
    filter_value_count: 2,
    filter_flow_id: expect.any(String),
    mark_group: "UV_FILTER_TYPE",
    mark_codes: ["MINERAL", "HYBRID", "EASY_WASH"],
  });
});

it("주소의 마크를 읽어 그룹별 칩 값과 시트 선택으로 되살리고, 목록 요청에 싣는다", async () => {
  useList();
  navigation.query = "keyword=선크림&marks=HYBRID&marks=MINERAL&marks=EASY_WASH";
  const requested: URLSearchParams[] = [];
  server.events.on("request:start", ({ request }) => {
    const url = new URL(request.url);
    if (url.pathname === "/api/products") requested.push(url.searchParams);
  });

  const sheet = await openMarkSheet(/무기자차 외 1개/);

  expect(requested[0].getAll("marks")).toEqual(["HYBRID", "MINERAL", "EASY_WASH"]);
  expect(requested[0].get("keyword")).toBe("선크림");
  expect(screen.getByRole("button", { name: /이지워시/, hidden: true })).toBeInTheDocument();
  expect(sheet.getByRole("checkbox", { name: /혼합자차/ })).toBeChecked();
  expect(sheet.getByRole("checkbox", { name: /무기자차/ })).toBeChecked();
  expect(sheet.getByRole("checkbox", { name: /유기자차/ })).not.toBeChecked();
});

it("후보 수가 0개가 된 선택도 옵션에 남고, 시트의 초기화는 그 그룹의 선택만 비운다", async () => {
  useList();
  navigation.query = "marks=ORGANIC&marks=EASY_WASH&brandIds=1";

  const sheet = await openMarkSheet(/유기자차/);

  expect(sheet.getByRole("checkbox", { name: /유기자차/ })).toBeChecked();
  await userEvent.click(sheet.getByRole("button", { name: "초기화" }));
  expect(sheet.getByRole("checkbox", { name: /유기자차/ })).not.toBeChecked();
  expect(track).toHaveBeenCalledWith("filter_reset", { filter_type: "mark" });

  await userEvent.click(sheet.getByRole("button", { name: /제품 보기/ }));
  expect(window.location.search).toBe("?brandIds=1&marks=EASY_WASH");
});

it("칩 줄의 초기화 버튼은 여러 그룹에 걸친 마크를 모두 비운다", async () => {
  useList();
  navigation.query = "marks=HYBRID&marks=EASY_WASH&marks=WATERPROOF&keyword=선크림";

  await renderList();
  await screen.findByRole("button", { name: /혼합자차/ });
  await userEvent.click(screen.getByRole("button", { name: /초기화/ }));

  expect(window.location.search).toBe("?keyword=%EC%84%A0%ED%81%AC%EB%A6%BC");
});

it("중간 장으로 들어와 후보가 없으면 칩을 하나 남겨 첫 장 링크를 주고, 고른 값은 코드로 적어 풀 수 있게 한다", async () => {
  useList();
  navigation.query = "marks=HYBRID&page=2";

  const sheet = await openMarkSheet(/제품 특성 1/);

  expect(sheet.getByRole("link", { name: "첫 페이지에서 전체 필터 선택지 보기" })).toHaveAttribute(
    "href",
    "/products?marks=HYBRID",
  );
  expect(sheet.queryByRole("checkbox")).not.toBeInTheDocument();
  await userEvent.click(sheet.getByRole("button", { name: /HYBRID/ }));
  expect(sheet.queryByText("HYBRID")).not.toBeInTheDocument();
});

it("뒤로 가기로 주소의 마크가 돌아오면 칩 값도 함께 돌아온다", async () => {
  useList();
  navigation.query = "marks=HYBRID";
  const { rerender } = render(<ProductList excludeCodes={excludeCodes} empty={<p>조건에 맞는 제품이 없어요</p>} />);
  await screen.findByRole("button", { name: /혼합자차/ });

  navigation.query = "marks=MINERAL";
  rerender(<ProductList excludeCodes={excludeCodes} empty={<p>조건에 맞는 제품이 없어요</p>} />);
  await screen.findByRole("button", { name: /무기자차/ });

  navigation.query = "marks=HYBRID";
  rerender(<ProductList excludeCodes={excludeCodes} empty={<p>조건에 맞는 제품이 없어요</p>} />);

  expect(await screen.findByRole("button", { name: /혼합자차/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /무기자차/ })).not.toBeInTheDocument();
});

it("담아 둔 목록으로 돌아오면 요청 없이 후보와 선택을 되살린다", async () => {
  useList();
  navigation.query = "marks=HYBRID";
  const first = render(<ProductList excludeCodes={excludeCodes} empty={<p>조건에 맞는 제품이 없어요</p>} />);
  await screen.findByRole("button", { name: /혼합자차/ });
  first.unmount();

  const listed = vi.fn();
  server.use(
    http.get("*/api/products", () => {
      listed();
      return HttpResponse.json({ code: "INTERNAL_ERROR", status: 500 }, { status: 500 });
    }),
  );
  render(<ProductList excludeCodes={excludeCodes} empty={<p>조건에 맞는 제품이 없어요</p>} />);

  expect(screen.getByRole("button", { name: /혼합자차/ })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /제품 특성/ })).toBeInTheDocument();
  expect(listed).not.toHaveBeenCalled();
});

it("조건을 바꿔 새 후보를 받는 동안 그룹 칩이 사라지지 않는다", async () => {
  useList();
  const { rerender } = render(<ProductList excludeCodes={excludeCodes} empty={<p>조건에 맞는 제품이 없어요</p>} />);
  await screen.findByRole("button", { name: UV_CHIP });

  // 응답을 주지 않아 받는 중인 상태로 둔다.
  server.use(http.get("*/api/products", () => new Promise(() => {})));
  navigation.query = "brandIds=1";
  rerender(<ProductList excludeCodes={excludeCodes} empty={<p>조건에 맞는 제품이 없어요</p>} />);

  expect(screen.getByRole("button", { name: UV_CHIP })).toBeInTheDocument();
  // 그룹을 모를 때 두는 `제품 특성 N` 칩으로 바뀌지 않는다.
  expect(screen.getByRole("button", { name: /^제품 특성/ })).toHaveTextContent(/^제품 특성$/);
});

it.each([
  ["없는 코드", "marks=NOPE"],
  ["없는 코드가 섞인 링크", "marks=ORGANIC&marks=NOPE&brandIds=1"],
])("서버가 거절한 마크(%s)는 조건에서 빼고 나머지 조건을 남긴다", async (_, query) => {
  navigation.query = query;
  window.history.replaceState(null, "", `/products?${query}`);
  server.use(
    http.get("*/api/products", ({ request }) =>
      new URL(request.url).searchParams.has("marks")
        ? HttpResponse.json({ code: "INVALID_QUERY_PARAMETER", status: 400 }, { status: 400 })
        : HttpResponse.json(listResponse(MARK_GROUPS)),
    ),
  );

  render(<ProductList excludeCodes={excludeCodes} empty={<p>조건에 맞는 제품이 없어요</p>} />);

  await waitFor(() => expect(window.location.search).not.toContain("marks"));
  expect(window.location.search).toBe(query.includes("brandIds=1") ? "?brandIds=1" : "");
});

it("마크가 없는 조건의 400 은 주소를 바꾸지 않는다", async () => {
  navigation.query = "brandIds=1";
  window.history.replaceState(null, "", "/products?brandIds=1");
  const listed = vi.fn();
  server.use(
    http.get("*/api/products", () => {
      listed();
      return HttpResponse.json({ code: "INVALID_QUERY_PARAMETER", status: 400 }, { status: 400 });
    }),
  );

  render(<ProductList excludeCodes={excludeCodes} empty={<p>조건에 맞는 제품이 없어요</p>} />);

  await waitFor(() => expect(listed).toHaveBeenCalled());
  await screen.findByRole("button", { name: /피부 타입/ });
  expect(window.location.search).toBe("?brandIds=1");
});
