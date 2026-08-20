/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { ProductSearchPanel } from "./ProductSearchPanel";

import { server } from "@/mocks/server";

/** 목록으로 넘어갔을 때 나올 제품 수를 정해 둔다. */
const countIs = (count: number) => server.use(http.get("*/api/products/count", () => HttpResponse.json({ count })));

/** 자동완성 결과를 정해 둔다. */
const suggestionsAre = (items: readonly { id: number; name: string; brandName: string }[]) =>
  server.use(
    http.get("*/api/products/suggestions", () =>
      HttpResponse.json({ items: items.map((item) => ({ ...item, imageUrl: "" })) }),
    ),
  );

const type = async (keyword: string) => {
  await userEvent.type(screen.getByRole("searchbox", { name: "제품명 검색" }), keyword);
};

describe("ProductSearchPanel", () => {
  it("조건에 맞는 제품이 있으면 전체 보기로 넘어가는 길을 준다", async () => {
    countIs(12);
    suggestionsAre([{ id: 1, name: "1025 독도 토너", brandName: "라운드랩" }]);

    render(<ProductSearchPanel />);
    await type("독");

    expect(await screen.findByRole("link", { name: /‘독’가 포함된 제품 검색/ })).toBeInTheDocument();
  });

  it("전체 보기에 목록과 같은 제품 수를 함께 보여 준다", async () => {
    countIs(12);
    suggestionsAre([{ id: 1, name: "1025 독도 토너", brandName: "라운드랩" }]);

    render(<ProductSearchPanel />);
    await type("독");

    expect(await screen.findByText("검색 결과 12개 전체 보기")).toBeInTheDocument();
  });

  it("맞는 제품이 없으면 전체 보기 대신 없다고 알린다", async () => {
    countIs(0);
    suggestionsAre([]);

    render(<ProductSearchPanel />);
    await type("없는제품");

    expect(await screen.findByText("‘없는제품’에 대한 검색 결과가 없어요")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /포함된 제품 검색/ })).not.toBeInTheDocument();
  });

  it("맞는 제품이 없으면 같은 말을 두 번 하지 않는다", async () => {
    countIs(0);
    suggestionsAre([]);

    render(<ProductSearchPanel />);
    await type("없는제품");

    await screen.findByText("‘없는제품’에 대한 검색 결과가 없어요");
    expect(screen.queryByText("제품 바로가기")).not.toBeInTheDocument();
  });

  it("자동완성이 비어도 목록에 결과가 있으면 전체 보기를 남긴다", async () => {
    // 자동완성은 제품명만 맞춰 보므로 목록보다 좁게 나올 수 있다.
    countIs(5);
    suggestionsAre([]);

    render(<ProductSearchPanel />);
    await type("독");

    expect(await screen.findByRole("link", { name: /‘독’가 포함된 제품 검색/ })).toBeInTheDocument();
  });

  it("응답이 오기 전에는 없다고 단정하지 않는다", async () => {
    suggestionsAre([]);
    // count 응답을 늦춰 아직 모르는 상태를 만든다.
    server.use(
      http.get("*/api/products/count", async () => {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        return HttpResponse.json({ count: 0 });
      }),
    );

    render(<ProductSearchPanel />);
    await type("독");

    await waitFor(() => expect(screen.getByText("제품 바로가기")).toBeInTheDocument());
    expect(screen.queryByText(/검색 결과가 없어요$/)).not.toBeInTheDocument();
  });
});
