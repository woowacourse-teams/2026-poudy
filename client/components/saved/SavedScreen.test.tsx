/**
 * localStorage 와 렌더링이 필요하다.
 *
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { SavedScreen } from "./SavedScreen";

import { refreshSavedProducts, saveProduct } from "@/lib/storage/saved-products";
import { allProducts } from "@/mocks/fixtures";
import { server } from "@/mocks/server";

/** 저장함이 한 번에 그리는 개수. 화면 쪽 값과 같아야 한다. */
const PAGE_SIZE = 20;

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
    const { container } = render(<SavedScreen />);

    expect(await screen.findByText("아직 저장한 제품이 없어요")).toBeInTheDocument();
    expect(container.querySelector("img")).toHaveAttribute("loading", "eager");
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

  it("첫 저장 제품 이미지만 즉시 받고 다음 제품부터 지연한다", async () => {
    saveProduct(1);
    saveProduct(3);
    const { container } = render(<SavedScreen />);

    await screen.findByText("1025 독도 토너");
    const images = container.querySelectorAll("[data-product-image]");

    expect(images[0]).toHaveAttribute("loading", "eager");
    expect(images[1]).toHaveAttribute("loading", "lazy");
  });

  it("브라우저 저장 안내를 숨기고 개수와 정렬을 한 줄에 둔다", async () => {
    saveProduct(1);
    render(<SavedScreen />);

    const count = await screen.findByText("총 1개");

    expect(screen.queryByText("이 브라우저에 저장돼요")).not.toBeInTheDocument();
    expect(count.parentElement).toHaveClass("justify-between");
    expect(count.parentElement).toContainElement(screen.getByRole("button", { name: /최근 저장순/ }));
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
    expect(screen.queryByText("아직 저장한 제품이 없어요")).not.toBeInTheDocument();
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
  it("이름 오름차순으로 바꾸면 순서가 다시 매겨진다", async () => {
    saveProduct(3);
    saveProduct(1);
    render(<SavedScreen />);
    await screen.findByText("1025 독도 토너");

    await userEvent.click(screen.getByRole("button", { name: /최근 저장순/ }));
    await userEvent.click(screen.getByRole("option", { name: "이름 오름차순" }));

    const names = screen.getAllByRole("article").map((card) => card.textContent ?? "");
    expect(names[0]).toContain("1025 독도 토너");
    expect(names.at(-1)).toContain("다이브인 저분자 히알루론산 토너");
  });

  it("정렬 목록에 저장함이 쓰는 다섯 가지를 둔다", async () => {
    saveProduct(1);
    render(<SavedScreen />);
    await screen.findByText("1025 독도 토너");

    await userEvent.click(screen.getByRole("button", { name: /최근 저장순/ }));

    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "최근 저장순",
      "이름 오름차순",
      "이름 내림차순",
      "가격 낮은순",
      "가격 높은순",
    ]);
  });

  it("찾는 칸을 개수와 정렬 위에 둔다", async () => {
    saveProduct(1);
    render(<SavedScreen />);
    await screen.findByText("1025 독도 토너");

    const search = screen.getByRole("searchbox");
    const count = screen.getByText("총 1개");

    // 문서 차례로 찾는 칸이 개수보다 앞선다.
    expect(search.compareDocumentPosition(count) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it("여러 개를 저장하면 모두 보여 준다", async () => {
    [1, 2, 3, 4, 5, 6, 7, 8].forEach(saveProduct);
    render(<SavedScreen />);
    await screen.findByText("총 8개");

    expect(screen.getAllByRole("article")).toHaveLength(8);
  });
  it("담은 것이 많으면 한 번에 다 그리지 않는다", async () => {
    /*
     * 파이프라인 목 데이터는 원본이 기밀이라 저장소에 없다. 손으로 적은 것만 남는
     * 환경이 있어 개수를 직접 적지 않고, 가진 만큼 담아 그중 일부만 그리는지 본다.
     */
    const saved = allProducts.slice(0, PAGE_SIZE + 5);
    saved.forEach((product) => saveProduct(product.id));
    render(<SavedScreen />);
    await screen.findByText(`총 ${saved.length}개`);

    // 나머지는 목록 끝에 닿을 때 이어서 그린다.
    const drawn = screen.getAllByRole("article").length;
    expect(drawn).toBe(Math.min(PAGE_SIZE, saved.length));
  });
});

describe("저장함 검색", () => {
  it("한글을 모으는 동안에는 거르지 않는다", async () => {
    saveProduct(1);
    saveProduct(3);
    render(<SavedScreen />);
    await screen.findByText("1025 독도 토너");

    const search = screen.getByRole("searchbox");
    // 아직 완성되지 않은 글자다. 이 값으로 거르면 두 제품이 모두 사라진다.
    fireEvent.compositionStart(search);
    fireEvent.change(search, { target: { value: "ㄷ" } });

    expect(search).toHaveValue("ㄷ");
    expect(screen.getByText("1025 독도 토너")).toBeInTheDocument();
    expect(screen.getByText("다이브인 저분자 히알루론산 토너")).toBeInTheDocument();
  });

  it("조합이 끝나면 그 말로 거른다", async () => {
    saveProduct(1);
    saveProduct(3);
    render(<SavedScreen />);
    await screen.findByText("1025 독도 토너");

    const search = screen.getByRole("searchbox");
    fireEvent.compositionStart(search);
    fireEvent.change(search, { target: { value: "독도" } });
    fireEvent.compositionEnd(search, { target: { value: "독도" } });

    expect(screen.getByText("1025 독도 토너")).toBeInTheDocument();
    expect(screen.queryByText("다이브인 저분자 히알루론산 토너")).not.toBeInTheDocument();
  });

  it("맞는 자리를 색으로 가른다", async () => {
    saveProduct(1);
    render(<SavedScreen />);
    await screen.findByText("1025 독도 토너");

    await userEvent.type(screen.getByRole("searchbox"), "독도");

    const matched = document.querySelector(".text-brand-strong");
    expect(matched).toHaveTextContent("독도");
  });
});

describe("저장을 풀 때", () => {
  it("서버를 다시 부르지 않고 그 카드만 덜어 낸다", async () => {
    let calls = 0;
    server.events.on("request:start", ({ request }) => {
      if (new URL(request.url).pathname.endsWith("/api/storage")) calls += 1;
    });

    saveProduct(1);
    saveProduct(3);
    render(<SavedScreen />);
    await screen.findByText("1025 독도 토너");

    const before = calls;
    await userEvent.click(screen.getByRole("button", { name: "1025 독도 토너 저장 해제" }));

    // 카드는 곧바로 사라지고 남은 것은 그대로 있다.
    await waitFor(() => expect(screen.queryByText("1025 독도 토너")).not.toBeInTheDocument());
    expect(screen.getByText("다이브인 저분자 히알루론산 토너")).toBeInTheDocument();
    expect(calls).toBe(before);
  });

  it("불러오는 중 안내로 되돌아가지 않는다", async () => {
    saveProduct(1);
    saveProduct(3);
    render(<SavedScreen />);
    await screen.findByText("1025 독도 토너");

    await userEvent.click(screen.getByRole("button", { name: "1025 독도 토너 저장 해제" }));

    expect(screen.queryByText("불러오는 중…")).not.toBeInTheDocument();
  });
});
