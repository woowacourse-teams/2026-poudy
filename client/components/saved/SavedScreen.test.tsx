/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SavedScreen } from "./SavedScreen";

import { ADMIN_SESSION_MESSAGE } from "@/lib/domain/admin-session";
import { getSavedProductsSnapshot, reloadSavedProducts } from "@/lib/storage/saved-products";
import { allProducts } from "@/mocks/fixtures";
import { setMockSavedProducts } from "@/mocks/handlers";
import { server } from "@/mocks/server";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace }),
}));

const PAGE_SIZE = 20;
const SAVED_PATH = "*/api/members/me/saved-products";

const seed = async (...productIds: readonly number[]) => {
  setMockSavedProducts(productIds);
  await reloadSavedProducts();
};

const problem = (status: number, code: string) =>
  HttpResponse.json({ title: code, status, detail: "실패", code }, { status });

beforeEach(async () => {
  await seed();
});

describe("저장함", () => {
  it("저장한 제품이 없으면 빈 안내와 제품을 더 찾는 길을 보여 준다", async () => {
    const { container } = render(<SavedScreen />);

    expect(await screen.findByText("아직 저장한 제품이 없어요")).toBeInTheDocument();
    expect(container.querySelector("img")).toHaveAttribute("loading", "eager");
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /저장할 제품 더 찾기/ })).toHaveAttribute("href", "/search/products");
  });

  it("로그인하지 않았으면 로그인 안내를 보여 준다", async () => {
    server.use(http.get(`${SAVED_PATH}/ids`, () => problem(401, "UNAUTHORIZED")));
    await reloadSavedProducts();

    render(<SavedScreen />);

    expect(await screen.findByText("로그인하면 제품을 저장할 수 있어요")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "로그인하기" })).toHaveAttribute("href", "/login");
  });

  it("관리자로 로그인되어 있으면 안내하고 관리자에서 로그아웃하면 로그인 화면으로 보낸다", async () => {
    server.use(
      http.get(`${SAVED_PATH}/ids`, () => problem(403, "FORBIDDEN")),
      http.post("*/api/admin/logout", () => new HttpResponse(null, { status: 204 })),
    );
    await reloadSavedProducts();

    render(<SavedScreen />);

    expect(await screen.findByText(ADMIN_SESSION_MESSAGE)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "관리자 로그아웃" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  });

  it("저장한 제품을 최근 저장순으로 채운다", async () => {
    await seed(1, 3);
    const { container } = render(<SavedScreen />);

    expect(await screen.findByText("총 2개")).toBeInTheDocument();
    const names = screen.getAllByRole("article").map((card) => card.textContent ?? "");
    expect(names[0]).toContain("1025 독도 토너");
    expect(names[1]).toContain("다이브인 저분자 히알루론산 토너");
    const images = container.querySelectorAll("[data-product-image]");
    expect(images[0]).toHaveAttribute("loading", "eager");
    expect(images[1]).toHaveAttribute("loading", "lazy");
  });

  it("찾는 칸을 개수와 정렬 위에 둔다", async () => {
    await seed(1);
    render(<SavedScreen />);

    const count = await screen.findByText("총 1개");
    const search = screen.getByRole("searchbox");

    expect(search.compareDocumentPosition(count) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(count.parentElement).toContainElement(screen.getByRole("button", { name: /최근 저장순/ }));
  });

  it("저장한 제품 안에서 검색하고 없으면 알려 준다", async () => {
    await seed(1, 3);
    render(<SavedScreen />);
    await screen.findByText("1025 독도 토너");

    await userEvent.type(screen.getByRole("searchbox"), "독도");
    expect(screen.queryByText("다이브인 저분자 히알루론산 토너")).not.toBeInTheDocument();
    expect(document.querySelector(".text-brand-strong")).toHaveTextContent("독도");

    await userEvent.clear(screen.getByRole("searchbox"));
    await userEvent.type(screen.getByRole("searchbox"), "없는제품");
    expect(screen.getByText("검색 결과가 없어요.")).toBeInTheDocument();
  });

  it("조회가 실패하면 빈 상태와 구분해서 알리고 다시 시도할 수 있다", async () => {
    await seed(1);
    server.use(http.get(SAVED_PATH, () => problem(500, "INTERNAL_SERVER_ERROR")));
    render(<SavedScreen />);

    expect(await screen.findByText("저장한 제품을 불러오지 못했어요")).toBeInTheDocument();
    expect(screen.queryByText("아직 저장한 제품이 없어요")).not.toBeInTheDocument();

    server.resetHandlers();
    await userEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("1025 독도 토너")).toBeInTheDocument();
  });

  it("이름 오름차순으로 바꾸면 순서가 다시 매겨진다", async () => {
    await seed(1, 3);
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
    await userEvent.click(screen.getByRole("option", { name: "이름 오름차순" }));

    const names = screen.getAllByRole("article").map((card) => card.textContent ?? "");
    expect(names[0]).toContain("1025 독도 토너");
    expect(names.at(-1)).toContain("다이브인 저분자 히알루론산 토너");
  });

  it("담은 것이 많으면 한 번에 다 그리지 않는다", async () => {
    const saved = allProducts.slice(0, PAGE_SIZE + 5).map((product) => product.id);
    await seed(...saved);
    render(<SavedScreen />);
    await screen.findByText(`총 ${saved.length}개`);

    expect(screen.getAllByRole("article")).toHaveLength(Math.min(PAGE_SIZE, saved.length));
  });
});

describe("저장함 검색", () => {
  it("한글을 모으는 동안에는 거르지 않고, 조합이 끝나면 그 말로 거른다", async () => {
    await seed(1, 3);
    render(<SavedScreen />);
    await screen.findByText("1025 독도 토너");

    const search = screen.getByRole("searchbox");
    fireEvent.compositionStart(search);
    fireEvent.change(search, { target: { value: "ㄷ" } });

    expect(search).toHaveValue("ㄷ");
    expect(screen.getByText("다이브인 저분자 히알루론산 토너")).toBeInTheDocument();

    fireEvent.change(search, { target: { value: "독도" } });
    fireEvent.compositionEnd(search, { target: { value: "독도" } });

    expect(screen.getByText("1025 독도 토너")).toBeInTheDocument();
    expect(screen.queryByText("다이브인 저분자 히알루론산 토너")).not.toBeInTheDocument();
  });
});

describe("저장을 풀 때", () => {
  it("삭제와 재조회가 모두 실패해도 삭제 표시를 되돌린다", async () => {
    await seed(1, 3);
    render(<SavedScreen />);
    await screen.findByText("1025 독도 토너");
    server.use(
      http.delete(`${SAVED_PATH}/1`, () => problem(500, "INTERNAL_SERVER_ERROR")),
      http.get(`${SAVED_PATH}/ids`, () => problem(500, "INTERNAL_SERVER_ERROR")),
    );

    await userEvent.click(screen.getByRole("button", { name: "1025 독도 토너 저장 해제" }));

    await waitFor(() => expect(getSavedProductsSnapshot().status).toBe("failed"));
    await waitFor(() => expect(screen.queryByRole("button", { name: /되돌리기/ })).not.toBeInTheDocument());
    expect(screen.getByText("총 2개")).toBeInTheDocument();
  });

  it("삭제가 실패하면 제품과 개수를 되돌린다", async () => {
    await seed(1, 3);
    server.use(http.delete(`${SAVED_PATH}/1`, () => problem(500, "INTERNAL_SERVER_ERROR")));
    render(<SavedScreen />);
    await screen.findByText("1025 독도 토너");

    await userEvent.click(screen.getByRole("button", { name: "1025 독도 토너 저장 해제" }));

    await waitFor(() => expect(screen.queryByRole("button", { name: /되돌리기/ })).not.toBeInTheDocument());
    expect(screen.getByText("총 2개")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1025 독도 토너 저장 해제" })).toBeInTheDocument();
    expect(getSavedProductsSnapshot().ids).toContain(1);
  });

  it("되돌리기가 실패하면 삭제 상태와 개수를 유지한다", async () => {
    await seed(1, 3);
    render(<SavedScreen />);
    await screen.findByText("1025 독도 토너");
    await userEvent.click(screen.getByRole("button", { name: "1025 독도 토너 저장 해제" }));
    await reloadSavedProducts();
    server.use(http.put(`${SAVED_PATH}/1`, () => problem(500, "INTERNAL_SERVER_ERROR")));

    await userEvent.click(screen.getByRole("button", { name: /되돌리기/ }));

    expect(await screen.findByRole("button", { name: /되돌리기/ })).toBeInTheDocument();
    expect(screen.getByText("총 1개")).toBeInTheDocument();
    expect(getSavedProductsSnapshot().ids).not.toContain(1);
  });

  it("삭제와 되돌리기가 모두 실패해도 실제 서버의 저장 상태로 복원한다", async () => {
    await seed(1, 3);
    const release = Promise.withResolvers<void>();
    server.use(
      http.delete(`${SAVED_PATH}/1`, async () => {
        await release.promise;
        return problem(500, "INTERNAL_SERVER_ERROR");
      }),
      http.put(`${SAVED_PATH}/1`, () => problem(500, "INTERNAL_SERVER_ERROR")),
    );
    render(<SavedScreen />);
    await screen.findByText("1025 독도 토너");
    await userEvent.click(screen.getByRole("button", { name: "1025 독도 토너 저장 해제" }));
    await userEvent.click(screen.getByRole("button", { name: /되돌리기/ }));
    release.resolve();
    await reloadSavedProducts();

    await waitFor(() => expect(screen.getByRole("button", { name: "1025 독도 토너 저장 해제" })).toBeInTheDocument());
    expect(screen.getByText("총 2개")).toBeInTheDocument();
    expect(getSavedProductsSnapshot().ids).toContain(1);
  });

  it("그 자리에 되돌리기를 남기고 개수에서 빼며 서버에서도 지운다", async () => {
    await seed(1, 3);
    render(<SavedScreen />);
    await screen.findByText("1025 독도 토너");

    await userEvent.click(screen.getByRole("button", { name: "1025 독도 토너 저장 해제" }));

    expect(await screen.findByRole("button", { name: /되돌리기/ })).toBeInTheDocument();
    expect(screen.getByText("총 1개")).toBeInTheDocument();
    expect(screen.getByText("다이브인 저분자 히알루론산 토너")).toBeInTheDocument();
    expect(screen.queryByText("불러오는 중…")).not.toBeInTheDocument();
    await waitFor(() => expect(getSavedProductsSnapshot().ids).toEqual([3]));
    await reloadSavedProducts();
    expect(getSavedProductsSnapshot().ids).toEqual([3]);
  });

  it("되돌리면 그 자리에 다시 서고 서버에도 다시 저장한다", async () => {
    await seed(1, 3);
    render(<SavedScreen />);
    await screen.findByText("1025 독도 토너");

    await userEvent.click(screen.getByRole("button", { name: "1025 독도 토너 저장 해제" }));
    await userEvent.click(await screen.findByRole("button", { name: /되돌리기/ }));

    expect(screen.queryByRole("button", { name: /되돌리기/ })).not.toBeInTheDocument();
    expect(screen.getByText("총 2개")).toBeInTheDocument();
    const names = screen.getAllByRole("article").map((card) => card.textContent ?? "");
    expect(names[0]).toContain("1025 독도 토너");
    await reloadSavedProducts();
    expect(getSavedProductsSnapshot().ids).toContain(1);
  });
});
