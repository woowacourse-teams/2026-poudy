/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProductSearchPanel } from "./ProductSearchPanel";

import { track } from "@/lib/analytics/track";
import { server } from "@/mocks/server";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

/** 자동완성 응답. `delayMs` 를 주면 아직 세는 중인 상태를 만든다. */
const suggestionsAre = (total: number, delayMs = 0) =>
  server.use(
    http.get("*/api/products/suggestions", async () => {
      if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));

      return HttpResponse.json({
        items: Array.from({ length: Math.min(total, 20) }, (_, index) => ({
          id: index + 1,
          name: `제품 ${index + 1}`,
          brandName: "브랜드",
          imageUrl: "",
          // 이름 앞 두 글자 `제품` 이 맞은 것으로 둔다. 서버가 주는 모양과 같다.
          match: { field: "PRODUCT_NAME" as const, text: `제품 ${index + 1}`, startIndex: 0, endIndexExclusive: 2 },
        })),
        pagination: { page: 0, size: 20, totalElements: total, totalPages: 1, hasNext: false },
      });
    }),
  );

const field = () => screen.getByRole("searchbox", { name: "제품명 검색" });

beforeEach(() => {
  push.mockClear();
  vi.mocked(track).mockClear();
});

describe("ProductSearchPanel 엔터 검색", () => {
  it("첫 유효 입력에서 제품 검색 시작을 한 번만 남긴다", async () => {
    suggestionsAre(3);

    render(<ProductSearchPanel />);
    await userEvent.type(field(), "독도");

    expect(vi.mocked(track).mock.calls.filter(([event]) => event === "search_started")).toEqual([
      ["search_started", { mode: "product" }],
    ]);
  });

  it("엔터를 누르면 검색어의 결과 목록으로 보낸다", async () => {
    suggestionsAre(3);

    render(<ProductSearchPanel />);
    await userEvent.type(field(), "독");
    await screen.findByRole("link", { name: /‘독’가 포함된 제품 검색/ });
    await userEvent.type(field(), "{Enter}");

    await waitFor(() => expect(push).toHaveBeenCalledWith("/products?keyword=%EB%8F%85"));
  });

  it("자동완성 첫 제품이 아니라 검색 결과 목록으로 간다", async () => {
    suggestionsAre(3);

    render(<ProductSearchPanel />);
    await userEvent.type(field(), "독");
    await screen.findByText("제품 1");
    await userEvent.type(field(), "{Enter}");

    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    expect(push).not.toHaveBeenCalledWith(expect.stringContaining("/products/1"));
  });

  it("엔터로 보내면 search_submitted 를 남긴다", async () => {
    suggestionsAre(3);

    render(<ProductSearchPanel />);
    await userEvent.type(field(), "독");
    await screen.findByText("제품 1");
    await userEvent.type(field(), "{Enter}");

    await waitFor(() =>
      expect(track).toHaveBeenCalledWith("search_submitted", { mode: "product", query: "독", result_count: 3 }),
    );
  });

  it("결과가 없으면 엔터를 눌러도 아무 일도 하지 않는다", async () => {
    suggestionsAre(0);

    render(<ProductSearchPanel />);
    await userEvent.type(field(), "없는제품");
    await screen.findByText("‘없는제품’에 대한 검색 결과가 없어요");
    await userEvent.type(field(), "{Enter}");

    await waitFor(() => expect(push).not.toHaveBeenCalled());
    expect(track).not.toHaveBeenCalledWith("search_submitted", expect.anything());
    expect(track).toHaveBeenCalledWith("search_results_viewed", {
      mode: "product",
      query: "없는제품",
      result_count: 0,
      include_count: 0,
      exclude_count: 0,
      exclude_group_count: 0,
    });
  });

  it("검색어가 공백뿐이면 아무 일도 하지 않는다", async () => {
    suggestionsAre(3);

    render(<ProductSearchPanel />);
    await userEvent.type(field(), "   {Enter}");

    await waitFor(() => expect(push).not.toHaveBeenCalled());
  });

  it("아직 세는 중이면 기다렸다가 결과가 있으면 보낸다", async () => {
    suggestionsAre(3, 300);

    render(<ProductSearchPanel />);
    await userEvent.type(field(), "독{Enter}");

    expect(push).not.toHaveBeenCalled();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/products?keyword=%EB%8F%85"));
  });

  it("아직 세는 중이면 기다렸다가 결과가 없으면 보내지 않는다", async () => {
    suggestionsAre(0, 300);

    render(<ProductSearchPanel />);
    await userEvent.type(field(), "없는제품{Enter}");

    await screen.findByText("‘없는제품’에 대한 검색 결과가 없어요");
    expect(push).not.toHaveBeenCalled();
  });

  it("기다리는 동안 무엇을 하는 중인지 보여 준다", async () => {
    suggestionsAre(3, 300);

    render(<ProductSearchPanel />);
    await userEvent.type(field(), "독{Enter}");

    expect(screen.getByText("검색 결과를 확인하고 있어요…")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("검색 결과를 확인하고 있어요…")).not.toBeInTheDocument());
  });

  it("기다리는 사이 검색어를 더 치면 마지막 검색어로 보낸다", async () => {
    suggestionsAre(3, 200);

    render(<ProductSearchPanel />);
    await userEvent.type(field(), "독{Enter}");
    await userEvent.type(field(), "도");

    await waitFor(() => expect(push).toHaveBeenCalledWith("/products?keyword=%EB%8F%85%EB%8F%84"));
    expect(push).toHaveBeenCalledTimes(1);
  });

  it("기다리는 사이 검색창을 비우면 보내지 않는다", async () => {
    suggestionsAre(3, 200);

    render(<ProductSearchPanel />);
    await userEvent.type(field(), "독{Enter}");
    await userEvent.clear(field());

    await waitFor(() => expect(screen.queryByText("검색 결과를 확인하고 있어요…")).not.toBeInTheDocument());
    expect(push).not.toHaveBeenCalled();
  });

  it("엔터를 여러 번 눌러도 한 번만 간다", async () => {
    suggestionsAre(3);

    render(<ProductSearchPanel />);
    await userEvent.type(field(), "독");
    await screen.findByText("제품 1");
    await userEvent.type(field(), "{Enter}{Enter}{Enter}");

    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    expect(vi.mocked(track).mock.calls.filter(([event]) => event === "search_submitted")).toHaveLength(1);
  });

  it("보낸 뒤에는 검색어를 더 쳐도 엔터 없이 가지 않는다", async () => {
    suggestionsAre(3);

    render(<ProductSearchPanel />);
    await userEvent.type(field(), "독");
    await screen.findByText("제품 1");
    await userEvent.type(field(), "{Enter}");
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));

    push.mockClear();
    await userEvent.type(field(), "도");
    await screen.findByRole("link", { name: /‘독도’가 포함된 제품 검색/ });
    expect(push).not.toHaveBeenCalled();
  });

  it("세는 중에 엔터를 여러 번 눌러도 한 번만 간다", async () => {
    suggestionsAre(3, 300);

    render(<ProductSearchPanel />);
    await userEvent.type(field(), "독{Enter}{Enter}{Enter}");

    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
  });
});
