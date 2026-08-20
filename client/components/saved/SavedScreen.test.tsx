/**
 * localStorage 와 렌더링이 필요하다.
 *
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { SavedScreen } from "./SavedScreen";

import { refreshSavedProducts, saveProduct } from "@/lib/storage/saved-products";
import { server } from "@/mocks/server";

beforeEach(() => {
  window.localStorage.clear();
  refreshSavedProducts();
});

/** 서버가 실패를 돌려주게 바꾼다. */
const failStorage = () => {
  server.use(
    http.get("*/api/storage", () =>
      HttpResponse.json(
        {
          title: "Internal Server Error",
          status: 500,
          detail: "잠시 후 다시 시도해 주세요.",
          code: "INTERNAL_SERVER_ERROR",
        },
        { status: 500 },
      ),
    ),
  );
};

describe("저장함", () => {
  it("저장한 제품이 없으면 API 를 부르지 않고 빈 안내를 보여 준다", async () => {
    render(<SavedScreen />);

    expect(await screen.findByText("저장한 제품이 없어요")).toBeInTheDocument();
    // 담긴 것이 없으면 검색과 정렬은 쓸 일이 없다.
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.queryByText("최근 저장순")).not.toBeInTheDocument();
  });

  it("빈 상태에서도 제품을 더 찾는 길을 남긴다", async () => {
    render(<SavedScreen />);

    const link = await screen.findByRole("link", { name: /저장할 제품 더 찾기/ });
    expect(link).toHaveAttribute("href", "/search/products");
  });

  it("저장한 제품이 있으면 목록을 채운다", async () => {
    saveProduct(1);
    saveProduct(3);
    render(<SavedScreen />);

    expect(await screen.findByText("1025 독도 토너")).toBeInTheDocument();
    expect(screen.getByText("다이브인 저분자 히알루론산 토너")).toBeInTheDocument();
    expect(screen.getByText("총 2개")).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  it("최근에 저장한 제품을 앞에 둔다", async () => {
    saveProduct(3);
    saveProduct(1);
    render(<SavedScreen />);

    await screen.findByText("1025 독도 토너");
    const names = screen.getAllByRole("article").map((card) => card.textContent ?? "");
    expect(names[0]).toContain("1025 독도 토너");
  });

  it("저장한 제품 안에서 검색한다", async () => {
    saveProduct(1);
    saveProduct(3);
    render(<SavedScreen />);
    await screen.findByText("1025 독도 토너");

    await userEvent.type(screen.getByRole("searchbox"), "독도");

    expect(screen.getByText("1025 독도 토너")).toBeInTheDocument();
    expect(screen.queryByText("다이브인 저분자 히알루론산 토너")).not.toBeInTheDocument();
  });

  it("검색 결과가 없으면 알려 준다", async () => {
    saveProduct(1);
    render(<SavedScreen />);
    await screen.findByText("1025 독도 토너");

    await userEvent.type(screen.getByRole("searchbox"), "없는제품");

    expect(screen.getByText("검색 결과가 없어요.")).toBeInTheDocument();
  });

  it("조회가 실패하면 빈 상태와 구분해서 알려 준다", async () => {
    failStorage();
    saveProduct(1);
    render(<SavedScreen />);

    expect(await screen.findByText("저장한 제품을 불러오지 못했어요")).toBeInTheDocument();
    // 실패를 저장한 것이 없는 것으로 보여 주면 안 된다.
    expect(screen.queryByText("저장한 제품이 없어요")).not.toBeInTheDocument();
  });

  it("실패한 뒤 다시 시도하면 목록을 보여 준다", async () => {
    failStorage();
    saveProduct(1);
    render(<SavedScreen />);
    await screen.findByText("저장한 제품을 불러오지 못했어요");

    // 다음 요청부터는 원래 핸들러가 응답한다.
    server.resetHandlers();
    await userEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    await waitFor(() => {
      expect(screen.getByText("1025 독도 토너")).toBeInTheDocument();
    });
  });

  it("저장을 해제하면 목록에서 빠진다", async () => {
    saveProduct(1);
    saveProduct(3);
    render(<SavedScreen />);
    await screen.findByText("1025 독도 토너");

    await userEvent.click(screen.getByRole("button", { name: "1025 독도 토너 저장 해제" }));

    await waitFor(() => {
      expect(screen.queryByText("1025 독도 토너")).not.toBeInTheDocument();
    });
    expect(screen.getByText("총 1개")).toBeInTheDocument();
  });
});
