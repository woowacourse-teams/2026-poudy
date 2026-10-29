/**
 * @vitest-environment jsdom
 */
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProductList } from "./ProductList";

import { clearProductPages } from "@/lib/storage/product-pages-cache";
import { excludeCodes, products } from "@/mocks/fixtures";
import { server } from "@/mocks/server";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

const { searchParams } = vi.hoisted(() => ({ searchParams: { current: new URLSearchParams() } }));

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/brands/7",
  useRouter: () => ({ replace: vi.fn(), push }),
  useSearchParams: () => searchParams.current,
}));

/** 한 장에 한 건씩 세 장. 장마다 다른 제품을 돌려준다. */
const threePages = () => {
  const requested: number[] = [];

  server.use(
    http.get("*/api/products", ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get("page") ?? 1);
      requested.push(page);

      return HttpResponse.json({
        items: products.slice(page - 1, page),
        pagination: { page, size: 1, totalElements: 3, totalPages: 3, hasNext: page < 3 },
      });
    }),
  );

  return requested;
};

/** 정해 둔 장은 실패하고, 나머지는 세 장 중 하나를 돌려준다. 실패 횟수만큼만 실패한다. */
const failingPages = (failures: Record<number, number>) => {
  const requested: number[] = [];
  const left = new Map(Object.entries(failures).map(([page, count]) => [Number(page), count]));

  server.use(
    http.get("*/api/products", ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get("page") ?? 1);
      requested.push(page);

      const remaining = left.get(page) ?? 0;
      if (remaining > 0) {
        left.set(page, remaining - 1);
        return HttpResponse.json({ code: "INTERNAL_SERVER_ERROR" }, { status: 500 });
      }

      return HttpResponse.json({
        items: products.slice(page - 1, page),
        pagination: { page, size: 1, totalElements: 3, totalPages: 3, hasNext: page < 3 },
      });
    }),
  );

  return requested;
};

const renderList = () =>
  render(
    <ProductList
      excludeCodes={excludeCodes}
      empty={<p>조건에 맞는 제품이 없어요</p>}
      basePath="/brands/7"
      fixedFilter={{ brandIds: [7] }}
    />,
  );

/** 지켜보는 자리가 화면에 닿게 한다. 목록 끝의 다음 장 자리를 지켜본다. */
const observers = new Set<(entries: { isIntersecting: boolean }[]) => void>();
const reachEnd = async () => {
  // 첫 장을 그린 뒤 다음 장 자리가 지켜보기를 시작할 때까지 기다린다. 그 전에 닿으면 아무도 듣지 않는다.
  await waitFor(() => expect(observers.size).toBeGreaterThan(0));
  touchEnd();
};
const touchEnd = () =>
  act(() => {
    for (const callback of [...observers]) callback([{ isIntersecting: true }]);
  });

/** 크롤러가 따라갈 장 링크. 사람에게는 보이지 않고 낭독에서도 빠져 있어 글로 찾는다. */
const crawlerLink = (name: string) => screen.queryByText(name, { selector: "a" });

describe("ProductList 장 링크", () => {
  beforeEach(() => {
    clearProductPages();
    searchParams.current = new URLSearchParams("size=1");
    observers.clear();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        private readonly callback: (entries: { isIntersecting: boolean }[]) => void;
        constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
          this.callback = callback;
        }
        observe() {
          observers.add(this.callback);
        }
        disconnect() {
          observers.delete(this.callback);
        }
        unobserve() {}
      },
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("목록 끝에 크롤러가 따라갈 다음 장 링크를 둔다", async () => {
    threePages();
    renderList();

    await screen.findAllByRole("listitem");
    // 고정 조건인 브랜드는 주소에 이미 있으므로 쿼리에 넣지 않는다.
    expect(crawlerLink("다음 제품 보기")).toHaveAttribute("href", "/brands/7?page=2&size=1");
    expect(screen.queryByRole("button", { name: "이전 제품 보기" })).not.toBeInTheDocument();
  });

  it("목록 끝이 보이면 주소를 옮기지 않고 다음 장을 이어 붙인다", async () => {
    const requested = threePages();
    renderList();

    await screen.findAllByRole("listitem");
    await reachEnd();

    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(2));
    expect(requested).toEqual([1, 2]);
    expect(crawlerLink("다음 제품 보기")).toHaveAttribute("href", "/brands/7?page=3&size=1");
  });

  it("마지막 장이면 다음 장 링크를 두지 않고 끝 문구도 보이지 않는다", async () => {
    threePages();
    searchParams.current = new URLSearchParams("page=3&size=1");
    renderList();

    await screen.findByRole("button", { name: "이전 제품 보기" });
    expect(crawlerLink("다음 제품 보기")).not.toBeInTheDocument();
    expect(screen.queryByText("모든 제품을 확인했어요")).toBeNull();
  });

  it("중간 장부터 들어오면 이전 제품 보기를 두고, 누르면 위에 붙인다", async () => {
    const requested = threePages();
    searchParams.current = new URLSearchParams("page=2&size=1");
    renderList();

    const previous = await screen.findByRole("button", { name: "이전 제품 보기" });
    expect(crawlerLink("이전 제품 보기")).toHaveAttribute("href", "/brands/7?size=1");

    await userEvent.click(previous);

    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(2));
    expect(requested).toEqual([2, 1]);
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent(products[0].name);
    // 첫 장까지 붙였으니 더 거슬러 오를 곳이 없다.
    expect(screen.queryByRole("button", { name: "이전 제품 보기" })).not.toBeInTheDocument();
  });

  it("이전 장을 받지 못하면 알리고, 같은 버튼으로만 다시 부른다", async () => {
    const requested = failingPages({ 1: 1 });
    searchParams.current = new URLSearchParams("page=2&size=1");
    renderList();

    await userEvent.click(await screen.findByRole("button", { name: "이전 제품 보기" }));
    expect(await screen.findByText("이전 제품을 불러오지 못했어요")).toBeInTheDocument();
    expect(requested).toEqual([2, 1]);

    await userEvent.click(screen.getByRole("button", { name: "이전 제품 보기" }));
    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(2));
    expect(requested).toEqual([2, 1, 1]);
  });

  it("마지막 장을 넘어선 주소면 앞쪽 링크가 마지막 장을 가리키고, 누르면 그 주소로 옮긴다", async () => {
    server.use(
      http.get("*/api/products", () =>
        HttpResponse.json({
          items: [],
          pagination: { page: 9, size: 1, totalElements: 3, totalPages: 3, hasNext: false },
        }),
      ),
    );
    searchParams.current = new URLSearchParams("page=9&size=1");
    renderList();

    const previous = await screen.findByRole("button", { name: "이전 제품 보기" });
    expect(crawlerLink("이전 제품 보기")).toHaveAttribute("href", "/brands/7?page=3&size=1");
    await userEvent.click(previous);
    expect(push).toHaveBeenCalledWith("/brands/7?page=3&size=1");
  });

  it("첫 장을 받지 못하면 제품이 없다고 하지 않고 다시 시도하게 한다", async () => {
    const requested = failingPages({ 1: 1 });
    renderList();

    expect(await screen.findByText("제품을 불러오지 못했어요")).toBeInTheDocument();
    expect(screen.queryByText("조건에 맞는 제품이 없어요")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(1));
    expect(requested).toEqual([1, 1]);
  });

  it("다음 장을 받지 못하면 저절로 다시 부르지 않고, 누르면 같은 장을 다시 부른다", async () => {
    const requested = failingPages({ 2: 1 });
    renderList();

    await screen.findAllByRole("listitem");
    await reachEnd();

    const retry = await screen.findByRole("button", { name: "다시 시도" });
    expect(screen.getByText("다음 제품을 불러오지 못했어요")).toBeInTheDocument();
    // 실패한 장을 건너뛰지 않는다. 링크는 여전히 받지 못한 그 장을 가리킨다.
    expect(crawlerLink("다음 제품 보기")).toHaveAttribute("href", "/brands/7?page=2&size=1");
    // 다시 끝에 닿아도 부르지 않는다. 실패한 자리는 지켜보기를 멈췄으므로 기다리지 않고 바로 보낸다.
    touchEnd();
    expect(requested).toEqual([1, 2]);

    await userEvent.click(retry);

    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(2));
    expect(requested).toEqual([1, 2, 2]);
  });
});
