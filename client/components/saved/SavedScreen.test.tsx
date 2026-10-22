/**
 * @vitest-environment jsdom
 */
import { ToastProvider } from "@poudy/design-system/toast";
import { cleanup, render as renderPlain, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SavedScreen } from "./SavedScreen";

import { WishlistEmpty } from "@/app/my-page/wishlist/empty";
import { fetchSavedProducts } from "@/lib/api/saved-products";
import { ADMIN_SESSION_MESSAGE } from "@/lib/domain/admin-session";
import { allProducts } from "@/mocks/fixtures";
import { setMockSavedProducts } from "@/mocks/handlers";
import { server } from "@/mocks/server";

const { push, replace } = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push, replace, refresh: vi.fn() }),
}));

// 뺀 직후의 되돌리기와 실패 안내는 토스트로 띄우므로 앱처럼 ToastProvider 안에 그린다.
const render = (ui: React.ReactElement) => renderPlain(ui, { wrapper: ToastProvider });
const SAVED_PATH = "*/api/users/me/wishlist";

const seed = (...productIds: readonly number[]) => setMockSavedProducts(productIds);

const savedOnServer = async (): Promise<readonly number[]> =>
  (await fetchSavedProducts()).items.map((product) => product.id);

const problem = (status: number, code: string) =>
  HttpResponse.json({ title: code, status, detail: "실패", code }, { status });

beforeEach(() => {
  seed();
});

describe("위시리스트", () => {
  it("저장한 제품이 없으면 하트 아이콘과 빈 안내, 제품을 둘러보는 버튼을 보여 준다", async () => {
    const { container } = render(<SavedScreen empty={<WishlistEmpty />} />);

    expect(await screen.findByText("아직 위시리스트에 추가한 제품이 없어요")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "제품 둘러보기" }));
    expect(push).toHaveBeenCalledWith("/search/products");
  });

  it("목록 끝에 제품을 더 찾는 길을 둔다", async () => {
    seed(1);
    render(<SavedScreen empty={<WishlistEmpty />} />);

    expect(await screen.findByRole("link", { name: /다른 제품도 둘러보기/ })).toHaveAttribute(
      "href",
      "/search/products",
    );
  });

  it("하트를 누르면 카드를 바로 빼고 되돌리기 토스트를 띄운다", async () => {
    seed(1, 3);
    render(<SavedScreen empty={<WishlistEmpty />} />);
    await screen.findByText("1025 독도 토너");

    await userEvent.click(screen.getByRole("button", { name: "1025 독도 토너 위시리스트에서 빼기" }));

    expect(screen.queryByText("1025 독도 토너")).not.toBeInTheDocument();
    expect(await screen.findByText("위시리스트에서 뺐어요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "되돌리기" })).toBeInTheDocument();
    expect(screen.getByText("총 1개")).toBeInTheDocument();
    // 누른 하트가 사라지므로 다음 카드의 하트로 포커스를 옮긴다.
    expect(screen.getByRole("button", { name: "다이브인 저분자 히알루론산 토너 위시리스트에서 빼기" })).toHaveFocus();
  });

  it("로그인하지 않았으면 로그인 안내를 보여 준다", async () => {
    server.use(http.get(`${SAVED_PATH}/products`, () => problem(401, "UNAUTHORIZED")));

    render(<SavedScreen empty={<WishlistEmpty />} />);

    expect(await screen.findByText("로그인하면 제품을 저장할 수 있어요")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "로그인하기" }));
    expect(push).toHaveBeenCalledWith("/login");
  });

  it("관리자로 로그인되어 있으면 안내하고 관리자에서 로그아웃하면 로그인 화면으로 보낸다", async () => {
    server.use(
      http.get(`${SAVED_PATH}/products`, () => problem(403, "FORBIDDEN")),
      http.post("*/api/admin/logout", () => new HttpResponse(null, { status: 204 })),
    );

    render(<SavedScreen empty={<WishlistEmpty />} />);

    expect(await screen.findByText(ADMIN_SESSION_MESSAGE)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "관리자 로그아웃" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  });

  it("저장한 제품을 최근 저장순으로 채운다", async () => {
    seed(1, 3);
    const { container } = render(<SavedScreen empty={<WishlistEmpty />} />);

    expect(await screen.findByText("총 2개")).toBeInTheDocument();
    const names = screen.getAllByRole("article").map((card) => card.textContent ?? "");
    expect(names[0]).toContain("1025 독도 토너");
    expect(names[1]).toContain("다이브인 저분자 히알루론산 토너");
    const images = container.querySelectorAll("[data-product-image]");
    expect(images[0]).toHaveAttribute("loading", "eager");
    expect(images[1]).toHaveAttribute("loading", "lazy");
  });

  it("위시리스트 안 검색 칸과 정렬은 두지 않고 개수만 둔다", async () => {
    seed(1);
    render(<SavedScreen empty={<WishlistEmpty />} />);

    expect(await screen.findByText("총 1개")).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /최근 저장순/ })).not.toBeInTheDocument();
  });

  it("조회가 실패하면 빈 상태와 구분해서 알리고 다시 시도할 수 있다", async () => {
    seed(1);
    server.use(http.get(`${SAVED_PATH}/products`, () => problem(500, "INTERNAL_SERVER_ERROR")));
    render(<SavedScreen empty={<WishlistEmpty />} />);

    expect(await screen.findByText("저장한 제품을 불러오지 못했어요")).toBeInTheDocument();
    expect(screen.queryByText("아직 위시리스트에 추가한 제품이 없어요")).not.toBeInTheDocument();

    server.resetHandlers();
    await userEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("1025 독도 토너")).toBeInTheDocument();
  });

  it("담은 제품을 한 번에 모두 그린다", async () => {
    const saved = allProducts.slice(0, 25).map((product) => product.id);
    seed(...saved);
    render(<SavedScreen empty={<WishlistEmpty />} />);

    expect(await screen.findByText(`총 ${saved.length}개`)).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(saved.length);
  });
});

describe("저장을 풀 때", () => {
  it("삭제가 실패하면 제품과 개수를 되돌린다", async () => {
    seed(1, 3);
    server.use(http.delete(`${SAVED_PATH}/products/1`, () => problem(500, "INTERNAL_SERVER_ERROR")));
    render(<SavedScreen empty={<WishlistEmpty />} />);
    await screen.findByText("1025 독도 토너");

    await userEvent.click(screen.getByRole("button", { name: "1025 독도 토너 위시리스트에서 빼기" }));

    expect(await screen.findByText("위시리스트에서 빼지 못했어요")).toBeInTheDocument();
    // 토스트가 쌓이므로 띄워 둔 되돌리기 토스트를 닫는다. 닫히는 전환이 끝나면 빠진다.
    await waitFor(() => expect(screen.queryByRole("button", { name: "되돌리기" })).not.toBeInTheDocument());
    expect(screen.getByText("총 2개")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1025 독도 토너 위시리스트에서 빼기" })).toBeInTheDocument();
    expect(await savedOnServer()).toContain(1);
  });

  it("되돌리기가 실패하면 삭제 상태와 개수를 유지한다", async () => {
    seed(1, 3);
    render(<SavedScreen empty={<WishlistEmpty />} />);
    await screen.findByText("1025 독도 토너");
    await userEvent.click(screen.getByRole("button", { name: "1025 독도 토너 위시리스트에서 빼기" }));
    await waitFor(async () => expect(await savedOnServer()).not.toContain(1));
    server.use(http.post(`${SAVED_PATH}/products/1/restore`, () => problem(500, "INTERNAL_SERVER_ERROR")));

    await userEvent.click(screen.getByRole("button", { name: "되돌리기" }));

    expect(await screen.findByText("위시리스트에 다시 담지 못했어요")).toBeInTheDocument();
    expect(screen.getByText("총 1개")).toBeInTheDocument();
    expect(await savedOnServer()).not.toContain(1);
  });

  it("삭제와 되돌리기가 모두 실패해도 실제 서버의 저장 상태로 복원한다", async () => {
    seed(1, 3);
    const release = Promise.withResolvers<void>();
    server.use(
      http.delete(`${SAVED_PATH}/products/1`, async () => {
        await release.promise;
        return problem(500, "INTERNAL_SERVER_ERROR");
      }),
      http.post(`${SAVED_PATH}/products/1/restore`, () => problem(500, "INTERNAL_SERVER_ERROR")),
    );
    render(<SavedScreen empty={<WishlistEmpty />} />);
    await screen.findByText("1025 독도 토너");
    await userEvent.click(screen.getByRole("button", { name: "1025 독도 토너 위시리스트에서 빼기" }));
    await userEvent.click(screen.getByRole("button", { name: "되돌리기" }));
    release.resolve();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "1025 독도 토너 위시리스트에서 빼기" })).toBeInTheDocument(),
    );
    expect(screen.getByText("총 2개")).toBeInTheDocument();
    expect(await savedOnServer()).toContain(1);
  });

  it("목록과 개수에서 빼고 서버에서도 지운다", async () => {
    seed(1, 3);
    render(<SavedScreen empty={<WishlistEmpty />} />);
    await screen.findByText("1025 독도 토너");

    await userEvent.click(screen.getByRole("button", { name: "1025 독도 토너 위시리스트에서 빼기" }));

    expect(await screen.findByRole("button", { name: "되돌리기" })).toBeInTheDocument();
    expect(screen.getByText("총 1개")).toBeInTheDocument();
    expect(screen.getByText("다이브인 저분자 히알루론산 토너")).toBeInTheDocument();
    expect(screen.queryByText("불러오는 중…")).not.toBeInTheDocument();
    await waitFor(async () => expect(await savedOnServer()).toEqual([3]));
  });

  it("되돌린 제품은 다시 받아도 원래 자리에 있다", async () => {
    seed(1, 3);
    render(<SavedScreen empty={<WishlistEmpty />} />);
    await screen.findByText("1025 독도 토너");

    await userEvent.click(screen.getByRole("button", { name: "다이브인 저분자 히알루론산 토너 위시리스트에서 빼기" }));
    await userEvent.click(await screen.findByRole("button", { name: "되돌리기" }));
    await waitFor(async () => expect(await savedOnServer()).toEqual([1, 3]));
    cleanup();

    render(<SavedScreen empty={<WishlistEmpty />} />);

    await waitFor(() => {
      const names = screen.getAllByRole("article").map((card) => card.textContent ?? "");
      expect(names[0]).toContain("1025 독도 토너");
      expect(names[1]).toContain("다이브인 저분자 히알루론산 토너");
    });
  });

  it("되돌리면 원래 자리로 다시 넣고 서버에도 다시 저장하며 그 하트로 포커스를 돌려준다", async () => {
    seed(1, 3);
    render(<SavedScreen empty={<WishlistEmpty />} />);
    await screen.findByText("1025 독도 토너");

    await userEvent.click(screen.getByRole("button", { name: "1025 독도 토너 위시리스트에서 빼기" }));
    await userEvent.click(await screen.findByRole("button", { name: "되돌리기" }));

    await waitFor(() => expect(screen.queryByRole("button", { name: "되돌리기" })).not.toBeInTheDocument());
    expect(screen.getByText("총 2개")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1025 독도 토너 위시리스트에서 빼기" })).toHaveFocus();
    const names = screen.getAllByRole("article").map((card) => card.textContent ?? "");
    expect(names[0]).toContain("1025 독도 토너");
    await waitFor(async () => expect(await savedOnServer()).toContain(1));
  });
});
