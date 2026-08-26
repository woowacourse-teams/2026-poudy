/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProductSearchPanel } from "./ProductSearchPanel";

import { server } from "@/mocks/server";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

const suggestionsAre = (items: readonly { id: number; name: string; brandName: string }[]) =>
  server.use(
    http.get("*/api/products/suggestions", () =>
      HttpResponse.json({
        items: items.map((item) => ({ ...item, imageUrl: "" })),
        pagination: {
          page: 0,
          size: 20,
          totalElements: items.length,
          totalPages: Math.ceil(items.length / 20),
          hasNext: false,
        },
      }),
    ),
  );

const pagedSuggestionsAre = (total: number, size: number) =>
  server.use(
    http.get("*/api/products/suggestions", ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get("page") ?? 0);
      const start = page * size;
      const items = Array.from({ length: Math.max(0, Math.min(size, total - start)) }, (_, index) => ({
        id: start + index + 1,
        name: `제품 ${start + index + 1}`,
        brandName: "브랜드",
        imageUrl: "",
      }));

      return HttpResponse.json({
        items,
        pagination: {
          page,
          size,
          totalElements: total,
          totalPages: Math.ceil(total / size),
          hasNext: start + size < total,
        },
      });
    }),
  );

const observeImmediately = () => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(private readonly callback: IntersectionObserverCallback) {}

      observe() {
        this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as never);
      }

      disconnect() {}

      unobserve() {}
    },
  );
};

const type = async (keyword: string) => {
  await userEvent.type(screen.getByRole("searchbox", { name: "제품명 검색" }), keyword);
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ProductSearchPanel", () => {
  it("조건에 맞는 제품이 있으면 전체 보기로 넘어가는 길을 준다", async () => {
    suggestionsAre([{ id: 1, name: "1025 독도 토너", brandName: "라운드랩" }]);

    render(<ProductSearchPanel />);
    await type("독");

    expect(await screen.findByRole("link", { name: /‘독’가 포함된 제품 검색/ })).toBeInTheDocument();
  });

  it("전체 보기와 바로가기에 같은 제품 수를 보여 준다", async () => {
    pagedSuggestionsAre(12, 20);

    render(<ProductSearchPanel />);
    await type("제품");

    expect(await screen.findByText("검색 결과 12개 전체 보기")).toBeInTheDocument();
    expect(screen.getByText("12개")).toBeInTheDocument();
  });

  it("맞는 제품이 없으면 전체 보기 대신 없다고 알린다", async () => {
    suggestionsAre([]);

    render(<ProductSearchPanel />);
    await type("없는제품");

    expect(await screen.findByText("‘없는제품’에 대한 검색 결과가 없어요")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /포함된 제품 검색/ })).not.toBeInTheDocument();
  });

  it("맞는 제품이 없으면 같은 말을 두 번 하지 않는다", async () => {
    suggestionsAre([]);

    render(<ProductSearchPanel />);
    await type("없는제품");

    await screen.findByText("‘없는제품’에 대한 검색 결과가 없어요");
    expect(screen.queryByText("제품 바로가기")).not.toBeInTheDocument();
  });

  it("응답이 오기 전에는 검색하는 중으로 보여 준다", async () => {
    server.use(
      http.get("*/api/products/suggestions", async () => {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        return HttpResponse.json({
          items: [],
          pagination: { page: 0, size: 20, totalElements: 0, totalPages: 0, hasNext: false },
        });
      }),
    );

    render(<ProductSearchPanel />);
    await type("독");

    await waitFor(() => expect(screen.getByText("검색하는 중…")).toBeInTheDocument());
    expect(screen.queryByText(/검색 결과가 없어요$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/에 대한 검색 결과가 없어요$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/개$/)).not.toBeInTheDocument();
  });

  it("개수를 세는 요청을 따로 보내지 않는다", async () => {
    const counted: string[] = [];
    server.use(
      http.get("*/api/products/count", ({ request }) => {
        counted.push(request.url);
        return HttpResponse.json({ count: 0 });
      }),
    );
    suggestionsAre([{ id: 1, name: "1025 독도 토너", brandName: "라운드랩" }]);

    render(<ProductSearchPanel />);
    await type("독");

    await screen.findByText("1025 독도 토너");
    expect(counted).toHaveLength(0);
  });

  it("걸린 제품 수는 받은 장이 아니라 검색어에 걸린 전체를 보여 준다", async () => {
    pagedSuggestionsAre(48, 20);

    render(<ProductSearchPanel />);
    await type("제품");

    expect(await screen.findByText("48개")).toBeInTheDocument();
  });

  it("목록 끝에 닿으면 다음 장을 이어 붙인다", async () => {
    observeImmediately();
    pagedSuggestionsAre(25, 20);

    render(<ProductSearchPanel />);
    await type("제품");

    expect(await screen.findByText("제품 1")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("제품 25")).toBeInTheDocument());
    expect(screen.getByText("제품 1")).toBeInTheDocument();
  });

  it("마지막 장까지 받으면 더 부르지 않는다", async () => {
    observeImmediately();
    pagedSuggestionsAre(3, 20);

    render(<ProductSearchPanel />);
    await type("제품");

    await screen.findByText("제품 3");
    expect(screen.queryByText("불러오는 중…")).not.toBeInTheDocument();
  });
});
